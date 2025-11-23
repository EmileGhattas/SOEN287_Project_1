
function _readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}
function getBookingsArray() {
  const arr = _readJSON('bookings');
  return Array.isArray(arr) ? arr : [];
}
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

    // Restrict date selection (today to 10 days ahead)
    const today = new Date();
    const maxdate = new Date();
    maxdate.setDate(today.getDate() + 10);
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxdate.toISOString().split('T')[0];

    updateAvailableTimes();
});

// Update available times based on existing bookings
function updateAvailableTimes() {
    const arr = getBookingsArray();
    const inDate = dateInput.value || new Date().toISOString().split('T')[0];

    // Full list of time options
    const timeOptions = [];
    for(let h=7; h<=23; h++) {
        timeOptions.push(`${String(h).padStart(2,'0')}:00`);
        timeOptions.push(`${String(h).padStart(2,'0')}:30`);
    }

    // Filter out already booked times for the selected room and date
    const booked = arr.filter(b => b.room === selectedRoom && b.date === inDate);
    const availableTimes = [...timeOptions];

    booked.forEach(b => {
        const [startHour, startMin] = b.startTime.split(':').map(Number);
        const [endHour, endMin] = b.endTime.split(':').map(Number);
        const startTotal = startHour*60 + startMin;
        const endTotal = endHour*60 + endMin;

        // Remove half-hour increments that fall in booked range
        for(let i=startTotal; i<endTotal; i+=30) {
            const h = Math.floor(i/60);
            const m = i%60;
            const t = `${String(h).padStart(2,'0')}:${m===0?'00':'30'}`;
            const index = availableTimes.indexOf(t);
            if(index !== -1) availableTimes.splice(index, 1);
        }
    });

    startTime.innerHTML = '';
    endTime.innerHTML = '';
    availableTimes.forEach(t => {
        const opt1 = document.createElement('option');
        opt1.value = t;
        startTime.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = t;
        endTime.appendChild(opt2);
    });
}

// Update available times if date changes
dateInput.addEventListener('change', updateAvailableTimes);

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

            const local = getBookingsArray();
            local.push({
                room: booking.room,
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime,
            });
            localStorage.setItem('bookings', JSON.stringify(local));

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



