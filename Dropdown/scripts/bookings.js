// Optional: profile menu updates if your mainpage.js needs an element
// <div id="profileMenu"></div> exists in the header.

function readLocalJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function normalizeBookings(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  return [];
}

function getAllBookings() {

  const b1 = readLocalJSON('Booking');
  const b2 = readLocalJSON('booking');
  const b3 = readLocalJSON('bookings');
  const merged = [...normalizeBookings(b1), ...normalizeBookings(b2), ...normalizeBookings(b3)];

  const seen = new Set();
  const out = [];
  for (const b of merged) {
    if (!b || typeof b !== 'object') continue;
    const isEquipment = Boolean(b.equipment && !b.room);
    const room = b.room || b.Room || b.equipment || b.name || 'Room';
    const date = b.date || b.Date || b.day || '';
    const start = b.startTime || b.start || b.from || (isEquipment ? 'All day' : '');
    const end = b.endTime || b.end || b.to || (isEquipment ? 'All day' : '');
    const type = b.type || (isEquipment ? 'Equipment' : 'Reservation');
    const key = `${room}__${date}__${start}__${end}`;
    if (!seen.has(key)) { seen.add(key); out.push({ room, date, startTime: start, endTime: end, type }); }
  }
  return out;
}

function filterByDateRange(data, from, to) {
  if (!from && !to) return data;
  const fromTs = from ? Date.parse(from) : -Infinity;
  const toTs = to ? Date.parse(to) : Infinity;
  return data.filter(b => {
    const dateTs = Date.parse(b.date);
    return isFinite(dateTs) ? (dateTs >= fromTs && dateTs <= toTs) : true;
  });
}

function renderBookings(list) {
  const grid = document.getElementById('bookingsGrid');
  const empty = document.getElementById('bookingsEmpty');
  grid.innerHTML = '';
  if (!list.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  for (const b of list) {
    const el = document.createElement('article');
    el.className = 'booking-card';
    el.innerHTML = `
      <div class="booking-card__header">
        <span class="badge">${b.type || 'Reservation'}</span>
        <h3 class="booking-card__title">${b.room}</h3>
      </div>
      <div class="booking-card__body">
        <div><strong>Date:</strong> ${b.date || '-'}</div>
        <div><strong>Time:</strong> ${b.startTime || '-'} — ${b.endTime || '-'}</div>
      </div>
    `;
    grid.appendChild(el);
  }
}

function refresh() {
  const all = getAllBookings();
  const from = document.getElementById('filterFrom').value || null;
  const to = document.getElementById('filterTo').value || null;
  renderBookings(filterByDateRange(all, from, to));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('applyFilters').addEventListener('click', refresh);
  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value = '';
    refresh();
  });

  document.getElementById('clearMyBookings').addEventListener('click', () => {
    if (!confirm('Remove locally stored bookings from this device?')) return;
    localStorage.removeItem('Booking');
    localStorage.removeItem('booking');
    localStorage.removeItem('bookings');
    refresh();
  });


  refresh();
});