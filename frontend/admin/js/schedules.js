const resourceSelect = document.getElementById("resourceSelect");
const resourceMeta = document.getElementById("resourceMeta");
const openTime = document.getElementById("openTime");
const closeTime = document.getElementById("closeTime");
const exceptionDate = document.getElementById("exceptionDate");
const exceptionOpen = document.getElementById("exceptionOpen");
const exceptionClose = document.getElementById("exceptionClose");
const blackoutDate = document.getElementById("blackoutDate");
const exceptionList = document.getElementById("exceptionList");
const blackoutList = document.getElementById("blackoutList");

const saveHoursBtn = document.getElementById("saveHoursBtn");
const addExceptionBtn = document.getElementById("addExceptionBtn");
const addBlackoutBtn = document.getElementById("addBlackoutBtn");

async function loadResourceOptions() {
    const resources = await window.resourceAPI.loadResources();

    resourceSelect.innerHTML = '<option value="">Choose a resource</option>';
    resources.forEach((res) => {
        const option = document.createElement("option");
        option.value = res.resource_id;
        option.textContent = res.name;
        resourceSelect.appendChild(option);
    });

    const params = new URLSearchParams(window.location.search);
    const preselect = params.get("resourceId");
    if (preselect) {
        resourceSelect.value = preselect;
        loadSchedule(preselect);
    }
}

function renderMeta(resourceId) {
    const resource = (window.resourceAPI.cache || []).find((r) => `${r.resource_id}` === `${resourceId}`);
    if (!resource) {
        resourceMeta.innerHTML = "";
        return;
    }

    const usage = resource.usage || {};
    const availability = resource.availability;
    resourceMeta.innerHTML = `
        <div><strong>Location:</strong> ${resource.location || "-"}</div>
        <div><strong>Capacity:</strong> ${resource.capacity ?? "-"}</div>
        <div><strong>Usage:</strong> ${usage.bookings || 0} bookings, ${usage.exceptions || 0} exceptions, ${
        usage.blackoutDays || 0
    } blackouts</div>
        ${availability ? `<div><strong>Current Hours:</strong> ${availability.open_time} - ${availability.close_time}</div>` : ""}
    `;
}

async function loadSchedule(resourceId) {
    if (!resourceId) {
        resourceMeta.innerHTML = "";
        openTime.value = "";
        closeTime.value = "";
        exceptionList.innerHTML = "";
        blackoutList.innerHTML = "";
        return;
    }

    renderMeta(resourceId);

    try {
        const response = await window.resourceAPI.authFetch(`/api/resources/${resourceId}/schedule`);
        const data = await response.json();

        openTime.value = data.hours?.open_time || "";
        closeTime.value = data.hours?.close_time || "";

        renderExceptions(data.exceptions || []);
        renderBlackouts(data.blackouts || []);
    } catch (err) {
        alert(err.message || "Failed to load schedule");
    }
}

function renderExceptions(list) {
    exceptionList.innerHTML = "";
    if (!list.length) {
        exceptionList.innerHTML = "<li>No exceptions configured.</li>";
        return;
    }

    list.forEach((ex) => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${ex.exception_date}: ${ex.open_time} - ${ex.close_time}
            <button data-action="delete-exception" data-id="${ex.exception_id}">X</button>
        `;
        exceptionList.appendChild(li);
    });
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
            <button data-action="delete-blackout" data-id="${date.blackout_id}">X</button>
        `;
        blackoutList.appendChild(li);
    });
}

async function saveHours() {
    const resourceId = resourceSelect.value;
    if (!resourceId) return alert("Choose a resource.");

    if (!openTime.value || !closeTime.value) {
        alert("Please enter valid times.");
        return;
    }

    try {
        await window.resourceAPI.authFetch(`/api/resources/${resourceId}/schedule`, {
            method: "PUT",
            body: JSON.stringify({ open_time: openTime.value, close_time: closeTime.value }),
        });

        const cached = window.resourceAPI.cache.find((r) => `${r.resource_id}` === `${resourceId}`);
        if (cached) {
            cached.availability = { open_time: openTime.value, close_time: closeTime.value };
        }
        renderMeta(resourceId);
        alert("Working hours saved!");
    } catch (err) {
        alert(err.message || "Failed to save hours");
    }
}

async function addException() {
    const resourceId = resourceSelect.value;
    if (!resourceId) return alert("Choose a resource.");

    if (!exceptionDate.value || !exceptionOpen.value || !exceptionClose.value) {
        alert("Fill all exception fields.");
        return;
    }

    try {
        const response = await window.resourceAPI.authFetch(`/api/resources/${resourceId}/schedule/exceptions`, {
            method: "POST",
            body: JSON.stringify({
                exception_date: exceptionDate.value,
                open_time: exceptionOpen.value,
                close_time: exceptionClose.value,
            }),
        });

        const data = await response.json();
        renderExceptions(data.exceptions || []);

        const cached = window.resourceAPI.cache.find((r) => `${r.resource_id}` === `${resourceId}`);
        if (cached && cached.usage) {
            cached.usage.exceptions = data.exceptions?.length ?? cached.usage.exceptions;
            renderMeta(resourceId);
        }
    } catch (err) {
        alert(err.message || "Failed to add exception");
    }
}

async function addBlackout() {
    const resourceId = resourceSelect.value;
    if (!resourceId) return alert("Choose a resource.");
    if (!blackoutDate.value) return alert("Pick a date.");

    try {
        const response = await window.resourceAPI.authFetch(`/api/resources/${resourceId}/blackouts`, {
            method: "POST",
            body: JSON.stringify({ blackout_date: blackoutDate.value }),
        });

        const data = await response.json();
        renderBlackouts(data.blackouts || []);

        const cached = window.resourceAPI.cache.find((r) => `${r.resource_id}` === `${resourceId}`);
        if (cached && cached.usage) {
            cached.usage.blackoutDays = data.blackouts?.length ?? cached.usage.blackoutDays;
            renderMeta(resourceId);
        }
    } catch (err) {
        alert(err.message || "Failed to add blackout");
    }
}

async function handleListClick(event) {
    const action = event.target.getAttribute("data-action");
    const itemId = event.target.getAttribute("data-id");
    const resourceId = resourceSelect.value;
    if (!action || !itemId || !resourceId) return;

    if (action === "delete-exception") {
        try {
            const response = await window.resourceAPI.authFetch(
                `/api/resources/${resourceId}/schedule/exceptions/${itemId}`,
                { method: "DELETE" }
            );
            const data = await response.json();
            renderExceptions(data.exceptions || []);

            const cached = window.resourceAPI.cache.find((r) => `${r.resource_id}` === `${resourceId}`);
            if (cached && cached.usage) {
                cached.usage.exceptions = data.exceptions?.length ?? cached.usage.exceptions;
                renderMeta(resourceId);
            }
        } catch (err) {
            alert(err.message || "Failed to delete exception");
        }
    }

    if (action === "delete-blackout") {
        try {
            const response = await window.resourceAPI.authFetch(
                `/api/resources/${resourceId}/blackouts/${itemId}`,
                { method: "DELETE" }
            );
            const data = await response.json();
            renderBlackouts(data.blackouts || []);

            const cached = window.resourceAPI.cache.find((r) => `${r.resource_id}` === `${resourceId}`);
            if (cached && cached.usage) {
                cached.usage.blackoutDays = data.blackouts?.length ?? cached.usage.blackoutDays;
                renderMeta(resourceId);
            }
        } catch (err) {
            alert(err.message || "Failed to delete blackout");
        }
    }
}

resourceSelect.addEventListener("change", (e) => loadSchedule(e.target.value));
saveHoursBtn.addEventListener("click", saveHours);
addExceptionBtn.addEventListener("click", addException);
addBlackoutBtn.addEventListener("click", addBlackout);
exceptionList.addEventListener("click", handleListClick);
blackoutList.addEventListener("click", handleListClick);

document.addEventListener("DOMContentLoaded", () => {
    loadResourceOptions().catch((err) => alert(err.message || "Failed to load resources"));
});
