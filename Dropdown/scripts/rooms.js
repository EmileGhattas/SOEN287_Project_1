
function _readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}
function getBookingsArray() {
  const arr = _readJSON('bookings');
  return Array.isArray(arr) ? arr : [];
}
function saveBooking(booking) {
    if (!booking || typeof booking !== 'object') return;

    const arr = JSON.parse(localStorage.getItem('bookings') || '[]');
    arr.push(booking);
    localStorage.setItem('bookings', JSON.stringify(arr));

    localStorage.setItem('booking', JSON.stringify(booking));
    localStorage.setItem('Booking', JSON.stringify(booking));
}

const rooms = document.querySelectorAll('.room');
const dateInput = document.getElementById('date');
const toDate = document.getElementById('toDate');
const datetime = document.getElementById('datetime');
const confirmButton = document.getElementById('confirm');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const confirmation = document.getElementById('confirmation');
const summary = document.getElementById('summary');

let selectedRoom = "";

// Room selection
rooms.forEach(room => {
    room.addEventListener('click', () => {
        if (room.classList.contains('disabled')) return; // cannot select
        rooms.forEach(r => r.classList.remove('selected'));
        room.classList.add('selected');
        selectedRoom = room.textContent.trim();
        toDate.disabled = false;
    });
});

// Show date picker
toDate.addEventListener('click', () => {
    if (selectedRoom === "") {
        alert("Please select a room first.");
        return;
    }

    datetime.style.display = 'block';

    // Display today's date
    const date = new Date();
    const format = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
    document.getElementById('currentDate').textContent = date.toLocaleDateString('en-US', format);

    // Restrict date range (today to +14 days)
    const today = new Date();
    const maxdate = new Date();
    maxdate.setDate(today.getDate() + 14);
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxdate.toISOString().split('T')[0];

    // Do NOT update time availability yet; wait until user picks a date
});

// Update times when the user selects a date
dateInput.addEventListener('change', updateTimeAvailability);

// If user presses Next and date was already set (e.g., prefilled), we can also call:
dateInput.addEventListener('input', updateTimeAvailability);

// Update time input options based on existing bookings
function updateTimeAvailability() {
    const bookings = getBookingsArray();
    const date = dateInput.value || new Date().toISOString().split('T')[0];
    const roomBookings = bookings.filter(b => b.room === selectedRoom && b.date === date);

    // All half-hour times 07:00–23:00
    const times = [];
    for (let h = 7; h <= 23; h++) {
        times.push(h.toString().padStart(2,'0') + ':00');
        times.push(h.toString().padStart(2,'0') + ':30');
    }

    // Remove overlapping times
    const unavailable = new Set();
    roomBookings.forEach(b => {
        const [startH, startM] = b.startTime.split(':').map(Number);
        const [endH, endM] = b.endTime.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        times.forEach(t => {
            const [h, m] = t.split(':').map(Number);
            const total = h * 60 + m;
            if (total >= startTotal && total < endTotal) unavailable.add(t);
        });
    });

    // Populate startTime and endTime inputs
    startTime.innerHTML = '';
    endTime.innerHTML = '';
    times.forEach(t => {
        if (!unavailable.has(t)) {
            const optStart = document.createElement('option');
            optStart.value = t; optStart.textContent = t;
            startTime.appendChild(optStart);

            const optEnd = document.createElement('option');
            optEnd.value = t; optEnd.textContent = t;
            endTime.appendChild(optEnd);
        }
    });

    // Disable room if no times left
    const roomDiv = Array.from(rooms).find(r => r.textContent.trim() === selectedRoom);
    if (startTime.options.length === 0) {
        roomDiv.classList.add('disabled');
        roomDiv.style.pointerEvents = 'none';
        roomDiv.style.opacity = '0.5';
    } else {
        roomDiv.classList.remove('disabled');
        roomDiv.style.pointerEvents = 'auto';
        roomDiv.style.opacity = '1';
    }
}

// Update times if date changes
dateInput.addEventListener('change', updateTimeAvailability);

// Confirm booking
confirmButton.addEventListener('click', () => {
    const inDate = dateInput.value;
    const inStartTime = startTime.value;
    const inEndTime = endTime.value;

    if (!inDate || !inStartTime || !inEndTime) {
        alert("Please fill in all the required fields.");
        return;
    }

    const [startHour, startMin] = inStartTime.split(':').map(Number);
    const [endHour, endMin] = inEndTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;

    if (startTotal < 7*60 || endTotal > 23*60) {
        alert("Bookings must be between 07:00 and 23:00.");
        return;
    }

    if (endTotal <= startTotal) {
        alert("End time must be after start time.");
        return;
    }

    if (endTotal - startTotal > 240) {
        alert("Booking cannot exceed 4 hours.");
        return;
    }

    // Prevent overlapping booking for this room
    const bookings = getBookingsArray();
    const overlap = bookings.some(b => b.room === selectedRoom && b.date === inDate &&
        !(endTotal <= parseInt(b.startTime.split(':')[0])*60 + parseInt(b.startTime.split(':')[1]) ||
            startTotal >= parseInt(b.endTime.split(':')[0])*60 + parseInt(b.endTime.split(':')[1])));
    if (overlap) {
        alert("This time slot overlaps an existing booking for this room.");
        return;
    }

    const booking = { room: selectedRoom, date: inDate, startTime: inStartTime, endTime: inEndTime };
    saveBooking(booking);

    // Confirm booking
    datetime.style.display = 'none';
    document.querySelector('.room-selection').style.display = 'none';
    confirmation.style.display = 'block';
    summary.innerHTML = `
    <strong>Room:</strong> ${booking.room}<br>
    <strong>Date:</strong> ${booking.date}<br>
    <strong>Time:</strong> ${booking.startTime} – ${booking.endTime}<br><br>
    Room successfully booked!
  `;
});