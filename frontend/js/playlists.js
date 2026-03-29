function switchAppView(view) {
    // Handle navigation between home, playlist, analytics, and playlist detail views.
    const homeView = document.getElementById("home-view");
    const playlistsView = document.getElementById("playlists-view");
    const detailView = document.getElementById("playlist-detail-view");
    const analyticsView = document.getElementById("analytics-view");

    const token = localStorage.getItem("access_token");

    // Guarded views should not blank the current view on auth failure; only switch after passing checks.
    const requiresAuth = view === "playlists" || view === "analytics" || view === "playlist-detail";
    if (requiresAuth && (!token || token === "null" || token === "undefined")) {
        showToast("You must be logged in to view this section.", "error");
        openAuth("login");
        return;
    }

    // Hide all views first; selectively reveal target view below.
    homeView.classList.add("hidden");
    playlistsView.classList.add("hidden");
    detailView.classList.add("hidden");
    if (analyticsView) analyticsView.classList.add("hidden");

    if (view === "playlists") {
        playlistsView.classList.remove("hidden");
        fetchPlaylists();
    } else if (view === "analytics") {
        if (analyticsView) analyticsView.classList.remove("hidden");
        loadVideoCategoryAnalytics();
    } else if (view === "playlist-detail") {
        detailView.classList.remove("hidden");
    } else {
        homeView.classList.remove("hidden");
    }
}

function openCreatePlaylist() {
    // Open create-playlist modal.
    const modal = document.getElementById("create-playlist-modal");
    modal.classList.remove("hidden");
    modal.classList.add("show");
    setupCreatePlaylistCategoryInput();
}

function closeCreatePlaylist() {
    // Close modal and clear any unsaved inputs.
    const modal = document.getElementById("create-playlist-modal");
    modal.classList.remove("show");
    setTimeout(() => {
        modal.classList.add("hidden");
        resetCreatePlaylistForm();
        setCreatePlaylistLoadingState(false);
    }, 300);
}

function setCreatePlaylistLoadingState(isLoading) {
    // Toggle create button state during API work.
    const submitButton = document.getElementById("create-playlist-submit");
    if (!submitButton) return;

    submitButton.disabled = isLoading;
    submitButton.innerText = isLoading ? "Creating..." : "Create";
}

function resetCreatePlaylistForm() {
    // Clear inputs and reset category picker layout.
    const nameInput = document.getElementById("new-playlist-name");
    const categoryInput = document.getElementById("new-playlist-category");
    const categorySelect = document.getElementById("new-playlist-category-select");
    const selectWrapper = document.getElementById("new-playlist-category-select-wrapper");
    const inputWrapper = document.getElementById("new-playlist-category-input-wrapper");

    if (nameInput) nameInput.value = "";
    if (categoryInput) categoryInput.value = "";
    if (categorySelect) categorySelect.innerHTML = "";
    if (selectWrapper) selectWrapper.classList.add("hidden");
    if (inputWrapper) inputWrapper.classList.remove("hidden");
}

function getUniquePlaylistCategories() {
    // Extract non-empty category strings from playlists.
    return [...new Set(myPlaylists.map((playlist) => (playlist.category || "").trim()).filter(Boolean))];
}

function setupCreatePlaylistCategoryInput() {
    // Decide whether to show select or free-text category input.
    const selectWrapper = document.getElementById("new-playlist-category-select-wrapper");
    const inputWrapper = document.getElementById("new-playlist-category-input-wrapper");
    const categorySelect = document.getElementById("new-playlist-category-select");
    const categoryInput = document.getElementById("new-playlist-category");

    if (!selectWrapper || !inputWrapper || !categorySelect || !categoryInput) return;

    const categories = getUniquePlaylistCategories();

    if (categories.length === 0) {
        // No saved categories yet; default to free-text input.
        selectWrapper.classList.add("hidden");
        inputWrapper.classList.remove("hidden");
        categorySelect.innerHTML = "";
        return;
    }

    selectWrapper.classList.remove("hidden");
    inputWrapper.classList.add("hidden");
    categorySelect.innerHTML = '<option value="" disabled selected>Select a category</option>';

    categories.forEach((category) => {
        categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
    });

    categorySelect.innerHTML += '<option value="__new__">+ Add new category</option>';

    categorySelect.onchange = () => {
        // Switch to text input when the user chooses to add a new category.
        if (categorySelect.value === "__new__") {
            inputWrapper.classList.remove("hidden");
            categoryInput.value = "";
            categoryInput.focus();
        } else {
            inputWrapper.classList.add("hidden");
            categoryInput.value = "";
        }
    };
}

function handleCreateAndAdd() {
    // Used when user starts from "add to playlist" and needs a new playlist first.
    closeAddToPlaylistModal(true);
    openCreatePlaylist();
}

async function handleCreatePlaylist() {
    // handle creation of a new playlist.

    // Read playlist form values and validate required fields.
    const name = document.getElementById("new-playlist-name").value.trim();
    const categoryInput = document.getElementById("new-playlist-category");
    const categorySelect = document.getElementById("new-playlist-category-select");
    const selectWrapper = document.getElementById("new-playlist-category-select-wrapper");
    let cat = "";

    if (selectWrapper && !selectWrapper.classList.contains("hidden")) {
        if (categorySelect && categorySelect.value && categorySelect.value !== "__new__") {
            cat = categorySelect.value.trim();
        } else if (categoryInput) {
            cat = categoryInput.value.trim();
        }
    } else if (categoryInput) {
        cat = categoryInput.value.trim();
    }
    const token = localStorage.getItem("access_token");

    if (!name || !cat) return showToast("Fields required", "error");

    setCreatePlaylistLoadingState(true);

    try {
        // Create a new playlist via the backend endpoint.
        const url = `${API_BASE_URL}/playlists/new?name=${encodeURIComponent(name)}&category=${encodeURIComponent(cat)}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            const newPlaylist = await response.json();
            const isCreateAndAdd = Boolean(currentItemToAdd.data);
            if (!isCreateAndAdd) {
                showToast(`Playlist "${name}" created!`, "success");
            }
            closeCreatePlaylist();

            if (isCreateAndAdd) {
                confirmAddToPlaylist(newPlaylist.id, newPlaylist.name, {
                    successMessage: "Playlist created and item added.",
                    restoreSearchResults: true
                });
            } else {
                fetchPlaylists();
            }
        } else {
            const errorData = await response.json();
            showToast(errorData.detail || "Failed to create playlist.", "error");
        }
    } catch (error) {
        showToast("Network error creating playlist.", "error");
    } finally {
        setCreatePlaylistLoadingState(false);
    }
}

async function fetchPlaylists() {
    // Fetch all playlists for authenticated user and refresh UI filters/grid.
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
            setupCreatePlaylistCategoryInput();
        } else {
            showToast("Failed to load playlists.", "error");
        }
    } catch (error) {
        console.error("Error fetching playlists:", error);
        showToast("Network error while fetching playlists.", "error");
    }
}

function renderPlaylists(searchTerm = "", categoryFilter = "") {
    // Render playlist cards after applying local text/category filtering.
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
                <button class=\"btn-delete-playlist-card\" onclick=\"handleDeletePlaylist(event, ${playlist.id}, '${playlist.name}')\" title=\"Delete playlist\">&times;</button>
                <div>
                    <h4>${playlist.name}</h4>
                    <p>${playlist.category || "Uncategorized"}</p>
                </div>
            </div>
        `;
    });
}

async function handleDeletePlaylist(event, playlistId, playlistName) {
    //Delete playlist after from a saved library view after confirming with the user.

    event.stopPropagation();
    const confirmed = window.confirm(`Delete playlist "${playlistName}"? This cannot be undone.`);
    if (!confirmed) return;

    const token = localStorage.getItem("access_token");
    // Send a delete request to the backend to remove the playlist.
    try {
        const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        // If response from backend is not ok, Display error message.
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to delete playlist.");
        }

        myPlaylists = myPlaylists.filter((playlist) => playlist.id !== playlistId);
        renderPlaylists();
        populateCategoryFilter();
        setupCreatePlaylistCategoryInput();
        showToast("Playlist deleted.", "success");
    } catch (error) {
        showToast(error.message || "Failed to delete playlist.", "error");
    }
}

function populateCategoryFilter() {
    // Rebuild category dropdown from unique playlist categories.
    const filterSelect = document.getElementById("playlist-category-filter");

    const uniqueCategories = [...new Set(myPlaylists.map((p) => p.category).filter(Boolean))];

    filterSelect.innerHTML = '<option value="">All Categories</option>';

    uniqueCategories.forEach((category) => {
        filterSelect.innerHTML += `<option value=\"${category}\">${category}</option>`;
    });
}

async function openAddToPlaylistModal(event, type, id) {
    // Prevent parent card click action when opening this modal.
    event.stopPropagation();

    const token = localStorage.getItem("access_token");
    if (!token) {
        showToast("Please login to save items!", "error");
        openAuth("login");
        return;
    }

    // Store current item context so confirm step can build API payload.
    if (type === "video") {
        currentItemToAdd = { type: "video", data: allVideos.find((v) => v.video_id === id) };
    } else {
        currentItemToAdd = { type: "repo", data: allRepos.find((r) => r.repo_url === id) };
    }

    // Seed modal list with create-new option, then append existing playlists.
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

function closeAddToPlaylistModal(keepSelection = false) {
    // Close modal and clear temporary selected-item state.
    const modal = document.getElementById("add-to-playlist-modal");
    modal.classList.remove("show");
    setTimeout(() => modal.classList.add("hidden"), 300);
    if (!keepSelection) {
        currentItemToAdd = { type: null, data: null };
    }
}

async function confirmAddToPlaylist(playlistId, playlistName, options = {}) {
    // check we have the necessary item data from the search context before attempting to build API payload.
    if (!currentItemToAdd.data) return;

    const token = localStorage.getItem("access_token");
    let endpoint = "";
    let payload = {};

    // Build endpoint and payload schema based on selected item type.
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

    if (options.restoreSearchResults && typeof restoreSearchResultsView === "function") {
        restoreSearchResultsView();
    }

    try {
        // Persist selected item into target playlist.
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const successMessage = options.successMessage || `Added to "${playlistName}"!`;
            showToast(successMessage, "success");
            closeAddToPlaylistModal();
        } else {
            const errorData = await response.json();
            showToast(errorData.detail || "Failed to add item.", "error");
        }
    } catch (error) {
        console.error("Error adding to playlist:", error);
        showToast("Network error.", "error");
    } finally {
        if (options.restoreSearchResults && typeof renderCurrentPage === "function") {
            renderCurrentPage();
        }
    }
}

function restoreSearchResultsView() {
    //After adding item to playlist from search results, maintain the search results view instead of navigating back to the playlist grid.

    const resultsSection = document.getElementById("results-section");
    const videosContainer = document.getElementById("videos-container");
    const reposContainer = document.getElementById("repos-container");
    const videosTabBtn = document.getElementById("tab-videos");
    const reposTabBtn = document.getElementById("tab-repos");

    if (!resultsSection || !videosContainer || !reposContainer) return;

    resultsSection.classList.remove("hidden");

    // Display content of the active tab from where the user initiated the add-to-playlist action.
    if (activeTab === "repos") {
        reposContainer.classList.remove("hidden");
        videosContainer.classList.add("hidden");
        if (reposTabBtn) reposTabBtn.classList.add("active");
        if (videosTabBtn) videosTabBtn.classList.remove("active");
    } else {
        videosContainer.classList.remove("hidden");
        reposContainer.classList.add("hidden");
        if (videosTabBtn) videosTabBtn.classList.add("active");
        if (reposTabBtn) reposTabBtn.classList.remove("active");
    }
}

async function openPlaylistDetail(playlistId) {
    // Ensure we have a valid auth token before loading user playlist content.
    const token = localStorage.getItem("access_token");
    if (!token || token === "null" || token === "undefined") {
        console.error("Token is invalid or missing. Redirecting...");
        openAuth("login");
        return;
    }

    // Switch view and render temporary loading state.
    switchAppView("playlist-detail");
    document.getElementById("detail-videos-container").innerHTML = "<p>Loading playlist...</p>";
    document.getElementById("detail-repos-container").innerHTML = "";

    try {
        // Fetch playlist with embedded videos and repositories.
        const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            // Update header and item counts from loaded playlist payload.
            currentDetailedPlaylist = await response.json();

            document.getElementById("detail-playlist-name").innerText = currentDetailedPlaylist.name;
            document.getElementById("detail-playlist-category").innerText = currentDetailedPlaylist.category || "General";

            const vCount = currentDetailedPlaylist.videos ? currentDetailedPlaylist.videos.length : 0;
            const rCount = currentDetailedPlaylist.repos ? currentDetailedPlaylist.repos.length : 0;

            document.getElementById("count-videos").innerText = vCount;
            document.getElementById("count-repos").innerText = rCount;

            // Render both tabs, then default to the videos tab.
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

async function handleDeleteCurrentPlaylist() {
    // Delete playlist from with in the detail view.

    if (!currentDetailedPlaylist) return;
    const confirmed = window.confirm(`Delete playlist "${currentDetailedPlaylist.name}"? This cannot be undone.`);
    if (!confirmed) return;

    const token = localStorage.getItem("access_token");

    // Send a delete request to the backend to remove the playlist.
    try {
        const response = await fetch(`${API_BASE_URL}/playlists/${currentDetailedPlaylist.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to delete playlist.");
        }

        showToast("Playlist deleted.", "success");
        currentDetailedPlaylist = null;
        switchAppView("playlists");
        await fetchPlaylists();
    } catch (error) {
        // if deletion fails as a result of any backend error, stay on detail view and show error message.
        showToast(error.message || "Failed to delete playlist.", "error");
    }
}

function switchDetailTab(tab) {
    // Toggle active styling and visibility for detail sub-tabs.
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
    // Render saved videos for the selected playlist detail view.
    const container = document.getElementById("detail-videos-container");
    container.innerHTML = "";

    if (videos.length === 0) {
        container.innerHTML = "<p style='color:#94a3b8;'>No videos saved in this playlist yet.</p>";
        return;
    }

    videos.forEach((video) => {
        container.innerHTML += `
            <div class=\"result-item video-card\" onclick=\"openVideo('${video.youtube_video_id}')\" style=\"cursor:pointer; position: relative;\">
                <button class=\"btn-remove-item\" onclick=\"handleRemoveVideoFromPlaylist(event, ${video.id})\" title=\"Remove video\">&times;</button>
                <img src=\"${video.thumbnail}\" alt=\"thumb\">
                <div class=\"info\">
                    <h4>${video.title}</h4>
                    <p class=\"channel\">${video.channel || "YouTube"}</p>
                </div>
            </div>`;
    });
}

async function handleRemoveVideoFromPlaylist(event, videoId) {
    // Remove a single video from a playlist.

    event.stopPropagation();
    if (!currentDetailedPlaylist) return;

    // Confirm with the user before removing the video from the playlist. 
    const confirmed = window.confirm("Remove this video from the playlist?");
    if (!confirmed) return;

    const token = localStorage.getItem("access_token");

    // Send a delete request to the backend to remove the video from the playlist.
    try {
        const response = await fetch(`${API_BASE_URL}/playlists/${currentDetailedPlaylist.id}/videos/${videoId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to remove video.");
        }

        currentDetailedPlaylist.videos = currentDetailedPlaylist.videos.filter((video) => video.id !== videoId);
        document.getElementById("count-videos").innerText = currentDetailedPlaylist.videos.length;
        renderDetailVideos(currentDetailedPlaylist.videos || []);
        showToast("Video removed.", "success");
    } catch (error) {
        showToast(error.message || "Failed to remove video.", "error");
    }
}

function renderDetailRepos(repos) {
    // Render saved repositories for the selected playlist detail view.
    const container = document.getElementById("detail-repos-container");
    container.innerHTML = "";

    if (repos.length === 0) {
        container.innerHTML = "<p style='color:#94a3b8;'>No repositories saved in this playlist yet.</p>";
        return;
    }

    repos.forEach((repo) => {
        container.innerHTML += `
            <div class=\"result-item repo-card\" onclick=\"openRepo('${repo.repo_url}')\" style=\"cursor:pointer; position: relative;\">
                <button class=\"btn-remove-item\" onclick=\"handleRemoveRepoFromPlaylist(event, ${repo.id})\" title=\"Remove repository\">&times;</button>
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

async function handleRemoveRepoFromPlaylist(event, repoId) {
    // Remove a single repository from a playlist.

    
    event.stopPropagation();
    if (!currentDetailedPlaylist) return;
    //Confirm with the user before removing the repository from the playlist.
    const confirmed = window.confirm("Remove this repository from the playlist?");
    if (!confirmed) return;

    const token = localStorage.getItem("access_token");
    // Send a delete request to the backend to remove the repository from the playlist.
    try {
        const response = await fetch(`${API_BASE_URL}/playlists/${currentDetailedPlaylist.id}/repositories/${repoId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to remove repository.");
        }

        currentDetailedPlaylist.repos = currentDetailedPlaylist.repos.filter((repo) => repo.id !== repoId);
        document.getElementById("count-repos").innerText = currentDetailedPlaylist.repos.length;
        renderDetailRepos(currentDetailedPlaylist.repos || []);
        showToast("Repository removed.", "success");
    } catch (error) {
        showToast(error.message || "Failed to remove repository.", "error");
    }
}
