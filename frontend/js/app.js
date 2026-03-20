const API_BASE_URL = "http://localhost:8000";

let allVideos = [];
let allRepos = [];
let currentPage = 1;
const itemsPerPage = 10;
let activeTab = 'videos';

async function handleSearch() {
    const query = document.getElementById("search-input").value;
    if (query === "") return;
    allVideos = [];
    allRepos = [];
    currentPage = 1;

    document.getElementById("results-section").classList.remove("hidden");
    document.getElementById("pagination-controls").classList.add("hidden"); 
    document.getElementById("sort-select").classList.add("hidden");
    const loaderHtml = `<div class="loading-container" style="text-align: center; padding: 40px;"><span class="loader"></span><p>Loading...</p></div>`;
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

    if (activeTab === 'videos') {
        dataArray = allVideos;
        containerId = "videos-container";
    } else {
        dataArray = allRepos;
        containerId = "repos-container";
    }

    let container = document.getElementById(containerId);
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

    if (activeTab === 'videos') {
        renderVideoResults(paginatedData);
    } else {
        renderRepoResults(paginatedData);
    }

    updatePaginationUI(dataArray.length);
}

function changePage(direction) {
    currentPage = currentPage + direction;
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

function formatViews(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

function renderVideoResults(videoArray) {
    let videosContainer = document.getElementById("videos-container");
    videosContainer.innerHTML = "";

    if (videoArray.length === 0) {
        videosContainer.innerHTML = "<p>No videos found.</p>";
        return;
    }

    for (let i = 0; i < videoArray.length; i++) {
        let video = videoArray[i];
        
        
        let dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        let formattedDate = new Date(video.date).toLocaleDateString(undefined, dateOptions);

        let videoElement = `
            <div class="result-item video-card" onclick="openVideo('${video.video_id}')" style="cursor:pointer;">
                <img src="${video.thumbnail}" alt="${video.title}">

                <div class="info">
                    <h4>${video.title}</h4>
                    <p class="channel">${video.channel}</p>
                    <p class="video-meta">
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

    const githubSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-github" viewBox="0 0 16 16">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
    </svg>`;

    const gitForkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-git" viewBox="0 0 16 16">
        <path d="M15.698 7.287 8.712.302a1.03 1.03 0 0 0-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 0 1 1.55 1.56l1.773 1.774a1.224 1.224 0 0 1 1.267 2.025 1.226 1.226 0 0 1-2.002-1.334L8.58 5.963v4.353a1.226 1.226 0 1 1-1.008-.036V5.887a1.226 1.226 0 0 1-.666-1.608L5.093 2.465l-4.79 4.79a1.03 1.03 0 0 0 0 1.457l6.986 6.986a1.03 1.03 0 0 0 1.457 0l6.953-6.953a1.03 1.03 0 0 0 0-1.457"/>
        </svg>`;

    for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        
        let description = repo.description;
        if (!description) {
            description = "No description.";
        }

        const html = `
            <div class="result-item repo-card">
                <div class="repo-title-wrapper">
                    ${githubSvg}
                    <h4><a href="${repo.repo_url}" target="_blank" class="repo-title">${repo.name}</a></h4>
                </div>
                <div class="repo-meta">
                    <span>👤 ${repo.owner}</span>
                    <span>⭐ ${repo.stars}</span>
                    <span> ${gitForkSvg} Forks: ${repo.forks}</span>
                    <span>🕒 Updated: ${new Date(repo.updated).toLocaleDateString()}</span>
                </div>
                <p>${description}</p>
            </div>`;
            
        container.innerHTML += html;
    }
}

function openAuth(type) {
    const modal = document.getElementById("auth-modal");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const errorDisplay = document.getElementById("auth-error");

    if (errorDisplay) {
        errorDisplay.style.display = "none";
        errorDisplay.innerText = "";
    }

    modal.classList.remove("hidden");
    modal.classList.add("show");

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
    if (event.target == createModal) {
        closeCreatePlaylist();
    }
};

function closeAuth() {
    const modal = document.getElementById("auth-modal");
    modal.classList.remove("show");
    setTimeout(() => {
        modal.classList.add("hidden");
        clearAuthForms();
    }, 300);
}

function updateSortOptions() {
    let sortSelect = document.getElementById("sort-select");
    if (activeTab === 'videos') {
        sortSelect.innerHTML = `
            <option value="views-desc">Views ↓(High to Low)</option>
            <option value="views-asc">Views ↑(Low to High)</option>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
        `;
    } else {
        sortSelect.innerHTML = `
            <option value="stars-desc">Stars ↓(High to Low)</option>
            <option value="stars-asc">Stars ↑(Low to High)</option>
            <option value="forks-desc">Forks ↓(High to Low)</option>
            <option value="forks-asc">Forks ↑(Low to High)</option>
            <option value="updated-desc">Recently Updated</option>
            <option value="updated-asc">Least Recently Updated</option>
        `;
    }
}

function applySort() {
    let sortSelect = document.getElementById("sort-select");
    let sortValue = sortSelect.value;
    
    let splitValue = sortValue.split("-");
    let key = splitValue[0];
    let order = splitValue[1];

    if (activeTab === 'videos') {
        allVideos.sort(function(a, b) {
            let valA;
            let valB;

            if (key === 'date') {
                if (a.date) {
                    valA = new Date(a.date).getTime();
                } else {
                    valA = new Date(0).getTime();
                }
            } else {
                if (a.views) {
                    valA = Number(a.views);
                } else {
                    valA = 0;
                }
            }

            if (key === 'date') {
                if (b.date) {
                    valB = new Date(b.date).getTime();
                } else {
                    valB = new Date(0).getTime();
                }
            } else {
                if (b.views) {
                    valB = Number(b.views);
                } else {
                    valB = 0;
                }
            }
            
            if (order === 'desc') {
                return valB - valA;
            } else {
                return valA - valB;
            }
        });
    } else {

        allRepos.sort(function(a, b) {
            let valA;
            let valB;

            if (key === 'updated') {
                if (a.updated) {
                    valA = new Date(a.updated).getTime();
                } else {
                    valA = new Date(0).getTime();
                }
            } else {
                if (a[key]) {
                    valA = Number(a[key]);
                } else {
                    valA = 0;
                }
            }

            if (key === 'updated') {
                if (b.updated) {
                    valB = new Date(b.updated).getTime();
                } else {
                    valB = new Date(0).getTime();
                }
            } else {
                if (b[key]) {
                    valB = Number(b[key]);
                } else {
                    valB = 0;
                }
            }
            
            if (order === 'desc') {
                return valB - valA;
            } else {
                return valA - valB;
            }
        });
    }

    currentPage = 1; 
    renderCurrentPage();
}

function openVideo(videoId) {
    const modal = document.getElementById("video-modal");
    const player = document.getElementById("video-player");
    
    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    modal.classList.add("show");
    document.body.style.overflow = 'hidden'; 
}

function closeVideo() {
    const modal = document.getElementById("video-modal");
    const player = document.getElementById("video-player");
    modal.classList.remove("show");
    
    setTimeout(() => {
        player.src = ""; 
        document.body.style.overflow = 'auto';
    }, 300);
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById("video-modal");
    if (event.target === modal) {
        closeVideo();
    }
});

window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeVideo();
    }
});

async function handleRegister() {
    const username = document.getElementById("reg-username").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const errorDisplay = document.getElementById("auth-error");

    errorDisplay.style.display = "none";

    if (!username || !email || !password) {
        errorDisplay.innerText = "Please fill in all fields.";
        errorDisplay.style.display = "block";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Registration failed");
        }

        showToast("Registration successful! Please log in.", "success");
        clearAuthForms(); 
        openAuth('login');
        
    } catch (error) {
        errorDisplay.innerText = error.message;
        errorDisplay.style.display = "block";
    }
}

async function handleLogin() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const errorDisplay = document.getElementById("auth-error");

    errorDisplay.style.display = "none";

    if (!username || !password) {
        errorDisplay.innerText = "Please enter username and password.";
        errorDisplay.style.display = "block";
        return;
    }

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Login failed");
        }

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("username", username);
        
        closeAuth();
        updateNavbarUI();
        
        showToast(`Welcome back, ${username}!`, "success");

    } catch (error) {
        errorDisplay.innerText = error.message;
        errorDisplay.style.display = "block";
    }
}

function updateNavbarUI() {
    const token = localStorage.getItem("access_token");
    const username = localStorage.getItem("username");
    const navButtons = document.querySelector(".navbar div"); 

    if (token) {
        navButtons.innerHTML = `
            <button onclick="switchAppView('playlists')">Playlists</button>
            <span style="margin-right: 15px; margin-left: 15px; color: #cbd5e1;">Hi, ${username}</span>
            <button onclick="handleLogout()">Logout</button>
        `;
    } else {
        navButtons.innerHTML = `
            <button onclick="switchAppView('playlists')">Playlists</button>
            <button onclick="openAuth('login')" style="margin-left: 15px;">Login</button>
            <button class="primary" onclick="openAuth('register')">Get Started</button>
        `;
    }
}

function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    updateNavbarUI();
    
    showToast("You have been logged out.", "success");
}

document.addEventListener("DOMContentLoaded", () => {
    updateNavbarUI();
});


function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "fadeOutUp 0.3s forwards ease-in";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

function clearAuthForms() {
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
    document.getElementById("reg-username").value = "";
    document.getElementById("reg-email").value = "";
    document.getElementById("reg-password").value = "";
    
    const errorDisplay = document.getElementById("auth-error");
    if (errorDisplay) {
        errorDisplay.style.display = "none";
        errorDisplay.innerText = "";
    }
}

function switchAppView(view) {
    const homeView = document.getElementById("home-view");
    const playlistsView = document.getElementById("playlists-view");

    if (view === 'playlists') {
        homeView.classList.add("hidden");
        playlistsView.classList.remove("hidden");
        renderPlaylists();
    } else {
        playlistsView.classList.add("hidden");
        homeView.classList.remove("hidden");
    }
}


function openCreatePlaylist() {
    const modal = document.getElementById("create-playlist-modal");
    modal.classList.remove("hidden");
    modal.classList.add("show");
}

function closeCreatePlaylist() {
    const modal = document.getElementById("create-playlist-modal");
    modal.classList.remove("show");
    setTimeout(() => {
        modal.classList.add("hidden");
        document.getElementById("new-playlist-name").value = "";
        document.getElementById("new-playlist-category").value = "";
    }, 300);
}

function handleCreatePlaylist() {
    const name = document.getElementById("new-playlist-name").value;
    const cat = document.getElementById("new-playlist-category").value;
    
    if(!name) {
        showToast("Playlist name is required", "error");
        return;
    }

    showToast(`Playlist "${name}" created!`, "success");
    closeCreatePlaylist();
}



function renderPlaylists() {
   
}