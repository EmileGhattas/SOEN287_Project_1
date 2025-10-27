//getting all info from room.html
const rooms = document.querySelectorAll('.room')
const dateInput = document.getElementById('date');

let selectedRoom = "";
rooms.forEach(room =>{
    room.addEventListener('click', () => {
        rooms.forEach(r => r.classList.remove('selected'));

        room.classList.add('selected');

        selectedRoom = room.textContent.trim();

    });
});
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
