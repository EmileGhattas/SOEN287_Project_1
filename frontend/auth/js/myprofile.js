(function () {
  const form = document.getElementById('profileForm');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const messageBox = document.getElementById('profileMessage');

  function getAuthToken() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token && !sessionStorage.getItem('token')) {
      sessionStorage.setItem('token', token);
      localStorage.removeItem('token');
    }
    return token;
  }

  function persistUser(user) {
    sessionStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('user');
  }

  function showMessage(text, type = 'error') {
    if (!messageBox) return alert(text);
    messageBox.textContent = text;
    messageBox.classList.remove('error', 'success');
    messageBox.classList.add(type);
    messageBox.style.display = text ? 'block' : 'none';
  }

  function authHeaders() {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function loadProfile() {
    try {
      const res = await fetch('/api/auth/me', { headers: authHeaders() });
      if (res.status === 401) {
        showMessage('Please sign in to manage your profile.');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load profile');
      usernameInput.value = data.user?.username || '';
      emailInput.value = data.user?.email || '';
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'Unable to load profile');
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!usernameInput.value || !emailInput.value) {
      showMessage('Username and email are required.');
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          username: usernameInput.value.trim(),
          email: emailInput.value.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save profile');

      const user = { ...data.user };
      persistUser(user);
      showMessage('Profile updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'Could not save profile');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    if (form) form.addEventListener('submit', saveProfile);
  });
})();
