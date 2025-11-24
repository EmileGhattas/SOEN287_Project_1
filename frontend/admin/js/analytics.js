(function () {
    const popularContainer = document.getElementById('popularResources');
    const peakContainer = document.getElementById('peakTimes');

    function ensureAdmin() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user?.is_admin) {
                window.location.href = '/adminsignin';
                return false;
            }
            return true;
        } catch (err) {
            window.location.href = '/adminsignin';
            return false;
        }
    }

    function authHeaders() {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    }

    function renderPopular(list) {
        if (!popularContainer) return;
        popularContainer.innerHTML = '';
        if (!list.length) {
            popularContainer.textContent = 'No booking data yet.';
            return;
        }
        list.slice(0, 5).forEach((item) => {
            const card = document.createElement('div');
            card.className = 'analytics-card';
            card.innerHTML = `
                <h4>${item.name}</h4>
                <p>Type: ${item.type}</p>
                <p>Bookings: ${item.bookings}</p>
            `;
            popularContainer.appendChild(card);
        });
    }

    function renderPeakTimes(list) {
        if (!peakContainer) return;
        peakContainer.innerHTML = '';
        if (!list.length) {
            peakContainer.textContent = 'No usage patterns yet.';
            return;
        }
        list.forEach((slot) => {
            const row = document.createElement('div');
            row.className = 'analytics-row';
            row.innerHTML = `<strong>${slot.label}</strong> – ${slot.bookings} bookings`;
            peakContainer.appendChild(row);
        });
    }

    async function loadUsage() {
        const res = await fetch('/api/resources/usage/summary', { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load analytics');
        const sorted = [...data].sort((a, b) => (b.bookings || 0) - (a.bookings || 0));
        renderPopular(sorted);
    }

    async function loadPeakTimes() {
        // Use seeded timeslots and approximate popularity by total bookings per slot across resources
        const res = await fetch('/api/bookings', { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load bookings');
        const counts = {};
        data.forEach((b) => {
            const label = b.room?.label || b.lab?.label;
            if (!label) return;
            counts[label] = (counts[label] || 0) + 1;
        });
        const entries = Object.entries(counts).map(([label, bookings]) => ({ label, bookings }));
        entries.sort((a, b) => b.bookings - a.bookings);
        renderPeakTimes(entries.slice(0, 5));
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (!ensureAdmin()) return;
        try {
            await loadUsage();
            await loadPeakTimes();
        } catch (err) {
            console.error(err);
            if (popularContainer) popularContainer.textContent = err.message;
        }
    });
})();
