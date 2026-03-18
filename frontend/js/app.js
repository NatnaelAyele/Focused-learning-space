const API_BASE_URL = "http://localhost:8000";


let allVideos = [];
let allRepos = [];
let currentPage = 1;
const itemsPerPage = 10;
let activeTab = 'videos';

async function handleSearch() {
    const query = document.getElementById("search-input").value;
    if (!query) return;

    document.getElementById("results-section").classList.remove("hidden");
    document.getElementById("pagination-controls").classList.add("hidden"); // Hide until loaded
    
    document.getElementById("videos-container").innerHTML = "<p>Loading videos...</p>";
    document.getElementById("repos-container").innerHTML = "<p>Loading repositories...</p>";

    try {
        const [videoRes, repoRes] = await Promise.all([
            fetch(`${API_BASE_URL}/search/videos?query=${encodeURIComponent(query)}`),
            fetch(`${API_BASE_URL}/search/repositories?query=${encodeURIComponent(query)}`)
        ]);

        const videoData = await videoRes.json();
        const repoData = await repoRes.json();

        allVideos = videoData.videos || [];
        allRepos = repoData.repositories || [];
        currentPage = 1;

        renderCurrentPage();

    } catch (error) {
        console.error("Error:", error);
        document.getElementById("videos-container").innerHTML = "<p>Failed to load results.</p>";
        document.getElementById("repos-container").innerHTML = "<p>Failed to load results.</p>";

    }
}

function renderCurrentPage() {

    const dataArray = activeTab === 'videos' ? allVideos : allRepos;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = dataArray.slice(startIndex, endIndex);

    if (activeTab === 'videos') {
        renderVideoResults(paginatedData);
    } else {
        renderRepoResults(paginatedData);
    }

    updatePaginationUI(dataArray.length);
}

function changePage(direction) {
    currentPage += direction;
    renderCurrentPage();
    document.getElementById("results-section").scrollIntoView({ behavior: 'smooth' });
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
    pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    previousBtn.disabled = currentPage === 1;
    previousBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
    previousBtn.style.cursor = currentPage === 1 ? "not-allowed" : "pointer";

    nextBtn.disabled = currentPage === totalPages;
    nextBtn.style.opacity = currentPage === totalPages ? "0.5" : "1";
    nextBtn.style.cursor = currentPage === totalPages ? "not-allowed" : "pointer";
}

function switchTab(tab) {
    activeTab = tab;
    currentPage = 1;
    
    const videos = document.getElementById("videos-container");
    const repos = document.getElementById("repos-container");
    const videosTab = document.getElementById("tab-videos");
    const reposTab = document.getElementById("tab-repos");

    if (tab === "videos") {
        videos.classList.remove("hidden");
        repos.classList.add("hidden");
        videosTab.classList.add("active");
        reposTab.classList.remove("active");
    } else {
        repos.classList.remove("hidden");
        videos.classList.add("hidden");
        reposTab.classList.add("active");
        videosTab.classList.remove("active");
    }

    renderCurrentPage();
}



function renderVideoResults(videos) {
    const container = document.getElementById("videos-container");
    container.innerHTML = "";

    if (!videos || videos.length === 0) {
        container.innerHTML = "<p>No videos found.</p>";
        return;
    }

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const videoUrl = "https://www.youtube.com/watch?v=" + video.video_id;

        const html = `
            <div class="result-item video-card">
                <a href="${videoUrl}" target="_blank">
                    <img src="${video.thumbnail}" alt="${video.title}">
                </a>
                <div class="info">
                    <h4><a href="${videoUrl}" target="_blank">${video.title}</a></h4>
                    <p class="channel">${video.channel}</p>
                </div>
            </div>`;
            
        container.innerHTML += html;
    }
}

function renderRepoResults(repos) {
    const container = document.getElementById("repos-container");
    container.innerHTML = "";

    if (!repos || repos.length === 0) {
        container.innerHTML = "<p>No repositories found.</p>";
        return;
    }
    const githubSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-github" viewBox="0 0 16 16">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
    </svg>`;
    for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        const html = `
            <div class="result-item repo-card">
                <div class="repo-title-wrapper">
                    ${githubSvg}
                    <h4><a href="${repo.repo_url}" target="_blank" class="repo-title">${repo.name}</a></h4>
                </div>
                <div class="repo-meta">
                    <span>👤 ${repo.owner}</span>
                    <span>⭐ ${repo.stars}</span>
                </div>
                <p>${repo.description || "No description."}</p>
            </div>`;
            
        container.innerHTML += html;
    }
}


function openAuth(type) {
    const modal = document.getElementById("auth-modal");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    modal.classList.remove("hidden");

    if (type === "login") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
    }
}

window.onclick = function(event) {
    const modal = document.getElementById("auth-modal");
    if (event.target == modal) {
        closeAuth();
    }
};

function closeAuth() {
    document.getElementById("auth-modal").classList.add("hidden");
}