// Add this near your other button handlers
async function saveReport(data) {
    const dbService = new DBService();
    await dbService.init();

    const report = {
        filename: `validation_report_${new Date().toISOString().slice(0, 10)}.csv`,
        content: data,
        summary: {
            truePositives: countByType('true-positive'),
            falsePositives: countByType('false-positive'),
            falseNegatives: countByType('false-negative'),
            notValid: countByType('not-valid')
        },
        rowCount: getRowCount(),
        timestamp: Date.now()
    };

    await dbService.saveReport(report);
    alert('Report saved successfully!');
}

// Add the save button to your UI where appropriate
function addSaveButton() {
    const saveButton = document.createElement('button');
    saveButton.className = 'extension-button';
    saveButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save Report
    `;
    saveButton.onclick = () => {
        const csvData = generateCSVData(); // Your existing CSV generation function
        saveReport(csvData);
    };

    // Add the button to your toolbar
    document.querySelector('.toolbar').appendChild(saveButton);
}
