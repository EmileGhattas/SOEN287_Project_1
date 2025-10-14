// Get form and inputs
const loginForm = document.querySelector('form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

loginForm.addEventListener('submit', function(e) {
    e.preventDefault(); // stop form from submitting normally

    const email = emailInput.value;
    const password = passwordInput.value;

    // Get users from LocalStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // Find user that matches email and password
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        alert(`Welcome back, ${user.username || 'user'}!`);
        // Redirect to main page
        window.location.href = '../mainpage.html'; // adjust path
    } else {
        alert('Invalid email or password');
    }
});
