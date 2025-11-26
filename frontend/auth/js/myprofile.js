(function () {
  const form = document.getElementById('profileForm');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const messageBox = document.getElementById('profileMessage');
  const passwordForm = document.getElementById('passwordForm');
  const passwordMessage = document.getElementById('passwordMessage');
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  const deleteSection = document.getElementById('deleteAccountSection');

  let currentUser = null;

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

  function showMessage(target, text, type = 'error') {
    if (!target) return alert(text);
    target.textContent = text;
    target.classList.remove('error', 'success');
    target.classList.add(type);
    target.style.display = text ? 'block' : 'none';
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
        showMessage(messageBox, 'Please sign in to manage your profile.');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load profile');
      currentUser = data.user || null;
      usernameInput.value = currentUser?.username || '';
      emailInput.value = currentUser?.email || '';

      if (deleteSection) {
        deleteSection.style.display = currentUser?.is_admin ? 'none' : 'block';
      }
    } catch (err) {
      console.error(err);
      showMessage(messageBox, err.message || 'Unable to load profile');
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!usernameInput.value || !emailInput.value) {
      showMessage(messageBox, 'Username and email are required.');
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
      currentUser = user;
      showMessage(messageBox, 'Profile updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      showMessage(messageBox, err.message || 'Could not save profile');
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    const currentPassword = currentPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage(passwordMessage, 'All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage(passwordMessage, 'New passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/auth/me/password', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password');

      showMessage(passwordMessage, 'Password updated successfully.', 'success');
      currentPasswordInput.value = '';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
    } catch (err) {
      console.error(err);
      showMessage(passwordMessage, err.message || 'Could not update password');
    }
  }

  function clearAuth() {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  async function deleteAccount() {
    const confirmed = window.confirm('Are you sure you want to delete your account? This cannot be undone.');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/auth/me', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete account');

      clearAuth();
      showMessage(messageBox, 'Account deleted. Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/signup';
      }, 300);
    } catch (err) {
      console.error(err);
      showMessage(messageBox, err.message || 'Could not delete account');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    if (form) form.addEventListener('submit', saveProfile);
    if (passwordForm) passwordForm.addEventListener('submit', changePassword);
    if (deleteAccountBtn) deleteAccountBtn.addEventListener('click', deleteAccount);
  });
})();
