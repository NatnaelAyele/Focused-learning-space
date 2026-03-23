function openVideo(videoId) {
    const modal = document.getElementById("video-modal");
    const player = document.getElementById("video-player");

    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function closeVideo() {
    const modal = document.getElementById("video-modal");
    const player = document.getElementById("video-player");
    modal.classList.remove("show");

    setTimeout(() => {
        player.src = "";
        document.body.style.overflow = "auto";
    }, 300);
}

window.addEventListener("click", (event) => {
    const modal = document.getElementById("video-modal");
    if (event.target === modal) {
        closeVideo();
    }
});

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeVideo();
    }
});

function openRepo(url) {
    if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
    } else {
        showToast("Repository URL not found.", "error");
    }
}
