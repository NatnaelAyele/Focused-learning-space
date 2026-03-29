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

function isOffline() {
    // Guard against non-browser contexts and use navigator online flag.
    return typeof navigator !== "undefined" && navigator && navigator.onLine === false;
}

async function fetchJson(url, options = {}, config = {}) {
    // Support simple timeout/retry config on top of fetch.
    const timeoutMs = config.timeoutMs || 10000;
    const retries = config.retries || 0;
    const controller = new AbortController();
    const attemptFetch = async () => {
        // Abort the request if it exceeds the timeout.
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            let data = null;
            try {
                // Attempt to parse JSON, but allow empty/invalid bodies.
                data = await response.json();
            } catch (error) {
                data = null;
            }

            if (!response.ok) {
                return {
                    ok: false,
                    status: response.status,
                    data,
                    error: (data && (data.detail || data.message)) || `Request failed (${response.status}).`
                };
            }

            return { ok: true, status: response.status, data };
        } catch (error) {
            clearTimeout(timeoutId);
            return { ok: false, status: 0, data: null, error: "Network error." };
        }
    };

    let result = await attemptFetch();
    let attempts = 0;
    while (!result.ok && attempts < retries) {
        attempts += 1;
        result = await attemptFetch();
    }

    // Override generic error when the browser reports offline state.
    if (!result.ok && isOffline()) {
        result.error = "You appear to be offline.";
    }

    return result;
}
