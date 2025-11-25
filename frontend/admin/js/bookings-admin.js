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
    const submitBtn = form?.querySelector('button[type="submit"]');

    let editingId = null;
    let editingBooking = null;
    let resourcesCache = [];

    function normalizeStatus(booking) {
        const status = booking.status || "active";
        const date = booking.booking_date ? new Date(`${booking.booking_date}T00:00:00`) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (status === "active" && date && !Number.isNaN(date.getTime()) && date < today) {
            return "completed";
        }
        return status;
    }

    function statusLabel(status) {
        const map = {
            active: "Active",
            cancelled: "Cancelled",
            rescheduled: "Rescheduled",
            completed: "Completed",
        };
        return map[status] || status || "Unknown";
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
            const data = await res.json();
            this.cache = data.map((booking) => ({
                ...booking,
                computed_status: normalizeStatus(booking),
            }));
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
        async rescheduleBooking(id, payload) {
            const res = await this.authFetch(`/api/bookings/${id}/reschedule`, {
                method: "POST",
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to update booking");
            }
            return res.json();
        },
        async deleteBooking(id) {
            const res = await this.authFetch(`/api/bookings/${id}/cancel`, { method: "POST" });
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

    function formatDate(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toISOString().slice(0, 10);
    }

    function formatTime(value) {
        if (!value) return "";
        if (typeof value === "string") {
            const match = value.match(/^(\d{2}:\d{2})/);
            if (match) return match[1];
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function formatUserLabel(booking) {
        return (
            booking.user?.username ||
            booking.user?.email ||
            booking.user_name ||
            booking.user_email ||
            "Unknown"
        );
    }

    function formatDetails(booking) {
        if (booking.booking_type === "room" && booking.room) {
            const label = booking.room.label || `${formatTime(booking.room.start_time)} to ${formatTime(booking.room.end_time)}`;
            return `${booking.room.name || "Room"} – ${label}`;
        }
        if (booking.booking_type === "lab" && booking.lab) {
            const label = booking.lab.label || `${formatTime(booking.lab.start_time)} to ${formatTime(booking.lab.end_time)}`;
            return `${booking.lab.name || "Lab"} – ${label}`;
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
            const status = booking.computed_status || booking.status || "active";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${booking.booking_id}</td>
                <td>${formatUserLabel(booking)}</td>
                <td>${formatDate(booking.booking_date)}</td>
                <td>${statusLabel(status)}</td>
                <td>${formatDetails(booking)}</td>
                <td>
                    <button class="btn" data-action="edit" data-id="${booking.booking_id}" ${
                        status !== "active" ? "disabled" : ""
                    }>Edit / Reschedule</button>
                    <button class="btn btn-danger" data-action="delete" data-id="${booking.booking_id}" ${
                        status !== "active" ? "disabled" : ""
                    }>Cancel</button>
                </td>
            `;
            bookingRows.appendChild(tr);
        });
    }

    function openPanel(booking) {
        if (!editPanel || !booking) return;
        editingId = booking.booking_id;
        editingBooking = booking;
        panelTitle.textContent = `Edit Booking #${booking.booking_id}`;
        dateInput.value = formatDate(booking.booking_date) || "";

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
            loadTimeslotOptions(resourceSelect?.value, formatDate(booking.booking_date), slotId);
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
        editingBooking = null;
    }

    function buildPayload() {
        const payload = {
            bookingDate: dateInput?.value,
            resourceId: resourceSelect?.value ? Number(resourceSelect.value) : null,
        };

        if (pageType === "room" || pageType === "lab") {
            const chosenSlot = slotInput?.value;
            const originalSlot = editingBooking?.room?.timeslot_id || editingBooking?.lab?.timeslot_id || null;
            const originalDate = formatDate(editingBooking?.booking_date);
            const originalResourceId =
                (editingBooking?.room && editingBooking.room.id) ||
                (editingBooking?.lab && editingBooking.lab.id) ||
                null;
            const dateUnchanged = payload.bookingDate && originalDate === payload.bookingDate;
            const resourceUnchanged =
                originalResourceId && resourceSelect?.value
                    ? String(originalResourceId) === String(resourceSelect.value)
                    : false;

            if (chosenSlot) {
                payload.timeslotId = Number(chosenSlot);
            } else if (dateUnchanged && resourceUnchanged && originalSlot) {
                payload.timeslotId = Number(originalSlot);
            } else {
                payload.timeslotId = null;
            }
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
        if (!slotInput || pageType === "equipment") return;
        slotInput.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        slotInput.innerHTML = '<option value="">Loading slots...</option>';
        if (!resourceId || !bookingDate) {
            slotInput.innerHTML = '<option value="" disabled>Select a date and resource</option>';
            return;
        }
        try {
            const res = await fetch(`/api/resources/${resourceId}/availability?date=${encodeURIComponent(bookingDate)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Unable to load availability");
            const combined = [...(data.available || []), ...(data.booked || [])];
            if (!combined.length) {
                slotInput.innerHTML = '<option value="" disabled>No slots for this date</option>';
                return;
            }
            const options = ['<option value="">Select a timeslot</option>'];
            slotInput.innerHTML = combined
                .map((slot) => {
                    const disabled = slot.is_active === false || (data.booked || []).some((b) => b.id === slot.id);
                    return `<option value="${slot.id}" ${disabled && slot.id !== Number(currentSlotId) ? "disabled" : ""}>${slotLabel(slot)}${disabled && slot.id !== Number(currentSlotId) ? " (booked)" : ""}</option>`;
                })
                .join("");
            slotInput.innerHTML = options.join("") + slotInput.innerHTML;
            slotInput.value = currentSlotId ? String(currentSlotId) : "";
            slotInput.disabled = false;
            if (submitBtn) submitBtn.disabled = false;
        } catch (err) {
            console.error(err);
            slotInput.innerHTML = '<option value="" disabled>Availability unavailable</option>';
            slotInput.disabled = true;
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
            if (target.disabled) return;
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
            const reload = () => {
                const originalDate = formatDate(editingBooking?.booking_date);
                const originalResourceId =
                    (editingBooking?.room && editingBooking.room.id) ||
                    (editingBooking?.lab && editingBooking.lab.id) ||
                    null;
                const resourceUnchanged =
                    originalResourceId && resourceSelect?.value
                        ? String(originalResourceId) === String(resourceSelect.value)
                        : false;
                const slotId =
                    dateInput?.value === originalDate && resourceUnchanged
                        ? editingBooking?.room?.timeslot_id || editingBooking?.lab?.timeslot_id || null
                        : null;
                loadTimeslotOptions(resourceSelect?.value, dateInput?.value, slotId);
            };
            if (dateInput) dateInput.addEventListener("change", reload);
            if (resourceSelect) resourceSelect.addEventListener("change", reload);
        }

        if (form) {
            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                if (!editingId) return;
                try {
                    const payload = buildPayload();
                    if (!payload.bookingDate) {
                        alert("Please select a booking date.");
                        return;
                    }
                    if ((pageType === "room" || pageType === "lab") && !payload.resourceId) {
                        alert("Please choose a resource before rescheduling.");
                        return;
                    }
                    if ((pageType === "room" || pageType === "lab") && slotInput?.disabled) {
                        alert("Please wait for timeslots to finish loading.");
                        return;
                    }
                    if ((pageType === "room" || pageType === "lab") && !payload.timeslotId) {
                        alert("Please select a valid timeslot for the chosen date.");
                        return;
                    }
                    if (pageType === "equipment") {
                        if (!payload.resourceId) {
                            alert("Please choose equipment to reschedule.");
                            return;
                        }
                        if (!payload.quantity || Number.isNaN(payload.quantity) || payload.quantity < 1) {
                            alert("Please enter a valid quantity (at least 1).");
                            return;
                        }
                    }
                    await bookingsAPI.rescheduleBooking(editingId, payload);
                    closePanel();
                    await refresh();
                } catch (err) {
                    alert(err.message || "Failed to update booking");
                }
            });
        }
    });
})();
