function openAuth(type) {
    const modal = document.getElementById("auth-modal");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    modal.classList.remove("hidden");

    if (type === "login") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
    }
}

window.onclick = function(event) {
    const modal = document.getElementById("auth-modal");
    if (event.target == modal) {
        closeAuth();
    }
};

function closeAuth() {
    document.getElementById("auth-modal").classList.add("hidden");
}