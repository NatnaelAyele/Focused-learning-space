function setLibraryLoadingState() {
    // Reuse one loading block for all three grouped search sections.
    const loadingHtml = `<div class=\"loading-container\"><span class=\"loader\"></span><p>Searching library...</p></div>`;
    document.getElementById("library-playlists-results").innerHTML = loadingHtml;
    document.getElementById("library-videos-results").innerHTML = loadingHtml;
    document.getElementById("library-repos-results").innerHTML = loadingHtml;
}

function renderLibraryResults(data, query) {
    // Resolve section containers for grouped result presentation.
    const playlistContainer = document.getElementById("library-playlists-results");
    const videoContainer = document.getElementById("library-videos-results");
    const repoContainer = document.getElementById("library-repos-results");

    // Normalize payload shape and update section counters.
    const playlists = data.playlists || [];
    const videos = data.videos || [];
    const repos = data.repos || [];

    document.getElementById("library-count-playlists").innerText = playlists.length;
    document.getElementById("library-count-videos").innerText = videos.length;
    document.getElementById("library-count-repos").innerText = repos.length;

    // Clear previous render before appending new cards.
    playlistContainer.innerHTML = "";
    videoContainer.innerHTML = "";
    repoContainer.innerHTML = "";

    // playlist matches.
    if (playlists.length === 0) {
        playlistContainer.innerHTML = "<p style='color:#94a3b8;'>No matching playlists.</p>";
    } else {
        playlists.forEach((playlist) => {
            const imageSrc = getPlaylistImage(playlist.id);
            playlistContainer.innerHTML += `
                <div class=\"playlist-card\" onclick=\"openPlaylistDetail(${playlist.id})\" style=\"cursor: pointer;\">
                    <img src=\"${imageSrc}\" alt=\"${playlist.name}\">
                    <div>
                        <h4>${highlightMatch(playlist.name, query)}</h4>
                        <p>${playlist.category || "Uncategorized"}</p>
                    </div>
                </div>
            `;
        });
    }

    // video matches, each with parent playlist context.
    if (videos.length === 0) {
        videoContainer.innerHTML = "<p style='color:#94a3b8;'>No matching videos.</p>";
    } else {
        videos.forEach((video) => {
            videoContainer.innerHTML += `
                <div class=\"result-item video-card\" onclick=\"openVideo('${video.youtube_video_id}')\" style=\"cursor:pointer; position: relative;\">
                    <img src=\"${video.thumbnail || ""}\" alt=\"thumb\">
                    <div class=\"info\">
                        <h4>${highlightMatch(video.title, query)}</h4>
                        <p class=\"channel\">${video.channel || "YouTube"}</p>
                        <p class=\"parent-link\">In: <span onclick=\"event.stopPropagation(); openPlaylistDetail(${video.playlist_id})\">${video.playlist_name}</span></p>
                    </div>
                </div>
            `;
        });
    }

    // repository matches, each with parent playlist context.
    if (repos.length === 0) {
        repoContainer.innerHTML = "<p style='color:#94a3b8;'>No matching repositories.</p>";
    } else {
        repos.forEach((repo) => {
            repoContainer.innerHTML += `
                <div class=\"result-item repo-card\" onclick=\"openRepo('${repo.repo_url}')\" style=\"cursor:pointer; position: relative;\">
                    <div class=\"repo-title-wrapper\">
                        <h4><span class=\"repo-title\">${highlightMatch(repo.name, query)}</span></h4>
                    </div>
                    <div class=\"repo-meta\">
                        <span>👤 ${repo.owner || "Unknown"}</span>
                        <span>⭐ ${repo.stars || 0}</span>
                    </div>
                    <p>${highlightMatch(repo.description || "No description", query)}</p>
                    <p class=\"parent-link\">In: <span onclick=\"event.stopPropagation(); openPlaylistDetail(${repo.playlist_id})\">${repo.playlist_name}</span></p>
                </div>
            `;
        });
    }
}

async function handleLibrarySearch() {
    // Read library query and category filter values.
    const queryInput = document.getElementById("playlist-search");
    const categoryFilter = document.getElementById("playlist-category-filter");
    const query = queryInput ? queryInput.value.trim() : "";
    const category = categoryFilter ? categoryFilter.value : "";
    const resultsSection = document.getElementById("library-results");
    const playlistsGrid = document.getElementById("playlists-grid");

    // Empty query restores normal playlist grid view.
    if (!query) {
        resultsSection.classList.add("hidden");
        playlistsGrid.classList.remove("hidden");
        setClearSearchVisible(false);
        renderPlaylists("", category);
        return;
    }

    // Require authentication before searching user-owned saved items.
    const token = localStorage.getItem("access_token");
    if (!token) {
        showToast("Please login to search your library.", "error");
        openAuth("login");
        return;
    }

    // Show grouped-result view and loading placeholders.
    resultsSection.classList.remove("hidden");
    playlistsGrid.classList.add("hidden");
    setClearSearchVisible(true);
    setLibraryLoadingState();

    // Build backend endpoint with optional category narrowing.
    const url = `${API_BASE_URL}/library/search?query=${encodeURIComponent(query)}${category ? `&category=${encodeURIComponent(category)}` : ""}`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Failed to search library.");
        }

        // Render grouped results with text highlighting.
        const data = await response.json();
        renderLibraryResults(data, query);
    } catch (error) {
        // Show section-level fallback messages if request fails.
        console.error("Library search error:", error);
        document.getElementById("library-playlists-results").innerHTML = "<p>Failed to load results.</p>";
        document.getElementById("library-videos-results").innerHTML = "<p>Failed to load results.</p>";
        document.getElementById("library-repos-results").innerHTML = "<p>Failed to load results.</p>";
    }
}

function clearLibrarySearch() {
    // Reset query input and switch back to default playlist grid UI.
    const queryInput = document.getElementById("playlist-search");
    const categoryFilter = document.getElementById("playlist-category-filter");
    const resultsSection = document.getElementById("library-results");
    const playlistsGrid = document.getElementById("playlists-grid");

    if (queryInput) {
        queryInput.value = "";
    }

    if (resultsSection && playlistsGrid) {
        resultsSection.classList.add("hidden");
        playlistsGrid.classList.remove("hidden");
    }

    setClearSearchVisible(false);
    renderPlaylists("", categoryFilter ? categoryFilter.value : "");
}
