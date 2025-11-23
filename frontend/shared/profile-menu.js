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

  function renderAdminNav(isAdmin) {
    const navList = document.querySelector('.navLinks');
    if (!navList) return;

    const existing = document.getElementById('adminNavItem');
    if (isAdmin) {
      if (!existing) {
        const adminItem = document.createElement('li');
        adminItem.id = 'adminNavItem';
        const adminLink = document.createElement('a');
        adminLink.href = '/admin';
        adminLink.textContent = 'Admin';
        adminItem.appendChild(adminLink);

        const profileDropdown = document.getElementById('profileDropdown');
        if (profileDropdown && profileDropdown.parentElement === navList) {
          navList.insertBefore(adminItem, profileDropdown);
        } else {
          navList.appendChild(adminItem);
        }
      }
    } else if (existing) {
      existing.remove();
    }
  }

  function initProfileMenu() {
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');
    if (!profileLink || !profileMenu) {
      return;
    }

    function updateMenu() {
      const user = safeParse(localStorage.getItem('user'));
      const isAdmin = Boolean(user && (user.is_admin ?? user.admin ?? user.isadmin));

      if (user) {
        const normalizedUser = { ...user, is_admin: isAdmin };
        delete normalizedUser.admin;
        delete normalizedUser.isadmin;
        localStorage.setItem('user', JSON.stringify(normalizedUser));

        profileLink.textContent = 'Profile';
        profileLink.setAttribute('href', '/myprofile');
        profileMenu.innerHTML = `
          <li><a href="/myprofile">My Profile</a></li>
          <li><a href="/booking">My Bookings</a></li>
          <li><a href="#" id="logout">Logout</a></li>
        `;

        renderAdminNav(isAdmin);

        const logout = document.getElementById('logout');
        if (logout) {
          logout.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('user');
            localStorage.removeItem('pendingBooking');
            updateMenu();
            window.location.href = '/signin';
          });
        }
      } else {
        profileLink.textContent = 'Profile';
        profileLink.setAttribute('href', '/signin');
        profileMenu.innerHTML = `
          <li><a href="/signin">Sign In</a></li>
          <li><a href="/signup">Sign Up</a></li>
        `;
        renderAdminNav(false);
      }
    }

    updateMenu();
  }

  document.addEventListener('DOMContentLoaded', initProfileMenu);
})();
