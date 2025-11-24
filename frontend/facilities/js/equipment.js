const equipmentList = document.getElementById('equipment-list');
const dateInput = document.getElementById('date');
const datetime = document.getElementById('datetime');
const confirmButton = document.getElementById('confirm');
const summary = document.getElementById('summary');
const confirmation = document.getElementById('confirmation');
const toDate = document.getElementById('Next');
const quantityInput = document.getElementById('quantity');

let selectedEquipment = "";
let selectedEquipmentId = null;
let totalQuantity = 0;
let equipmentCatalog = [];

function renderEquipment() {
    equipmentList.innerHTML = "";
    equipmentCatalog.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'equipment';
        card.dataset.id = item.equipment_id;
        card.dataset.name = item.name;
        card.innerHTML = `
            <div class="equipment-name">${item.name}</div>
            <div class="equipment-info">${item.total_quantity} total</div>
        `;
        card.addEventListener('click', () => {
            document.querySelectorAll('.equipment').forEach((e) => e.classList.remove('selected'));
            card.classList.add('selected');
            selectedEquipment = item.name;
            selectedEquipmentId = item.equipment_id;
            totalQuantity = item.total_quantity;
            toDate.disabled = false;
        });
        equipmentList.appendChild(card);
    });
}

async function loadEquipment() {
    try {
        const res = await fetch('/api/bookings/equipment');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load equipment');
        equipmentCatalog = Array.isArray(data) ? data : [];
        renderEquipment();
    } catch (err) {
        console.error('Failed to load equipment', err);
        equipmentList.innerHTML = '<p>Unable to load equipment.</p>';
    }
}

async function refreshAvailability() {
    if (!selectedEquipmentId || !dateInput.value) return;
    try {
        const res = await fetch(`/api/bookings/availability/equipment/${selectedEquipmentId}?date=${encodeURIComponent(dateInput.value)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Availability unavailable');
        const available = data.available_quantity ?? data.availableQuantity ?? totalQuantity;
        const infoEl = document.querySelector('.equipment.selected .equipment-info');
        if (infoEl) {
            infoEl.textContent = `${available} available on ${dateInput.value}`;
        }
        quantityInput.max = Math.max(1, available);
        if (Number(quantityInput.value) > available) {
            quantityInput.value = available || 1;
        }
    } catch (err) {
        console.error('Failed to load equipment availability', err);
    }
}

// 🔹 Proceed to date selection
toDate.addEventListener('click', () => {
    if (!selectedEquipment) return alert("Select an equipment first!");
    datetime.style.display = 'block';

    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + 14);
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = max.toISOString().split('T')[0];
    if (!dateInput.value) {
        dateInput.value = today.toISOString().split('T')[0];
    }
    refreshAvailability();
});

dateInput.addEventListener('change', refreshAvailability);

// 🔹 Confirm booking
confirmButton.addEventListener('click', () => {
    const date = dateInput.value;
    const quantity = Number(quantityInput.value) || 1;
    if (!date || !selectedEquipmentId)
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

    const booking = {
        type: 'equipment',
        equipment: selectedEquipment,
        equipmentId: selectedEquipmentId,
        date,
        quantity,
    };
    sendEquipmentBookingToDB(booking);
});


function sendEquipmentBookingToDB(booking) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    fetch('/api/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            bookingType: "equipment",
            equipmentId: booking.equipmentId,
            bookingDate: booking.date,
            quantity: booking.quantity
        })
    })
        .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'Equipment booking failed');
            }
            document.querySelector('.equipment-selection').style.display = 'none';
            datetime.style.display = 'none';
            confirmation.style.display = 'block';
            summary.innerHTML = `
                <strong>Equipment:</strong> ${booking.equipment}<br>
                <strong>Date:</strong> ${booking.date}<br>
                <strong>Quantity:</strong> ${booking.quantity}<br><br>
                Booking successfully confirmed for 24 hours!
            `;
            refreshAvailability();
        })
        .catch(err => {
            console.error('Equipment booking failed', err);
            alert(err.message || 'Failed to book equipment');
        });
}

loadEquipment();
