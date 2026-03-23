function getPlaylistImage(playlistId) {
    const imageNumber = (playlistId % 7) + 1;
    return `assets/${imageNumber}.jpg`;
}

function formatViews(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function highlightMatch(text, query) {
    if (!query) return escapeHtml(text || "");
    const safeText = escapeHtml(text || "");
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    return safeText.replace(regex, "<mark class=\"highlight\">$1</mark>");
}

function setClearSearchVisible(isVisible) {
    const clearBtn = document.getElementById("clear-library-search");
    if (!clearBtn) return;
    if (isVisible) {
        clearBtn.classList.remove("hidden");
    } else {
        clearBtn.classList.add("hidden");
    }
}
