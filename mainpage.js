// mainpage.js
document.addEventListener("DOMContentLoaded", () => {
  const profileLink = document.getElementById("profileLink");
  const profileMenu = document.getElementById("profileMenu");

  function updateProfileMenu() {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user) {
      // User is logged in
      profileLink.textContent = "Profile";
      profileMenu.innerHTML = `
        <li><a href="settings.html">Settings</a></li>
        <li><a href="#" id="logout">Logout</a></li>
      `;

      document.getElementById("logout").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("user");
        updateProfileMenu(); // Update menu after logout
      });
    } else {
      // User is not logged in
      profileLink.textContent = "Log In";
      profileMenu.innerHTML = `
        <li><a href="../Sign in/indexsignin.html">Sign In</a></li>
        <li><a href="../Sign up/indexsignup.html">Sign Up</a></li>
      `;
    }
  }

  updateProfileMenu();
});
