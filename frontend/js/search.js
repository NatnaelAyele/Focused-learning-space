async function handleSearch() {
    const query = document.getElementById("search-input").value;
    if (query === "") return;
    allVideos = [];
    allRepos = [];
    currentPage = 1;

    document.getElementById("results-section").classList.remove("hidden");
    document.getElementById("pagination-controls").classList.add("hidden");
    document.getElementById("sort-select").classList.add("hidden");
    const loaderHtml = `<div class=\"loading-container\" style=\"text-align: center; padding: 40px;\"><span class=\"loader\"></span><p>Loading...</p></div>`;
    document.getElementById("videos-container").innerHTML = loaderHtml;
    document.getElementById("repos-container").innerHTML = loaderHtml;

    try {
        const [videoRes, repoRes] = await Promise.all([
            fetch(API_BASE_URL + "/search/videos?query=" + encodeURIComponent(query)),
            fetch(API_BASE_URL + "/search/repositories?query=" + encodeURIComponent(query))
        ]);

        const videoData = await videoRes.json();
        const repoData = await repoRes.json();

        allVideos = videoData.videos || [];
        allRepos = repoData.repositories || [];

        updateSortOptions();
        applySort();

        if (allVideos.length > 0 || allRepos.length > 0) {
            document.getElementById("sort-select").classList.remove("hidden");
        }

        renderCurrentPage();
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("videos-container").innerHTML = "<p>Failed to load results.</p>";
        document.getElementById("repos-container").innerHTML = "<p>Failed to load results.</p>";
    }
}

function renderCurrentPage() {
    let dataArray;
    let containerId;

    if (activeTab === "videos") {
        dataArray = allVideos;
        containerId = "videos-container";
    } else {
        dataArray = allRepos;
        containerId = "repos-container";
    }

    const container = document.getElementById(containerId);
    if (dataArray.length === 0) {
        if (!container.innerHTML.includes("loader")) {
            container.innerHTML = `<p>No ${activeTab} found.</p>`;
            document.getElementById("pagination-controls").classList.add("hidden");
        }
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = dataArray.slice(startIndex, endIndex);

    if (activeTab === "videos") {
        renderVideoResults(paginatedData);
    } else {
        renderRepoResults(paginatedData);
    }

    updatePaginationUI(dataArray.length);
}

function changePage(direction) {
    currentPage = currentPage + direction;
    renderCurrentPage();
    document.getElementById("results-section").scrollIntoView({ behavior: "smooth" });
}

function updatePaginationUI(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageInfo = document.getElementById("page-info");
    const previousBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const paginationControls = document.getElementById("pagination-controls");

    if (totalItems === 0) {
        paginationControls.classList.add("hidden");
        return;
    }

    paginationControls.classList.remove("hidden");
    pageInfo.innerText = "Page " + currentPage + " of " + totalPages;

    if (currentPage === 1) {
        previousBtn.disabled = true;
        previousBtn.style.opacity = "0.5";
        previousBtn.style.cursor = "not-allowed";
    } else {
        previousBtn.disabled = false;
        previousBtn.style.opacity = "1";
        previousBtn.style.cursor = "pointer";
    }

    if (currentPage === totalPages) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = "0.5";
        nextBtn.style.cursor = "not-allowed";
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = "1";
        nextBtn.style.cursor = "pointer";
    }
}

function switchTab(tab) {
    activeTab = tab;
    currentPage = 1;

    const videosContainer = document.getElementById("videos-container");
    const reposContainer = document.getElementById("repos-container");
    const videosTabBtn = document.getElementById("tab-videos");
    const reposTabBtn = document.getElementById("tab-repos");

    if (tab === "videos") {
        videosContainer.classList.remove("hidden");
        reposContainer.classList.add("hidden");
        videosTabBtn.classList.add("active");
        reposTabBtn.classList.remove("active");
    } else {
        reposContainer.classList.remove("hidden");
        videosContainer.classList.add("hidden");
        reposTabBtn.classList.add("active");
        videosTabBtn.classList.remove("active");
    }

    updateSortOptions();
    renderCurrentPage();
}

function renderVideoResults(videoArray) {
    const videosContainer = document.getElementById("videos-container");
    videosContainer.innerHTML = "";

    if (videoArray.length === 0) {
        videosContainer.innerHTML = "<p>No videos found.</p>";
        return;
    }

    for (let i = 0; i < videoArray.length; i++) {
        const video = videoArray[i];
        const dateOptions = { year: "numeric", month: "short", day: "numeric" };
        const formattedDate = new Date(video.date).toLocaleDateString(undefined, dateOptions);

        const addBtn = `<button class=\"btn-add-to-playlist\" title=\"Add to Playlist\" onclick=\"openAddToPlaylistModal(event, 'video', '${video.video_id}')\">⋮</button>`;

        const videoElement = `
            <div class=\"result-item video-card\" onclick=\"openVideo('${video.video_id}')\" style=\"cursor:pointer;\">
                <img src=\"${video.thumbnail}\" alt=\"${video.title}\">
                <div class=\"info\">
                    <h4>${video.title}</h4>
                    ${addBtn}
                    <p class=\"channel\">${video.channel}</p>
                    <p class=\"video-meta\">
                        <span>👁️ ${formatViews(video.views)} views</span> •
                        <span>📅 ${formattedDate}</span>
                    </p>
                </div>
            </div>`;

        videosContainer.innerHTML += videoElement;
    }
}

function renderRepoResults(repos) {
    const container = document.getElementById("repos-container");
    container.innerHTML = "";

    if (repos.length === 0) {
        container.innerHTML = "<p>No repositories found.</p>";
        return;
    }

    const githubSvg = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" fill=\"currentColor\" class=\"bi bi-github\" viewBox=\"0 0 16 16\">
        <path d=\"M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8\"/>
    </svg>`;

    const gitForkSvg = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-git\" viewBox=\"0 0 16 16\">
        <path d=\"M15.698 7.287 8.712.302a1.03 1.03 0 0 0-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 0 1 1.55 1.56l1.773 1.774a1.224 1.224 0 0 1 1.267 2.025 1.226 1.226 0 0 1-2.002-1.334L8.58 5.963v4.353a1.226 1.226 0 1 1-1.008-.036V5.887a1.226 1.226 0 0 1-.666-1.608L5.093 2.465l-4.79 4.79a1.03 1.03 0 0 0 0 1.457l6.986 6.986a1.03 1.03 0 0 0 1.457 0l6.953-6.953a1.03 1.03 0 0 0 0-1.457\"/>
    </svg>`;

    for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        const url = repo.repo_url || repo.html_url || repo.url;
        const description = repo.description || "No description.";

        const addBtn = `<button class=\"btn-add-to-playlist\" title=\"Add to Playlist\" onclick=\"event.stopPropagation(); openAddToPlaylistModal(event, 'repo', '${url}')\">⋮</button>`;

        const html = `
            <div class=\"result-item repo-card\" onclick=\"openRepo('${url}')\" style=\"cursor:pointer;\">
                <div class=\"repo-title-wrapper\">
                    ${githubSvg}
                    <h4><span class=\"repo-title\">${repo.name}</span></h4>
                    ${addBtn}
                </div>
                <div class=\"repo-meta\">
                    <span>👤 ${repo.owner}</span>
                    <span>⭐ ${repo.stars || 0}</span>
                    <span> ${gitForkSvg} Forks: ${repo.forks || 0}</span>
                    <span>🕒 Updated: ${repo.updated ? new Date(repo.updated).toLocaleDateString() : "N/A"}</span>
                </div>
                <p>${description}</p>
            </div>`;

        container.innerHTML += html;
    }
}

function updateSortOptions() {
    const sortSelect = document.getElementById("sort-select");
    if (activeTab === "videos") {
        sortSelect.innerHTML = `
            <option value=\"views-desc\">Views ↓(High to Low)</option>
            <option value=\"views-asc\">Views ↑(Low to High)</option>
            <option value=\"date-desc\">Newest First</option>
            <option value=\"date-asc\">Oldest First</option>
        `;
    } else {
        sortSelect.innerHTML = `
            <option value=\"stars-desc\">Stars ↓(High to Low)</option>
            <option value=\"stars-asc\">Stars ↑(Low to High)</option>
            <option value=\"forks-desc\">Forks ↓(High to Low)</option>
            <option value=\"forks-asc\">Forks ↑(Low to High)</option>
            <option value=\"updated-desc\">Recently Updated</option>
            <option value=\"updated-asc\">Least Recently Updated</option>
        `;
    }
}

function applySort() {
    const sortSelect = document.getElementById("sort-select");
    const sortValue = sortSelect.value;

    const splitValue = sortValue.split("-");
    const key = splitValue[0];
    const order = splitValue[1];

    if (activeTab === "videos") {
        allVideos.sort((a, b) => {
            let valA;
            let valB;

            if (key === "date") {
                valA = a.date ? new Date(a.date).getTime() : new Date(0).getTime();
                valB = b.date ? new Date(b.date).getTime() : new Date(0).getTime();
            } else {
                valA = a.views ? Number(a.views) : 0;
                valB = b.views ? Number(b.views) : 0;
            }

            if (order === "desc") {
                return valB - valA;
            }
            return valA - valB;
        });
    } else {
        allRepos.sort((a, b) => {
            let valA;
            let valB;

            if (key === "updated") {
                valA = a.updated ? new Date(a.updated).getTime() : new Date(0).getTime();
                valB = b.updated ? new Date(b.updated).getTime() : new Date(0).getTime();
            } else {
                valA = a[key] ? Number(a[key]) : 0;
                valB = b[key] ? Number(b[key]) : 0;
            }

            if (order === "desc") {
                return valB - valA;
            }
            return valA - valB;
        });
    }

    currentPage = 1;
    renderCurrentPage();
}
