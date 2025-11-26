const upcomingGrid = document.getElementById('upcomingGrid');
const pastGrid = document.getElementById('pastGrid');
const upcomingEmpty = document.getElementById('upcomingEmpty');
const pastEmpty = document.getElementById('pastEmpty');
const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const applyFilters = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const clearMyBookingsBtn = document.getElementById('clearMyBookings');
const rescheduleModal = document.getElementById('rescheduleModal');
const rescheduleForm = document.getElementById('rescheduleForm');
const rescheduleDate = document.getElementById('rescheduleDate');
const rescheduleTimeslot = document.getElementById('rescheduleTimeslot');
const rescheduleQuantity = document.getElementById('rescheduleQuantity');
const rescheduleResource = document.getElementById('rescheduleResource');
const rescheduleTitle = document.getElementById('rescheduleTitle');
const closeReschedule = document.getElementById('closeReschedule');
const timeslotField = document.getElementById('timeslotField');
const quantityField = document.getElementById('quantityField');
const rescheduleSubmit = rescheduleForm?.querySelector('button[type="submit"]');

let bookingsCache = [];
let activeBooking = null;

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

function slotLabel(slot) {
    if (!slot) return 'Timeslot';
    return slot.label || `${slot.start_time} - ${slot.end_time}`;
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

        const hasValidDate = date && !Number.isNaN(date.getTime());
        const isUpcoming = status === 'active' && hasValidDate && date >= today;
        const isPast =
            status === 'cancelled' ||
            status === 'rescheduled' ||
            status === 'completed' ||
            (status === 'active' && hasValidDate && date < today);

        if (isUpcoming) {
            upcoming.push(entry);
        } else if (isPast || !hasValidDate) {
            past.push(entry);
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

function closeRescheduleModal() {
    if (rescheduleModal) {
        rescheduleModal.classList.remove('is-open');
        rescheduleModal.setAttribute('aria-hidden', 'true');
    }
    activeBooking = null;
    if (rescheduleForm) rescheduleForm.reset();
    if (rescheduleTimeslot) rescheduleTimeslot.innerHTML = '<option value="">Select a timeslot</option>';
    if (rescheduleTimeslot) rescheduleTimeslot.disabled = false;
    if (quantityField) quantityField.style.display = 'none';
    if (timeslotField) timeslotField.style.display = 'none';
    if (rescheduleSubmit) rescheduleSubmit.disabled = false;
}

async function loadTimeslotAvailability(resourceId, bookingDate, currentSlotId = null) {
    if (!rescheduleTimeslot) return;
    rescheduleTimeslot.innerHTML = '<option value="">Loading availability...</option>';
    rescheduleTimeslot.disabled = true;
    if (rescheduleSubmit) rescheduleSubmit.disabled = true;
    if (!resourceId || !bookingDate) {
        rescheduleTimeslot.innerHTML = '<option value="" disabled>Select a date to see timeslots</option>';
        return;
    }

    try {
        const res = await fetch(`/api/resources/${resourceId}/availability?date=${encodeURIComponent(bookingDate)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load availability');

        const bookedIds = new Set((data.booked || []).map((slot) => slot.id));
        const combined = [...(data.available || []), ...(data.booked || [])];
        if (!combined.length) {
            rescheduleTimeslot.innerHTML = '<option value="" disabled>No timeslots for this date</option>';
            return;
        }

        const options = ['<option value="">Select a timeslot</option>'];
        combined.forEach((slot) => {
            const isCurrent = currentSlotId && Number(slot.id) === Number(currentSlotId);
            const disabled = bookedIds.has(slot.id) && !isCurrent;
            options.push(
                `<option value="${slot.id}" ${disabled ? 'disabled' : ''}>${slotLabel(slot)}${
                    disabled ? ' (booked)' : ''
                }</option>`
            );
        });
        rescheduleTimeslot.innerHTML = options.join('');
        rescheduleTimeslot.value = currentSlotId ? String(currentSlotId) : '';
        rescheduleTimeslot.disabled = false;
        if (rescheduleSubmit) rescheduleSubmit.disabled = false;
    } catch (err) {
        console.error(err);
        rescheduleTimeslot.innerHTML = '<option value="" disabled>Availability unavailable</option>';
        rescheduleTimeslot.disabled = true;
        if (rescheduleSubmit) rescheduleSubmit.disabled = true;
    }
}

async function loadEquipmentAvailability(resourceId, bookingDate, currentQuantity = 1) {
    if (!rescheduleQuantity) return;
    rescheduleQuantity.value = currentQuantity || 1;
    rescheduleQuantity.min = 1;
    rescheduleQuantity.removeAttribute('max');
    if (!resourceId || !bookingDate) return;

    try {
        const res = await fetch(`/api/resources/${resourceId}/availability?date=${encodeURIComponent(bookingDate)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load availability');
        const remaining = Number(data.remainingQuantity ?? 0);
        const max = Math.max(remaining + Number(currentQuantity || 1), 1);
        rescheduleQuantity.max = max;
        if (Number(rescheduleQuantity.value) > max) {
            rescheduleQuantity.value = max;
        }
    } catch (err) {
        console.error(err);
    }
}

function openRescheduleModal(booking) {
    activeBooking = booking;
    if (!booking || !rescheduleModal) return;

    if (rescheduleForm) {
        const url = `/api/bookings/${booking.booking_id}/reschedule`;
        rescheduleForm.dataset.rescheduleUrl = url;
        rescheduleForm.setAttribute('method', 'post');
        rescheduleForm.setAttribute('action', url);
    }

    rescheduleTitle.textContent = `Reschedule Booking #${booking.booking_id}`;
    rescheduleResource.textContent = resourceLabel(booking);
    rescheduleDate.value = booking.booking_date || '';

    const type = booking.booking_type;
    const resourceId = booking.resource?.id || booking.room?.id || booking.lab?.id || booking.equipment?.id;

    if (type === 'equipment') {
        if (timeslotField) timeslotField.style.display = 'none';
        if (quantityField) quantityField.style.display = 'flex';
        loadEquipmentAvailability(resourceId, rescheduleDate.value, booking.equipment?.quantity || 1);
    } else {
        if (timeslotField) timeslotField.style.display = 'flex';
        if (quantityField) quantityField.style.display = 'none';
        rescheduleTimeslot.innerHTML = '<option value="">Select a timeslot</option>';
        loadTimeslotAvailability(
            resourceId,
            rescheduleDate.value,
            booking.room?.timeslot_id || booking.lab?.timeslot_id || null
        );
    }

    rescheduleModal.classList.add('is-open');
    rescheduleModal.setAttribute('aria-hidden', 'false');
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

    const response = await fetch(`/api/bookings/${id}/cancel`, {
        method: 'POST',
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

async function submitReschedule(event) {
    if (event) event.preventDefault();
    if (!activeBooking) return;

    const bookingDate = rescheduleDate?.value?.trim();
    if (!bookingDate) {
        alert('Please select a new date.');
        return;
    }

    const payload = { bookingDate };
    if (activeBooking.booking_type === 'equipment') {
        const quantity = Number(rescheduleQuantity?.value);
        if (!Number.isInteger(quantity) || quantity < 1) {
            alert('Quantity must be at least 1.');
            return;
        }
        payload.quantity = quantity;
    } else {
        if (rescheduleTimeslot?.disabled) {
            alert('Please wait for availability to load.');
            return;
        }
        const timeslotId = rescheduleTimeslot?.value;
        if (!timeslotId) {
            alert('Please choose a timeslot.');
            return;
        }
        const parsedTimeslot = Number(timeslotId);
        if (!Number.isFinite(parsedTimeslot) || parsedTimeslot <= 0) {
            alert('Please choose a valid timeslot.');
            return;
        }
        payload.timeslotId = parsedTimeslot;
    }

    const rescheduleUrl = rescheduleForm?.dataset.rescheduleUrl || `/api/bookings/${activeBooking.booking_id}/reschedule`;

    const response = await fetch(rescheduleUrl, {
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

    closeRescheduleModal();
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
        openRescheduleModal(booking);
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

    if (closeReschedule) closeReschedule.addEventListener('click', closeRescheduleModal);
    if (rescheduleModal) {
        rescheduleModal.addEventListener('click', (event) => {
            if (event.target === rescheduleModal) closeRescheduleModal();
        });
    }
    if (rescheduleDate) {
        rescheduleDate.addEventListener('change', () => {
            if (!activeBooking) return;
            const resourceId =
                activeBooking.resource?.id ||
                activeBooking.room?.id ||
                activeBooking.lab?.id ||
                activeBooking.equipment?.id;
            if (activeBooking.booking_type === 'equipment') {
                loadEquipmentAvailability(resourceId, rescheduleDate.value, activeBooking.equipment?.quantity || 1);
            } else {
                loadTimeslotAvailability(
                    resourceId,
                    rescheduleDate.value,
                    activeBooking.room?.timeslot_id || activeBooking.lab?.timeslot_id || null
                );
            }
        });
    }
    if (rescheduleForm) {
        rescheduleForm.addEventListener('submit', (event) => {
            submitReschedule(event).catch((err) => alert(err.message));
        });
    }

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
