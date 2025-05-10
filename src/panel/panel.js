// Add proper error handling for frame reload
window.addEventListener('error', function (event) {
    console.error('Global error caught:', event.error);
    try {
        showFallbackUI('An error occurred while loading the panel. Try reopening DevTools.');
    } catch (e) {
        // Last resort - show a basic message if everything else fails
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: system-ui;">
                <h2 style="color: #db4437;">Node Validator Error</h2>
                <p>An error occurred while loading the panel.</p>
                <button onclick="location.reload()">Reload Panel</button>
            </div>
        `;
    }
});

// Show a fallback UI when something goes wrong
function showFallbackUI(message) {
    // Clear any existing content
    const container = document.querySelector('.panel-container');
    if (container) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2 style="color: var(--danger); margin-bottom: 16px;">Oops! Something went wrong</h2>
                <p style="margin-bottom: 20px;">${message}</p>
                <button class="action-button primary" onclick="location.reload()">Reload Panel</button>
            </div>
        `;
    }
}

// Add a function to show dock position warning
function showDockPositionWarning(position) {
    // Create or update the dock warning if not bottom
    if (position !== 'default') {
        // Check if warning already exists
        let warningEl = document.getElementById('dock-warning');
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = 'dock-warning';
            warningEl.className = 'dock-warning';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'dock-warning-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = function () {
                warningEl.style.display = 'none';

                // Remember that user dismissed this warning
                localStorage.setItem('dock-warning-dismissed', 'true');
            };

            warningEl.appendChild(closeBtn);
            document.body.insertBefore(warningEl, document.body.firstChild);
        }

        // Don't show if user dismissed it
        if (localStorage.getItem('dock-warning-dismissed') === 'true') {
            return;
        }

        // Update warning message based on position
        let positionName = position === 'dark' ? 'right' : 'left';
        warningEl.innerHTML = `
            <button class="dock-warning-close">&times;</button>
            <div class="dock-warning-content">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>
                    Node Validator works best in <strong>bottom dock</strong> mode. 
                    You're currently using <strong>${positionName}</strong> mode, which may cause UI issues.
                </span>
            </div>
        `;

        warningEl.querySelector('.dock-warning-close').onclick = function () {
            warningEl.style.display = 'none';
            localStorage.setItem('dock-warning-dismissed', 'true');
        };
    }
}

// Ensure DOM is ready before trying to access elements
function ensureDomReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// Initialize panel with proper error handling
ensureDomReady(function () {
    try {
        initializePanel();
    } catch (err) {
        console.error('Error initializing panel:', err);
        showFallbackUI('Failed to initialize the panel. Please try reopening DevTools.');
    }
});

// Main panel initialization function
function initializePanel() {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const csvFileInput = document.getElementById('csvFileInput');
    const progressSection = document.getElementById('progressSection');
    const summarySection = document.getElementById('summarySection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const exportResultsBtn = document.getElementById('exportResults');
    const uploadSection = document.getElementById('uploadSection');
    const startValidationBtn = document.getElementById('startValidation');
    const stopValidationBtn = document.getElementById('stopValidation');
    const headerSection = document.getElementById('headerSection');
    const homeButton = document.getElementById('homeButton');
    const newRunButton = document.getElementById('newRunButton');

    // Summary Elements
    const totalUrlsEl = document.getElementById('totalUrls');
    const totalNodesEl = document.getElementById('totalNodes');
    const truePositivesEl = document.getElementById('truePositives');
    const falsePositivesEl = document.getElementById('falsePositives');
    const falseNegativesEl = document.getElementById('falseNegatives');
    const notValidEl = document.getElementById('notValid');
    const pendingEl = document.getElementById('pending');

    const currentSelector = document.getElementById('currentSelector');
    const statusNotes = document.getElementById('statusNotes');
    const nextUrlBtn = document.getElementById('nextUrl');

    const statusButtons = {
        statusTruePositive: 'True Positive',
        statusFalsePositive: 'False Positive',
        statusFalseNegative: 'False Negative',
        statusNotValid: 'Not Valid'
    };

    let selectedStatus = null;

    let automatedMode = false; // Default to manual mode

    // Improved status button setup with better visual feedback
    function setupStatusButtons() {
        Object.keys(statusButtons).forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.onclick = function () {
                    // Clear all selections
                    Object.keys(statusButtons).forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) btn.classList.remove('selected');
                    });

                    // Select this button
                    button.classList.add('selected');
                    selectedStatus = statusButtons[buttonId];

                    // Preview the status change in stats
                    previewStatusChange(buttonId);
                };
            }
        });
    }

    // Preview status change by updating the stats immediately
    function previewStatusChange(statusBtnId) {
        // Only update if we have validation data
        if (!validationData || !validationData[currentIndex]) return;

        // Get current status if any
        const currentStatus = validationData[currentIndex].status;

        // Create a copy of validation data with updated status
        const updatedData = [...validationData];
        updatedData[currentIndex] = {
            ...updatedData[currentIndex],
            status: statusButtons[statusBtnId]
        };

        // Update UI with the previewed change
        updateSummaryUI(generateSummary(updatedData));
    }

    // More robust function to display the current validation info
    function updateCurrentValidation(url, selector) {
        try {
            const currentUrlEl = document.getElementById('currentUrl');
            const selectorCodeEl = document.getElementById('selectorCode');

            // Always update with the actual values from validationData
            if (currentUrlEl && validationData[currentIndex]) {
                currentUrlEl.textContent = validationData[currentIndex].url;
            }
            if (selectorCodeEl && validationData[currentIndex]) {
                selectorCodeEl.textContent = validationData[currentIndex].targetNode;
            }

            console.log('Updated validation display:', {
                url: validationData[currentIndex].url,
                selector: validationData[currentIndex].targetNode
            });
        } catch (error) {
            console.error('Error updating validation display:', error);
        }
    }

    // Show the status marking section with current node info
    function showStatusMarking(selector) {
        try {
            if (validationData && validationData[currentIndex]) {
                const url = validationData[currentIndex].url;
                console.log('Showing status marking for:', { url, selector });

                updateCurrentValidation(url, selector || validationData[currentIndex].targetNode || '-');

                // Ensure buttons are properly set up
                setupStatusButtons();

                // Make sure UI is visible
                setUISection('summary');
            }
        } catch (error) {
            console.error('Error showing status marking:', error);
        }
    }

    // Custom notification modal
    function showCustomConfirm(message, onConfirm) {
        // Remove any existing modal
        const existing = document.getElementById('nv-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'nv-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.18)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '99999';

        const box = document.createElement('div');
        box.style.background = '#fff';
        box.style.borderRadius = '8px';
        box.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
        box.style.padding = '24px 28px';
        box.style.minWidth = '320px';
        box.style.maxWidth = '90vw';
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.alignItems = 'center';

        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.marginBottom = '20px';
        msg.style.fontSize = '15px';
        msg.style.color = '#333';
        msg.style.textAlign = 'center';

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '16px';

        const yesBtn = document.createElement('button');
        yesBtn.textContent = 'Yes';
        yesBtn.style.background = 'var(--primary)';
        yesBtn.style.color = '#fff';
        yesBtn.style.border = 'none';
        yesBtn.style.borderRadius = '4px';
        yesBtn.style.padding = '8px 18px';
        yesBtn.style.fontWeight = '600';
        yesBtn.style.cursor = 'pointer';

        const noBtn = document.createElement('button');
        noBtn.textContent = 'No';
        noBtn.style.background = 'var(--gray-300)';
        noBtn.style.color = '#333';
        noBtn.style.border = 'none';
        noBtn.style.borderRadius = '4px';
        noBtn.style.padding = '8px 18px';
        noBtn.style.fontWeight = '600';
        noBtn.style.cursor = 'pointer';

        yesBtn.onclick = function () {
            modal.remove();
            onConfirm && onConfirm();
        };
        noBtn.onclick = function () {
            modal.remove();
        };

        btnRow.appendChild(yesBtn);
        btnRow.appendChild(noBtn);
        box.appendChild(msg);
        box.appendChild(btnRow);
        modal.appendChild(box);
        document.body.appendChild(modal);
    }

    // Add notification system to show messages within DevTools panel
    function showNotification(message, type = 'info', duration = 3000) {
        // Remove any existing notification
        const existingNotification = document.getElementById('nv-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'nv-notification';
        notification.className = `nv-notification ${type}`;
        notification.textContent = message;

        // Append to panel container
        const container = document.querySelector('.panel-container');
        if (container) {
            container.appendChild(notification);

            // Auto-remove after duration
            if (duration > 0) {
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.classList.add('fade-out');
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.parentNode.removeChild(notification);
                            }
                        }, 300);
                    }
                }, duration);
            }
        }

        return notification;
    }

    // Add debug logging to help diagnose issues
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        console.log('Panel received message:', message.action, message);

        try {
            // Handle various message types
            if (message.action === 'UPDATE_STATUS_RESULT') {
                if (message.success) {
                    console.log('Status update confirmed by background script');
                    // Make sure validationData is updated locally
                    if (validationData[message.index]) {
                        validationData[message.index].status = message.status;
                        validationData[message.index].comments = message.comments || '';

                        // Update the UI to reflect changes immediately
                        updateSummaryUI(generateSummary(validationData));

                        // Show notification for automated updates
                        if (message.automated) {
                            const statusMsg = message.status === 'True Positive' ?
                                'Element found and marked as True Positive.' :
                                'Element not found and marked as Not Valid.';

                            // Update the automation status display
                            const autoStatus = document.getElementById('automation-status');
                            if (autoStatus) {
                                const progress = `${message.index + 1}/${validationData.length}`;
                                autoStatus.textContent = `Processing: ${progress} - ${statusMsg}`;

                                // If this is the last item, show completing message
                                if (message.isLast) {
                                    autoStatus.textContent = `Completing validation... (${progress} processed)`;
                                }
                            }

                            // Also update progress bar immediately
                            updateProgressUI(message.index + 1, validationData.length);
                        }
                    }
                } else {
                    console.error('Background script reported error:', message.error);
                    showNotification(`Status update error: ${message.error}`, 'error');
                }
            }
            else if (message.action === 'VALIDATION_COMPLETE') {
                console.log('Received validation complete message:', message);

                // Force refresh data to ensure we have latest state
                chrome.storage.local.get(['validationData', 'currentIndex'], function (data) {
                    if (Array.isArray(data.validationData)) {
                        validationData = data.validationData;
                        currentIndex = data.currentIndex || validationData.length;

                        // Update UI with final data
                        updateSummaryUI(generateSummary(validationData));
                        updateProgressUI(validationData.length, validationData.length);
                    }

                    // Update UI to show validation is complete
                    if (startValidationBtn) {
                        startValidationBtn.textContent = 'Start Validation';
                        startValidationBtn.disabled = false;
                    }

                    if (stopValidationBtn) {
                        stopValidationBtn.textContent = 'Stopped';
                        stopValidationBtn.disabled = true;
                    }

                    if (nextUrlBtn) {
                        nextUrlBtn.disabled = true;
                    }

                    // Remove any automation notification
                    const notification = document.querySelector('.automation-notification');
                    if (notification) {
                        notification.remove();
                    }

                    // Re-enable UI elements
                    document.querySelectorAll('.status-btn').forEach(btn => {
                        btn.disabled = false;
                    });

                    if (statusNotes) {
                        statusNotes.disabled = false;
                    }

                    // Show completion message
                    if (message.pendingFixed) {
                        showNotification('Automated validation complete! Some nodes were auto-marked as Not Valid.', 'warning', 5000);
                    } else {
                        showNotification('Automated validation complete!', 'success');
                    }
                });
            }
            else if (message.action === 'ELEMENT_STATUS') {
                // Handle element found/not found status messages
                const statusText = message.found ?
                    'Element found on page! Please mark its status.' :
                    'Element not found on page. Consider marking as Not Valid.';

                showNotification(statusText, message.found ? 'success' : 'warning', 5000);

                console.log('Element status received in panel:', message);

                // If in manual mode, pre-select the recommended button
                if (!automatedMode) {
                    if (!message.found) {
                        const notValidBtn = document.getElementById('statusNotValid');
                        if (notValidBtn) {
                            // Simulate a click on the Not Valid button
                            Object.keys(statusButtons).forEach(id => {
                                const btn = document.getElementById(id);
                                if (btn) btn.classList.remove('selected');
                            });
                            notValidBtn.classList.add('selected');
                            selectedStatus = statusButtons.statusNotValid;
                            previewStatusChange('statusNotValid');

                            // Add a suggestion to the comments
                            if (statusNotes) {
                                if (!statusNotes.value) {
                                    statusNotes.value = 'Element not found on page.';
                                }
                            }
                        }
                    }
                }
            }
            // Add a DEBUG message type for troubleshooting
            else if (message.action === 'DEBUG') {
                console.log('Debug message received:', message.payload);
            }
            else if (message.action === 'DOCK_POSITION_UPDATED') {
                console.log('Dock position updated:', message.position);
                showDockPositionWarning(message.position);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    // Update the start validation click handler for more robust initialization
    if (startValidationBtn) {
        startValidationBtn.addEventListener('click', function () {
            if (!validationData || validationData.length === 0) {
                showNotification('Please upload a CSV file first.', 'error');
                return;
            }

            // Reset all statuses and comments for a fresh run
            validationData = validationData.map(row => ({
                ...row,
                status: undefined,
                comments: ''
            }));

            // Always start from index 0
            currentIndex = 0;
            selectedStatus = null;

            // Reset progress bar and text
            updateProgressUI(0, validationData.length);

            // Reset stop button
            if (stopValidationBtn) {
                stopValidationBtn.textContent = 'Stop';
                stopValidationBtn.disabled = false;
            }

            // Make sure next button is properly enabled for manual mode
            if (nextUrlBtn) {
                nextUrlBtn.disabled = automatedMode;
                nextUrlBtn.textContent = 'Next URL';
            }

            // Show mode notification
            showNotification(`Starting validation in ${automatedMode ? 'automated' : 'manual'} mode...`, 'info');

            chrome.runtime.sendMessage({
                action: 'START_VALIDATION',
                payload: {
                    url: validationData[currentIndex].url,
                    targetNode: validationData[currentIndex].targetNode,
                    automated: automatedMode
                }
            }, function (response) {
                if (!response || !response.success) {
                    showNotification(response && response.error ? response.error : 'Failed to start validation', 'error');
                } else {
                    startValidationBtn.textContent = automatedMode ? 'Auto-Validating...' : 'Validating...';
                    startValidationBtn.disabled = true;
                    setUISection('summary');
                    setupStatusButtons();
                    updateCurrentValidation(
                        validationData[currentIndex].url,
                        validationData[currentIndex].targetNode
                    );

                    // In manual mode, enable Next URL button. In automated mode, disable it
                    if (nextUrlBtn) nextUrlBtn.disabled = automatedMode;

                    // If automated, show a notification
                    if (automatedMode) {
                        const notification = document.createElement('div');
                        notification.className = 'automation-notification';
                        notification.id = 'automation-status';
                        notification.textContent = 'Automated validation in progress...';
                        document.querySelector('.validation-controls').appendChild(notification);

                        // Disable status buttons in automated mode
                        document.querySelectorAll('.status-btn').forEach(btn => {
                            btn.disabled = true;
                        });

                        if (statusNotes) {
                            statusNotes.disabled = true;
                        }
                    } else {
                        showNotification('Please mark the status for each node manually.', 'info', 5000);
                    }

                    // Also update summary UI to reflect reset
                    updateSummaryUI(generateSummary(validationData));
                }
            });
        });
    }

    // Handle stop validation
    if (stopValidationBtn) {
        stopValidationBtn.addEventListener('click', function () {
            showCustomConfirm('Are you sure you want to stop validation? You can resume later.', function () {
                // Reset UI state
                if (startValidationBtn) {
                    startValidationBtn.textContent = 'Stopped';
                    startValidationBtn.disabled = false;
                }
                // Also update the stop button itself
                stopValidationBtn.textContent = 'Stopped';
                stopValidationBtn.disabled = true;

                // Notify background script
                chrome.runtime.sendMessage({
                    action: 'STOP_VALIDATION'
                });

                // Return to summary view
                setUISection('summary');
            });
        });
    }

    // Update the Next URL button handler with improved error handling
    if (nextUrlBtn) {
        nextUrlBtn.onclick = function () {
            console.log('Next URL button clicked, selected status:', selectedStatus);

            if (!selectedStatus) {
                showNotification('Please select a status for this node.', 'error');
                return;
            }

            // Disable the button while processing to prevent double-clicks
            nextUrlBtn.disabled = true;
            nextUrlBtn.textContent = 'Updating...';

            const comments = statusNotes ? statusNotes.value || '' : '';

            // First, update local state
            if (validationData[currentIndex]) {
                validationData[currentIndex].status = selectedStatus;
                validationData[currentIndex].comments = comments;
            }

            // Then send message to background
            chrome.runtime.sendMessage({
                action: 'UPDATE_STATUS',
                payload: {
                    index: currentIndex,
                    status: selectedStatus,
                    comments: comments
                }
            }, function (response) {
                console.log('Update status response:', response);

                if (response && response.success) {
                    showNotification(`Status marked as ${selectedStatus}`, 'success');

                    // Reset status selection
                    selectedStatus = null;
                    if (statusNotes) statusNotes.value = '';

                    // Reset button states
                    Object.keys(statusButtons).forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) {
                            btn.classList.remove('selected');
                        }
                    });

                    // Move to next URL
                    moveToNextUrl();
                } else {
                    nextUrlBtn.disabled = false;
                    nextUrlBtn.textContent = 'Next URL';
                    showNotification('Failed to update status. Please try again.', 'error');
                }
            });
        };
    }

    // Function to move to the next URL
    function moveToNextUrl() {
        if (nextUrlBtn) {
            nextUrlBtn.disabled = true;
            nextUrlBtn.textContent = 'Loading...';
        }

        showNotification('Loading next item...', 'info');

        chrome.runtime.sendMessage({ action: 'NEXT_URL' }, function (nextResponse) {
            console.log('Next URL response:', nextResponse);

            if (nextUrlBtn) {
                nextUrlBtn.disabled = false;
                nextUrlBtn.textContent = 'Next URL';
            }

            if (nextResponse && nextResponse.success) {
                chrome.storage.local.get(['currentIndex'], function (data) {
                    if (typeof data.currentIndex === 'number') {
                        currentIndex = data.currentIndex;
                    }

                    updateCurrentValidation();
                    updateProgressUI(currentIndex, validationData.length);
                    showNotification('Ready for validation', 'success');
                });
            } else {
                const completeMsg = nextResponse && nextResponse.message ? nextResponse.message : 'Validation complete!';
                showNotification(completeMsg, 'success', 5000);

                if (startValidationBtn) {
                    startValidationBtn.textContent = 'Start Validation';
                    startValidationBtn.disabled = false;
                }

                if (nextUrlBtn) {
                    nextUrlBtn.disabled = true;
                }

                if (stopValidationBtn) {
                    stopValidationBtn.textContent = 'Stopped';
                    stopValidationBtn.disabled = true;
                }

                updateProgressUI(validationData.length, validationData.length);

                chrome.storage.local.get(['validationData', 'currentIndex'], function (data) {
                    if (Array.isArray(data.validationData)) {
                        validationData = data.validationData;
                        updateSummaryUI(generateSummary(validationData));
                    }
                });
            }
        });
    }

    // Handle home button click - return to upload view
    if (homeButton) {
        homeButton.addEventListener('click', function () {
            showCustomConfirm('Return to upload screen? This will not affect your current validation data.', function () {
                setUISection('upload');
            });
        });
    }

    // Handle new run button click - clear data and return to upload
    if (newRunButton) {
        newRunButton.addEventListener('click', function () {
            showCustomConfirm('Start a new validation run? This will clear all current validation data.', function () {
                // Reset UI elements first
                if (startValidationBtn) {
                    startValidationBtn.textContent = 'Start Validation';
                    startValidationBtn.disabled = false;
                }

                if (stopValidationBtn) {
                    stopValidationBtn.textContent = 'Stop';
                    stopValidationBtn.disabled = false;
                }

                if (nextUrlBtn) {
                    nextUrlBtn.disabled = false;
                }

                // Reset validation state completely
                validationData = [];
                currentIndex = 0;
                selectedStatus = null;

                // Reset any automation state
                automatedMode = false;
                const modeToggle = document.getElementById('modeToggle');
                if (modeToggle) modeToggle.checked = false;
                const modeText = document.getElementById('modeText');
                if (modeText) modeText.textContent = 'Manual Mode';

                // Make sure status buttons are enabled
                document.querySelectorAll('.status-btn').forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('selected');
                });

                if (statusNotes) {
                    statusNotes.disabled = false;
                    statusNotes.value = '';
                }

                // Remove any existing automation notification
                const notification = document.querySelector('.automation-notification');
                if (notification) notification.remove();

                // Notify background script to reset
                chrome.runtime.sendMessage({
                    action: 'RESET_VALIDATION'
                });

                // Update storage with empty data
                chrome.storage.local.set({
                    validationData: [],
                    currentIndex: 0
                }, function () {
                    // Update UI to reflect empty state
                    updateSummaryUI(generateSummary([]));
                    updateProgressUI(0, 0);

                    // Return to upload view
                    setUISection('upload');

                    // Show notification for user feedback
                    showNotification('Ready for new validation run', 'info');

                    // Also reset the file input to allow re-uploading same file
                    if (csvFileInput) {
                        csvFileInput.value = '';
                    }
                });
            });
        });
    }

    // Global state with safer initialization
    let validationData = [];
    let currentIndex = 0;
    let initialized = false;

    // Initialize or recover state
    function initializeState() {
        if (initialized) return;

        chrome.storage.local.get(['validationData', 'currentIndex'], function (data) {
            try {
                // Always ensure we have a valid array
                validationData = Array.isArray(data.validationData) ? data.validationData : [];
                currentIndex = typeof data.currentIndex === 'number' ? data.currentIndex : 0;

                updateUI();
                initialized = true;

                console.log('Panel state initialized with', validationData.length, 'records');
            } catch (err) {
                console.error('Error initializing state:', err);
                // Reset to a safe state
                validationData = [];
                currentIndex = 0;
                setUISection('upload');
            }
        });
    }

    function updateUI() {
        try {
            // Set the UI section based on current state
            if (validationData.length === 0) {
                setUISection('upload');
                updateSummaryUI(generateSummary([]));
                updateProgressUI(0, 0);
                if (exportResultsBtn) exportResultsBtn.disabled = true;
            } else if (currentIndex === 0 && !hasResults(validationData)) {
                setUISection('summary');
                updateSummaryUI(generateSummary(validationData));
                updateProgressUI(0, validationData.length);
                if (exportResultsBtn) exportResultsBtn.disabled = true;
            } else {
                setUISection('summary');
                updateProgressUI(currentIndex, validationData.length);
                updateSummaryUI(generateSummary(validationData));
                if (exportResultsBtn) {
                    exportResultsBtn.disabled = !hasResults(validationData);
                }
            }
        } catch (err) {
            console.error('Error updating UI:', err);
        }
    }

    // Safely set UI section visibility
    function setUISection(section) {
        try {
            // Show header only in upload section
            if (headerSection) headerSection.style.display = section === 'upload' ? 'block' : 'none';

            if (uploadSection) uploadSection.style.display = section === 'upload' ? 'block' : 'none';
            if (summarySection) summarySection.style.display = section === 'summary' ? 'block' : 'none';
            if (progressSection) progressSection.style.display = section === 'progress' ? 'block' : 'none';
        } catch (e) {
            console.error("Error setting UI section visibility:", e);
        }
    }

    // Set up event listeners for drag and drop
    if (dropArea) {
        dropArea.addEventListener('click', function () {
            csvFileInput.click();
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(function (eventName) {
            dropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(function (eventName) {
            dropArea.addEventListener(eventName, unhighlight, false);
        });

        function highlight() {
            dropArea.classList.add('highlight');
        }

        function unhighlight() {
            dropArea.classList.remove('highlight');
        }

        // Handle file drop
        dropArea.addEventListener('drop', handleDrop, false);
    }

    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleFileSelect, false);
    }

    // Button event listeners
    if (exportResultsBtn) {
        exportResultsBtn.addEventListener('click', function () {
            if (!validationData || validationData.length === 0) {
                alert('No results to export.');
                return;
            }

            // Ensure comments are included from the UI state
            const dataToExport = validationData.map((row, idx) => {
                // If the current index is the one being edited, get the latest comments from the textarea
                let comments = row.comments || '';
                if (idx === currentIndex && statusNotes && statusNotes.value) {
                    comments = statusNotes.value;
                }
                return {
                    url: row.url,
                    targetNode: row.targetNode,
                    status: row.status,
                    comments: comments
                };
            });

            exportCsv(dataToExport);
        });
    }

    // Check for existing data
    chrome.storage.local.get(['validationData', 'currentIndex'], function (data) {
        // Defensive: Ensure data is always an array
        if (!Array.isArray(data.validationData)) {
            validationData = [];
            currentIndex = 0;
            setUISection('upload');
            updateSummaryUI(generateSummary([]));
            updateProgressUI(0, 0);
            if (exportResultsBtn) exportResultsBtn.disabled = true;
            return;
        }

        validationData = data.validationData;
        currentIndex = typeof data.currentIndex === 'number' ? data.currentIndex : 0;

        // If we have data but haven't started validating, show the summary section
        if (currentIndex === 0 && !hasResults(validationData)) {
            setUISection('summary');
            updateSummaryUI(generateSummary(validationData));
            updateProgressUI(0, validationData.length);
        } else if (validationData.length > 0) {
            // If we're mid-validation or have results, show progress and summary
            setUISection('progress');
            updateProgressUI(currentIndex, validationData.length);
            updateSummaryUI(generateSummary(validationData));
            if (exportResultsBtn) {
                exportResultsBtn.disabled = !hasResults(validationData);
            }
        } else {
            // No data, show upload section
            setUISection('upload');
            updateSummaryUI(generateSummary([]));
            updateProgressUI(0, 0);
            if (exportResultsBtn) exportResultsBtn.disabled = true;
        }
    });

    // Listen for changes to the validation data
    chrome.storage.onChanged.addListener(function (changes) {
        if (changes.validationData) {
            validationData = changes.validationData.newValue;
            updateSummaryUI(generateSummary(validationData));
            if (exportResultsBtn) {
                exportResultsBtn.disabled = !hasResults(validationData);
            }
        }

        if (changes.currentIndex && validationData.length > 0) {
            currentIndex = changes.currentIndex.newValue;
            updateProgressUI(currentIndex, validationData.length);
            if (exportResultsBtn) {
                exportResultsBtn.disabled = !hasResults(validationData);
            }
        }
    });

    // Handle dropped files
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files && files.length) {
            handleFiles(files);
        }
    }

    // Handle file selection via the file input
    function handleFileSelect(e) {
        const target = e.target;
        const files = target.files;

        if (files && files.length) {
            handleFiles(files);
        }
    }

    // Process the uploaded files
    function handleFiles(files) {
        const file = files[0]; // Only process the first file

        if (!file || (file.type !== 'text/csv' && !file.name.endsWith('.csv'))) {
            showNotification('Please upload a valid CSV file', 'error');
            return;
        }

        // Show loading notification
        showNotification('Processing CSV file...', 'info');

        parseCsv(file)
            .then(function (rows) {
                // Accept both 'targetNode' and 'target_node' for flexibility
                if (Array.isArray(rows) && rows.length > 0 && (!rows[0].targetNode && rows[0].target_node)) {
                    rows.forEach(function (row) {
                        if (!row.targetNode && row.target_node) row.targetNode = row.target_node;
                    });
                }

                if (!Array.isArray(rows) || rows.length === 0 || !rows[0].url || !rows[0].targetNode) {
                    showNotification('CSV must have at least one row and columns: url,targetNode', 'error');
                    return;
                }

                // Reset any existing state entirely
                validationData = rows.map(row => ({
                    ...row,
                    status: undefined,
                    comments: ''
                }));
                currentIndex = 0;

                console.log('Processed CSV with', rows.length, 'records');

                // Always use chrome.runtime.sendMessage when in extension context
                if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({
                        action: 'UPLOAD_CSV',
                        payload: validationData
                    }, function (response) {
                        if (response && response.success) {
                            // Update CSV summary statistics
                            updateSummaryUI(generateSummary(validationData));

                            // Show summary section
                            setUISection('summary');

                            // Show success notification
                            showNotification(`Loaded ${rows.length} records successfully`, 'success');
                        } else {
                            showNotification('Failed to upload CSV file', 'error');
                        }
                    });
                } else {
                    showNotification('chrome.runtime.sendMessage is not available. Please ensure you are running this as a Chrome extension.', 'error');
                }
            })
            .catch(function (error) {
                // Improved error reporting
                let msg = 'Error parsing CSV file. Please check the format.';
                if (Array.isArray(error) && error.length > 0) {
                    if (error[0].message) {
                        msg = error[0].message;
                    } else if (typeof error[0] === 'string') {
                        msg = error[0];
                    }
                } else if (typeof error === 'string') {
                    msg = error;
                }

                // Only log error if console is available
                if (typeof console !== "undefined" && console.error) {
                    console.error('Error parsing CSV:', error);
                }

                showNotification(msg, 'error');
            });
    }

    // Update progress UI
    function updateProgressUI(current, total) {
        if (!progressBar || !progressText) return;

        // Clamp current to total
        let safeCurrent = Math.min(current, total);
        let safeTotal = total || 1;
        const percentage = Math.round((safeCurrent / safeTotal) * 100);

        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${safeCurrent}/${safeTotal} URLs processed (${percentage}%)`;
    }

    // Update summary UI
    function updateSummaryUI(summary) {
        if (!summary) return;

        if (totalUrlsEl) totalUrlsEl.textContent = summary.totalUrls.toString();
        if (totalNodesEl) totalNodesEl.textContent = summary.totalNodes.toString();
        if (truePositivesEl) truePositivesEl.textContent = summary.truePositives.toString();
        if (falsePositivesEl) falsePositivesEl.textContent = summary.falsePositives.toString();
        if (falseNegativesEl) falseNegativesEl.textContent = summary.falseNegatives.toString();
        if (notValidEl) notValidEl.textContent = summary.notValid.toString();
        if (pendingEl) pendingEl.textContent = summary.pending.toString();
    }

    // Check if there are results to export
    function hasResults(data) {
        return Array.isArray(data) && data.some(function (row) {
            return row.status && row.status !== 'Pending';
        });
    }

    // Improved generateSummary function to handle edge cases
    function generateSummary(data) {
        const summary = {
            totalUrls: new Set(data.map(row => row.url)).size,
            totalNodes: data.length,
            truePositives: 0,
            falsePositives: 0,
            falseNegatives: 0,
            notValid: 0,
            pending: 0
        };

        data.forEach(row => {
            if (!row.status || row.status === 'Pending') {
                summary.pending++;
            } else if (row.status === 'True Positive') {
                summary.truePositives++;
            } else if (row.status === 'False Positive') {
                summary.falsePositives++;
            } else if (row.status === 'False Negative') {
                summary.falseNegatives++;
            } else if (row.status === 'Not Valid') {
                summary.notValid++;
            }
        });

        // Double check totals - fixes edge cases where counts get out of sync
        const verified = summary.truePositives + summary.falsePositives +
            summary.falseNegatives + summary.notValid + summary.pending;

        if (verified !== summary.totalNodes) {
            console.warn(`Summary count mismatch: ${verified} vs ${summary.totalNodes}`);
            // Use verified count to ensure UI is consistent
            summary.totalNodes = verified;
        }

        return summary;
    }

    // Setup copy buttons with feedback
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.getAttribute('data-copy');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                const textToCopy = targetEl.textContent;

                // Show copy feedback near the button
                const feedbackEl = document.createElement('span');
                feedbackEl.textContent = 'Copied!';
                feedbackEl.style.position = 'absolute';
                feedbackEl.style.right = '100%';
                feedbackEl.style.marginRight = '8px';
                feedbackEl.style.color = '#4CAF50';
                feedbackEl.style.fontSize = '12px';
                feedbackEl.style.fontWeight = '500';

                this.parentNode.style.position = 'relative';
                this.parentNode.appendChild(feedbackEl);

                // Copy to clipboard
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Visual feedback
                    button.style.color = '#4CAF50';

                    // Remove feedback after 2 seconds
                    setTimeout(() => {
                        button.style.color = '';
                        feedbackEl.remove();
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text:', err);
                    feedbackEl.textContent = 'Failed to copy';
                    feedbackEl.style.color = '#F44336';
                });
            }
        });
    });

    // Add the UI toggle to the dashboard header (before the dashboard-actions div)
    function addModeToggle() {
        const dashboardTitle = document.querySelector('.dashboard-title');
        if (!dashboardTitle) return;

        const modeToggleContainer = document.createElement('div');
        modeToggleContainer.className = 'mode-toggle-container';

        const modeToggleLabel = document.createElement('label');
        modeToggleLabel.className = 'switch';

        const modeToggleInput = document.createElement('input');
        modeToggleInput.type = 'checkbox';
        modeToggleInput.id = 'modeToggle';

        const modeToggleSlider = document.createElement('span');
        modeToggleSlider.className = 'slider round';

        const modeText = document.createElement('span');
        modeText.id = 'modeText';
        modeText.textContent = 'Manual Mode';
        modeText.className = 'mode-text';

        modeToggleLabel.appendChild(modeToggleInput);
        modeToggleLabel.appendChild(modeToggleSlider);
        modeToggleContainer.appendChild(modeToggleLabel);
        modeToggleContainer.appendChild(modeText);

        // Insert after the h2 element
        const h2Element = dashboardTitle.querySelector('h2');
        if (h2Element && h2Element.nextSibling) {
            dashboardTitle.insertBefore(modeToggleContainer, h2Element.nextSibling);
        } else {
            dashboardTitle.appendChild(modeToggleContainer);
        }

        // Set up the toggle handler
        modeToggleInput.addEventListener('change', function () {
            automatedMode = this.checked;
            modeText.textContent = automatedMode ? 'Automated Mode' : 'Manual Mode';

            // Send message to background script about mode change
            chrome.runtime.sendMessage({
                action: 'TOGGLE_VALIDATION_MODE',
                payload: { automated: automatedMode }
            });
        });
    }

    // Add CSS for the notification system
    function addNotificationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .nv-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 4px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                animation: slideIn 0.3s forwards;
                max-width: 80%;
            }
            
            .nv-notification.info {
                background-color: var(--primary);
            }
            
            .nv-notification.success {
                background-color: var(--success);
            }
            
            .nv-notification.warning {
                background-color: var(--warning);
                color: var(--dark);
            }
            
            .nv-notification.error {
                background-color: var(--danger);
            }
            
            .nv-notification.fade-out {
                animation: fadeOut 0.3s forwards;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            #automation-status {
                position: relative;
                padding-left: 24px;
            }
            
            #automation-status:before {
                content: '';
                position: absolute;
                left: 8px;
                top: 50%;
                transform: translateY(-50%);
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: white;
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }

    // Add robust connection check
    function checkConnection() {
        chrome.runtime.sendMessage({ action: 'PING' }, response => {
            if (chrome.runtime.lastError) {
                console.warn('Connection error:', chrome.runtime.lastError);
                showFallbackUI('Lost connection to the extension. Try reopening DevTools.');
                return;
            }

            if (response && response.success) {
                console.log('Connection to background script OK');
            }
        });
    }

    // Initialize everything in the correct order
    function start() {
        addNotificationStyles();
        setupStatusButtons();
        addModeToggle();
        initializeDataHandling();
        initializeState();
        checkConnection();

        // Add periodic connection check
        setInterval(checkConnection, 30000);
    }

    // Start the panel
    start();

    // Add this function to the initialization
    function initializeDataHandling() {
        // Check for any stale data that needs fixing
        chrome.storage.local.get(['validationData'], function (data) {
            if (Array.isArray(data.validationData) && data.validationData.length > 0) {
                // Check for any inconsistent state and fix it
                let needsFix = false;
                for (let i = 0; i < data.validationData.length; i++) {
                    if (!data.validationData[i].status) {
                        data.validationData[i].status = 'Pending';
                        needsFix = true;
                    }
                }

                if (needsFix) {
                    console.log('Fixed data inconsistencies');
                    chrome.storage.local.set({ validationData: data.validationData });
                }
            }
        });
    }

    // Initialize with dock position check
    chrome.storage.local.get(['dockPosition'], function (data) {
        if (data.dockPosition) {
            showDockPositionWarning(data.dockPosition);
        }
    });
}
