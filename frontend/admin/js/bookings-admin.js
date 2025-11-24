(function () {
    const pageType = document.body.dataset.bookingType || null;
    const bookingRows = document.getElementById("bookingRows");
    const refreshBtn = document.getElementById("refreshBookings");
    const emptyState = document.getElementById("bookingEmptyState");
    const editPanel = document.getElementById("bookingPanel");
    const closePanelBtn = document.getElementById("closeBookingPanel");
    const form = document.getElementById("bookingForm");
    const dateInput = document.getElementById("bookingDate");
    const resourceSelect = document.getElementById("bookingResource");
    const startInput = document.getElementById("bookingStart");
    const endInput = document.getElementById("bookingEnd");
    const slotInput = document.getElementById("bookingSlot");
    const quantityInput = document.getElementById("bookingQuantity");
    const panelTitle = document.getElementById("bookingPanelTitle");

    let editingId = null;
    let resourcesCache = [];

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

    const bookingsAPI = {
        cache: [],
        async authFetch(url, options = {}) {
            const token = getAuthToken();
            if (!token) {
                window.location.href = "/auth/adminsignin.html";
                throw new Error("Missing token");
            }

            const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
            headers.Authorization = `Bearer ${token}`;

            const response = await fetch(url, { ...options, headers });
            if (response.status === 401 || response.status === 403) {
                alert("Admin access required. Please sign in again.");
                window.location.href = "/adminsignin";
                throw new Error("Unauthorized");
            }
            return response;
        },
        async loadBookings() {
            const res = await this.authFetch("/api/bookings");
            if (!res.ok) throw new Error("Unable to load bookings");
            this.cache = await res.json();
            return this.cache;
        },
        async updateBooking(id, payload) {
            const res = await this.authFetch(`/api/bookings/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to update booking");
            }
            return res.json();
        },
        async deleteBooking(id) {
            const res = await this.authFetch(`/api/bookings/${id}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete booking");
            }
        },
    };

    async function ensureAdmin() {
        const userRaw = sessionStorage.getItem("user") || localStorage.getItem("user");
        if (!userRaw) {
            window.location.href = "/adminsignin";
            return false;
        }
        try {
            const user = JSON.parse(userRaw);
            if (!user || !user.is_admin) {
                window.location.href = "/adminsignin";
                return false;
            }
        } catch (err) {
            console.warn("Unable to parse user", err);
            window.location.href = "/adminsignin";
            return false;
        }
        return true;
    }

    function filterForPage(bookings) {
        if (!pageType) return bookings;
        return bookings.filter((b) => b.booking_type === pageType);
    }

    function formatDetails(booking) {
        if (booking.booking_type === "room" && booking.room) {
            return `${booking.room.name || "Room"} – ${booking.room.label || `${booking.room.start_time} to ${booking.room.end_time}`}`;
        }
        if (booking.booking_type === "lab" && booking.lab) {
            return `${booking.lab.name || "Lab"} – ${booking.lab.label || `${booking.lab.start_time} to ${booking.lab.end_time}`}`;
        }
        if (booking.booking_type === "equipment" && booking.equipment) {
            return `${booking.equipment.name || "Equipment"} (Qty: ${booking.equipment.quantity})`;
        }
        return "Details unavailable";
    }

    function renderBookings(bookings) {
        if (!bookingRows) return;

        const filtered = filterForPage(bookings);
        bookingRows.innerHTML = "";

        if (!filtered.length) {
            if (emptyState) emptyState.style.display = "block";
            return;
        }

        if (emptyState) emptyState.style.display = "none";

        filtered.forEach((booking) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${booking.booking_id}</td>
                <td>${booking.user_name || booking.user_email}</td>
                <td>${booking.booking_date}</td>
                <td>${formatDetails(booking)}</td>
                <td>
                    <button class="btn" data-action="edit" data-id="${booking.booking_id}">Edit / Reschedule</button>
                    <button class="btn btn-danger" data-action="delete" data-id="${booking.booking_id}">Cancel</button>
                </td>
            `;
            bookingRows.appendChild(tr);
        });
    }

    function openPanel(booking) {
        if (!editPanel || !booking) return;
        editingId = booking.booking_id;
        panelTitle.textContent = `Edit Booking #${booking.booking_id}`;
        dateInput.value = booking.booking_date || "";

        if (resourceSelect) {
            resourceSelect.value = "";
            const resourceId =
                (booking.room && booking.room.id) ||
                (booking.lab && booking.lab.id) ||
                (booking.equipment && booking.equipment.id) ||
                "";
            if (resourceId) {
                resourceSelect.value = String(resourceId);
            }
        }

        if (slotInput && (booking.room || booking.lab)) {
            const slotId = booking.room?.timeslot_id || booking.lab?.timeslot_id;
            loadTimeslotOptions(resourceSelect?.value, booking.booking_date, slotId);
        }

        if (quantityInput && booking.equipment) {
            quantityInput.value = booking.equipment.quantity || 1;
        }

        editPanel.style.display = "flex";
    }

    function closePanel() {
        if (editPanel) {
            editPanel.style.display = "none";
        }
        editingId = null;
    }

    function buildPayload() {
        const payload = {
            bookingDate: dateInput?.value,
        };

        if (pageType === "room" || pageType === "lab") {
            payload.timeslotId = slotInput?.value;
        } else if (pageType === "equipment") {
            payload.quantity = Number(quantityInput?.value || 1);
        }
        return payload;
    }

    function slotLabel(slot) {
        if (!slot) return "Timeslot";
        return slot.label || `${slot.start_time} - ${slot.end_time}`;
    }

    async function loadTimeslotOptions(resourceId, bookingDate, currentSlotId = null) {
        if (!slotInput || pageType === "equipment" || !resourceId || !bookingDate) return;
        slotInput.innerHTML = '<option value="">Loading slots...</option>';
        try {
            const res = await fetch(`/api/resources/${resourceId}/availability?date=${encodeURIComponent(bookingDate)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Unable to load availability");
            const combined = [...(data.available || []), ...(data.booked || [])];
            if (!combined.length) {
                slotInput.innerHTML = '<option value="" disabled>No slots for this date</option>';
                return;
            }
            slotInput.innerHTML = combined
                .map((slot) => {
                    const disabled = slot.is_active === false || (data.booked || []).some((b) => b.id === slot.id);
                    return `<option value="${slot.id}" ${disabled && slot.id !== Number(currentSlotId) ? "disabled" : ""}>${slotLabel(slot)}${disabled && slot.id !== Number(currentSlotId) ? " (booked)" : ""}</option>`;
                })
                .join("");
            if (currentSlotId) {
                slotInput.value = String(currentSlotId);
            }
        } catch (err) {
            console.error(err);
            slotInput.innerHTML = '<option value="" disabled>Availability unavailable</option>';
        }
    }

    async function loadResources() {
        if (!resourceSelect) return;
        try {
            const res = await bookingsAPI.authFetch("/api/resources");
            if (!res.ok) return;
            resourcesCache = await res.json();
            const typeMap = { room: "room", lab: "lab", equipment: "equipment" };
            const filtered = resourcesCache.filter((r) => r.type === typeMap[pageType]);
            resourceSelect.innerHTML = filtered
                .map((r) => `<option value="${r.id || r.resource_id}">${r.name}</option>`)
                .join("");
        } catch (err) {
            console.error("Failed to load resources", err);
        }
    }

    async function refresh() {
        try {
            const data = await bookingsAPI.loadBookings();
            renderBookings(data);
        } catch (err) {
            console.error(err);
            alert(err.message || "Unable to load bookings");
        }
    }

    function attachTableListeners() {
        if (!bookingRows) return;
        bookingRows.addEventListener("click", async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const action = target.dataset.action;
            const id = target.dataset.id;
            if (!action || !id) return;

            if (action === "delete") {
                if (!confirm("Cancel this booking?")) return;
                try {
                    await bookingsAPI.deleteBooking(id);
                    await refresh();
                } catch (err) {
                    alert(err.message || "Failed to cancel booking");
                }
            } else if (action === "edit") {
                const booking = bookingsAPI.cache.find((b) => String(b.booking_id) === String(id));
                if (booking) {
                    openPanel(booking);
                }
            }
        });
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const ok = await ensureAdmin();
        if (!ok) return;

        attachTableListeners();
        await loadResources();
        await refresh();

        if (refreshBtn) refreshBtn.addEventListener("click", refresh);
        if (closePanelBtn) closePanelBtn.addEventListener("click", closePanel);

        if (pageType !== "equipment") {
            const reload = () => loadTimeslotOptions(resourceSelect?.value, dateInput?.value);
            if (dateInput) dateInput.addEventListener("change", reload);
            if (resourceSelect) resourceSelect.addEventListener("change", reload);
        }

        if (form) {
            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                if (!editingId) return;
                try {
                    const payload = buildPayload();
                    await bookingsAPI.updateBooking(editingId, payload);
                    closePanel();
                    await refresh();
                } catch (err) {
                    alert(err.message || "Failed to update booking");
                }
            });
        }
    });
})();
