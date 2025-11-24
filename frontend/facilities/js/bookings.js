const bookingsGrid = document.getElementById('bookingsGrid');
const bookingsEmpty = document.getElementById('bookingsEmpty');
const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const applyFilters = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const clearMyBookingsBtn = document.getElementById('clearMyBookings');

let bookingsCache = [];

function authHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

function resourceLabel(booking) {
    if (booking.booking_type === 'room' && booking.room) return booking.room.name || `Room ${booking.room.id}`;
    if (booking.booking_type === 'lab' && booking.lab) return booking.lab.name || `Lab ${booking.lab.id}`;
    if (booking.booking_type === 'equipment' && booking.equipment) return booking.equipment.name || `Equipment ${booking.equipment.id}`;
    return booking.booking_type;
}

function timeLabel(booking) {
    if (booking.booking_type === 'room' && booking.room) {
        return booking.room.label || `${booking.room.start_time} — ${booking.room.end_time}`;
    }
    if (booking.booking_type === 'lab' && booking.lab) {
        return booking.lab.label || `${booking.lab.start_time} — ${booking.lab.end_time}`;
    }
    if (booking.booking_type === 'equipment' && booking.equipment) {
        return `Quantity: ${booking.equipment.quantity}`;
    }
    return '-';
}

function filterBookings(list) {
    const fromTs = filterFrom.value ? Date.parse(filterFrom.value) : -Infinity;
    const toTs = filterTo.value ? Date.parse(filterTo.value) : Infinity;

    return list.filter((b) => {
        const ts = Date.parse(b.booking_date);
        if (!Number.isFinite(ts)) return true;
        return ts >= fromTs && ts <= toTs;
    });
}

function renderBookings(list) {
    bookingsGrid.innerHTML = '';

    if (!list.length) {
        bookingsEmpty.style.display = 'block';
        return;
    }

    bookingsEmpty.style.display = 'none';

    list.forEach((booking) => {
        const card = document.createElement('article');
        card.className = 'booking-card';
        card.dataset.bookingId = booking.booking_id;
        card.innerHTML = `
            <div class="booking-card__header">
                <span class="badge">${booking.booking_type}</span>
                <h3 class="booking-card__title">${resourceLabel(booking)}</h3>
            </div>
            <div class="booking-card__body">
                <div><strong>Date:</strong> ${booking.booking_date}</div>
                <div><strong>Details:</strong> ${timeLabel(booking)}</div>
            </div>
            <div class="booking-card__actions">
                <button class="btn" data-action="reschedule" data-id="${booking.booking_id}">Reschedule</button>
                <button class="btn delete" data-action="cancel" data-id="${booking.booking_id}">Cancel</button>
            </div>
        `;
        bookingsGrid.appendChild(card);
    });
}

async function loadBookings() {
    try {
        const response = await fetch('/api/bookings/mine', { headers: authHeaders() });
        if (response.status === 401) {
            bookingsGrid.innerHTML = '';
            bookingsEmpty.style.display = 'block';
            bookingsEmpty.innerHTML = '<strong>Please sign in to view your bookings.</strong>';
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to load bookings');
        }

        bookingsCache = data;
        renderBookings(filterBookings(bookingsCache));
    } catch (err) {
        console.error(err);
        alert(err.message || 'Failed to load bookings');
    }
}

async function cancelBooking(id) {
    const confirmed = confirm('Cancel this booking?');
    if (!confirmed) return;

    const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });

    if (response.status === 403) {
        alert('You cannot cancel this booking.');
        return;
    }

    if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to cancel booking');
    }

    await loadBookings();
}

async function rescheduleBooking(booking) {
    const bookingDate = prompt('New date (YYYY-MM-DD):', booking.booking_date);
    if (!bookingDate) return;

    const payload = { bookingDate };

    if (booking.booking_type === 'room' || booking.booking_type === 'lab') {
        const timeslotId = prompt('New timeslot id (see availability page):', booking.room?.timeslot_id || booking.lab?.timeslot_id || '');
        if (!timeslotId) return alert('A timeslot id is required.');
        payload.timeslotId = timeslotId;
    } else if (booking.booking_type === 'equipment') {
        const quantity = Number(prompt('Quantity:', booking.equipment?.quantity || 1));
        if (!quantity || quantity < 1) return alert('Quantity must be at least 1.');
        payload.quantity = quantity;
    }

    const response = await fetch(`/api/bookings/${booking.booking_id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (response.status === 403) {
        alert('You cannot reschedule this booking.');
        return;
    }
    if (!response.ok) {
        throw new Error(data.message || 'Failed to update booking');
    }

    await loadBookings();
}

function handleGridClick(event) {
    const action = event.target.getAttribute('data-action');
    const bookingId = event.target.getAttribute('data-id');
    if (!action || !bookingId) return;

    const booking = bookingsCache.find((b) => `${b.booking_id}` === bookingId);
    if (!booking) return;

    if (action === 'cancel') {
        cancelBooking(bookingId).catch((err) => alert(err.message));
    }
    if (action === 'reschedule') {
        rescheduleBooking(booking).catch((err) => alert(err.message));
    }
}

function handleClearFilters() {
    filterFrom.value = '';
    filterTo.value = '';
    renderBookings(bookingsCache);
}

document.addEventListener('DOMContentLoaded', () => {
    applyFilters.addEventListener('click', () => renderBookings(filterBookings(bookingsCache)));
    clearFiltersBtn.addEventListener('click', handleClearFilters);
    bookingsGrid.addEventListener('click', handleGridClick);

    clearMyBookingsBtn.addEventListener('click', () => {
        if (!bookingsCache.length) return;
        const confirmed = confirm('Cancel all of your bookings?');
        if (!confirmed) return;

        Promise.all(bookingsCache.map((b) => cancelBooking(b.booking_id))).catch((err) => alert(err.message));
    });

    loadBookings();
});
