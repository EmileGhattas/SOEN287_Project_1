
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
  // Backward compatibility: also set the last single booking (optional)
  saveBooking(booking);
  saveBooking(booking);
}

const rooms = document.querySelectorAll('.room')
const dateInput = document.getElementById('date');
const toDate = document.getElementById('toDate');
const datetime = document.getElementById('datetime');
const confirmButton = document.getElementById('confirm');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const confirmation = document.getElementById('confirmation');
const summary = document.getElementById('summary');


let selectedRoom = "";
rooms.forEach(room =>{
    room.addEventListener('click', () => {
        rooms.forEach(r => r.classList.remove('selected'));

        room.classList.add('selected');

        selectedRoom = room.textContent.trim();

        toDate.disabled = false;

    });
});

toDate.addEventListener('click', () => {
    if(selectedRoom === ""){
        alert("Please select a room first.");
        return;
    }
    datetime.style.display = 'block';

    // Display today's date
    const date= new Date();
    const format = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}
    document.getElementById('currentDate').textContent = date.toLocaleDateString('en-US', format);

//Restrict the date to present date
    const today = new Date();
    const maxdate = new Date();
    maxdate.setDate(today.getDate() + 14);
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxdate.toISOString().split('T')[0];


});


confirmButton.addEventListener('click', () => {
    const inDate = dateInput.value;
    const inStartTime = startTime.value;
    const inEndTime = endTime.value;


    if (!inDate || !inStartTime || !inEndTime){
        alert("Please fill in all the required fields.");
    }

    //need to change to send alert when booking > 4 hours
    if((inEndTime - inStartTime) > 4){
        alert("Bookings cannot exceed 4 hours.");
    }

    const booking = {
        room: selectedRoom,
        date: inDate,
        startTime : inStartTime,
        endTime : inEndTime
    };

    saveBooking(booking);

    //Confirm Booking
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

function getBookings(){
    return JSON.parse(localStorage.getItem("booking"));
}