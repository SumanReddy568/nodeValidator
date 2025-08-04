document.addEventListener('DOMContentLoaded', async function () {
    const dbService = new DBService();
    const backButton = document.getElementById('backButton');

    // Apply theme from localStorage or system preference
    function applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
    }

    // Navigate back to the main panel
    backButton.addEventListener('click', function () {
        window.location.href = 'panel.html';
    });

    // Format a timestamp for display
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    // Load saved reports from IndexedDB
    async function loadReports() {
        const reportsContainer = document.getElementById('reportsContainer');
        reportsContainer.innerHTML = '';

        try {
            const reports = await dbService.getAllReports();

            if (reports.length === 0) {
                reportsContainer.innerHTML = `
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <h3>No saved reports found</h3>
                        <p>Export results from the validation dashboard to save reports</p>
                    </div>
                `;
                return;
            }

            // Sort reports by newest first
            reports.sort((a, b) => b.timestamp - a.timestamp);

            reports.forEach((report) => {
                const reportCard = document.createElement('div');
                reportCard.className = 'report-card';

                // Create node counts summary
                let summary = '';
                if (report.summary) {
                    summary = `${report.summary.truePositives || 0} TP, ${report.summary.falsePositives || 0} FP, ${report.summary.falseNegatives || 0} FN, ${report.summary.notValid || 0} Invalid`;
                }

                const details = document.createElement('div');
                details.className = 'details';
                details.innerHTML = `
                <span><strong>${report.filename}</strong></span>
                <span>Saved on: ${formatDate(report.timestamp)}</span>
                <span class="summary">${report.rowCount || 0} nodes • ${summary}</span>
            `;

                const actions = document.createElement('div');
                actions.className = 'actions';

                const viewButton = document.createElement('button');
                viewButton.className = 'view-button';
                viewButton.textContent = 'Download';
                viewButton.addEventListener('click', () => {
                    // Create and trigger download
                    const blob = new Blob([report.content], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = report.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                });

                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-button';
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', async () => {
                    if (confirm('Are you sure you want to delete this report?')) {
                        await dbService.deleteReport(report.id);
                        await loadReports();
                    }
                });

                actions.appendChild(viewButton);
                actions.appendChild(deleteButton);

                reportCard.appendChild(details);
                reportCard.appendChild(actions);
                reportsContainer.appendChild(reportCard);
            });
        } catch (error) {
            console.error('Error loading reports:', error);
            reportsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Error loading reports. Please try again.</p>
                </div>
            `;
        }
    }

    // Apply theme on page load
    applyTheme();

    // Initialize database and load reports
    try {
        await dbService.init();
        await loadReports();
    } catch (error) {
        console.error('Error initializing database:', error);
    }
});
