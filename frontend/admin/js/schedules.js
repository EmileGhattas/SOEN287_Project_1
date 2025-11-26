const resourceTypeSelect = document.getElementById("resourceType");
const resourceSelect = document.getElementById("resourceSelect");
const refreshResourceBtn = document.getElementById("refreshResource");
const summaryName = document.getElementById("summaryName");
const summaryDescription = document.getElementById("summaryDescription");
const summaryType = document.getElementById("summaryType");
const summaryLocation = document.getElementById("summaryLocation");
const summaryCapacity = document.getElementById("summaryCapacity");
const disableToggle = document.getElementById("disableToggle");

const blackoutForm = document.getElementById("blackoutForm");
const blackoutStart = document.getElementById("blackoutStart");
const blackoutEnd = document.getElementById("blackoutEnd");
const blackoutReason = document.getElementById("blackoutReason");
const blackoutList = document.getElementById("blackoutList");

const timeslotGrid = document.getElementById("timeslotGrid");
const timeslotBlock = document.getElementById("timeslotBlock");
const timeslotDate = document.getElementById("timeslotDate");
const customStart = document.getElementById("customStart");
const customEnd = document.getElementById("customEnd");
const addTimeslotBtn = document.getElementById("addTimeslot");

const equipmentBlock = document.getElementById("equipmentBlock");
const equipmentForm = document.getElementById("equipmentForm");
const equipmentQuantity = document.getElementById("equipmentQuantity");
const equipStart = document.getElementById("equipStart");
const equipEnd = document.getElementById("equipEnd");

let resourcesCache = [];
let selectedResource = null;
let timeslotState = [];

const defaultSlots = [
    "09:00-10:30",
    "10:30-12:00",
    "12:00-13:30",
    "13:30-15:00",
    "15:00-16:30",
    "16:30-18:00",
    "18:00-19:30",
    "19:30-21:00",
    "21:00-22:30",
];

function getAuthToken() {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token && !sessionStorage.getItem("token")) {
        sessionStorage.setItem("token", token);
        localStorage.removeItem("token");
    }
    return token;
}

function getStoredUser() {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (raw && !sessionStorage.getItem("user")) {
        sessionStorage.setItem("user", raw);
        localStorage.removeItem("user");
    }
    try {
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.warn("Unable to parse user", err);
        return null;
    }
}

function ensureAdmin() {
    try {
        const user = getStoredUser();
        if (!user?.is_admin) {
            window.location.href = "/adminsignin";
            return false;
        }
        return true;
    } catch (err) {
        window.location.href = "/adminsignin";
        return false;
    }
}

async function authFetch(url, options = {}) {
    const token = getAuthToken();
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
        alert("Admin access required. Please sign in again.");
        window.location.href = "/adminsignin";
        throw new Error("Unauthorized");
    }
    return response;
}

function setSummary(resource) {
    selectedResource = resource || null;
    if (!resource) {
        summaryName.textContent = "Select a resource to view details";
        summaryDescription.textContent = "";
        summaryType.textContent = summaryLocation.textContent = summaryCapacity.textContent = "-";
        disableToggle.checked = false;
        return;
    }
    summaryName.textContent = resource.name || "Resource";
    summaryDescription.textContent = resource.description || "";
    summaryType.textContent = resource.type || "-";
    summaryLocation.textContent = resource.location || "-";
    summaryCapacity.textContent = resource.type === "equipment"
        ? resource.quantity ?? "-"
        : resource.capacity ?? "-";
}

async function loadResources() {
    const res = await authFetch("/api/resources");
    const data = await res.json().catch(() => []);
    if (!res.ok) {
        alert(data.message || "Failed to load resources");
        return;
    }
    resourcesCache = data;
    renderResourceOptions();
    preloadSelection();
}

function renderResourceOptions() {
    const type = resourceTypeSelect.value;
    const filtered = resourcesCache.filter((r) => r.type === type);
    resourceSelect.innerHTML = '<option value="">Choose a resource</option>';
    filtered.forEach((resource) => {
        const opt = document.createElement("option");
        opt.value = resource.id || resource.resource_id;
        opt.textContent = resource.name;
        resourceSelect.appendChild(opt);
    });
}

function preloadSelection() {
    const params = new URLSearchParams(window.location.search);
    const preselect = params.get("resourceId");
    if (preselect) {
        const match = resourcesCache.find((r) => `${r.id}` === `${preselect}`);
        if (match) {
            resourceTypeSelect.value = match.type;
            renderResourceOptions();
            resourceSelect.value = `${preselect}`;
            handleResourceChange();
        }
    }
}

async function loadResourceDetails(resourceId) {
    if (!resourceId) return;
    const res = await authFetch(`/api/resources/${resourceId}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        alert(data?.message || "Failed to load resource details");
        return;
    }
    setSummary(data);
    toggleSections(data.type);
    await Promise.all([loadBlackouts(resourceId), loadTimeslots(resourceId), hydrateEquipment(resourceId, data)]);
}

function toggleSections(type) {
    if (timeslotBlock) timeslotBlock.style.display = type === "equipment" ? "none" : "block";
    if (equipmentBlock) equipmentBlock.style.display = type === "equipment" ? "block" : "none";
}

function renderBlackouts(list) {
    blackoutList.innerHTML = "";
    if (!list || !list.length) {
        blackoutList.innerHTML = '<p class="muted">No active blackouts.</p>';
        return;
    }
    list.forEach((item) => {
        const row = document.createElement("div");
        row.className = "list-row";
        row.innerHTML = `
            <div>
                <strong>${item.blackout_date}</strong>
                ${item.reason ? `<span class="muted">• ${item.reason}</span>` : ""}
            </div>
            <button class="btn delete" data-action="delete-blackout" data-id="${item.id || item.blackout_id}">Remove</button>
        `;
        blackoutList.appendChild(row);
    });
}

async function loadBlackouts(resourceId) {
    if (!resourceId) return;
    const res = await authFetch(`/api/resources/${resourceId}/blackouts`);
    const data = await res.json().catch(() => []);
    if (!res.ok) {
        alert(data.message || "Failed to load blackouts");
        return;
    }
    renderBlackouts(data);
}

function buildDateRange(start, end) {
    const dates = [];
    const current = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(current.getTime()) || Number.isNaN(endDate.getTime())) return dates;
    while (current <= endDate) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

async function addBlackoutRange(event) {
    event.preventDefault();
    const resourceId = resourceSelect.value;
    if (!resourceId) return alert("Select a resource first.");
    if (!blackoutStart.value || !blackoutEnd.value) return alert("Please choose start and end dates.");

    const dates = buildDateRange(blackoutStart.value, blackoutEnd.value);
    if (!dates.length) return alert("Invalid date range.");

    for (const date of dates) {
        // eslint-disable-next-line no-await-in-loop
        const res = await authFetch(`/api/resources/${resourceId}/blackouts`, {
            method: "POST",
            body: JSON.stringify({ blackout_date: date, reason: blackoutReason.value || undefined }),
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) {
            alert(data.message || "Failed to add blackout");
            break;
        }
        renderBlackouts(data);
    }
    blackoutForm.reset();
}

async function handleBlackoutClick(event) {
    const action = event.target.getAttribute("data-action");
    if (action !== "delete-blackout") return;
    const resourceId = resourceSelect.value;
    const blackoutId = event.target.getAttribute("data-id");
    if (!resourceId || !blackoutId) return;

    const res = await authFetch(`/api/resources/${resourceId}/blackouts/${blackoutId}`, { method: "DELETE" });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
        alert(data.message || "Failed to remove blackout");
        return;
    }
    renderBlackouts(data);
}

function parseSlot(label) {
    const [start, end] = label.split("-");
    return { start_time: start, end_time: end, label };
}

function normalizeTimeslots(raw) {
    const base = defaultSlots.map(parseSlot);
    const merged = [...base];
    if (Array.isArray(raw)) {
        raw.forEach((slot) => {
            if (!slot?.label) return;
            const exists = merged.some((s) => s.label === slot.label);
            if (!exists) merged.push({
                id: slot.id,
                label: slot.label,
                start_time: slot.start_time || slot.label.split("-")[0],
                end_time: slot.end_time || slot.label.split("-")[1],
                is_active: slot.is_active !== false,
            });
        });
    }
    return merged.map((slot, index) => ({
        id: slot.id || index + 1,
        label: slot.label,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: slot.is_active !== false,
        is_hidden: slot.is_active === false,
    }));
}

function renderTimeslots(list) {
    timeslotGrid.innerHTML = "";
    if (!list.length) {
        timeslotGrid.innerHTML = '<p class="muted">No timeslots configured.</p>';
        return;
    }
    list.forEach((slot) => {
        const card = document.createElement("div");
        card.className = "timeslot-card";
        if (slot.is_hidden === true || slot.is_active === false) card.classList.add("is-disabled");
        card.innerHTML = `
            <div class="timeslot-label">
                <strong>${slot.label}</strong>
                <span class="muted">${slot.start_time} - ${slot.end_time}</span>
            </div>
            <div class="timeslot-controls">
                <label class="toggle small">
                    <input type="checkbox" data-action="toggle-slot" data-id="${slot.id}" ${slot.is_active !== false ? "checked" : ""}>
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">Available</span>
                </label>
                <button class="btn" data-action="hide-slot" data-id="${slot.id}">${slot.is_hidden ? "Unhide" : "Hide"}</button>
            </div>
        `;
        timeslotGrid.appendChild(card);
    });
}

async function loadTimeslots(resourceId) {
    if (!resourceId || resourceTypeSelect.value === "equipment") {
        timeslotState = [];
        renderTimeslots([]);
        return;
    }
    const dateParam = timeslotDate.value || new Date().toISOString().slice(0, 10);
    try {
        const res = await authFetch(`/api/resources/${resourceId}/availability?date=${encodeURIComponent(dateParam)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load availability");
        const combined = [...(data.available || []), ...(data.booked || [])];
        timeslotState = normalizeTimeslots(combined);
        renderTimeslots(timeslotState);
    } catch (err) {
        console.error(err);
        timeslotState = normalizeTimeslots();
        renderTimeslots(timeslotState);
    }
}

async function updateTimeslotState(slotId, updates) {
    if (!selectedResource) return;
    const payload = { timeslotUpdates: [{ id: slotId, ...updates }] };
    const res = await authFetch(`/api/resources/${selectedResource.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to update timeslot");
    }
}

function handleTimeslotClick(event) {
    const action = event.target.getAttribute("data-action");
    if (!action) return;
    const slotId = event.target.getAttribute("data-id");
    const slot = timeslotState.find((s) => `${s.id}` === `${slotId}`);
    if (!slot) return;

    if (action === "toggle-slot") {
        slot.is_active = event.target.checked;
        slot.is_hidden = !event.target.checked;
        renderTimeslots(timeslotState);
        updateTimeslotState(slot.id, { is_active: slot.is_active });
    }

    if (action === "hide-slot") {
        slot.is_hidden = !slot.is_hidden;
        slot.is_active = !slot.is_hidden;
        renderTimeslots(timeslotState);
        updateTimeslotState(slot.id, { is_active: slot.is_active });
    }
}

function addCustomSlot(event) {
    event.preventDefault();
    if (!selectedResource) return alert("Select a resource first.");
    if (selectedResource.type === "equipment") return alert("Custom timeslots are for rooms and labs.");

    if (!customStart.value || !customEnd.value) return alert("Provide start and end times.");
    const label = `${customStart.value}-${customEnd.value}`;
    const newSlot = {
        id: `custom-${Date.now()}`,
        label,
        start_time: customStart.value,
        end_time: customEnd.value,
        is_active: true,
        is_hidden: false,
    };
    timeslotState.push(newSlot);
    renderTimeslots(timeslotState);
    updateTimeslotState(newSlot.id, newSlot);
}

async function hydrateEquipment(resourceId, resource) {
    if (!equipmentForm || resource?.type !== "equipment") return;
    equipmentQuantity.value = resource.quantity ?? "";
}

async function saveEquipment(event) {
    event.preventDefault();
    if (!selectedResource || selectedResource.type !== "equipment") return alert("Choose equipment to update.");
    const payload = {
        quantity: equipmentQuantity.value === "" ? null : Number(equipmentQuantity.value),
        availability_start: equipStart.value || null,
        availability_end: equipEnd.value || null,
    };
    const res = await authFetch(`/api/resources/${selectedResource.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        alert(data.message || "Failed to update equipment availability");
        return;
    }
    alert("Equipment availability updated.");
}

async function toggleDisable(event) {
    if (!selectedResource) return;
    const res = await authFetch(`/api/resources/${selectedResource.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_disabled: event.target.checked }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Unable to update resource state");
    }
}

function handleResourceChange() {
    const resourceId = resourceSelect.value;
    if (!resourceId) {
        setSummary(null);
        renderBlackouts([]);
        renderTimeslots([]);
        return;
    }
    const resource = resourcesCache.find((r) => `${r.id}` === `${resourceId}`);
    if (resource) setSummary(resource);
    loadResourceDetails(resourceId);
}

function init() {
    if (!ensureAdmin()) return;
    timeslotDate.value = new Date().toISOString().slice(0, 10);
    loadResources();
}

resourceTypeSelect?.addEventListener("change", renderResourceOptions);
resourceSelect?.addEventListener("change", handleResourceChange);
refreshResourceBtn?.addEventListener("click", loadResources);
blackoutForm?.addEventListener("submit", addBlackoutRange);
blackoutList?.addEventListener("click", handleBlackoutClick);
timeslotGrid?.addEventListener("click", handleTimeslotClick);
addTimeslotBtn?.addEventListener("click", addCustomSlot);
if (timeslotDate) timeslotDate.addEventListener("change", () => loadTimeslots(resourceSelect.value));
if (equipmentForm) equipmentForm.addEventListener("submit", saveEquipment);
if (disableToggle) disableToggle.addEventListener("change", toggleDisable);

document.addEventListener("DOMContentLoaded", init);
