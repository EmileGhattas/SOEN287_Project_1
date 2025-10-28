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
