document.getElementById('saveReportBtn').addEventListener('click', async () => {
    try {
        const reportData = {
            content: window.generateCSV(), // Use window-scoped function
            filename: `validation_report_${new Date().toISOString().slice(0, 10)}.csv`,
            summary: {
                truePositives: document.querySelectorAll('.true-positive').length,
                falsePositives: document.querySelectorAll('.false-positive').length,
                falseNegatives: document.querySelectorAll('.false-negative').length,
                notValid: document.querySelectorAll('.not-valid').length
            },
            rowCount: document.querySelectorAll('.node-row').length,
            timestamp: Date.now()
        };

        await dbService.saveReport(reportData);
        showNotification('Report saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving report:', error);
        showNotification('Failed to save report', 'error');
    }
});
