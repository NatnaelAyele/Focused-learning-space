let categoryPieChart = null;

function showAnalyticsSection(event) {
    if (event) event.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) {
        showToast("Please login to view analytics.", "error");
        openAuth("login");
        return;
    }

    switchAppView("analytics");
}

function setAnalyticsLoading(isLoading) {
    const loadingEl = document.getElementById("analytics-loading");
    const chartWrapper = document.querySelector(".analytics-chart-wrapper");
    const emptyEl = document.getElementById("analytics-empty");

    if (loadingEl) loadingEl.classList.toggle("hidden", !isLoading);
    if (chartWrapper) chartWrapper.classList.toggle("hidden", isLoading);
    if (emptyEl) emptyEl.classList.add("hidden");
}

async function loadVideoCategoryAnalytics() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setAnalyticsLoading(true);

    try {
        const result = await fetchJson(
            `${API_BASE_URL}/analytics/videos/categories`,
            { headers: { Authorization: `Bearer ${token}` } },
            { timeoutMs: 10000 }
        );

        if (!result.ok) {
            showToast(result.error || "Failed to load analytics.", "error");
            return;
        }

        const data = result.data || {};
        const breakdown = data.by_category || [];
        const total = data.total_videos || 0;

        updateAnalyticsTotal(total);

        if (!breakdown.length) {
            showEmptyAnalytics();
            destroyCategoryChart();
            return;
        }

        renderCategoryPieChart(breakdown);
    } catch (error) {
        showToast("Network error while loading analytics.", "error");
    } finally {
        setAnalyticsLoading(false);
    }
}

function updateAnalyticsTotal(total) {
    const totalEl = document.getElementById("analytics-total");
    if (totalEl) {
        totalEl.textContent = `${total} ${total === 1 ? "video" : "videos"}`;
    }
}

function showEmptyAnalytics() {
    const emptyEl = document.getElementById("analytics-empty");
    const chartWrapper = document.querySelector(".analytics-chart-wrapper");
    if (emptyEl) emptyEl.classList.remove("hidden");
    if (chartWrapper) chartWrapper.classList.add("hidden");
}

function destroyCategoryChart() {
    if (categoryPieChart) {
        categoryPieChart.destroy();
        categoryPieChart = null;
    }
    const legend = document.getElementById("analytics-legend");
    if (legend) legend.innerHTML = "";
}

function renderCategoryPieChart(breakdown) {
    const ctx = document.getElementById("category-pie-chart");
    const legend = document.getElementById("analytics-legend");
    if (!ctx || !legend || typeof Chart === "undefined") return;

    destroyCategoryChart();

    const labels = breakdown.map((item) => item.category || "Uncategorized");
    const counts = breakdown.map((item) => item.count || 0);

    const colors = [
        "#60a5fa",
        "#a78bfa",
        "#22d3ee",
        "#f59e0b",
        "#34d399",
        "#f97316",
        "#ef4444"
    ];

    categoryPieChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [
                {
                    data: counts,
                    backgroundColor: labels.map((_, idx) => colors[idx % colors.length]),
                    borderWidth: 0
                }
            ]
        },
        options: {
            plugins: {
                legend: { display: false }
            }
        }
    });

    legend.innerHTML = labels
        .map((label, idx) => {
            const color = colors[idx % colors.length];
            const count = counts[idx];
            return `
                <div class="legend-item">
                    <span class="legend-swatch" style="background:${color}"></span>
                    <div>
                        <strong>${label}</strong>
                        <div style="color:#cbd5e1; font-size:13px;">${count} ${count === 1 ? "video" : "videos"}</div>
                    </div>
                </div>`;
        })
        .join("");
}
