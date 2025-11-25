const upcomingGrid = document.getElementById('upcomingGrid');
const pastGrid = document.getElementById('pastGrid');
const upcomingEmpty = document.getElementById('upcomingEmpty');
const pastEmpty = document.getElementById('pastEmpty');
const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const applyFilters = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const clearMyBookingsBtn = document.getElementById('clearMyBookings');

let bookingsCache = [];

function hasStoredAuth() {
    const user = sessionStorage.getItem('user') || localStorage.getItem('user');
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    return Boolean(user && token);
}

function ensureSignedIn() {
    if (!hasStoredAuth()) {
        window.location.href = '/auth/signin.html';
        return false;
    }
    return true;
}

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

function normalizedStatus(booking) {
    const status = booking.status || 'active';
    const date = booking.booking_date ? new Date(`${booking.booking_date}T00:00:00`) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (status === 'active' && date && !Number.isNaN(date.getTime()) && date < today) {
        return 'completed';
    }
    return status;
}

function statusLabel(status) {
    const map = {
        active: 'Active',
        cancelled: 'Cancelled',
        rescheduled: 'Rescheduled',
        completed: 'Completed',
    };
    return map[status] || status || 'Unknown';
}

function splitBookings(list) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = [];
    const past = [];

    list.forEach((booking) => {
        const status = normalizedStatus(booking);
        const date = booking.booking_date ? new Date(`${booking.booking_date}T00:00:00`) : null;
        const entry = { ...booking, computed_status: status };

        if (status === 'active' && date && !Number.isNaN(date.getTime()) && date >= today) {
            upcoming.push(entry);
        } else {
            past.push(entry);
        }
    });

    return { upcoming, past };
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

function renderBookingList(list, grid, emptyEl, { showActions = false } = {}) {
    grid.innerHTML = '';
    if (!list.length) {
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';

    list.forEach((booking) => {
        const status = booking.computed_status || booking.status || 'active';
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
                ${!showActions ? `<div><strong>Status:</strong> ${statusLabel(status)}</div>` : ''}
            </div>
            ${
                showActions
                    ? `<div class="booking-card__actions">
                        <button class="btn" data-action="reschedule" data-id="${booking.booking_id}">Reschedule</button>
                        <button class="btn delete" data-action="cancel" data-id="${booking.booking_id}">Cancel</button>
                    </div>`
                    : ''
            }
        `;
        grid.appendChild(card);
    });
}

function renderSections(list) {
    const filtered = filterBookings(list);
    const { upcoming, past } = splitBookings(filtered);

    renderBookingList(upcoming, upcomingGrid, upcomingEmpty, { showActions: true });
    renderBookingList(past, pastGrid, pastEmpty, { showActions: false });
}

async function loadBookings() {
    try {
        if (!ensureSignedIn()) return;
        const response = await fetch('/api/bookings/mine', { headers: authHeaders() });
        if (response.status === 401) {
            window.location.href = '/auth/signin.html';
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to load bookings');
        }

        bookingsCache = data.map((booking) => {
            const computed = normalizedStatus(booking);
            return { ...booking, computed_status: computed, status: booking.status || computed };
        });
        renderSections(bookingsCache);
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

    const response = await fetch(`/api/bookings/${booking.booking_id}/reschedule`, {
        method: 'POST',
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
    renderSections(bookingsCache);
}

document.addEventListener('DOMContentLoaded', () => {
    if (!ensureSignedIn()) return;

    applyFilters.addEventListener('click', () => renderSections(bookingsCache));
    clearFiltersBtn.addEventListener('click', handleClearFilters);
    upcomingGrid.addEventListener('click', handleGridClick);

    clearMyBookingsBtn.addEventListener('click', () => {
        const { upcoming } = splitBookings(bookingsCache);
        const activeUpcoming = upcoming.filter((b) => (b.computed_status || b.status) === 'active');
        if (!activeUpcoming.length) return;
        const confirmed = confirm('Cancel all of your bookings?');
        if (!confirmed) return;

        Promise.all(activeUpcoming.map((b) => cancelBooking(b.booking_id))).catch((err) => alert(err.message));
    });

    loadBookings();
});
