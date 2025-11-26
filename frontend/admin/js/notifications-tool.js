(function () {
  const form = document.getElementById('adminNotificationForm');
  const userSelect = document.getElementById('adminNotificationUser');
  const titleInput = document.getElementById('adminNotificationTitle');
  const bodyInput = document.getElementById('adminNotificationBody');
  const feedback = document.getElementById('adminNotificationFeedback');

  function getAuthToken() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token && !sessionStorage.getItem('token')) {
      sessionStorage.setItem('token', token);
      localStorage.removeItem('token');
    }
    return token;
  }

  function authHeaders() {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  function showFeedback(text, type = 'error') {
    if (!feedback) return;
    feedback.textContent = text;
    feedback.classList.remove('error', 'success');
    if (text) {
      feedback.classList.add(type);
      feedback.style.display = 'inline-flex';
    } else {
      feedback.style.display = 'none';
    }
  }

  function renderUsers(users) {
    if (!userSelect) return;
    userSelect.innerHTML = '';
    if (!users.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = 'No users available';
      userSelect.appendChild(opt);
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Select a user';
    userSelect.appendChild(placeholder);

    users.forEach((user) => {
      const opt = document.createElement('option');
      opt.value = user.id;
      opt.textContent = user.label;
      userSelect.appendChild(opt);
    });
  }

  async function loadUsers() {
    if (!userSelect) return;
    try {
      const res = await fetch('/api/bookings', { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load users');

      const map = new Map();
      data.forEach((booking) => {
        if (!booking.user_id) return;
        const label = `${booking.user_name || booking.user?.username || 'User'} (${booking.user_email || booking.user?.email || 'N/A'})`;
        if (!map.has(booking.user_id)) {
          map.set(booking.user_id, { id: booking.user_id, label });
        }
      });

      renderUsers(Array.from(map.values()));
    } catch (err) {
      console.error(err);
      renderUsers([]);
      showFeedback(err.message || 'Unable to load users. Please try again.', 'error');
    }
  }

  async function sendNotification(event) {
    event.preventDefault();
    if (!userSelect?.value || !titleInput?.value || !bodyInput?.value) {
      showFeedback('All fields are required.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          user_id: userSelect.value,
          title: titleInput.value.trim(),
          message: bodyInput.value.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send notification');

      showFeedback('Notification sent successfully.', 'success');
      form?.reset();
      userSelect.selectedIndex = 0;
    } catch (err) {
      console.error(err);
      showFeedback(err.message || 'Failed to send notification.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!form) return;
    loadUsers();
    form.addEventListener('submit', sendNotification);
  });
})();
