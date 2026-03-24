function getPlaylistImage(playlistId) {
    // Generate a consistent random image for each playlist from assets/.
    const imageNumber = (playlistId % 7) + 1;
    return `assets/${imageNumber}.jpg`;
}

function formatViews(num) {
    // Convert large numbers into human-readable units to be used in view counts.
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num;
}

function escapeHtml(value) {
    // Escape dangerous characters to prevent HTML/script injection when rendering text.
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function highlightMatch(text, query) {
    // Return plain escaped text if there is no active query.
    if (!query) return escapeHtml(text || "");
    // Escape both source text and query pattern before regex replacement.
    const safeText = escapeHtml(text || "");
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return safeText.replace(regex, "<mark class=\"highlight\">$1</mark>");
}

function setClearSearchVisible(isVisible) {
    // Toggle visibility of the library clear-search button.
    const clearBtn = document.getElementById("clear-library-search");
    if (!clearBtn) return;
    if (isVisible) {
        clearBtn.classList.remove("hidden");
    } else {
        clearBtn.classList.add("hidden");
    }
}
