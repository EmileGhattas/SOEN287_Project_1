const resourceSelect = document.getElementById("resourceSelect");
const resourceMeta = document.getElementById("resourceMeta");
const blackoutDate = document.getElementById("blackoutDate");
const blackoutList = document.getElementById("blackoutList");
const addBlackoutBtn = document.getElementById("addBlackoutBtn");
const saveHoursBtn = document.getElementById("saveHoursBtn");
const addExceptionBtn = document.getElementById("addExceptionBtn");

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

function renderMeta(resource) {
    if (!resourceMeta || !resource) return;
    resourceMeta.innerHTML = `
        <div><strong>Location:</strong> ${resource.location || "-"}</div>
        <div><strong>Capacity:</strong> ${resource.capacity ?? "-"}</div>
        <div><strong>Type:</strong> ${resource.type}</div>
    `;
}

function renderBlackouts(list) {
    blackoutList.innerHTML = "";
    if (!list.length) {
        blackoutList.innerHTML = "<li>No blackout dates.</li>";
        return;
    }

    list.forEach((date) => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${date.blackout_date}${date.reason ? ` - ${date.reason}` : ""}
            <button data-action="delete-blackout" data-id="${date.id || date.blackout_id}">X</button>
        `;
        blackoutList.appendChild(li);
    });
}

async function loadBlackouts(resourceId) {
    if (!resourceId) {
        blackoutList.innerHTML = "";
        return;
    }
    try {
        const res = await authFetch(`/api/resources/${resourceId}/blackouts`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load blackouts");
        renderBlackouts(data);
    } catch (err) {
        alert(err.message);
    }
}

async function loadResourceOptions() {
    const res = await authFetch("/api/resources");
    const data = await res.json();
    if (!res.ok) {
        alert(data.message || "Failed to load resources");
        return;
    }

    resourceSelect.innerHTML = '<option value="">Choose a resource</option>';
    data.forEach((r) => {
        const option = document.createElement("option");
        option.value = r.id;
        option.textContent = r.name;
        option.dataset.type = r.type;
        resourceSelect.appendChild(option);
    });

    const params = new URLSearchParams(window.location.search);
    const preselect = params.get("resourceId");
    if (preselect) {
        resourceSelect.value = preselect;
        const selected = data.find((r) => `${r.id}` === `${preselect}`);
        renderMeta(selected);
        loadBlackouts(preselect);
    }
}

async function addBlackout() {
    const resourceId = resourceSelect.value;
    if (!resourceId) return alert("Choose a resource.");
    if (!blackoutDate.value) return alert("Pick a date.");

    const res = await authFetch(`/api/resources/${resourceId}/blackouts`, {
        method: "POST",
        body: JSON.stringify({ blackout_date: blackoutDate.value }),
    });
    const data = await res.json();
    if (!res.ok) {
        alert(data.message || "Failed to add blackout");
        return;
    }
    renderBlackouts(data);
}

async function handleListClick(event) {
    const action = event.target.getAttribute("data-action");
    const itemId = event.target.getAttribute("data-id");
    const resourceId = resourceSelect.value;
    if (action !== "delete-blackout" || !itemId || !resourceId) return;

    const res = await authFetch(`/api/resources/${resourceId}/blackouts/${itemId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
        alert(data.message || "Failed to delete blackout");
        return;
    }
    renderBlackouts(data);
}

function attachUnsupportedHandlers() {
    if (saveHoursBtn) saveHoursBtn.addEventListener("click", () => alert("Hours are managed via default timeslots."));
    if (addExceptionBtn) addExceptionBtn.addEventListener("click", () => alert("Exceptions not available in this version."));
}

resourceSelect.addEventListener("change", (e) => {
    const selected = Array.from(resourceSelect.options).find((opt) => opt.value === e.target.value);
    renderMeta({
        name: selected?.textContent,
        type: selected?.dataset?.type,
    });
    loadBlackouts(e.target.value);
});

blackoutList.addEventListener("click", handleListClick);
addBlackoutBtn.addEventListener("click", addBlackout);

document.addEventListener("DOMContentLoaded", () => {
    if (!ensureAdmin()) return;
    attachUnsupportedHandlers();
    loadResourceOptions();
});
