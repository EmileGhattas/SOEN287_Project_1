// Get form and inputs
const loginForm = document.querySelector('form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

loginForm.addEventListener('submit', function(e) {
    e.preventDefault(); 

    const email = emailInput.value;
    const password = passwordInput.value;

    // Get users from LocalStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // Find user that matches email and password
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        alert(`Welcome back, ${user.username || 'user'}!`);
        // Save logged-in user to localStorage
        localStorage.setItem('user', JSON.stringify(user));
        // Redirect to main page
        window.location.href = '../MainPage/index.html'; 
    } else {
        alert('Invalid email or password');
    }
});
