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

  function clearStoredAuth() {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  function getStoredUser() {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (raw && !sessionStorage.getItem('user')) {
      sessionStorage.setItem('user', raw);
      localStorage.removeItem('user');
    }
    if (localStorage.getItem('token') && !sessionStorage.getItem('token')) {
      sessionStorage.setItem('token', localStorage.getItem('token'));
      localStorage.removeItem('token');
    }
    return safeParse(raw);
  }

  function persistUser(user) {
    sessionStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('user');
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

    const profileDropdown = document.getElementById('profileDropdown');
    const contactItem = navList.querySelector('a[href="/contact"]')?.closest('li') || null;

    let adminItem = document.getElementById('adminNavItem');

    if (isAdmin) {
      if (!adminItem) {
        adminItem = document.createElement('li');
        adminItem.id = 'adminNavItem';
        const adminLink = document.createElement('a');
        adminLink.href = '/admin';
        adminLink.textContent = 'Admin';
        adminItem.appendChild(adminLink);
      }

      if (adminItem.parentElement !== navList) {
        adminItem.remove();
        if (contactItem && contactItem.parentElement === navList) {
          navList.insertBefore(adminItem, contactItem.nextSibling);
        } else if (profileDropdown && profileDropdown.parentElement === navList) {
          navList.insertBefore(adminItem, profileDropdown);
        } else {
          navList.appendChild(adminItem);
        }
      } else if (contactItem && adminItem.previousElementSibling !== contactItem) {
        navList.insertBefore(adminItem, contactItem.nextSibling);
      } else if (!contactItem && profileDropdown && adminItem.nextElementSibling !== profileDropdown) {
        navList.insertBefore(adminItem, profileDropdown);
      }
    } else if (adminItem) {
      adminItem.remove();
    }
  }

  function initProfileMenu() {
    const profileLink = document.getElementById('profileLink');
    const profileMenu = document.getElementById('profileMenu');
    if (!profileLink || !profileMenu) {
      return;
    }

    function updateMenu() {
      const user = getStoredUser();
      const isAdmin = Boolean(user && (user.is_admin ?? user.admin ?? user.isadmin));

      if (user) {
        const normalizedUser = { ...user, is_admin: isAdmin };
        delete normalizedUser.admin;
        delete normalizedUser.isadmin;
        persistUser(normalizedUser);

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
            clearStoredAuth();
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
