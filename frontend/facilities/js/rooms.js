const ROOM_MAP = {
    "Room 1": 1,
    "Room 2": 2,
    "Room 3": 3,
    "Room 4": 4,
    "Room 5": 5,
    "Room 6": 6,
    "Room 7": 7,
    "Room 8": 8,
    "Room 9": 9,
    "Room 10": 10,
    "Conference Room A": 11,
    "Conference Room B": 12,
};

const rooms = document.querySelectorAll(".room");
const dateInput = document.getElementById("date");
const toDate = document.getElementById("toDate");
const datetime = document.getElementById("datetime");
const confirmButton = document.getElementById("confirm");
const timeslotSelect = document.getElementById("timeslot");
const confirmation = document.getElementById("confirmation");
const summary = document.getElementById("summary");

let selectedRoom = "";
let availableTimeslots = [];

function setDateBounds() {
    const today = new Date();
    const maxdate = new Date();
    maxdate.setDate(today.getDate() + 10);
    dateInput.min = today.toISOString().split("T")[0];
    dateInput.max = maxdate.toISOString().split("T")[0];
    if (!dateInput.value) {
        dateInput.value = today.toISOString().split("T")[0];
    }
}

function setSelectOptions(select, options) {
    select.innerHTML = "";
    options.forEach(({ value, label, disabled = false, selected = false }) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        opt.disabled = disabled;
        opt.selected = selected;
        select.appendChild(opt);
    });
}

async function updateAvailableTimeslots() {
    if (!selectedRoom) return;
    setDateBounds();
    const inDate = dateInput.value;
    const roomId = ROOM_MAP[selectedRoom] || selectedRoom;

    setSelectOptions(timeslotSelect, [{ value: "", label: "Loading times...", disabled: true, selected: true }]);
    timeslotSelect.disabled = true;

    try {
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("token");
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(
            `/api/bookings/availability/rooms/${roomId}?date=${encodeURIComponent(inDate)}&name=${encodeURIComponent(selectedRoom)}`,
            { headers }
        );
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Failed to load availability");
        }
        availableTimeslots = data.availableTimeslots || [];
        if (!availableTimeslots.length) {
            setSelectOptions(timeslotSelect, [
                { value: "", label: "No timeslots available", disabled: true, selected: true },
            ]);
            timeslotSelect.disabled = true;
            return;
        }
        setSelectOptions(timeslotSelect, [
            { value: "", label: "Select a timeslot", disabled: true, selected: true },
            ...availableTimeslots.map((slot) => ({ value: slot.timeslot_id, label: slot.label })),
        ]);
        timeslotSelect.disabled = false;
    } catch (err) {
        console.error("Failed to load availability", err);
        setSelectOptions(timeslotSelect, [
            { value: "", label: "Availability unavailable", disabled: true, selected: true },
        ]);
        timeslotSelect.disabled = true;
        alert(err.message || "Could not load available timeslots");
    }
}

rooms.forEach((room) => {
    room.addEventListener("click", () => {
        rooms.forEach((r) => r.classList.remove("selected"));
        room.classList.add("selected");
        selectedRoom = room.textContent.trim();
        toDate.disabled = false;
    });
});

toDate.addEventListener("click", () => {
    if (!selectedRoom) {
        alert("Please select a room first.");
        return;
    }
    datetime.style.display = "block";

    const date = new Date();
    const format = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    document.getElementById("currentDate").textContent = date.toLocaleDateString("en-US", format);

    setDateBounds();
    updateAvailableTimeslots();
});

dateInput.addEventListener("change", updateAvailableTimeslots);

confirmButton.addEventListener("click", () => {
    const inDate = dateInput.value;
    const timeslotId = timeslotSelect.value;

    if (!inDate || !timeslotId) {
        alert("Please select a date and timeslot.");
        return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    const booking = {
        type: "room",
        room: selectedRoom,
        date: inDate,
        timeslotId,
        roomId: ROOM_MAP[selectedRoom] || null,
    };

    if (!user) {
        localStorage.setItem("pendingBooking", JSON.stringify(booking));
        alert("Please sign in to complete your booking.");
        window.location.href = "../../auth/signin.html";
        return;
    }

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch("/api/bookings", {
        method: "POST",
        headers,
        body: JSON.stringify({
            bookingType: "room",
            bookingDate: booking.date,
            roomId: booking.roomId,
            roomName: booking.room,
            timeslotId: booking.timeslotId,
        }),
    })
        .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || "Room booking failed");
            }
            datetime.style.display = "none";
            document.querySelector(".room-selection").style.display = "none";
            confirmation.style.display = "block";
            summary.innerHTML = `
                <strong>Room:</strong> ${booking.room}<br>
                <strong>Date:</strong> ${booking.date}<br>
                <strong>Time:</strong> ${availableTimeslots.find((t) => `${t.timeslot_id}` === `${timeslotId}`)?.label || ""}<br><br>
                Room successfully booked!
            `;
        })
        .catch((err) => {
            console.error("Room booking failed", err);
            alert(err.message || "Failed to book room");
        });
});
