const labList = document.getElementById("lab-list");
const dateInput = document.getElementById("date");
const confirmBtn = document.getElementById("confirm");
const labSlots = document.getElementById("slot");
const selectionSection = document.querySelector(".lab-selection");
const confirmation = document.getElementById("confirmation");
const summary = document.getElementById("summary");
const toDate = document.getElementById("toDate");

let selectedLab = null;
let availableSlots = [];
let labsCatalog = [];
function resolveImagePath(path) {
    if (!path || typeof path !== "string") return "";
    return path.trim();
}

function getAuthToken() {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token && !sessionStorage.getItem("token")) {
        sessionStorage.setItem("token", token);
        localStorage.removeItem("token");
    }
    return token;
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
    if (!selectedLab) return;
    setDateBounds();
    const inDate = dateInput.value;
    setSelectOptions(labSlots, [{ value: "", label: "Loading slots...", disabled: true, selected: true }]);
    labSlots.disabled = true;

    try {
        const headers = { "Content-Type": "application/json" };
        const token = getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(
            `/api/bookings/availability/${selectedLab.id}?date=${encodeURIComponent(inDate)}`,
            { headers }
        );
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || "Failed to load availability");
        }
        availableSlots = data.available || [];
        if (!availableSlots.length) {
            setSelectOptions(labSlots, [
                { value: "", label: "No slots available", disabled: true, selected: true },
            ]);
            labSlots.disabled = true;
            return;
        }
        setSelectOptions(labSlots, [
            { value: "", label: "Select a slot", disabled: true, selected: true },
            ...availableSlots.map((slot) => ({ value: slot.id, label: slot.label })),
        ]);
        labSlots.disabled = false;
    } catch (err) {
        console.error(err);
        setSelectOptions(labSlots, [{ value: "", label: "Availability unavailable", disabled: true, selected: true }]);
        alert(err.message || "Could not load lab availability");
    }
}

function renderLabs() {
    labList.innerHTML = "";
    labsCatalog.forEach((lab) => {
        const card = document.createElement("div");
        card.className = "lab";
        card.dataset.id = lab.id;
        const imageSrc = resolveImagePath(lab.image_path || lab.image_url);
        const description = lab.description || "No description provided.";
        const capacity = lab.capacity ?? "N/A";
        const location = lab.location || "N/A";
        const imageMarkup = imageSrc ? `<img class="info-image" src="${imageSrc}" alt="${lab.name} image">` : "";
        card.innerHTML = `
            <h3>${lab.name}</h3>
            <div class="lab-meta">Capacity: ${capacity}</div>
            <div class="lab-info">
                ${imageMarkup}
                <div><strong>Capacity:</strong> ${capacity}</div>
                <div><strong>Location:</strong> ${location}</div>
                <div>${description}</div>
            </div>
        `;
        card.addEventListener("click", () => {
            document.querySelectorAll(".lab").forEach((l) => l.classList.remove("selected"));
            card.classList.add("selected");
            selectedLab = lab;
            toDate.disabled = false;
        });
        labList.appendChild(card);
    });
}

async function loadLabs() {
    try {
        const res = await fetch("/api/bookings/labs");
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load labs");
        labsCatalog = Array.isArray(data) ? data.map((l) => ({ ...l, id: l.id || l.lab_id })) : [];
        renderLabs();
    } catch (err) {
        console.error("Failed to load labs", err);
        labList.innerHTML = "<p>Unable to load labs.</p>";
    }
}

dateInput.addEventListener("change", loadAvailability);

toDate.addEventListener("click", () => {
    if (!selectedLab) {
        alert("Please select a lab first.");
        return;
    }
    document.getElementById("datetime").style.display = "block";
    loadAvailability();
});

confirmBtn.addEventListener("click", () => {
    const inDate = dateInput.value;
    const timeslotId = labSlots.value;
    if (!selectedLab || !inDate || !timeslotId) {
        alert("Please pick a lab, date, and slot.");
        return;
    }

    const token = getAuthToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch("/api/bookings", {
        method: "POST",
        headers,
        body: JSON.stringify({
            resourceId: selectedLab.id,
            bookingDate: inDate,
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
                <strong>Lab:</strong> ${selectedLab.name}<br>
                <strong>Date:</strong> ${inDate}<br>
                <strong>Slot:</strong> ${availableSlots.find((s) => `${s.id}` === `${timeslotId}`)?.label || ""}<br><br>
                Lab successfully booked!
            `;
        })
        .catch((err) => {
            console.error(err);
            alert(err.message || "Failed to book lab");
        });
});

setDateBounds();
loadLabs();
