function openVideo(videoId) {
    // Open modal and start autoplay for selected video.
    const modal = document.getElementById("video-modal");
    const player = document.getElementById("video-player");

    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeVideo() {
    // Hide modal first, then clear iframe src to stop playback.
    const modal = document.getElementById("video-modal");
    const player = document.getElementById("video-player");
    modal.classList.remove("show");

    setTimeout(() => {
        player.src = "";
        document.body.style.overflow = "auto";
    }, 300);
}

window.addEventListener("click", (event) => {
    // Close video when user clicks outside the player container.
    const modal = document.getElementById("video-modal");
    if (event.target === modal) {
        closeVideo();
    }
});

window.addEventListener("keydown", (event) => {
    // Allow keyboard users to close modal with Escape.
    if (event.key === "Escape") {
        closeVideo();
    }
});

function openRepo(url) {
    // Open repository in a safe new tab (no opener access).
    if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
    } else {
        showToast("Repository URL not found.", "error");
    }
}
