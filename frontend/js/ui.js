function showToast(message, type = "success") {
    // Reuse one toast container for all notifications.
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    // Create and append a new toast element.
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    // Dismiss after a short delay with exit animation.
    setTimeout(() => {
        toast.style.animation = "fadeOutUp 0.3s forwards ease-in";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}
