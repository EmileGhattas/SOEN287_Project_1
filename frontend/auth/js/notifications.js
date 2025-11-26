(function () {
  const listEl = document.getElementById('notificationsList');
  const messageEl = document.getElementById('notificationsMessage');

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

  function showMessage(text, type = 'error') {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.remove('error', 'success');
    if (text) {
      messageEl.classList.add(type);
      messageEl.style.display = 'block';
    } else {
      messageEl.style.display = 'none';
    }
  }

  function formatDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  function updateMenuCount(count) {
    const notificationsLink = document.getElementById('notificationsMenuLink');
    if (notificationsLink) {
      notificationsLink.textContent = count > 0 ? `My Notifications (${count})` : 'My Notifications';
    }
  }

  function renderNotifications(items) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!Array.isArray(items) || items.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'You have no notifications yet.';
      listEl.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'notification-item';
      if (!item.is_read) li.classList.add('unread');

      const header = document.createElement('div');
      header.className = 'notification-header';

      const title = document.createElement('h3');
      title.className = 'notification-title';
      title.textContent = item.title || 'Notification';

      const time = document.createElement('span');
      time.className = 'notification-time';
      time.textContent = formatDate(item.created_at);

      header.appendChild(title);
      header.appendChild(time);

      const message = document.createElement('p');
      message.className = 'notification-message';
      message.textContent = item.message || '';

      li.appendChild(header);
      li.appendChild(message);
      listEl.appendChild(li);
    });
  }

  async function markAllAsRead() {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: authHeaders(),
      });
      updateMenuCount(0);
    } catch (err) {
      console.warn('Unable to mark notifications as read', err);
    }
  }

  async function loadNotifications() {
    const token = getAuthToken();
    if (!token) {
      showMessage('Please sign in to view your notifications.');
      window.location.href = '/signin';
      return;
    }

    try {
      const res = await fetch('/api/notifications', { headers: authHeaders() });
      if (res.status === 401) {
        showMessage('Please sign in to view your notifications.');
        window.location.href = '/signin';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load notifications');

      const unreadCount = Array.isArray(data) ? data.filter((item) => !item.is_read).length : 0;
      updateMenuCount(unreadCount);
      renderNotifications(data);
      await markAllAsRead();
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'Unable to load notifications.');
    }
  }

  document.addEventListener('DOMContentLoaded', loadNotifications);
})();
