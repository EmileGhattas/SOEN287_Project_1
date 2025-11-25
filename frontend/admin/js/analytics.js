const AuthService = {
    getToken() {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');

        if (token && !sessionStorage.getItem('token')) {
            sessionStorage.setItem('token', token);
            localStorage.removeItem('token');
        }

        return token;
    },

    getUser() {
        const raw = sessionStorage.getItem('user') || localStorage.getItem('user');

        if (raw && !sessionStorage.getItem('user')) {
            sessionStorage.setItem('user', raw);
            localStorage.removeItem('user');
        }

        try {
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            console.error('[AuthService] Failed to parse user:', err);
            return null;
        }
    },

    isAdmin() {
        const user = this.getUser();
        return user?.is_admin === true;
    },

    redirectToSignIn() {
        window.location.href = '/adminsignin';
    },

    getHeaders() {
        const token = this.getToken();
        const headers = { 'Content-Type': 'application/json' };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return headers;
    }
};

const ApiService = {
    async getResourceUsage() {
        try {
            const response = await fetch('/api/resources/usage/summary', {
                headers: AuthService.getHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to load resource usage');
            }

            console.log('[ApiService] Resource usage loaded:', data.length, 'resources');
            return data;

        } catch (err) {
            console.error('[ApiService] Error fetching resource usage:', err);
            throw err;
        }
    },

    async getBookings() {
        try {
            const response = await fetch('/api/bookings', {
                headers: AuthService.getHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to load bookings');
            }

            console.log('[ApiService] Bookings loaded:', data.length, 'bookings');
            return data;

        } catch (err) {
            console.error('[ApiService] Error fetching bookings:', err);
            throw err;
        }
    }
};

const DataProcessor = {
    sortByBookings(resources) {
        return [...resources].sort((a, b) => (b.bookings || 0) - (a.bookings || 0));
    },

    countBookingsByTimeslot(bookings) {
        const counts = {};

        bookings.forEach((booking) => {
            if (booking.status === 'cancelled') return;

            const label = booking.room?.label || booking.lab?.label || booking.timeslot?.label;
            if (!label) return;

            counts[label] = (counts[label] || 0) + 1;
        });

        console.log('[DataProcessor] Timeslot counts:', counts);
        return counts;
    },

    convertToSortedArray(counts) {
        const entries = Object.entries(counts).map(([label, bookings]) => ({
            label,
            bookings
        }));

        entries.sort((a, b) => b.bookings - a.bookings);
        return entries;
    }
};

const ChartConfig = {
    colors: {
        primary: 'rgba(61, 93, 96, 0.8)',
        primaryBorder: 'rgba(61, 93, 96, 1)',
        secondary: 'rgba(46, 97, 105, 0.7)',
        secondaryBorder: 'rgba(46, 97, 105, 1)'
    },

    getPopularResourcesConfig(resources) {
        return {
            type: 'bar',
            data: {
                labels: resources.map(item => item.name),
                datasets: [{
                    label: 'Number of Bookings',
                    data: resources.map(item => item.bookings),
                    backgroundColor: this.colors.primary,
                    borderColor: this.colors.primaryBorder,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'All Resources - Booking Count',
                        font: { size: 16, weight: 'bold' },
                        padding: 20
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const item = resources[context.dataIndex];
                                return `Type: ${item.type}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 12 } },
                        title: {
                            display: true,
                            text: 'Number of Bookings',
                            font: { size: 13, weight: 'bold' }
                        }
                    },
                    x: {
                        ticks: { font: { size: 12 } },
                        title: {
                            display: true,
                            text: 'Resource Name',
                            font: { size: 13, weight: 'bold' }
                        }
                    }
                }
            }
        };
    },

    getPeakTimesConfig(timeslots) {
        return {
            type: 'bar',
            data: {
                labels: timeslots.map(slot => slot.label),
                datasets: [{
                    label: 'Number of Bookings',
                    data: timeslots.map(slot => slot.bookings),
                    backgroundColor: this.colors.secondary,
                    borderColor: this.colors.secondaryBorder,
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Peak Booking Times',
                        font: { size: 16, weight: 'bold' },
                        padding: 20
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 12 } },
                        title: {
                            display: true,
                            text: 'Number of Bookings',
                            font: { size: 13, weight: 'bold' }
                        }
                    },
                    y: {
                        ticks: { font: { size: 12 } },
                        title: {
                            display: true,
                            text: 'Time Slot',
                            font: { size: 13, weight: 'bold' }
                        }
                    }
                }
            }
        };
    }
};

const ChartManager = {
    charts: {
        popular: null,
        peak: null
    },

    containers: {
        popular: null,
        peak: null
    },

    init() {
        this.containers.popular = document.getElementById('popularResources');
        this.containers.peak = document.getElementById('peakTimes');
    },

    showLoading(type) {
        const container = this.containers[type];
        if (container) {
            container.innerHTML = '<p style="text-align: center; padding: 40px;">Loading charts...</p>';
        }
    },

    showError(type, message) {
        const container = this.containers[type];
        if (container) {
            container.innerHTML = `<p style="text-align: center; padding: 40px; color: #c0392b;">${message}</p>`;
        }
    },

    showEmpty(type, message) {
        const container = this.containers[type];
        if (container) {
            container.innerHTML = `<p style="text-align: center; padding: 40px; color: #666;">${message}</p>`;
        }
    },

    renderPopularResources(resources) {
        const container = this.containers.popular;
        if (!container) return;

        container.innerHTML = '';

        if (!resources.length) {
            this.showEmpty('popular', 'No booking data yet.');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.id = 'popularChart';
        container.appendChild(canvas);

        if (this.charts.popular) {
            this.charts.popular.destroy();
        }

        const ctx = canvas.getContext('2d');
        const config = ChartConfig.getPopularResourcesConfig(resources);
        this.charts.popular = new Chart(ctx, config);

        console.log('[ChartManager] Popular resources chart rendered');
    },

    renderPeakTimes(timeslots) {
        const container = this.containers.peak;
        if (!container) return;

        container.innerHTML = '';

        if (!timeslots.length) {
            this.showEmpty('peak', 'No usage patterns yet.');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.id = 'peakChart';
        container.appendChild(canvas);

        if (this.charts.peak) {
            this.charts.peak.destroy();
        }

        const ctx = canvas.getContext('2d');
        const config = ChartConfig.getPeakTimesConfig(timeslots);
        this.charts.peak = new Chart(ctx, config);

        console.log('[ChartManager] Peak times chart rendered');
    }
};

const AnalyticsApp = {
    async loadPopularResources() {
        try {
            const data = await ApiService.getResourceUsage();
            const sorted = DataProcessor.sortByBookings(data);
            ChartManager.renderPopularResources(sorted);
        } catch (err) {
            ChartManager.showError('popular', err.message);
            throw err;
        }
    },

    async loadPeakTimes() {
        try {
            const bookings = await ApiService.getBookings();
            const counts = DataProcessor.countBookingsByTimeslot(bookings);
            const timeslots = DataProcessor.convertToSortedArray(counts);
            ChartManager.renderPeakTimes(timeslots);
        } catch (err) {
            ChartManager.showError('peak', err.message);
            throw err;
        }
    },

    async init() {
        console.log('[AnalyticsApp] Initializing...');

        if (!AuthService.isAdmin()) {
            console.warn('[AnalyticsApp] User is not admin, redirecting...');
            AuthService.redirectToSignIn();
            return;
        }

        ChartManager.init();
        ChartManager.showLoading('popular');
        ChartManager.showLoading('peak');

        try {
            await Promise.all([
                this.loadPopularResources(),
                this.loadPeakTimes()
            ]);
            console.log('[AnalyticsApp] All charts loaded successfully');
        } catch (err) {
            console.error('[AnalyticsApp] Error loading charts:', err);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AnalyticsApp.init();
});