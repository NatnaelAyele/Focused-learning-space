function openAuth(type) {
    const modal = document.getElementById("auth-modal");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const errorDisplay = document.getElementById("auth-error");

    if (errorDisplay) {
        errorDisplay.style.display = "none";
        errorDisplay.innerText = "";
    }

    modal.classList.remove("hidden");
    modal.classList.add("show");

    if (type === "login") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
    }
}

function closeAuth() {
    const modal = document.getElementById("auth-modal");
    modal.classList.remove("show");
    setTimeout(() => {
        modal.classList.add("hidden");
        clearAuthForms();
    }, 300);
}

async function handleRegister() {
    const username = document.getElementById("reg-username").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const errorDisplay = document.getElementById("auth-error");

    errorDisplay.style.display = "none";

    if (!username || !email || !password) {
        errorDisplay.innerText = "Please fill in all fields.";
        errorDisplay.style.display = "block";
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Registration failed");
        }

        showToast("Registration successful! Please log in.", "success");
        clearAuthForms();
        openAuth("login");
    } catch (error) {
        errorDisplay.innerText = error.message;
        errorDisplay.style.display = "block";
    }
}

async function handleLogin() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const errorDisplay = document.getElementById("auth-error");

    errorDisplay.style.display = "none";

    if (!username || !password) {
        errorDisplay.innerText = "Please enter username and password.";
        errorDisplay.style.display = "block";
        return;
    }

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Login failed");
        }

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("username", username);

        closeAuth();
        updateNavbarUI();

        showToast(`Welcome back, ${username}!`, "success");
    } catch (error) {
        errorDisplay.innerText = error.message;
        errorDisplay.style.display = "block";
    }
}

function updateNavbarUI() {
    const token = localStorage.getItem("access_token");
    const username = localStorage.getItem("username");
    const navButtons = document.querySelector(".navbar div");

    if (token) {
        navButtons.innerHTML = `
            <button onclick=\"switchAppView('playlists')\">Playlists</button>
            <span style=\"margin-right: 15px; margin-left: 15px; color: #cbd5e1;\">Hi, ${username}</span>
            <button onclick=\"handleLogout()\">Logout</button>
        `;
    } else {
        navButtons.innerHTML = `
            <button onclick=\"switchAppView('playlists')\">Playlists</button>
            <button onclick=\"openAuth('login')\" style=\"margin-left: 15px;\">Login</button>
            <button class=\"primary\" onclick=\"openAuth('register')\">Get Started</button>
        `;
    }
}

function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    updateNavbarUI();

    showToast("You have been logged out.", "success");
}

function clearAuthForms() {
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
    document.getElementById("reg-username").value = "";
    document.getElementById("reg-email").value = "";
    document.getElementById("reg-password").value = "";

    const errorDisplay = document.getElementById("auth-error");
    if (errorDisplay) {
        errorDisplay.style.display = "none";
        errorDisplay.innerText = "";
    }
}
