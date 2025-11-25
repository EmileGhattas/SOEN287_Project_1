const addResourceBtn = document.getElementById("addResourceBtn");
const resourcePanel = document.getElementById("resourcePanel");
const closeResourcePanel = document.getElementById("closeResourcePanel");
const saveResourceBtn = document.getElementById("saveResourceBtn");
const roomResourceList = document.getElementById("roomResourceList");
const labResourceList = document.getElementById("labResourceList");
const equipmentResourceList = document.getElementById("equipmentResourceList");

const panelTitle = document.getElementById("panelTitle");
const resName = document.getElementById("resName");
const resDescription = document.getElementById("resDescription");
const resLocation = document.getElementById("resLocation");
const resCapacity = document.getElementById("resCapacity");
const resQuantity = document.getElementById("resQuantity");
const capacityField = document.getElementById("capacityField");
const quantityField = document.getElementById("quantityField");
const resType = document.getElementById("resType");
const resImage = document.getElementById("resImage");
const resImageError = document.getElementById("resImageError");

let editingResourceId = null;
const isResourcePage = Boolean(roomResourceList || labResourceList || equipmentResourceList);
const placeholderImage = "/assets/image-removebg-preview.png";

function resolveImagePath(path) {
    if (!path || typeof path !== "string") return placeholderImage;
    const trimmed = path.trim();
    return trimmed || placeholderImage;
}

function validateImagePath(value) {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("/assets/")) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return null;
}

function toggleCapacityQuantityFields(type) {
    if (!capacityField || !quantityField) return;
    if (type === "equipment") {
        capacityField.style.display = "none";
        quantityField.style.display = "block";
    } else {
        capacityField.style.display = "block";
        quantityField.style.display = "none";
    }
}

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
        resQuantity.value = resource.quantity || "";
        resType.value = resource.type || "room";
        resImage.value = resource.image_path || resource.image_url || "";
    } else {
        panelTitle.textContent = "Add Resource";
        saveResourceBtn.textContent = "Add";
        resName.value = "";
        resDescription.value = "";
        resLocation.value = "";
        resCapacity.value = "";
        resQuantity.value = "";
        resType.value = "room";
        resImage.value = "";
    }

    toggleCapacityQuantityFields(resType.value);

    if (resImageError) {
        resImageError.style.display = "none";
        resImageError.textContent = "";
    }

    resourcePanel.style.display = "flex";
}

function closePanel() {
    if (resourcePanel) {
        resourcePanel.style.display = "none";
    }
}

function renderResources() {
    if (!roomResourceList && !labResourceList && !equipmentResourceList) return;

    const resources = resourceAPI.cache || [];
    const grouped = {
        room: [],
        lab: [],
        equipment: [],
    };

    resources.forEach((resource) => {
        if (grouped[resource.type]) {
            grouped[resource.type].push(resource);
        }
    });

    const renderGroup = (listEl, list, type) => {
        if (!listEl) return;
        listEl.innerHTML = "";

        if (!list.length) {
            listEl.innerHTML = `
                <tr><td colspan="7" style="text-align:center; padding:20px; color:#666;">
                    No ${type}s added yet.
                </td></tr>`;
            return;
        }

        list.forEach((resource) => {
            const row = document.createElement("tr");
            const bookingCount = resource.booking_count ?? resource.usage?.bookings ?? 0;
            const blackoutCount = resource.blackout_count ?? resource.usage?.blackoutDays ?? resource.usage?.blackouts ?? 0;
            const rawImagePath = resource.image_path || resource.image_url || "";
            const hasImage = rawImagePath.trim().length > 0;
            const imageSrc = hasImage ? resolveImagePath(rawImagePath) : null;
            const quantityDisplay = resource.current_quantity ?? resource.quantity ?? "-";
            const capacityDisplay = resource.capacity ?? "-";
            row.innerHTML = `
                <td>${resource.name}</td>
                <td>${hasImage ? `<img class="resource-thumb" src="${imageSrc}" alt="${resource.name} image">` : "not provided"}</td>
                <td>${resource.location || "-"}</td>
                <td>${type === 'equipment' ? quantityDisplay : capacityDisplay}</td>
                <td>${resource.type || "-"}</td>
                <td>
                    <div>Bookings: ${bookingCount}</div>
                    <div>Blackouts: ${blackoutCount}</div>
                </td>
                <td>
                    <button class="btn edit" data-action="edit" data-id="${resource.id || resource.resource_id}">Edit</button>
                    <button class="btn delete" data-action="delete" data-id="${resource.id || resource.resource_id}">Delete</button>
                    <a class="btn" href="/admin/schedules?resourceId=${resource.id || resource.resource_id}">Availability</a>
                </td>
            `;

            listEl.appendChild(row);
        });
    };

    renderGroup(roomResourceList, grouped.room, "room");
    renderGroup(labResourceList, grouped.lab, "lab");
    renderGroup(equipmentResourceList, grouped.equipment, "equipment");
}

async function handleSaveResource() {
    if (resImageError) {
        resImageError.style.display = "none";
        resImageError.textContent = "";
    }

    const selectedType = resType.value;
    const payload = {
        name: resName.value.trim(),
        description: resDescription.value.trim(),
        location: resLocation.value.trim(),
        type: selectedType,
        image_path: resImage.value.trim(),
    };

    if (selectedType === "equipment") {
        const qty = resQuantity.value === "" ? null : Number(resQuantity.value);
        if (Number.isNaN(qty)) {
            alert("Quantity must be a valid number for equipment.");
            return;
        }
        payload.quantity = qty;
        payload.capacity = null;
    } else {
        const cap = resCapacity.value === "" ? null : Number(resCapacity.value);
        if (Number.isNaN(cap)) {
            alert("Capacity must be a valid number for rooms and labs.");
            return;
        }
        payload.capacity = cap;
        payload.quantity = null;
    }

    if (!payload.name) {
        alert("Resource must have a name.");
        return;
    }

    const normalizedImage = validateImagePath(payload.image_path);
    if (normalizedImage === null) {
        if (resImageError) {
            resImageError.textContent = "Invalid image path. Use /assets/... or a full URL.";
            resImageError.style.display = "block";
        }
        return;
    }
    payload.image_path = normalizedImage;

    try {
        await resourceAPI.saveResource(payload, editingResourceId);
        await resourceAPI.loadResources();
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

if (resType) {
    resType.addEventListener("change", (event) => {
        toggleCapacityQuantityFields(event.target.value);
        if (event.target.value === "equipment") {
            resCapacity.value = "";
        } else {
            resQuantity.value = "";
        }
    });
}

[roomResourceList, labResourceList, equipmentResourceList].forEach((listEl) => {
    if (listEl) {
        listEl.addEventListener("click", handleResourceListClick);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (isResourcePage && ensureAdmin()) {
        resourceAPI.loadResources().catch((err) => alert(err.message));
    }
});
