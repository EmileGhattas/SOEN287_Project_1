// landing.js
document.addEventListener("DOMContentLoaded", () => {
  const profileLink = document.getElementById("profileLink");
  const profileMenu = document.getElementById("profileMenu");

  function updateProfileMenu() {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user) {
      // User is logged in
      profileLink.textContent = "Profile";
      profileLink.setAttribute("href", "#");
      profileMenu.innerHTML = `
        <li><a href="settings.html">Settings</a></li>
        <li><a href="#" id="logout">Logout</a></li>
      `;

      document.getElementById("logout").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("user");
        localStorage.removeItem("pendingBooking");
        updateProfileMenu(); // Update menu after logout
        window.location.href = "../../auth/html/signin.html";
      });
    } else {
      // User is not logged in
      profileLink.textContent = "Log In";
      profileLink.setAttribute("href", "../Sign in/signin.html");
      profileMenu.innerHTML = `
        <li><a href="../../auth/html/signin.html">Sign In</a></li>
        <li><a href="../../auth/html/signup.html">Sign Up</a></li>
      `;
    }
  }

  updateProfileMenu();
});
