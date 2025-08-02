// Import Papaparse manually as we're not using modules
// You'll need to include this in your HTML file:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js"></script>

// NodeStatus enum equivalent
const NodeStatus = {
    TruePositive: 'True Positive',
    FalsePositive: 'False Positive',
    FalseNegative: 'False Negative',
    NotFound: 'Not Found',
    NotValid: 'Not Valid',
    Pending: 'Pending'
};

/**
 * Parse a CSV file and return an array of row objects.
 * Each row must have 'url' and 'targetNode'.
 * Adds a 'status' property set to Pending.
 */
function parseCsv(file) {
    return new Promise(function (resolve, reject) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                if (results.errors && results.errors.length > 0) {
                    reject(results.errors);
                    return;
                }
                // Accept both 'targetNode' and 'target_node'
                const rows = (results.data || []).map(function (row) {
                    let targetNode = row.targetNode || row.target_node;
                    return row.url && targetNode
                        ? {
                            url: row.url,
                            targetNode: targetNode,
                            status: NodeStatus.Pending,
                            notes: row.notes || ""
                        }
                        : null;
                }).filter(Boolean);
                if (!rows.length) {
                    reject([{ message: 'No valid rows found. Ensure CSV has url and targetNode columns.' }]);
                    return;
                }
                resolve(rows);
            },
            error: function (error) {
                reject([error]);
            }
        });
    });
}

/**
 * Export the given data array as a CSV file and trigger download.
 * Also saves the report in localStorage for access in the Saved Reports page.
 */
function exportCsv(data) {
    if (!Array.isArray(data) || !data.length) {
        alert('No data to export.');
        return;
    }

    // Ensure "Comments" column is included
    const csvData = data.map(row => ({
        url: row.url || '',
        targetNode: row.targetNode || '',
        status: row.status || 'Pending',
        comments: row.comments || '' // Add comments column
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `node-validation-results-${date}-${time}.csv`;

    // Calculate summary for report metadata
    const summary = {
        truePositives: csvData.filter(row => row.status === 'True Positive').length,
        falsePositives: csvData.filter(row => row.status === 'False Positive').length,
        falseNegatives: csvData.filter(row => row.status === 'False Negative').length,
        notValid: csvData.filter(row => row.status === 'Not Valid').length,
        needsReview: csvData.filter(row => row.status === 'Needs Review').length
    };

    // Save the report in local storage
    const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    savedReports.push({
        filename,
        timestamp: Date.now(),
        content: csv,
        rowCount: csvData.length,
        summary: summary
    });
    localStorage.setItem('savedReports', JSON.stringify(savedReports));

    // Trigger download
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Generate a summary object for the UI from the data array.
 */
function generateSummary(data) {
    if (!Array.isArray(data)) return null;

    return {
        totalUrls: data.length,
        totalNodes: data.length,
        truePositives: data.filter(row => row.status === 'True Positive').length,
        falsePositives: data.filter(row => row.status === 'False Positive').length,
        falseNegatives: data.filter(row => row.status === 'False Negative').length,
        notValid: data.filter(row => row.status === 'Not Valid').length,
        pending: data.filter(row => !row.status || row.status === 'Pending').length
    };
}
