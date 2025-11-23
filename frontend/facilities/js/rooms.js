const ROOM_MAP = {
    'Room 1': 1,
    'Room 2': 2,
    'Room 3': 3,
    'Room 4': 4,
    'Room 5': 5,
    'Room 6': 6,
    'Room 7': 7,
    'Room 8': 8,
    'Room 9': 9,
    'Room 10': 10,
    'Conference Room A': 11,
    'Conference Room B': 12,
};

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
let availableTimes = [];

function areConsecutive(prev, next) {
    const [pH, pM] = prev.split(':').map(Number);
    const [nH, nM] = next.split(':').map(Number);
    return (nH * 60 + nM) - (pH * 60 + pM) === 30;
}

function setSelectOptions(select, options) {
    select.innerHTML = '';
    options.forEach(({ value, label, disabled = false, selected = false }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        opt.disabled = disabled;
        opt.selected = selected;
        select.appendChild(opt);
    });
}

function setDateBounds() {
    const today = new Date();
    const maxdate = new Date();
    maxdate.setDate(today.getDate() + 10);
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxdate.toISOString().split('T')[0];
    if (!dateInput.value) {
        dateInput.value = today.toISOString().split('T')[0];
    }
}

function populateStartTimes(times) {
    if (!times.length) {
        setSelectOptions(startTime, [{ value: '', label: 'No available times', disabled: true, selected: true }]);
        startTime.disabled = true;
        setSelectOptions(endTime, [{ value: '', label: 'Select a start time first', disabled: true, selected: true }]);
        endTime.disabled = true;
        return;
    }

    setSelectOptions(startTime, [
        { value: '', label: 'Select start time', disabled: true, selected: true },
        ...times.map((t) => ({ value: t, label: t })),
    ]);
    startTime.disabled = false;
    endTime.disabled = true;
    setSelectOptions(endTime, [{ value: '', label: 'Select a start time first', disabled: true, selected: true }]);
}

function populateEndTimes(start) {
    setSelectOptions(endTime, []);
    if (!start) {
        setSelectOptions(endTime, [{ value: '', label: 'Select a start time first', disabled: true, selected: true }]);
        endTime.disabled = true;
        return;
    }

    const startIdx = availableTimes.indexOf(start);
    const endOptions = [];
    for (let i = startIdx + 1; i < availableTimes.length; i++) {
        const prev = availableTimes[i - 1];
        const curr = availableTimes[i];
        if (!areConsecutive(prev, curr)) break;
        if (i - startIdx > 8) break; // limit to 4 hours of 30-minute slots
        endOptions.push(curr);
    }

    if (!endOptions.length) {
        setSelectOptions(endTime, [{ value: '', label: 'No end times available', disabled: true, selected: true }]);
        endTime.disabled = true;
        return;
    }

    setSelectOptions(endTime, [
        { value: '', label: 'Select end time', disabled: true, selected: true },
        ...endOptions.map((t) => ({ value: t, label: t })),
    ]);
    endTime.disabled = false;
}

async function updateAvailableTimes() {
    if (!selectedRoom) {
        return;
    }
    setDateBounds();
    const inDate = dateInput.value;

    setSelectOptions(startTime, [{ value: '', label: 'Loading times...', disabled: true, selected: true }]);
    startTime.disabled = true;
    endTime.disabled = true;
    setSelectOptions(endTime, [{ value: '', label: 'Select a start time first', disabled: true, selected: true }]);

    try {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`/api/bookings/availability/rooms/${ROOM_MAP[selectedRoom]}?date=${encodeURIComponent(inDate)}`, { headers });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to load availability');
        }
        const data = await res.json();
        availableTimes = data.availableTimes || [];
        populateStartTimes(availableTimes);
    } catch (err) {
        console.error('Failed to load availability', err);
        setSelectOptions(startTime, [{ value: '', label: 'Availability unavailable', disabled: true, selected: true }]);
        setSelectOptions(endTime, [{ value: '', label: 'Select a start time first', disabled: true, selected: true }]);
        alert(err.message || 'Could not load available times. Please sign in and try again.');
    }
}

// Select a room
rooms.forEach(room => {
    room.addEventListener('click', () => {
        rooms.forEach(r => r.classList.remove('selected'));
        room.classList.add('selected');
        selectedRoom = room.textContent.trim();
        toDate.disabled = false;
    });
});

// Display date picker
toDate.addEventListener('click', () => {
    if(selectedRoom === "") {
        alert("Please select a room first.");
        return;
    }
    datetime.style.display = 'block';

    // Show today's date
    const date = new Date();
    const format = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
    document.getElementById('currentDate').textContent = date.toLocaleDateString('en-US', format);

    setDateBounds();
    updateAvailableTimes();
});

// Update available times if date changes
dateInput.addEventListener('change', updateAvailableTimes);
startTime.addEventListener('change', () => populateEndTimes(startTime.value));

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

    if (startTotal < 7 * 60 || endTotal > 23 * 60) {
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

    // Check login status
    const user = JSON.parse(localStorage.getItem("user"));

    const booking = {
        type: "room",
        room: selectedRoom,
        date: inDate,
        startTime: inStartTime,
        endTime: inEndTime,
        roomId: ROOM_MAP[selectedRoom],
    };

    // If not logged in → save booking temporarily & redirect
    if (!user) {
        localStorage.setItem("pendingBooking", JSON.stringify(booking));
        alert("Please sign in to complete your booking.");
        window.location.href = "../../auth/signin.html";
        return;
    }

    sendRoomBookingToDB(booking);
});

function sendRoomBookingToDB(booking) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    fetch('/api/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            bookingType: "room",
            bookingDate: booking.date,
            roomId: booking.roomId,
            startTime: booking.startTime,
            endTime: booking.endTime,
        })
    })
        .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'Room booking failed');
            }

            datetime.style.display = 'none';
            document.querySelector('.room-selection').style.display = 'none';
            confirmation.style.display = 'block';
            summary.innerHTML = `
                <strong>Room:</strong> ${booking.room}<br>
                <strong>Date:</strong> ${booking.date}<br>
                <strong>Time:</strong> ${booking.startTime} – ${booking.endTime}<br><br>
                Room successfully booked!
            `;
        })
        .catch(err => {
            console.error('Room booking failed', err);
            alert(err.message || 'Failed to book room');
        });
}
