document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.querySelector('form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Login successful
                console.log("Logged in!", data);

                // Save JWT token for staying logged in
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect after login (adjust as needed)
                window.location.href = '/booking';
            } else {
                // Login failed
                alert(data.message || "Invalid email or password");
            }
        } catch (err) {
            console.error("Login error:", err);
            alert("An error occurred. Please try again later.");
        }
    });
});
