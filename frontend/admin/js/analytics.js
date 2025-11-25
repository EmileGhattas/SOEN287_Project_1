// This script fetches booking data from the backend and renders interactive
// charts showing the most popular resources and peak booking times.


(function () {

    const popularContainer = document.getElementById('popularResources');
    const peakContainer = document.getElementById('peakTimes');


    let popularChart = null;
    let peakChart = null;


    // AUTHENTICATION HELPER FUNCTIONS
    // These functions handle user authentication and authorization

    /**
     * Retrieves the JWT authentication token from browser storage
     * sessionStorage (more secure) over localStorage
     */
    function getAuthToken() {

        const token = sessionStorage.getItem('token') || localStorage.getItem('token');

        if (token && !sessionStorage.getItem('token')) {
            sessionStorage.setItem('token', token);
            localStorage.removeItem('token');
        }

        return token;
    }


    function getStoredUser() {

        const raw = sessionStorage.getItem('user') || localStorage.getItem('user');

        if (raw && !sessionStorage.getItem('user')) {
            sessionStorage.setItem('user', raw);
            localStorage.removeItem('user');
        }


        try {
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            console.warn('Unable to parse user', err);
            return null;
        }
    }


    function ensureAdmin() {
        try {
            const user = getStoredUser();


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

    /**
     * Creates HTTP headers with authentication token for API requests
     * Backend expects "Bearer <token>" format for JWT authentication
     */
    function authHeaders() {
        const token = getAuthToken();
        const headers = { 'Content-Type': 'application/json' };


        if (token) headers.Authorization = `Bearer ${token}`;

        return headers;
    }


    //  CHART RENDERING FUNCTIONS
    // These functions create visual charts using Chart.js library

    /**
     * Renders a vertical bar chart showing the most booked resources
     *  {Array} list - Array of resources with booking counts
     *                       Example: [{name: "Room 101", type: "room", bookings: 15}, ...]
     */
    function renderPopularChart(list) {

        if (!popularContainer) return;

        popularContainer.innerHTML = '';

        if (!list.length) {
            popularContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No booking data yet.</p>';
            return;
        }

        // Show all resources (no limit - displays all 6)
        const allResources = list;

        // Create a <canvas> element where Chart.js will draw the chart
        const canvas = document.createElement('canvas');
        canvas.id = 'popularChart';
        popularContainer.appendChild(canvas);

        // If a chart already exists, destroy it first to prevent memory leaks
        if (popularChart) {
            popularChart.destroy();
        }

        const ctx = canvas.getContext('2d');

        // Create the Chart.js bar chart
        popularChart = new Chart(ctx, {
            type: 'bar',

            // Data configuration
            data: {
                // X-axis labels: Extract resource names from allResources array
                labels: allResources.map(item => item.name),

                datasets: [{
                    label: 'Number of Bookings',


                    data: allResources.map(item => item.bookings),

                    backgroundColor: [
                        'rgba(61, 93, 96, 0.8)'  // all the same color
                    ],


                    borderColor: [
                        'rgba(61, 93, 96, 1)',

                    ],
                    borderWidth: 2 // 2px border around each bar
                }]
            },


            options: {
                responsive: true,           // Chart resizes with container
                maintainAspectRatio: true,  // Keep proportions when resizing

                // Plugin configurations (Chart.js extensions)
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'All Resources - Booking Count',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: 20
                    },

                    // Customize tooltip (popup when hovering over bars)
                    tooltip: {
                        callbacks: {
                            // Add resource type to tooltip
                            // context.dataIndex gives us which bar was hovered over yk :)
                            afterLabel: function(context)  {
                                const item = allResources[context.dataIndex];
                                return `Type: ${item.type}`; // Shows "Type: room" or "Type: lab"
                            }
                        }
                    }
                },

                // Configure X and Y axes
                scales: {
                    y: { // Y-axis shows booking count
                        beginAtZero: true,  // Start Y-axis at 0 (not auto-scaled)
                        ticks: {
                            stepSize: 1,    //  (1, 2, 3, not 1.5)
                            font: { size: 12 }
                        },
                        title: {
                            display: true,
                            text: 'Number of Bookings',
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        }
                    },
                    x: { // X-axis shows resource names
                        ticks: {
                            font: { size: 12 }
                        },
                        title: {
                            display: true,
                            text: 'Resource Name',
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Renders a horizontal bar chart showing peak booking times
     *  {Array} list - Array of timeslots with booking counts
     *                       Example: [{label: "09:00-10:30", bookings: 12}, ...]
     */
    function renderPeakTimesChart(list) {
        // Exit if container doesn't exist
        if (!peakContainer) return;

        peakContainer.innerHTML = '';
        // Show message if no data available
        if (!list.length) {
            peakContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No usage patterns yet.</p>';
            return;
        }

        // Create canvas element for the chart
        const canvas = document.createElement('canvas');
        canvas.id = 'peakChart';
        peakContainer.appendChild(canvas);

        if (peakChart) {
            peakChart.destroy();
        }


        const ctx = canvas.getContext('2d');


        peakChart = new Chart(ctx, {
            type: 'bar',

            data: {
                // Labels: time slot like "09:00-10:30"
                labels: list.map(slot => slot.label),

                datasets: [{
                    label: 'Number of Bookings',

                    data: list.map(slot => slot.bookings),

                    backgroundColor: 'rgba(46, 97, 105, 0.7)',
                    borderColor: 'rgba(46, 97, 105, 1)',
                    borderWidth: 2
                }]
            },

            options: {
                indexAxis: 'y', // This makes the chart horizontal
                                // 'y' means categories (time slots) are on Y axis and values (booking counts) are on X axis

                responsive: true,
                maintainAspectRatio: true,

                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Peak Booking Times',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: 20
                    }
                },

                scales: {
                    x: { // X-axis now shows booking counts
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 12 }
                        },
                        title: {
                            display: true,
                            text: 'Number of Bookings',
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        }
                    },
                    y: { // Y-axis now shows time slots
                        ticks: {
                            font: { size: 12 }
                        },
                        title: {
                            display: true,
                            text: 'Time Slot',
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }

    //  DATA FETCHING FUNCTIONS
    // These functions fetch data from the backend API and render charts

    /**
     * Fetches resource usage data from backend and renders popular resources chart
     * Backend endpoint: GET /api/resources/usage/summary
     * Returns [{id, name, type, bookings}, ...]
     */
    async function loadUsage() {

        const res = await fetch('/api/resources/usage/summary', {
            headers: authHeaders()
        });

        const data = await res.json();


        if (!res.ok) throw new Error(data.message || 'Failed to load analytics');


        // (b.bookings - a.bookings) sorts descending (largest first)
        const sorted = [...data].sort((a, b) => (b.bookings || 0) - (a.bookings || 0));

        // Pass sorted data to chart rendering function
        renderPopularChart(sorted);
    }


    async function loadPeakTimes() {

        const res = await fetch('/api/bookings', {
            headers: authHeaders()
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Failed to load bookings');

        // Count bookings per timeslot for example: {"09:00-10:30": 12, "10:30-12:00": 8, ...}
        const counts = {};


        data.forEach((b) => {

            if (b.status === 'cancelled') return;

            const label = b.timeslot?.label;

            if (!label) return;



            counts[label] = (counts[label] || 0) + 1;
        });


        const entries = Object.entries(counts).map(([label, bookings]) => ({
            label,
            bookings
        }));


        entries.sort((a, b) => b.bookings - a.bookings);

        renderPeakTimesChart(entries);
    }




    document.addEventListener('DOMContentLoaded', async () => {

        if (!ensureAdmin()) return;


        if (popularContainer) {
            popularContainer.innerHTML = '<p style="text-align: center; padding: 40px;">Loading charts...</p>';
        }
        if (peakContainer) {
            peakContainer.innerHTML = '<p style="text-align: center; padding: 40px;">Loading charts...</p>';
        }

        try {

            await loadUsage();
            await loadPeakTimes();

        } catch (err) {


            console.error(err);

            if (popularContainer) {
                popularContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: #c0392b;">${err.message}</p>`;
            }
            if (peakContainer) {
                peakContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: #c0392b;">${err.message}</p>`;
            }
        }
    });

})();