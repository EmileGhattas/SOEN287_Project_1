function _readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}
function getBookingsArray() {
  const arr = _readJSON('bookings');
  return Array.isArray(arr) ? arr : [];
}
function saveBooking(booking) {
  if (!booking) return;
  const arr = getBookingsArray();
  arr.push(booking);
  localStorage.setItem('bookings', JSON.stringify(arr));
  // Backward compatibility (optional)
  localStorage.setItem('booking', JSON.stringify(booking));
  localStorage.setItem('Booking', JSON.stringify(booking));
}

const EQUIPMENT_MAP = {
    'Camera': 1,
    'Tripod': 2,
    'Microscope': 3,
    'VR Headset': 4,
};
// Selection handling
const items = document.querySelectorAll('.equip');
let selectedName = null;
items.forEach((el) => {
  el.addEventListener('click', () => {
    items.forEach(x => x.classList.remove('selected'));
    el.classList.add('selected');
    selectedName = el.getAttribute('data-name') || el.textContent.trim();
  });
});

// Confirm booking
const equipments = document.querySelectorAll('.equipment');
const dateInput = document.getElementById('date');
const datetime = document.getElementById('datetime');
const confirmButton = document.getElementById('confirm');
const summary = document.getElementById('summary');
const confirmation = document.getElementById('confirmation');
const toDate = document.getElementById('Next');

let selectedEquipment = "";

// Constants
const MAX_PER_DAY = 5;

// 🔹 Update equipment info tooltips + disable when full
function updateEquipmentAvailability() {
    const bookings = getBookingsArray();
    const today = dateInput.value || new Date().toISOString().split('T')[0];

    equipments.forEach(eq => {
        const eqName = eq.dataset.equipment;
        const bookedCount = bookings.filter(b => {
            const bookedName = b?.equipment || b?.room || b?.name;
            return bookedName === eqName && b?.date === today;
        }).length;
        const remaining = Math.max(0, MAX_PER_DAY - bookedCount);

        const info = eq.querySelector('.equipment-info');
        if (remaining > 0) {
            info.textContent = `${remaining} available today`;
        } else {
            info.textContent = "Fully booked today";
        }

        if (remaining === 0) {
            eq.classList.add('disabled');
            eq.style.pointerEvents = 'none';
            eq.style.opacity = '0.5';
        } else {
            eq.classList.remove('disabled');
            eq.style.pointerEvents = 'auto';
            eq.style.opacity = '1';
        }
    });
}

// 🔹 Hover shows available quantity
equipments.forEach(eq => {
    eq.addEventListener('mouseenter', () => updateEquipmentAvailability());
});

// 🔹 Select an equipment
equipments.forEach(eq => {
    eq.addEventListener('click', () => {
        if (eq.classList.contains('disabled')) return;
        equipments.forEach(e => e.classList.remove('selected'));
        eq.classList.add('selected');
        selectedEquipment = eq.dataset.equipment;
        toDate.disabled = false;
    });
});

// 🔹 Proceed to date selection
toDate.addEventListener('click', () => {
    if (!selectedEquipment) return alert("Select an equipment first!");
    datetime.style.display = 'block';
    updateEquipmentAvailability();

    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + 14);
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = max.toISOString().split('T')[0];
});

// 🔹 Confirm booking
confirmButton.addEventListener('click', () => {
    const date = dateInput.value;
    if (!date || !selectedEquipment)
        return alert("Please select an equipment and date.");

    const user = JSON.parse(localStorage.getItem('user'));
    const pending = { type: 'equipment', equipment: selectedEquipment, date };

    if (!user) {
        alert("Please sign in before booking.");
        localStorage.setItem("pendingEquipmentBooking", JSON.stringify(pending));
        localStorage.setItem("redirectAfterLogin", "equipment.html");
        window.location.href = "../../auth/signin.html";
        return;
    }

    const bookings = getBookingsArray();
    const bookedCount = bookings.filter(b => {
        const bookedName = b?.equipment || b?.room || b?.name;
        return bookedName === selectedEquipment && b?.date === date;
    }).length;

    if (bookedCount >= MAX_PER_DAY)
        return alert("All units are already booked for that day!");

    const booking = {
        type: 'Equipment',
        equipment: selectedEquipment,
        room: selectedEquipment,
        startTime: 'All day',
        endTime: 'All day',
        user: user.username,
    };
    saveBooking(booking);

    document.querySelector('.equipment-selection').style.display = 'none';
    datetime.style.display = 'none';
    confirmation.style.display = 'block';
    summary.innerHTML = `
        <strong>Equipment:</strong> ${booking.equipment}<br>
        <strong>Date:</strong> ${booking.date}<br><br>
        Booking successfully confirmed for 24 hours!
    `;
    updateEquipmentAvailability();
});


function sendEquipmentBookingToDB(booking) {
    fetch('../../backend/php/bookings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: "equipment",
            userId: booking.userId,
            equipmentId: booking.equipmentId,
            date: booking.date
        })
    });
}
