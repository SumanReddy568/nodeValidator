document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const openDevToolsBtn = document.getElementById('openDevTools');
    const quickStats = document.getElementById('quickStats');
    const progressStat = document.getElementById('progressStat');
    const tpStat = document.getElementById('tpStat');
    const fpStat = document.getElementById('fpStat');

    // Open DevTools panel
    openDevToolsBtn.addEventListener('click', function () {
        // We can't directly open DevTools, so just inform the user
        alert('Please open Chrome DevTools (F12) and navigate to the Node Validator panel.');
    });

    // Check for existing data
    chrome.storage.local.get(['validationData', 'currentIndex'], function (data) {
        if (data.validationData && data.validationData.length > 0) {
            updateStats(data.validationData, data.currentIndex);
        } else {
            quickStats.style.display = 'none';
        }
    });

    // Listen for changes
    chrome.storage.onChanged.addListener(function (changes) {
        chrome.storage.local.get(['validationData', 'currentIndex'], function (data) {
            if (data.validationData && data.validationData.length > 0) {
                updateStats(data.validationData, data.currentIndex);
                quickStats.style.display = 'block';
            } else {
                quickStats.style.display = 'none';
            }
        });
    });

    // Update stats in the popup
    function updateStats(data, currentIndex) {
        const summary = generateSummary(data);

        progressStat.textContent = `${currentIndex}/${data.length} URLs`;
        tpStat.textContent = summary.truePositives.toString();
        fpStat.textContent = summary.falsePositives.toString();
    }
});
