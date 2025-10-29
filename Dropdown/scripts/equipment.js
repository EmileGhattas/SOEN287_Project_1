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
const confirmBtn = document.getElementById('confirm');
const dateInput = document.getElementById('date');
const startInput = document.getElementById('startTime');
const endInput = document.getElementById('endTime');

if (confirmBtn) {
  confirmBtn.addEventListener('click', () => {
    if (!selectedName && items.length) {
      const first = items[0];
      selectedName = first.getAttribute('data-name') || first.textContent.trim();
      first.classList.add('selected');
    }

    const date = dateInput ? dateInput.value : '';
    const startTime = startInput ? startInput.value : '';
    const endTime = endInput ? endInput.value : '';

    if (!selectedName || !date || !startTime || !endTime) {
      alert('Please choose equipment and fill in date/time.');
      return;
    }

    saveBooking({
      room: selectedName,
      date,
      startTime,
      endTime,
      type: 'Equipment'
    });
    alert('Equipment successfully booked!\nIt is now visible on My Bookings.');
  });
}


const toDateBtn = document.getElementById('toDate');
const dateSection = document.querySelector('.date-selection');

if (toDateBtn && dateSection) {
  try { dateSection.style.display = dateSection.style.display || 'none'; } catch(e){}
  toDateBtn.addEventListener('click', () => {
    if (!selectedName) {
      alert('Please select equipment first.');
      return;
    }
    dateSection.style.display = 'block';
    dateSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function flashConfirm(btn) {
  if (!btn) return;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Booked! ✓';
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = original;
  }, 1200);
}

const MAX_EQUIPMENT_PER_DAY = 5;

// Reset daily equipment availability
function resetEquipmentDaily() {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = localStorage.getItem('equipmentLastReset');
    if (lastReset !== today) {
        localStorage.removeItem('equipmentBookings');
        localStorage.setItem('equipmentLastReset', today);
    }
}

// Count how many of one equipment are booked on a date
function countEquipmentBookings(equipmentName, date) {
    const bookings = JSON.parse(localStorage.getItem('equipmentBookings') || '[]');
    return bookings.filter(b => b.equipment === equipmentName && b.date === date).length;
}

// Disable unavailable equipment
function updateEquipmentAvailability() {
    const equipments = document.querySelectorAll('.equipment');
    const today = new Date().toISOString().split('T')[0];
    const bookings = JSON.parse(localStorage.getItem('equipmentBookings') || '[]');

    equipments.forEach(eq => {
        const name = eq.dataset.equipment;
        const booked = countEquipmentBookings(name, today);
        const remaining = Math.max(0, MAX_EQUIPMENT_PER_DAY - booked);

        // Tooltip or message
        const info = eq.querySelector('.equipment-info');
        if (info) info.textContent = remaining > 0
            ? `${remaining} available today`
            : "Fully booked";

        if (remaining <= 0) {
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

// Hook into confirm button (requires login + limit check)
const confirmButton = document.getElementById('confirm');
if (confirmButton) {
    confirmButton.addEventListener('click', () => {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!user) {
            alert("Please sign in before booking.");
            window.location.href = "../SignIn/indexsignin.html";
            return;
        }

        const selectedEquipment = localStorage.getItem('selectedEquipment');
        const date = document.getElementById('date')?.value;

        if (!selectedEquipment || !date) {
            alert("Please select an equipment and date first.");
            return;
        }

        const booked = countEquipmentBookings(selectedEquipment, date);
        if (booked >= MAX_EQUIPMENT_PER_DAY) {
            alert("No more units available for this equipment today!");
            return;
        }

        const booking = {
            equipment: selectedEquipment,
            date,
            user: user.email,
            duration: "24h"
        };

        const arr = JSON.parse(localStorage.getItem('equipmentBookings') || '[]');
        arr.push(booking);
        localStorage.setItem('equipmentBookings', JSON.stringify(arr));

        alert(`Booking confirmed for ${selectedEquipment} on ${date}.`);
        updateEquipmentAvailability();
    });
}

// Run updates on page load
resetEquipmentDaily();
updateEquipmentAvailability();