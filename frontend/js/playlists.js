function switchAppView(view) {
    const homeView = document.getElementById("home-view");
    const playlistsView = document.getElementById("playlists-view");
    const detailView = document.getElementById("playlist-detail-view");

    const token = localStorage.getItem("access_token");

    homeView.classList.add("hidden");
    playlistsView.classList.add("hidden");
    detailView.classList.add("hidden");

    if (view === "playlists") {
        if (!token) {
            showToast("You must be logged in to view playlists.", "error");
            openAuth("login");
            return;
        }
        playlistsView.classList.remove("hidden");
        fetchPlaylists();
    } else if (view === "playlist-detail") {
        detailView.classList.remove("hidden");
    } else {
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

function handleCreateAndAdd() {
    closeAddToPlaylistModal();
    openCreatePlaylist();
}

async function handleCreatePlaylist() {
    const name = document.getElementById("new-playlist-name").value.trim();
    const cat = document.getElementById("new-playlist-category").value.trim();
    const token = localStorage.getItem("access_token");

    if (!name || !cat) return showToast("Fields required", "error");

    try {
        const url = `${API_BASE_URL}/playlists/new?name=${encodeURIComponent(name)}&category=${encodeURIComponent(cat)}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            const newPlaylist = await response.json();
            showToast(`Playlist "${name}" created!`, "success");
            closeCreatePlaylist();

            if (currentItemToAdd.data) {
                confirmAddToPlaylist(newPlaylist.id, newPlaylist.name);
            } else {
                fetchPlaylists();
            }
        }
    } catch (error) {
        showToast("Error creating playlist", "error");
    }
}

async function fetchPlaylists() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/playlists`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.ok) {
            myPlaylists = await response.json();
            renderPlaylists();
            populateCategoryFilter();
        } else {
            showToast("Failed to load playlists.", "error");
        }
    } catch (error) {
        console.error("Error fetching playlists:", error);
        showToast("Network error while fetching playlists.", "error");
    }
}

function renderPlaylists(searchTerm = "", categoryFilter = "") {
    const grid = document.getElementById("playlists-grid");
    grid.innerHTML = "";

    const filteredPlaylists = myPlaylists.filter((playlist) => {
        const matchesSearch = playlist.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === "" || playlist.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (filteredPlaylists.length === 0) {
        grid.innerHTML = "<p style='color:#94a3b8;'>No playlists found.</p>";
        return;
    }

    filteredPlaylists.forEach((playlist) => {
        const imageSrc = getPlaylistImage(playlist.id);
        grid.innerHTML += `
            <div class=\"playlist-card\" onclick=\"openPlaylistDetail(${playlist.id})\" style=\"cursor: pointer;\">
                <img src=\"${imageSrc}\" alt=\"${playlist.name}\">
                <div>
                    <h4>${playlist.name}</h4>
                    <p>${playlist.category || "Uncategorized"}</p>
                </div>
            </div>
        `;
    });
}

function populateCategoryFilter() {
    const filterSelect = document.getElementById("playlist-category-filter");

    const uniqueCategories = [...new Set(myPlaylists.map((p) => p.category).filter(Boolean))];

    filterSelect.innerHTML = '<option value="">All Categories</option>';

    uniqueCategories.forEach((category) => {
        filterSelect.innerHTML += `<option value=\"${category}\">${category}</option>`;
    });
}

async function openAddToPlaylistModal(event, type, id) {
    event.stopPropagation();

    const token = localStorage.getItem("access_token");
    if (!token) {
        showToast("Please login to save items!", "error");
        openAuth("login");
        return;
    }

    if (type === "video") {
        currentItemToAdd = { type: "video", data: allVideos.find((v) => v.video_id === id) };
    } else {
        currentItemToAdd = { type: "repo", data: allRepos.find((r) => r.repo_url === id) };
    }

    const listContainer = document.getElementById("user-playlists-list");
    listContainer.innerHTML = `
        <div class=\"playlist-list-item create-new-option\" onclick=\"handleCreateAndAdd()\">
            + Create New Playlist
        </div>
    `;

    await fetchPlaylists();
    myPlaylists.forEach((pl) => {
        listContainer.innerHTML += `
            <div class=\"playlist-list-item\" onclick=\"confirmAddToPlaylist(${pl.id}, '${pl.name}')\">
                <strong>${pl.name}</strong>
                <span>${pl.category || "General"}</span>
            </div>
        `;
    });

    const modal = document.getElementById("add-to-playlist-modal");
    modal.classList.remove("hidden");
    modal.classList.add("show");
}

function closeAddToPlaylistModal() {
    const modal = document.getElementById("add-to-playlist-modal");
    modal.classList.remove("show");
    setTimeout(() => modal.classList.add("hidden"), 300);
    currentItemToAdd = { type: null, data: null };
}

async function confirmAddToPlaylist(playlistId, playlistName) {
    if (!currentItemToAdd.data) return;

    const token = localStorage.getItem("access_token");
    let endpoint = "";
    let payload = {};

    if (currentItemToAdd.type === "video") {
        endpoint = `${API_BASE_URL}/playlists/${playlistId}/videos`;
        payload = {
            youtube_video_id: currentItemToAdd.data.video_id,
            title: currentItemToAdd.data.title,
            channel: currentItemToAdd.data.channel,
            thumbnail: currentItemToAdd.data.thumbnail
        };
    } else {
        endpoint = `${API_BASE_URL}/playlists/${playlistId}/repositories`;
        payload = {
            name: currentItemToAdd.data.name,
            owner: currentItemToAdd.data.owner,
            repo_url: currentItemToAdd.data.repo_url,
            description: currentItemToAdd.data.description || "No description",
            stars: currentItemToAdd.data.stars
        };
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast(`Added to "${playlistName}"!`, "success");
            closeAddToPlaylistModal();
        } else {
            const errorData = await response.json();
            showToast(errorData.detail || "Failed to add item.", "error");
        }
    } catch (error) {
        console.error("Error adding to playlist:", error);
        showToast("Network error.", "error");
    }
}

async function openPlaylistDetail(playlistId) {
    const token = localStorage.getItem("access_token");
    if (!token || token === "null" || token === "undefined") {
        console.error("Token is invalid or missing. Redirecting...");
        openAuth("login");
        return;
    }

    switchAppView("playlist-detail");
    document.getElementById("detail-videos-container").innerHTML = "<p>Loading playlist...</p>";
    document.getElementById("detail-repos-container").innerHTML = "";

    try {
        const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            currentDetailedPlaylist = await response.json();

            document.getElementById("detail-playlist-name").innerText = currentDetailedPlaylist.name;
            document.getElementById("detail-playlist-category").innerText = currentDetailedPlaylist.category || "General";

            const vCount = currentDetailedPlaylist.videos ? currentDetailedPlaylist.videos.length : 0;
            const rCount = currentDetailedPlaylist.repos ? currentDetailedPlaylist.repos.length : 0;

            document.getElementById("count-videos").innerText = vCount;
            document.getElementById("count-repos").innerText = rCount;

            renderDetailVideos(currentDetailedPlaylist.videos || []);
            renderDetailRepos(currentDetailedPlaylist.repos || []);

            switchDetailTab("videos");
        } else {
            showToast("Failed to load playlist.", "error");
            switchAppView("playlists");
        }
    } catch (error) {
        console.error("Error fetching detail:", error);
        showToast("Network error.", "error");
    }
}

function switchDetailTab(tab) {
    const vContainer = document.getElementById("detail-videos-container");
    const rContainer = document.getElementById("detail-repos-container");
    const vTab = document.getElementById("detail-tab-videos");
    const rTab = document.getElementById("detail-tab-repos");

    if (tab === "videos") {
        vContainer.classList.remove("hidden");
        rContainer.classList.add("hidden");
        vTab.classList.add("active");
        rTab.classList.remove("active");
    } else {
        rContainer.classList.remove("hidden");
        vContainer.classList.add("hidden");
        rTab.classList.add("active");
        vTab.classList.remove("active");
    }
}

function renderDetailVideos(videos) {
    const container = document.getElementById("detail-videos-container");
    container.innerHTML = "";

    if (videos.length === 0) {
        container.innerHTML = "<p style='color:#94a3b8;'>No videos saved in this playlist yet.</p>";
        return;
    }

    videos.forEach((video) => {
        container.innerHTML += `
            <div class=\"result-item video-card\" onclick=\"openVideo('${video.youtube_video_id}')\" style=\"cursor:pointer; position: relative;\">
                <img src=\"${video.thumbnail}\" alt=\"thumb\">
                <div class=\"info\">
                    <h4>${video.title}</h4>
                    <p class=\"channel\">${video.channel || "YouTube"}</p>
                </div>
            </div>`;
    });
}

function renderDetailRepos(repos) {
    const container = document.getElementById("detail-repos-container");
    container.innerHTML = "";

    if (repos.length === 0) {
        container.innerHTML = "<p style='color:#94a3b8;'>No repositories saved in this playlist yet.</p>";
        return;
    }

    repos.forEach((repo) => {
        container.innerHTML += `
            <div class=\"result-item repo-card\" onclick=\"openRepo('${repo.repo_url}')\" style=\"cursor:pointer; position: relative;\">
                <div class=\"repo-title-wrapper\">
                    <h4><span class=\"repo-title\">${repo.name}</span></h4>
                </div>
                <div class=\"repo-meta\">
                    <span>👤 ${repo.owner}</span>
                    <span>⭐ ${repo.stars || 0}</span>
                </div>
                <p>${repo.description || "No description"}</p>
            </div>`;
    });
}
