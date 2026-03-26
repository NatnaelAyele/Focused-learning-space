function openAuth(type) {
    // shows the authentication modal for both login and registration flows, with the appropriate message and fields.
    
    const modal = document.getElementById("auth-modal");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const errorDisplay = document.getElementById("auth-error");

    // Remove any existing error messages from the modal.
    if (errorDisplay) {
        errorDisplay.style.display = "none";
        errorDisplay.innerText = "";
    }

    modal.classList.remove("hidden");
    modal.classList.add("show");

    // Show only the requested form (login/register) within the modal.
    if (type === "login") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
    } else {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
    }
}

function closeAuth() {
    // close the authentication modals.
    const modal = document.getElementById("auth-modal");
    // Run close animation, then hide and reset form fields.
    modal.classList.remove("show");
    setTimeout(() => {
        modal.classList.add("hidden");
        clearAuthForms();
        setAuthLoadingState(false, "login");
        setAuthLoadingState(false, "register");
    }, 300);
}

function setAuthLoadingState(isLoading, mode) {
    const loginButton = document.getElementById("login-submit");
    const registerButton = document.getElementById("register-submit");

    if (mode === "login" && loginButton) {
        loginButton.disabled = isLoading;
        loginButton.innerText = isLoading ? "Logging in..." : "Login";
    }

    if (mode === "register" && registerButton) {
        registerButton.disabled = isLoading;
        registerButton.innerText = isLoading ? "Creating..." : "Create account";
    }
}

async function handleRegister() {
    // read form fields from refistration modal, validate inputs and submit registered user to backend.
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

    setAuthLoadingState(true, "register");

    // Submit registration payload to backend.
    try {
        const result = await fetchJson(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        if (!result.ok) {
            throw new Error(result.error || "Registration failed");
        }

        // redirect user to login modal after successful registration.
        showToast("Registration successful! Please log in.", "success");
        clearAuthForms();
        openAuth("login");
    } catch (error) {
        errorDisplay.innerText = error.message;
        errorDisplay.style.display = "block";
    } finally {
        setAuthLoadingState(false, "register");
    }
}

async function handleLogin() {
    // Validate login credentials and give access token on successful login.
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const errorDisplay = document.getElementById("auth-error");

    errorDisplay.style.display = "none";

    if (!username || !password) {
        errorDisplay.innerText = "Please enter username and password.";
        errorDisplay.style.display = "block";
        return;
    }

    setAuthLoadingState(true, "login");

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    // Check login credentials; if valid, store the access token and refresh navbar state.
    try {
        const result = await fetchJson(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        });

        // If login fails, show error message.
        if (!result.ok) {
            throw new Error(result.error || "Login failed");
        }

        localStorage.setItem("access_token", result.data.access_token);
        localStorage.setItem("username", username);

        closeAuth();
        updateNavbarUI();

        showToast(`Welcome back, ${username}!`, "success");
    } catch (error) {
        errorDisplay.innerText = error.message;
        errorDisplay.style.display = "block";
    } finally {
        setAuthLoadingState(false, "login");
    }
}

function updateNavbarUI() {
    // Render navbar based on authentication state.
    const token = localStorage.getItem("access_token");
    const username = localStorage.getItem("username");
    const navButtons = document.querySelector(".navbar div");

    // if user is authenticated, show playlists and logout options; otherwise, show login/register buttons.
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
    // Clear persisted authentication state and refresh navbar.
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    updateNavbarUI();

    showToast("You have been logged out.", "success");
}

function clearAuthForms() {
    // Reset all authentication form inputs and hide any error message.
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
