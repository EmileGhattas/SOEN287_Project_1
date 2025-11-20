(function () {
  const scriptEl = document.currentScript || document.querySelector('script[src*="profile-menu.js"]');
  let relativeBase = '';

  if (scriptEl) {
    const srcAttr = scriptEl.getAttribute('src') || '';
    const match = srcAttr.match(/^(.*?)(?:shared\/profile-menu\.js)(?:$|\?)/);
    if (match && match[1]) {
      relativeBase = match[1];
    } else if (scriptEl.src) {
      try {
        const url = new URL(scriptEl.src, window.location.href);
        const baseUrl = new URL('../', url);
        relativeBase = baseUrl.href;
      } catch (err) {
        console.warn('Unable to derive profile menu base from script src.', err);
      }
    }
  }

  function safeParse(item) {
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch (err) {
      console.warn('Unable to parse stored user data:', err);
      return null;
    }
  }

  function resolvePath(path) {
    if (!path) {
      return '#';
    }
    if (/^(?:[a-z]+:|\/\/|\/)/i.test(path)) {
      return path;
    }
    return (relativeBase || '') + path;
  }

  function initProfileMenu() {
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');
    if (!profileLink || !profileMenu) {
      return;
    }

    function updateMenu() {
      const user = safeParse(localStorage.getItem('user'));

      if (user) {
        profileLink.textContent = 'Profile';
        profileLink.setAttribute('href', '#');
        profileMenu.innerHTML = `
          <li><a href="${resolvePath('facilities/bookings')}">My Bookings</a></li>
          <li><a href="#" id="logout">Logout</a></li>
        `;

        const logout = document.getElementById('logout');
        if (logout) {
          logout.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('user');
            localStorage.removeItem('pendingBooking');
            updateMenu();
            window.location.href = resolvePath('signin');
          });
        }
      } else {
        profileLink.textContent = 'Profile';
        profileLink.setAttribute('href', resolvePath('signin'));
        profileMenu.innerHTML = `
          <li><a href="${resolvePath('signin')}">Sign In</a></li>
          <li><a href="${resolvePath('signup')}">Sign Up</a></li>
        `;
      }
    }

    updateMenu();
  }

  document.addEventListener('DOMContentLoaded', initProfileMenu);
})();
