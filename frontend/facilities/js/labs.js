function _readJSON(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch (e) {
        return null;
    }
}

function getBookingsArray() {
    const arr = _readJSON('labBookings');
    return Array.isArray(arr) ? arr : [];
}

function saveBooking(booking) {
    const arr = getBookingsArray();
    arr.push(booking);
    localStorage.setItem('labBookings', JSON.stringify(arr));
}

// Elements
const labs = document.querySelectorAll('.lab');
const dateInput = document.getElementById('date');
const datetime = document.getElementById('datetime');
const confirmButton = document.getElementById('confirm');
const slotSelect = document.getElementById('slot');
const summary = document.getElementById('summary');
const confirmation = document.getElementById('confirmation');
const toDate = document.getElementById('toDate');

let selectedLab = "";

// Constants
const dailySlots = ["8:00-11:30", "12:00-15:30", "16:00-19:30"];
const MAX_SLOTS_PER_DAY = 3;

// 🔹 Update lab info tooltips + disable when full
function updateLabAvailability() {
    const bookings = getBookingsArray();
    const today = dateInput.value || new Date().toISOString().split('T')[0];

    labs.forEach(lab => {
        const labName = lab.dataset.lab;
        const bookedSlots = bookings
            .filter(b => b.lab === labName && b.date === today)
            .map(b => b.slot);

        const remainingSlots = dailySlots.filter(slot => !bookedSlots.includes(slot));
        const info = lab.querySelector('.lab-info');

        // Tooltip text
        if (remainingSlots.length > 0) {
            info.textContent = `${remainingSlots.length} slot(s) left: ${remainingSlots.join(", ")}`;
        } else {
            info.textContent = "Fully booked today";
        }

        // Disable if full
        if (remainingSlots.length === 0) {
            lab.classList.add('disabled');
            lab.style.pointerEvents = 'none';
            lab.style.opacity = '0.5';
        } else {
            lab.classList.remove('disabled');
            lab.style.pointerEvents = 'auto';
            lab.style.opacity = '1';
        }
    });
}

// 🔹 Hover shows available slots
labs.forEach(lab => {
    lab.addEventListener('mouseenter', () => updateLabAvailability());
});

// 🔹 Select a lab
labs.forEach(lab => {
    lab.addEventListener('click', () => {
        if (lab.classList.contains('disabled')) return;
        labs.forEach(l => l.classList.remove('selected'));
        lab.classList.add('selected');
        selectedLab = lab.dataset.lab;
        toDate.disabled = false;
    });
});

// 🔹 Proceed to date selection
toDate.addEventListener('click', () => {
    if (!selectedLab) return alert("Select a lab first!");
    datetime.style.display = 'block';
    updateLabAvailability();

    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + 14);
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = max.toISOString().split('T')[0];

    updateAvailableSlots();
});

// 🔹 Update slot dropdown for that date
function updateAvailableSlots() {
    const date = dateInput.value;
    const bookings = getBookingsArray();
    const bookedSlots = bookings
        .filter(b => b.lab === selectedLab && b.date === date)
        .map(b => b.slot);

    slotSelect.innerHTML = '<option value="">Select a slot</option>';
    dailySlots.forEach(slot => {
        if (!bookedSlots.includes(slot)) {
            const opt = document.createElement('option');
            opt.value = slot;
            opt.textContent = slot;
            slotSelect.appendChild(opt);
        }
    });
}

dateInput.addEventListener('change', () => {
    updateAvailableSlots();
    updateLabAvailability();
});

// 🔹 Confirm booking
confirmButton.addEventListener('click', () => {
    const date = dateInput.value;
    const slot = slotSelect.value;

    if (!date || !slot || !selectedLab)
        return alert("Please select a lab, date, and time slot.");

    const bookings = getBookingsArray();
    const exists = bookings.find(
        b => b.lab === selectedLab && b.date === date && b.slot === slot
    );

    if (exists) return alert("That slot is already booked!");

    const labBookingsToday = bookings.filter(
        b => b.lab === selectedLab && b.date === date
    );
    if (labBookingsToday.length >= MAX_SLOTS_PER_DAY)
        return alert("All slots are already taken for this lab on this date!");

    const booking = { lab: selectedLab, date, slot };
    saveBooking(booking);

    document.querySelector('.lab-selection').style.display = 'none';
    datetime.style.display = 'none';
    confirmation.style.display = 'block';
    summary.innerHTML = `
    <strong>Lab:</strong> ${booking.lab}<br>
    <strong>Date:</strong> ${booking.date}<br>
    <strong>Slot:</strong> ${booking.slot}<br><br>
    Booking successfully confirmed!
  `;

    updateLabAvailability();
});


function sendLabBookingToDB(booking) {
    fetch('../../backend/php/bookings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: "lab",
            userId: booking.userId,
            labId: LAB_MAP[selectedLab],
            date: booking.date,
            slot: booking.slot
        })
    });
}
