document.addEventListener("DOMContentLoaded", () => {
    updateNavbarUI();
    const playlistSearch = document.getElementById("playlist-search");
    const categoryFilter = document.getElementById("playlist-category-filter");

    if (playlistSearch) {
        playlistSearch.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                handleLibrarySearch();
            }
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener("change", () => {
            const query = playlistSearch ? playlistSearch.value.trim() : "";
            if (query) {
                handleLibrarySearch();
            } else {
                const resultsSection = document.getElementById("library-results");
                const playlistsGrid = document.getElementById("playlists-grid");
                const clearBtn = document.getElementById("clear-library-search");
                if (resultsSection && playlistsGrid) {
                    resultsSection.classList.add("hidden");
                    playlistsGrid.classList.remove("hidden");
                }
                if (clearBtn) {
                    clearBtn.classList.add("hidden");
                }
                renderPlaylists("", categoryFilter.value);
            }
        });
    }
});

window.onclick = function(event) {
    const authModal = document.getElementById("auth-modal");
    const createPlaylistModal = document.getElementById("create-playlist-modal");
    const videoModal = document.getElementById("video-modal");
    const addPlaylistModal = document.getElementById("add-to-playlist-modal");

    if (event.target === authModal) {
        closeAuth();
    }
    if (event.target === createPlaylistModal) {
        closeCreatePlaylist();
    }
    if (event.target === videoModal) {
        closeVideo();
    }
    if (event.target === addPlaylistModal) {
        closeAddToPlaylistModal();
    }
};
