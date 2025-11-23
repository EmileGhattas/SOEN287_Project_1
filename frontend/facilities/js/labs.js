const labs = document.querySelectorAll(".lab");
const dateInput = document.getElementById("date");
const confirmBtn = document.getElementById("confirm");
const labSlots = document.getElementById("slot");
const selectionSection = document.querySelector(".lab-selection");
const confirmation = document.getElementById("confirmation");
const summary = document.getElementById("summary");

let selectedLab = "";
let selectedLabId = null;
let availableSlots = [];

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

async function loadAvailability() {
    if (!selectedLabId) return;
    setDateBounds();
    const inDate = dateInput.value;
    setSelectOptions(labSlots, [{ value: "", label: "Loading slots...", disabled: true, selected: true }]);
    labSlots.disabled = true;

    try {
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("token");
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(
            `/api/bookings/availability/labs/${selectedLabId}?date=${encodeURIComponent(inDate)}&name=${encodeURIComponent(selectedLab)}`,
            { headers }
        );
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Failed to load availability");
        }
        availableSlots = data.availableTimeslots || [];
        if (!availableSlots.length) {
            setSelectOptions(labSlots, [
                { value: "", label: "No slots available", disabled: true, selected: true },
            ]);
            labSlots.disabled = true;
            return;
        }
        setSelectOptions(labSlots, [
            { value: "", label: "Select a slot", disabled: true, selected: true },
            ...availableSlots.map((slot) => ({ value: slot.timeslot_id, label: slot.label })),
        ]);
        labSlots.disabled = false;
    } catch (err) {
        console.error(err);
        setSelectOptions(labSlots, [{ value: "", label: "Availability unavailable", disabled: true, selected: true }]);
        alert(err.message || "Could not load lab availability");
    }
}

labs.forEach((lab) => {
    lab.addEventListener("click", () => {
        labs.forEach((l) => l.classList.remove("selected"));
        lab.classList.add("selected");
        selectedLab = lab.querySelector("h3").textContent.trim();
        selectedLabId = lab.dataset.id ? Number(lab.dataset.id) : null;
        if (!selectedLabId) {
            const match = selectedLab.match(/Lab (\d+)/i);
            if (match) {
                selectedLabId = Number(match[1]);
            }
        }
        loadAvailability();
    });
});

dateInput.addEventListener("change", loadAvailability);

confirmBtn.addEventListener("click", () => {
    const inDate = dateInput.value;
    const timeslotId = labSlots.value;
    if (!selectedLabId || !inDate || !timeslotId) {
        alert("Please pick a lab, date, and slot.");
        return;
    }

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch("/api/bookings", {
        method: "POST",
        headers,
        body: JSON.stringify({
            bookingType: "lab",
            bookingDate: inDate,
            labId: selectedLabId,
            timeslotId,
        }),
    })
        .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || "Failed to book lab");
            }
            if (selectionSection) selectionSection.style.display = "none";
            confirmation.style.display = "block";
            summary.innerHTML = `
                <strong>Lab:</strong> ${selectedLab}<br>
                <strong>Date:</strong> ${inDate}<br>
                <strong>Slot:</strong> ${availableSlots.find((s) => `${s.timeslot_id}` === `${timeslotId}`)?.label || ""}<br><br>
                Lab successfully booked!
            `;
        })
        .catch((err) => {
            console.error(err);
            alert(err.message || "Failed to book lab");
        });
});

setDateBounds();
