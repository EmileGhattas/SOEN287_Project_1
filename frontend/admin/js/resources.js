const addResourceBtn = document.getElementById("addResourceBtn");
const resourcePanel = document.getElementById("resourcePanel");
const closeResourcePanel = document.getElementById("closeResourcePanel");
const saveResourceBtn = document.getElementById("saveResourceBtn");
const resourceList = document.getElementById("resourceList");

const panelTitle = document.getElementById("panelTitle");
const resName = document.getElementById("resName");
const resDescription = document.getElementById("resDescription");
const resLocation = document.getElementById("resLocation");
const resCapacity = document.getElementById("resCapacity");
const resType = document.getElementById("resType");
const resImage = document.getElementById("resImage");

let editingResourceId = null;
const isResourcePage = Boolean(resourceList);

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

const resourceAPI = {
    cache: [],
    async authFetch(url, options = {}) {
        const token = getAuthToken();
        const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            alert("Admin access required. Please sign in again.");
            window.location.href = "/adminsignin";
            throw new Error("Unauthorized");
        }

        return response;
    },
    async loadResources() {
        const response = await this.authFetch("/api/resources");
        const data = await response.json().catch(() => []);
        if (!response.ok) {
            throw new Error(data.message || "Failed to load resources");
        }

        this.cache = data;
        renderResources();
        return this.cache;
    },
    async saveResource(payload, resourceId = null) {
        const method = resourceId ? "PUT" : "POST";
        const url = resourceId ? `/api/resources/${resourceId}` : "/api/resources";
        const response = await this.authFetch(url, {
            method,
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || "Unable to save resource");
        }

        return data;
    },
    async deleteResource(resourceId) {
        const response = await this.authFetch(`/api/resources/${resourceId}`, { method: "DELETE" });
        if (!response.ok && response.status !== 204) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || "Unable to delete resource");
        }
    },
};

window.resourceAPI = resourceAPI;

function openPanel(resource = null) {
    if (!resourcePanel) return;

    editingResourceId = resource ? (resource.id || resource.resource_id) : null;

    if (resource) {
        panelTitle.textContent = "Edit Resource";
        saveResourceBtn.textContent = "Update";
        resName.value = resource.name || "";
        resDescription.value = resource.description || "";
        resLocation.value = resource.location || "";
        resCapacity.value = resource.capacity || "";
        resType.value = resource.type || "room";
        resImage.value = resource.image_url || resource.image_path || "";
    } else {
        panelTitle.textContent = "Add Resource";
        saveResourceBtn.textContent = "Add";
        resName.value = "";
        resDescription.value = "";
        resLocation.value = "";
        resCapacity.value = "";
        resType.value = "room";
        resImage.value = "";
    }

    resourcePanel.style.display = "flex";
}

function closePanel() {
    if (resourcePanel) {
        resourcePanel.style.display = "none";
    }
}

function renderResources() {
    if (!resourceList) return;

    const resources = resourceAPI.cache || [];
    resourceList.innerHTML = "";

    if (!resources.length) {
        resourceList.innerHTML = `
            <tr><td colspan="6" style="text-align:center; padding:20px; color:#666;">
                No resources added yet.
            </td></tr>`;
        return;
    }

    resources.forEach((resource) => {
        const row = document.createElement("tr");
        const usage = resource.usage || {};
        row.innerHTML = `
            <td>${resource.name}</td>
            <td>${resource.location || "-"}</td>
            <td>${resource.capacity ?? "-"}</td>
            <td>${resource.type || "-"}</td>
            <td>
                <div>Bookings: ${usage.bookings || 0}</div>
                <div>Blackouts: ${usage.blackoutDays || usage.blackouts || 0}</div>
            </td>
            <td>
                <button class="btn edit" data-action="edit" data-id="${resource.id || resource.resource_id}">Edit</button>
                <button class="btn delete" data-action="delete" data-id="${resource.id || resource.resource_id}">Delete</button>
                <a class="btn" href="/admin/schedules?resourceId=${resource.id || resource.resource_id}">Availability</a>
            </td>
        `;

        resourceList.appendChild(row);
    });
}

async function handleSaveResource() {
    const payload = {
        name: resName.value.trim(),
        description: resDescription.value.trim(),
        location: resLocation.value.trim(),
        capacity: resCapacity.value ? Number(resCapacity.value) : null,
        type: resType.value,
        image_url: resImage.value.trim(),
    };

    if (!payload.name) {
        alert("Resource must have a name.");
        return;
    }

    try {
        const saved = await resourceAPI.saveResource(payload, editingResourceId);
        if (editingResourceId) {
            resourceAPI.cache = resourceAPI.cache.map((r) => ((r.id || r.resource_id) === editingResourceId ? saved : r));
        } else {
            resourceAPI.cache.push(saved);
        }

        renderResources();
        closePanel();
    } catch (err) {
        alert(err.message);
    }
}

async function handleResourceListClick(event) {
    const action = event.target.getAttribute("data-action");
    const resourceId = event.target.getAttribute("data-id");

    if (!action || !resourceId) return;

    const resource = resourceAPI.cache.find((r) => `${r.id || r.resource_id}` === resourceId);
    if (action === "edit") {
        openPanel(resource);
    }

    if (action === "delete") {
        const confirmDelete = confirm("Delete this resource? This will also remove its schedule.");
        if (!confirmDelete) return;

        try {
            await resourceAPI.deleteResource(resourceId);
            resourceAPI.cache = resourceAPI.cache.filter((r) => `${r.id || r.resource_id}` !== resourceId);
            renderResources();
        } catch (err) {
            alert(err.message);
        }
    }
}

if (addResourceBtn) {
    addResourceBtn.addEventListener("click", () => openPanel(null));
}

if (closeResourcePanel) {
    closeResourcePanel.addEventListener("click", closePanel);
}

if (saveResourceBtn) {
    saveResourceBtn.addEventListener("click", handleSaveResource);
}

if (resourceList) {
    resourceList.addEventListener("click", handleResourceListClick);
}

document.addEventListener("DOMContentLoaded", () => {
    if (isResourcePage && ensureAdmin()) {
        resourceAPI.loadResources().catch((err) => alert(err.message));
    }
});
