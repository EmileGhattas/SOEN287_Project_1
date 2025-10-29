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

        const pending = JSON.parse(localStorage.getItem("pendingBooking"));
        if (pending) {
            const user = JSON.parse(localStorage.getItem("loggedInUser"));
            const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');

            // Weekly limit check again
            const startWeek = new Date(pending.date);
            startWeek.setDate(startWeek.getDate() - startWeek.getDay());
            const endWeek = new Date(startWeek);
            endWeek.setDate(startWeek.getDate() + 6);

            const userWeeklyBookings = bookings.filter(b =>
                b.user === user.username &&
                new Date(b.date) >= startWeek &&
                new Date(b.date) <= endWeek
            );

            if (userWeeklyBookings.length >= 2) {
                alert("You already have 2 bookings this week. Pending booking was not saved.");
                localStorage.removeItem("pendingBooking");
            } else {
                pending.user = user.username;
                bookings.push(pending);
                localStorage.setItem("bookings", JSON.stringify(bookings));
                localStorage.removeItem("pendingBooking");
                alert("Your pending booking has been successfully saved!");
            }
        }

        // Redirect to main page
        window.location.href = '../MainPage/index.html'; 
    } else {
        alert('Invalid email or password');
    }
});
