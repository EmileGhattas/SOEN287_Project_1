document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('signinForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageBox = document.getElementById('formMessage');
    const submitBtn = document.getElementById('submitbtn');

    function showMessage(text, type = 'error') {
        if (!messageBox) return alert(text);
        messageBox.textContent = text;
        messageBox.classList.remove('error', 'success');
        messageBox.classList.add(type);
        messageBox.style.display = text ? 'block' : 'none';
    }

    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        showMessage('', 'success');

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showMessage('Please enter both email and password.');
            return;
        }

        submitBtn.disabled = true;

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                const isAdmin = Boolean(data?.user?.is_admin ?? data?.user?.admin ?? data?.user?.isadmin);
                const normalizedUser = { ...data.user, is_admin: isAdmin };
                delete normalizedUser.admin;
                delete normalizedUser.isadmin;

                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(normalizedUser));

                const adminPage = window.location.pathname.includes('adminsignin');
                if (adminPage && !isAdmin) {
                    showMessage('Admin access required for this area.', 'error');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    submitBtn.disabled = false;
                    return;
                }

                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    if (isAdmin) {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/';
                    }
                }, 350);
            } else {
                showMessage(data.message || "Invalid email or password.");
            }
        } catch (err) {
            console.error("Login error:", err);
            showMessage("An error occurred. Please try again later.");
        } finally {
            submitBtn.disabled = false;
        }
    });
});
