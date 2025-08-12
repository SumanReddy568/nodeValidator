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

// Store the current element data for AI analysis
let currentElementData = {
    html: '',
    parentHtml: '',  // Add parentHtml field
    childHtml: '',   // Add childHtml field
    accessibility: '',
    cssProperties: '',
    attributes: ''
};

let processingNextUrl = false;
let currentIndex = 0;

// Theme management
const themeToggle = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const backUrlBtn = document.getElementById('backUrl');

// Load saved theme preference or use system preference
const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'dark';
    } else {
        const systemTheme = prefersDarkScheme.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', systemTheme);
        themeToggle.checked = systemTheme === 'dark';
    }
};

// Handle theme toggle
themeToggle.addEventListener('change', () => {
    const theme = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
});

// Listen for system theme changes
prefersDarkScheme.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        const systemTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', systemTheme);
        themeToggle.checked = systemTheme === 'dark';
    }
});

// Initialize theme on page load
loadTheme();

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

        // Initialize AI analyzer if available
        if (window.aiAnalyzer) {
            window.aiAnalyzer.init();
            initializeAIFeatures();
        } else {
            console.warn('AI Analyzer not found');
        }
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
    const resumeValidationBtn = document.getElementById('resumeValidation');
    const stopValidationBtn = document.getElementById('stopValidation');
    const headerSection = document.getElementById('headerSection');
    const homeButton = document.getElementById('homeButton');
    const newRunButton = document.getElementById('newRunButton');
    const startIndexInput = document.getElementById('startIndex');
    const totalIndexCountEl = document.getElementById('totalIndexCount');

    // Summary Elements
    const totalUrlsEl = document.getElementById('totalUrls');
    const totalNodesEl = document.getElementById('totalNodes');
    const truePositivesEl = document.getElementById('truePositives');
    const falsePositivesEl = document.getElementById('falsePositives');
    const falseNegativesEl = document.getElementById('falseNegatives');
    const notValidEl = document.getElementById('notValid');
    const needsReviewEl = document.getElementById('needsReview'); // Added
    const pendingEl = document.getElementById('pending');

    const currentSelector = document.getElementById('currentSelector');
    const statusNotes = document.getElementById('statusNotes');
    const nextUrlBtn = document.getElementById('nextUrl');

    const statusButtons = {
        statusTruePositive: 'True Positive',
        statusFalsePositive: 'False Positive',
        statusFalseNegative: 'False Negative',
        statusNotValid: 'Not Valid',
        statusNeedsReview: 'Needs Review', // Added
        statusSkip: 'Skipped'
    };

    let selectedStatus = null;
    let automatedMode = false; // Default to manual mode
    let validationStopped = false; // Track if validation was stopped
    let currentStartIndex = 0; // Track the current start index // Add flag to prevent double-clicking Next URL button

    // Helper to get filtered data based on currentStartIndex
    function getActiveValidationData() {
        return validationData.slice(currentStartIndex);
    }

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

                    // If Skip is selected, automatically add a comment
                    if (buttonId === 'statusSkip' && statusNotes) {
                        // Don't overwrite existing comment if there is one
                        if (!statusNotes.value) {
                            statusNotes.value = 'Skipped by user';
                        }
                    }

                    // Preview the status change in stats
                    previewStatusChange(buttonId);
                };
            }
        });
    }

    if (backUrlBtn) {
        backUrlBtn.onclick = function () {
            if (processingNextUrl) return;
            if (currentIndex <= 0) {
                showNotification('Already at the first node.', 'warning');
                return;
            }
            processingNextUrl = true;
            backUrlBtn.disabled = true;
            backUrlBtn.textContent = 'Loading...';

            chrome.storage.local.get(['currentIndex'], function (data) {
                let prevIndex = typeof data.currentIndex === 'number' ? data.currentIndex - 1 : currentIndex - 1;
                if (prevIndex < 0) prevIndex = 0;

                chrome.storage.local.set({
                    currentIndex: prevIndex
                }, function () {
                    try {
                        currentIndex = prevIndex;
                        updateCurrentValidation();
                        const activeData = getActiveValidationData();
                        const localIndex = currentIndex - currentStartIndex;
                        updateProgressUI(localIndex + 1, activeData.length);
                        chrome.runtime.sendMessage({
                            action: 'START_VALIDATION',
                            payload: {
                                url: validationData[currentIndex]?.url,
                                targetNode: validationData[currentIndex]?.targetNode,
                                automated: automatedMode,
                                startIndex: currentIndex,
                                resuming: true,
                                filterStartIndex: currentStartIndex
                            }
                        }, function () {
                            processingNextUrl = false;
                            backUrlBtn.disabled = false;
                            backUrlBtn.textContent = 'Back';
                            showNotification('Moved to previous node.', 'info');
                        });
                    } catch (err) {
                        processingNextUrl = false;
                        backUrlBtn.disabled = false;
                        backUrlBtn.textContent = 'Back';
                        showNotification('Error moving to previous node.', 'error');
                    }
                });
            });
        };
    }

    // Preview status change by updating the stats immediately
    function previewStatusChange(statusBtnId) {
        // Only update if we have validation data
        if (!validationData || !validationData[currentIndex]) return;

        // Make a copy of validation data
        const updatedData = [...validationData];
        updatedData[currentIndex] = {
            ...updatedData[currentIndex],
            status: statusButtons[statusBtnId]
        };

        // Always use filtered data for summary UI updates
        const activeData = updatedData.slice(currentStartIndex);

        // Store the temp status selection in the local storage to persist it
        chrome.storage.local.set({
            tempStatusSelection: {
                index: currentIndex,
                status: statusButtons[statusBtnId],
                currentStartIndex: currentStartIndex
            }
        });

        updateSummaryUI(generateSummary(activeData));
    }

    // More robust function to display the current validation info
    function updateCurrentValidation() {
        try {
            const currentUrlEl = document.getElementById('currentUrl');
            const selectorCodeEl = document.getElementById('selectorCode');

            if (validationData && validationData[currentIndex]) {
                const currentData = validationData[currentIndex];

                if (currentUrlEl) {
                    currentUrlEl.textContent = currentData.url || '-';
                }

                if (selectorCodeEl) {
                    selectorCodeEl.textContent = currentData.targetNode || '-';
                }

                // Refresh copy buttons after updating content
                setTimeout(setupCopyButtons, 0);
            } else {
                if (currentUrlEl) currentUrlEl.textContent = '-';
                if (selectorCodeEl) selectorCodeEl.textContent = '-';
            }
        } catch (error) {
            console.error('Error updating validation display:', error);
            showNotification('Error updating display', 'error');
        }
    }

    // Show the status marking section with current node info
    function showStatusMarking(selector) {
        try {
            if (validationData && validationData[currentIndex]) {
                const url = validationData[currentIndex].url;

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

    // Make showNotification available globally
    window.showNotification = showNotification;

    // Add debug logging to help diagnose issues
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        console.log('Panel received message:', message.action, message);

        try {
            if (message.action === 'ELEMENT_DETAILS' && message.payload) {
                const htmlSnippet = document.getElementById('htmlSnippet');
                const parentHtmlSnippet = document.getElementById('parentHtmlSnippet');
                const childHtmlSnippet = document.getElementById('childHtmlSnippet');
                const nodeAttributes = document.getElementById('nodeAttributes');
                const nodeAccessibility = document.getElementById('nodeAccessibility');
                const nodeCssProperties = document.getElementById('nodeCssProperties');

                // Debug the payload to ensure all data is received
                console.log('Element details payload:', message.payload);

                // Main HTML snippet
                if (htmlSnippet && message.payload.html) {
                    try {
                        htmlSnippet.innerHTML = formatHtmlForDisplay(message.payload.html);
                    } catch (e) {
                        console.error('Error formatting main HTML:', e);
                        htmlSnippet.textContent = String(message.payload.html).substring(0, 500) + '...';
                    }
                }

                // Parent HTML snippet
                if (parentHtmlSnippet && message.payload.parentHtml) {
                    try {
                        parentHtmlSnippet.innerHTML = formatHtmlForDisplay(message.payload.parentHtml);
                    } catch (e) {
                        console.error('Error formatting parent HTML:', e);
                        parentHtmlSnippet.textContent = String(message.payload.parentHtml).substring(0, 500) + '...';
                    }
                } else if (parentHtmlSnippet) {
                    parentHtmlSnippet.textContent = '-';
                }

                // Child HTML snippet
                if (childHtmlSnippet) {
                    try {
                        if (message.payload.childHtml && message.payload.childHtml !== '-') {
                            console.log('Updating child HTML snippet with:', message.payload.childHtml);
                            childHtmlSnippet.innerHTML = formatHtmlForDisplay(message.payload.childHtml);
                        } else {
                            childHtmlSnippet.textContent = '-';
                        }
                    } catch (e) {
                        console.error('Error formatting child HTML:', e, message.payload.childHtml);
                        childHtmlSnippet.textContent = message.payload.childHtml ?
                            String(message.payload.childHtml).substring(0, 500) + '...' : '-';
                    }
                }

                // Node Attributes
                if (nodeAttributes) {
                    try {
                        if (message.payload.attributes && message.payload.attributes !== '-') {
                            nodeAttributes.textContent = message.payload.attributes;
                        } else {
                            nodeAttributes.textContent = '-';
                        }
                    } catch (e) {
                        console.error('Error setting node attributes:', e);
                        nodeAttributes.textContent = '-';
                    }
                }

                // Node Accessibility
                if (nodeAccessibility) {
                    try {
                        if (message.payload.accessibility && message.payload.accessibility !== '-') {
                            nodeAccessibility.textContent = message.payload.accessibility;
                        } else {
                            nodeAccessibility.textContent = '-';
                        }
                    } catch (e) {
                        console.error('Error setting node accessibility:', e);
                        nodeAccessibility.textContent = '-';
                    }
                }

                // CSS Properties
                if (nodeCssProperties) {
                    try {
                        if (message.payload.cssProperties && message.payload.cssProperties !== '-') {
                            nodeCssProperties.textContent = message.payload.cssProperties;
                        } else {
                            nodeCssProperties.textContent = '-';
                        }
                    } catch (e) {
                        console.error('Error setting CSS properties:', e);
                        nodeCssProperties.textContent = '-';
                    }
                }

                // Make sure copy buttons are set up
                setTimeout(setupCopyButtons, 0);

                // Update current element data for AI analysis
                updateCurrentElementData(message.payload);
            }
            // Handle various message types
            if (message.action === 'UPDATE_STATUS_RESULT') {
                if (message.success) {
                    console.log('Status update confirmed by background script');
                    // Make sure validationData is updated locally
                    if (validationData[message.index]) {
                        validationData[message.index].status = message.status;
                        validationData[message.index].comments = message.comments || '';

                        // Important: Update the current validation display even in automated mode
                        if (message.automated) {
                            currentIndex = message.index;
                            updateCurrentValidation();
                        }

                        // Update the UI with filtered data
                        const activeData = getActiveValidationData();
                        updateSummaryUI(generateSummary(activeData));

                        // Show notification for automated updates
                        if (message.automated) {
                            handleAutomationUpdate(message);
                            // Use filtered progress for UI
                            const localIndex = currentIndex - currentStartIndex;
                            updateProgressUI(localIndex + 1, activeData.length);
                        }
                    }
                } else {
                    console.error('Background script reported error:', message.error);
                    showNotification(`Status update error: ${message.error}`, 'error');
                }
                // Return to keep channel open for async response
                return true;
            } else if (message.action === 'VALIDATION_COMPLETE') {
                console.log('Received validation complete message:', message);

                // Force refresh data to ensure we have latest state
                chrome.storage.local.get(['validationData', 'currentIndex'], function (data) {
                    if (Array.isArray(data.validationData)) {
                        validationData = data.validationData;
                        currentIndex = data.currentIndex || validationData.length;

                        // Use filtered data for summary and progress
                        const activeData = getActiveValidationData();
                        updateSummaryUI(generateSummary(activeData));
                        updateProgressUI(activeData.length, activeData.length);
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

                    // Hide the resume button since validation is complete
                    if (resumeValidationBtn) {
                        resumeValidationBtn.style.display = 'none';
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
            } else if (message.action === 'ELEMENT_STATUS') {
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
            } else if (message.action === 'DOCK_POSITION_UPDATED') {
                console.log('Dock position updated:', message.position);
                showDockPositionWarning(message.position);
            }
        } catch (error) {
            console.error('Error handling message:', error, error.stack);
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'EVALUATE_DOCK_MODE_REQUEST') {
            console.log("Panel received EVALUATE_DOCK_MODE_REQUEST.");

            // Heuristic: if panel is significantly taller than it is wide,
            // it's likely docked to the side (left/right).
            // Adjust the multiplier (e.g., 1.25) as needed based on testing.
            const isLikelySideDocked = window.innerHeight > window.innerWidth * 1.25;

            const existingBanner = document.querySelector('.dock-warning-banner');
            if (existingBanner) {
                existingBanner.remove(); // Remove any previous banner
            }

            if (isLikelySideDocked) {
                const banner = document.createElement('div');
                banner.className = 'dock-warning-banner'; // Ensure this class matches your CSS in panel.html
                banner.textContent = "⚠️ Node Validator works best when DevTools is docked to the bottom. Side-docked mode may cause UI issues.";

                // Insert banner at the top of the body
                if (document.body) {
                    document.body.insertBefore(banner, document.body.firstChild);
                } else {
                    // Fallback if body is not ready, though DOMContentLoaded should handle this
                    document.addEventListener('DOMContentLoaded', () => {
                        document.body.insertBefore(banner, document.body.firstChild);
                    });
                }


                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                    }
                }, 8000); // Keep banner for 8 seconds
                console.log("Panel determined it is likely side-docked. Showing warning.");
            } else {
                console.log("Panel determined it is likely bottom-docked or undocked (wide). No warning.");
            }
        }
        // Add other message handlers from your panel.js if they exist, or this can be the only one
    });

    // Update the start validation click handler for more robust initialization
    if (startValidationBtn) {
        startValidationBtn.addEventListener('click', function () {
            if (!validationData || validationData.length === 0) {
                showNotification('Please upload a CSV file first.', 'error');
                return;
            }

            // Get starting index from input
            const startFromIndex = parseInt(startIndexInput.value, 10) || 0;

            // Validate index is within range
            if (startFromIndex < 0 || startFromIndex >= validationData.length) {
                showNotification(`Invalid start index. Must be between 0 and ${validationData.length - 1}`, 'error');
                return;
            }

            // Set the current start index for filtering
            currentStartIndex = startFromIndex;

            // Also set currentIndex to be the same as startFromIndex
            currentIndex = startFromIndex;

            // Filter validation data to only include rows after the start index
            const filteredData = getActiveValidationData();

            // Set initialFilterStartIndex only if not already set
            chrome.storage.local.get(['initialFilterStartIndex'], function (data) {
                if (typeof data.initialFilterStartIndex !== 'number') {
                    chrome.storage.local.set({
                        filterStartIndex: currentStartIndex,
                        initialFilterStartIndex: currentStartIndex
                    });
                } else {
                    chrome.storage.local.set({
                        filterStartIndex: currentStartIndex
                    });
                }
            });

            // Reset validation status only if not resuming
            if (!validationStopped) {
                // Don't reset validationData statuses - keep existing statuses
                // We're just changing where we start from
            }

            selectedStatus = null;
            validationStopped = false;
            processingNextUrl = false; // Reset processing flag

            // Hide resume button
            if (resumeValidationBtn) {
                resumeValidationBtn.style.display = 'none';
            }

            // Update progress bar and text with correct starting position
            // This ensures we show the correct progress including previously validated items
            updateProgressUI(currentIndex - currentStartIndex, filteredData.length);

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
            showNotification(`Starting validation ${startFromIndex > 0 ? `from index ${startFromIndex}` : ''} in ${automatedMode ? 'automated' : 'manual'} mode...`, 'info');

            chrome.runtime.sendMessage({
                action: 'START_VALIDATION',
                payload: {
                    url: validationData[currentIndex].url,
                    targetNode: validationData[currentIndex].targetNode,
                    automated: automatedMode,
                    startIndex: currentIndex,
                    resuming: validationStopped,
                    filterStartIndex: currentStartIndex // Pass the filter start index
                }
            }, function (response) {
                if (!response || !response.success) {
                    showNotification(response && response.error ? response.error : 'Failed to start validation', 'error');
                } else {
                    startValidationBtn.textContent = automatedMode ? 'Auto-Validating...' : 'Validating...';
                    startValidationBtn.disabled = true;
                    setUISection('summary');
                    setupStatusButtons();
                    updateCurrentValidation();

                    // In manual mode, enable Next URL button. In automated mode, disable it
                    if (nextUrlBtn) nextUrlBtn.disabled = automatedMode;

                    // If automated, show a notification
                    if (automatedMode) {
                        const notification = document.createElement('div');
                        notification.className = 'automation-notification';
                        notification.id = 'automation-status';
                        notification.textContent = 'Automated validation in progress...';
                        document.querySelector('.validation-controls').appendChild(notification);

                        // Initial scroll to automation status
                        notification.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });

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

                    // Also update summary UI to reflect filtered view
                    updateSummaryUI(generateSummary(filteredData));

                    // Update progress UI to show current progress in filtered view
                    updateProgressUI(0, filteredData.length);

                    // Enable export button if we have results
                    if (exportResultsBtn) {
                        exportResultsBtn.disabled = !hasResults(filteredData);
                    }
                }
            });
        });
    }

    // Handle Resume Validation
    if (resumeValidationBtn) {
        resumeValidationBtn.addEventListener('click', function () {
            if (!validationData || validationData.length === 0) {
                showNotification('No validation data available to resume.', 'error');
                return;
            }

            // Use the stored currentIndex as the starting point for resumption
            chrome.storage.local.get(['currentIndex', 'filterStartIndex'], function (data) {
                let startFromIndex = currentIndex;

                // If we have a stored index, use that
                if (data && typeof data.currentIndex === 'number') {
                    startFromIndex = data.currentIndex;
                }

                // Make sure we don't go past the end of the data
                if (startFromIndex >= validationData.length) {
                    startFromIndex = validationData.length - 1;
                }

                // Get the filter start index from storage if available
                if (data && typeof data.filterStartIndex === 'number') {
                    currentStartIndex = data.filterStartIndex;
                }

                // Update the startIndex input to show the current position
                if (startIndexInput) {
                    startIndexInput.value = startFromIndex.toString();
                }

                // Set current index to the start index for resumption
                currentIndex = startFromIndex;

                // Hide resume button
                resumeValidationBtn.style.display = 'none';

                // Reset validation stopped flag
                validationStopped = false;

                // Important: Do NOT modify the progress bar here - it will be updated by startValidationBtn.click()

                // Make sure the filter start index is correctly saved for the background
                chrome.storage.local.set({
                    filterStartIndex: currentStartIndex,
                    validationStopped: false
                }, function () {
                    // Get the active data with current filter
                    const activeData = getActiveValidationData();

                    // Calculate relative position for progress bar before clicking start
                    // This is crucial to show correct progress when resuming
                    const relativePosition = Math.max(0, currentIndex - currentStartIndex);

                    // Update UI before starting validation
                    updateSummaryUI(generateSummary(activeData));
                    updateProgressUI(relativePosition, activeData.length);

                    // Now call start validation
                    if (startValidationBtn) {
                        // We need to bypass the progress reset in the click handler
                        // So we'll directly call the background script
                        chrome.runtime.sendMessage({
                            action: 'START_VALIDATION',
                            payload: {
                                url: validationData[currentIndex].url,
                                targetNode: validationData[currentIndex].targetNode,
                                automated: automatedMode,
                                startIndex: currentIndex,
                                resuming: true,
                                filterStartIndex: currentStartIndex
                            }
                        }, function (response) {
                            if (!response || !response.success) {
                                showNotification(response && response.error ? response.error : 'Failed to resume validation', 'error');
                                // Restore resume button if failed
                                resumeValidationBtn.style.display = 'inline-block';
                            } else {
                                startValidationBtn.textContent = automatedMode ? 'Auto-Validating...' : 'Validating...';
                                startValidationBtn.disabled = true;
                                setUISection('summary');
                                setupStatusButtons();
                                updateCurrentValidation();

                                // In manual mode, enable Next URL button. In automated mode, disable it
                                if (nextUrlBtn) nextUrlBtn.disabled = automatedMode;

                                // Reset stop button
                                if (stopValidationBtn) {
                                    stopValidationBtn.textContent = 'Stop';
                                    stopValidationBtn.disabled = false;
                                }

                                // If automated, show a notification
                                if (automatedMode) {
                                    const notification = document.querySelector('.automation-notification');
                                    if (!notification) {
                                        const newNotification = document.createElement('div');
                                        newNotification.className = 'automation-notification';
                                        newNotification.id = 'automation-status';
                                        newNotification.textContent = 'Automated validation in progress...';
                                        document.querySelector('.validation-controls').appendChild(newNotification);

                                        // Scroll to automation status
                                        newNotification.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'nearest'
                                        });
                                    }

                                    // Disable status buttons in automated mode
                                    document.querySelectorAll('.status-btn').forEach(btn => {
                                        btn.disabled = true;
                                    });

                                    if (statusNotes) {
                                        statusNotes.disabled = true;
                                    }
                                }

                                showNotification(`Resuming validation from index ${currentIndex}`, 'success');
                            }
                        });
                    }
                });
            });
        });
    }

    // Handle stop validation
    if (stopValidationBtn) {
        stopValidationBtn.addEventListener('click', function () {
            showCustomConfirm('Are you sure you want to stop validation? You can resume later.', function () {
                // Set validation stopped flag
                validationStopped = true;
                processingNextUrl = false; // Reset processing flag to ensure Next URL button is re-enabled on resume

                // Reset UI state to allow resuming
                if (startValidationBtn) {
                    startValidationBtn.textContent = 'Start Validation';
                    startValidationBtn.disabled = false;
                }

                // Show resume button
                if (resumeValidationBtn) {
                    resumeValidationBtn.style.display = 'inline-block';
                }

                // Update the stop button itself
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

            // Prevent multiple clicks
            if (processingNextUrl) {
                console.log('Already processing next URL request, ignoring');
                return;
            }

            if (!selectedStatus) {
                showNotification('Please select a status for this node.', 'error');
                return;
            }

            // Disable the button while processing to prevent double-clicks
            processingNextUrl = true;
            nextUrlBtn.disabled = true;
            nextUrlBtn.textContent = 'Updating...';

            const comments = statusNotes ? statusNotes.value || '' : '';

            // First, update local state
            if (validationData[currentIndex]) {
                validationData[currentIndex].status = selectedStatus;
                validationData[currentIndex].comments = comments;

                // Also update the storage with the new filterStartIndex for persistence
                chrome.storage.local.set({
                    filterStartIndex: currentStartIndex
                });
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
                    processingNextUrl = false;
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

        // Store the current index before navigation for reference
        const previousIndex = currentIndex;

        // Calculate progress relative to the filtered view
        const activeData = getActiveValidationData();
        const localIndex = currentIndex - currentStartIndex;
        updateProgressUI(localIndex + 1, activeData.length);
        const hasMoreUrls = currentIndex < validationData.length - 1;

        if (!hasMoreUrls) {
            // No more URLs to process
            processingNextUrl = false;
            showNotification('Validation complete!', 'success', 5000);

            if (startValidationBtn) {
                startValidationBtn.textContent = 'Start Validation';
                startValidationBtn.disabled = false;
            }

            if (nextUrlBtn) {
                nextUrlBtn.disabled = true;
                nextUrlBtn.textContent = 'Next URL';
            }

            if (stopValidationBtn) {
                stopValidationBtn.textContent = 'Stopped';
                stopValidationBtn.disabled = true;
            }

            // Update progress UI with the complete count
            const totalProcessed = validationData.length - currentStartIndex;
            updateProgressUI(totalProcessed, totalProcessed);
            updateSummaryUI(generateSummary(activeData));

            if (exportResultsBtn) {
                exportResultsBtn.disabled = !hasResults(activeData);
            }
            return;
        }

        chrome.runtime.sendMessage({
            action: 'NEXT_URL'
        }, function (nextResponse) {
            // Reset the processing flag to allow future clicks
            processingNextUrl = false;

            console.log('Next URL response:', nextResponse);

            if (nextUrlBtn) {
                nextUrlBtn.disabled = false;
                nextUrlBtn.textContent = 'Next URL'; // Reset button text
            }

            if (nextResponse && nextResponse.success) {
                chrome.storage.local.get(['currentIndex'], function (data) {
                    if (typeof data.currentIndex === 'number') {
                        currentIndex = data.currentIndex;

                        // Update the start index input to match the current index
                        // This ensures start index stays in sync with current progress
                        if (startIndexInput && typeof startIndexInput.value === 'string') {
                            startIndexInput.value = currentStartIndex.toString(); // Keep the filter start point
                        }

                        // Explicitly update current validation display
                        updateCurrentValidation();

                        // Progress and summary for filtered data
                        const newActiveData = getActiveValidationData(); // Re-fetch active data
                        const newLocalIndex = currentIndex - currentStartIndex;
                        updateProgressUI(newLocalIndex + 1, newActiveData.length);
                        updateSummaryUI(generateSummary(newActiveData));

                        // Enable export button if we have results
                        if (exportResultsBtn) {
                            exportResultsBtn.disabled = !hasResults(newActiveData);
                        }

                        showNotification('Ready for validation', 'success');
                    }
                });
            } else {
                handleValidationError(nextResponse);
            }
        });
    }

    // Add new helper function to handle validation errors
    function handleValidationError(response) {
        const errorMsg = response && response.message ? response.message : 'Error moving to next URL';
        showNotification(errorMsg, 'error', 5000);

        // Re-enable navigation
        if (nextUrlBtn) {
            nextUrlBtn.disabled = false;
            nextUrlBtn.textContent = 'Next URL';
        }
    }

    // Update progress UI
    function updateProgressUI(current, total) {
        if (!progressBar || !progressText) return;

        // Adjust current value to be relative to start index
        const adjustedCurrent = Math.min(current, total);
        const percentage = Math.round((adjustedCurrent / total) * 100);

        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${adjustedCurrent}/${total} URLs processed (${percentage}%)`;

        // Update the displayed current index to include the start index offset
        if (startIndexInput) {
            startIndexInput.value = currentIndex.toString();
        }
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

                if (resumeValidationBtn) {
                    resumeValidationBtn.style.display = 'none';
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
                validationStopped = false;
                currentStartIndex = 0;

                // Reset any automation state
                automatedMode = false;
                const modeToggle = document.getElementById('modeToggle');
                if (modeToggle) modeToggle.checked = false;
                const modeText = document.getElementById('modeText');
                if (modeText) modeText.textContent = 'Manual Mode';

                // Reset start index input
                if (startIndexInput) {
                    startIndexInput.value = 0;
                }
                if (totalIndexCountEl) {
                    totalIndexCountEl.textContent = '0';
                }

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

                    // Clear initialFilterStartIndex on new run
                    chrome.storage.local.remove('initialFilterStartIndex');

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
    let initialized = false;

    // Initialize or recover state
    function initializeState() {
        if (initialized) return;

        chrome.storage.local.get(['validationData', 'currentIndex', 'validationStopped', 'filterStartIndex', 'initialFilterStartIndex', 'tempStatusSelection'], function (data) {
            try {
                // Always ensure we have a valid array
                validationData = Array.isArray(data.validationData) ? data.validationData : [];
                currentIndex = typeof data.currentIndex === 'number' ? data.currentIndex : 0;
                validationStopped = !!data.validationStopped;

                // Recover filter start index if available
                if (typeof data.filterStartIndex === 'number') {
                    currentStartIndex = data.filterStartIndex;
                } else {
                    currentStartIndex = 0;
                }

                // Make sure the start index input reflects the current filter start
                if (startIndexInput && validationData.length > 0) {
                    startIndexInput.value = currentIndex.toString(); // Set to current position instead of filter start
                    startIndexInput.max = validationData.length - 1;
                }

                // Restore any temporary status selection
                if (data.tempStatusSelection &&
                    typeof data.tempStatusSelection.index === 'number' &&
                    data.tempStatusSelection.index === currentIndex) {

                    // Make sure currentStartIndex matches what was saved
                    if (typeof data.tempStatusSelection.currentStartIndex === 'number') {
                        currentStartIndex = data.tempStatusSelection.currentStartIndex;
                    }

                    // Restore the selected status button
                    Object.entries(statusButtons).forEach(([buttonId, statusValue]) => {
                        if (statusValue === data.tempStatusSelection.status) {
                            const button = document.getElementById(buttonId);
                            if (button) {
                                setTimeout(() => {
                                    // Select this button after UI is ready
                                    Object.keys(statusButtons).forEach(id => {
                                        const btn = document.getElementById(id);
                                        if (btn) btn.classList.remove('selected');
                                    });
                                    button.classList.add('selected');
                                    selectedStatus = statusValue;
                                }, 100);
                            }
                        }
                    });
                }

                updateUI();
                initialized = true;

                console.log('Panel state initialized with', validationData.length, 'records, currentIndex:', currentIndex, 'filterStartIndex:', currentStartIndex);
            } catch (err) {
                console.error('Error initializing state:', err);
                // Reset to a safe state
                validationData = [];
                currentIndex = 0;
                currentStartIndex = 0;
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
                if (resumeValidationBtn) resumeValidationBtn.style.display = 'none';
            } else {
                // Always show summary if we have data
                setUISection('summary');

                // Retrieve the latest filterStartIndex from storage to ensure consistency
                chrome.storage.local.get(['filterStartIndex'], function (data) {
                    // Update currentStartIndex if it's in storage
                    if (typeof data.filterStartIndex === 'number') {
                        currentStartIndex = data.filterStartIndex;
                    }

                    // Use filtered data for progress, summary, and export
                    const activeData = getActiveValidationData();

                    // Calculate the relative position in the filtered data
                    let relativeIndex = Math.max(0, currentIndex - currentStartIndex);

                    // Update progress UI with the correct relative index based on filtered data
                    updateProgressUI(relativeIndex, activeData.length);

                    // Update summary with the filtered data to show correct stats
                    updateSummaryUI(generateSummary(activeData));

                    if (exportResultsBtn) {
                        exportResultsBtn.disabled = !hasResults(activeData);
                    }

                    // Show resume button if validation was stopped mid-way
                    if (resumeValidationBtn && validationStopped) {
                        resumeValidationBtn.style.display = 'inline-block';
                    }
                });
            }

            // Update total index count - show the absolute total, not filtered
            if (totalIndexCountEl && validationData.length > 0) {
                totalIndexCountEl.textContent = validationData.length - 1;
            }

            // Set max value for start index input
            if (startIndexInput && validationData.length > 0) {
                startIndexInput.max = validationData.length - 1;
            }

            // Make sure current validation is displayed correctly
            updateCurrentValidation();

            // Reset processingNextUrl flag
            processingNextUrl = false;

            // Reset Next URL button if it was stuck
            if (nextUrlBtn) {
                nextUrlBtn.disabled = false;
                nextUrlBtn.textContent = 'Next URL';
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
            // Always fetch the latest validationData and current index from storage before exporting
            chrome.storage.local.get(['validationData', 'initialFilterStartIndex', 'currentIndex'], function (data) {
                let exportData = [];
                let initialStart = typeof data.initialFilterStartIndex === 'number' ? data.initialFilterStartIndex : 0;
                let endIndex = typeof data.currentIndex === 'number' ? data.currentIndex : validationData.length;

                // Ensure endIndex doesn't exceed the array length
                endIndex = Math.min(endIndex, (data.validationData || []).length);

                console.log(`Exporting data from index ${initialStart} to ${endIndex}`);

                if (Array.isArray(data.validationData) && data.validationData.length > 0) {
                    // Only export the range of data that has been processed
                    exportData = data.validationData.slice(initialStart, endIndex + 1).map(row => ({
                        url: row.url,
                        targetNode: row.targetNode,
                        status: row.status || 'Pending',
                        comments: row.comments || ''
                    }));
                } else {
                    // Fallback to current in-memory data if storage is empty
                    exportData = validationData.slice(initialStart, currentIndex + 1).map(row => ({
                        url: row.url,
                        targetNode: row.targetNode,
                        status: row.status || 'Pending',
                        comments: row.comments || ''
                    }));
                }

                if (!exportData || exportData.length === 0) {
                    showNotification('No results to export.', 'warning');
                    return;
                }

                exportCsv(exportData);
                showNotification(`Exported ${exportData.length} validated nodes.`, 'success');
            });
        });
    }

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
                currentStartIndex = 0; // Reset filter start index on new upload
                validationStopped = false;
                processingNextUrl = false;

                console.log('Processed CSV with', rows.length, 'records');

                // Update the total index count
                if (totalIndexCountEl) {
                    totalIndexCountEl.textContent = rows.length - 1;
                }

                // Reset the start index input
                if (startIndexInput) {
                    startIndexInput.value = 0;
                    startIndexInput.max = rows.length - 1;
                }

                // Hide resume button
                if (resumeValidationBtn) {
                    resumeValidationBtn.style.display = 'none';
                }

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

                            // Clear initialFilterStartIndex on new upload
                            chrome.storage.local.remove('initialFilterStartIndex');

                            // Show success notification
                            showNotification(`Loaded ${rows.length} records successfully`, 'success');

                            // Ensure export button is disabled until we have results
                            if (exportResultsBtn) {
                                exportResultsBtn.disabled = true;
                            }
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

    // Update summary UI
    function updateSummaryUI(summary) {
        if (!summary) return;

        // Add logging to diagnose issues
        console.log('Updating summary UI with data:', JSON.stringify(summary));
        console.log('Current filter index:', currentStartIndex);

        if (totalUrlsEl) totalUrlsEl.textContent = summary.totalUrls.toString();
        if (totalNodesEl) totalNodesEl.textContent = summary.totalNodes.toString();
        if (truePositivesEl) truePositivesEl.textContent = summary.truePositives.toString();
        if (falsePositivesEl) falsePositivesEl.textContent = summary.falsePositives.toString();
        if (falseNegativesEl) falseNegativesEl.textContent = summary.falseNegatives.toString();
        if (notValidEl) notValidEl.textContent = summary.notValid.toString();
        if (needsReviewEl) needsReviewEl.textContent = summary.needsReview.toString(); // Added
        if (pendingEl) pendingEl.textContent = summary.pending.toString();

        // Update export button based on results
        if (exportResultsBtn) {
            const activeData = getActiveValidationData();
            exportResultsBtn.disabled = !hasResults(activeData);
        }
    }

    // Check if there are results to export - improved to be more lenient
    function hasResults(data) {
        if (!Array.isArray(data) || data.length === 0) return false;

        // Consider any data with at least one status as having results
        return data.some(function (row) {
            return row.status && row.status !== 'Pending';
        });
    }

    // Improved generateSummary function to handle edge cases
    function generateSummary(data) {
        // Add debugging to identify potential issues
        console.log(`Generating summary for ${data.length} items, currentStartIndex: ${currentStartIndex}`);

        const summary = {
            totalUrls: new Set(data.map(row => row.url)).size,
            totalNodes: data.length,
            truePositives: 0,
            falsePositives: 0,
            falseNegatives: 0,
            notValid: 0,
            needsReview: 0, // Added
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
            } else if (row.status === 'Needs Review') {
                summary.needsReview++;
            }
        });

        // Double check totals - fixes edge cases where counts get out of sync
        const verified = summary.truePositives + summary.falsePositives +
            summary.falseNegatives + summary.notValid + summary.needsReview + summary.pending;

        if (verified !== summary.totalNodes) {
            console.warn(`Summary count mismatch: ${verified} vs ${summary.totalNodes}`);
            // Use verified count to ensure UI is consistent
            summary.totalNodes = verified;
        }

        // Add debugging
        console.log('Summary generated:', summary);

        return summary;
    }

    // Setup copy buttons with feedback
    function setupCopyButtons() {
        document.querySelectorAll('.copy-btn').forEach(button => {
            // Remove existing listeners
            button.replaceWith(button.cloneNode(true));

            // Get fresh button reference
            const newButton = document.querySelector(`[data-copy="${button.getAttribute('data-copy')}"]`);

            newButton.addEventListener('click', function () {
                try {
                    const targetId = this.getAttribute('data-copy');
                    const targetEl = document.getElementById(targetId);

                    if (!targetEl || targetEl.textContent === '-') {
                        return;
                    }

                    const text = targetEl.textContent.trim();

                    // Create temporary textarea for copying
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();

                    // Execute copy command
                    document.execCommand('copy');
                    document.body.removeChild(textarea);

                    // Show success feedback
                    this.style.color = 'var(--success)';
                    const feedback = document.createElement('div');
                    feedback.textContent = 'Copied!';
                    feedback.style.position = 'absolute';
                    feedback.style.right = '40px';
                    feedback.style.top = '50%';
                    feedback.style.transform = 'translateY(-50%)';
                    feedback.style.color = document.documentElement.getAttribute('data-theme') === 'dark' ?
                        'var(--primary-light)' :
                        'var(--success)';
                    feedback.style.fontSize = '12px';
                    feedback.style.fontWeight = '500';
                    feedback.style.pointerEvents = 'none';

                    this.parentElement.style.position = 'relative';
                    this.parentElement.appendChild(feedback);

                    // Remove feedback after delay
                    setTimeout(() => {
                        this.style.color = '';
                        if (feedback.parentNode) {
                            feedback.remove();
                        }
                    }, 2000);

                } catch (err) {
                    console.error('Copy failed:', err);
                    showNotification('Failed to copy text', 'error');
                }
            });
        });
    }

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
                payload: {
                    automated: automatedMode
                }
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
                left: 20px; /* Position on left side */
                padding: 10px 15px;
                border-radius: 4px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                animation: slideIn 0.3s forwards;
                width: auto;  /* Don't force a specific width */
                max-width: 300px; /* Limit maximum width */
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
                from { transform: translateX(-100%); opacity: 0; }
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
        chrome.runtime.sendMessage({
            action: 'PING'
        }, response => {
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
        addSettingsStyles(); // Add the new styles
        setupStatusButtons();
        setupCopyButtons();
        addModeToggle();
        initializeDataHandling();
        initializeState();
        checkConnection();

        // Add periodic connection check
        setInterval(checkConnection, 30000);

        // Initialize the resume button state
        chrome.storage.local.get(['validationStopped'], function (data) {
            validationStopped = !!data.validationStopped;
            if (validationStopped && resumeValidationBtn && validationData.length > 0) {
                resumeValidationBtn.style.display = 'inline-block';
            }
        });
    }

    // Start the panel
    start();

    // Add this function to the initialization
    function initializeDataHandling() {
        // Check for any stale data that needs fixing
        chrome.storage.local.get(['validationData', 'filterStartIndex'], function (data) {
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
                    chrome.storage.local.set({
                        validationData: data.validationData
                    });
                }

                // Make sure we have filterStartIndex saved
                if (typeof data.filterStartIndex !== 'number') {
                    chrome.storage.local.set({
                        filterStartIndex: 0
                    });
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

    // Handle automation updates
    function handleAutomationUpdate(message) {
        const autoStatus = document.getElementById('automation-status');
        if (autoStatus) {
            const progress = `${message.index + 1}/${validationData.length}`;
            const statusMsg = message.status === 'True Positive' ?
                'Element found and marked as True Positive.' :
                'Element not found and marked as Not Valid.';

            autoStatus.textContent = `Processing: ${progress} - ${statusMsg}`;

            // Scroll to the automation status banner
            autoStatus.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });

            // If this is the last item, show completing message
            if (message.isLast) {
                autoStatus.textContent = `Completing validation... (${progress} processed)`;
            }
        }
    }
}

// Add this function for HTML formatting
function formatHtmlForDisplay(html) {
    if (!html || html === '-') return '-';

    try {
        // Ensure html is a string
        const htmlString = String(html);

        // Escape HTML special characters
        const escaped = htmlString
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        // Add syntax highlighting
        const highlighted = escaped
            .replace(/(&lt;[\w\d-]+)/g, '<span class="html-tag">$1</span>')
            .replace(/(&lt;\/[\w\d-]+&gt;)/g, '<span class="html-tag">$1</span>')
            .replace(/(\s[\w\d-]+)=["'][^"']*["']/g, '<span class="html-attr">$1</span>');

        return highlighted;
    } catch (e) {
        console.error('Error formatting HTML for display:', e);
        return String(html).substring(0, 1000) + '...';
    }
}

// Add these styles
const elementStyles = document.createElement('style');
elementStyles.textContent = `
    .html-snippet {
        background: var(--surface);
        padding: 12px;
        border-radius: 4px;
        font-family: 'Roboto Mono', monospace;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid var(--border-color);
        margin-top: 4px;
    }
    .html-tag { color: #e83e8c; }
    .html-attr { color: #4CAF50; }
`;
document.head.appendChild(elementStyles);

// Add this function to handle settings styles
function addSettingsStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .toggle-setting {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .toggle-label {
            font-weight: 500;
        }
        .setting-description {
            font-size: 12px;
            color: var(--gray-600);
            margin-top: 0;
            margin-bottom: 16px;
        }
    `;
    document.head.appendChild(style);
}

// Initialize AI-related features
async function initializeAIFeatures() {
    // Load AI toggle preference from local storage - DEFAULT TO FALSE
    const aiEnabled = localStorage.getItem('aiOptEnabled') === 'true'; // Default to false if not set
    const aiToggle = document.getElementById('aiOptToggle');
    const aiAnalysisSection = document.querySelector('.ai-analysis-section');

    // Set initial toggle state
    if (aiToggle) {
        aiToggle.checked = aiEnabled;

        // Add event listener for toggle changes - avoid inline handlers
        aiToggle.addEventListener('change', function () {
            const enabled = this.checked;
            localStorage.setItem('aiOptEnabled', enabled);

            // Show/hide AI analysis section
            if (aiAnalysisSection) {
                aiAnalysisSection.style.display = enabled ? 'block' : 'none';
            }
        });
    }

    // Set initial visibility of AI analysis section
    if (aiAnalysisSection) {
        aiAnalysisSection.style.display = aiEnabled ? 'block' : 'none';
    }

    // Load rules and API key first

    try {
        // Wait for the settings to load before proceeding
        const result = await window.aiAnalyzer.loadSettings();
        if (!result.success) {
            console.error('Failed to load AI settings:', result.error);
            showNotification('Failed to load AI settings. AI features may not work.', 'error');
        }
    } catch (e) {
        console.error('Failed to load AI settings unexpectedly:', e);
        showNotification('An unexpected error occurred while loading AI settings.', 'error');
    }

    // Initialize settings menu
    const settingsMenuButton = document.getElementById('settingsMenuButton');
    const settingsMenu = document.getElementById('settingsMenu');

    if (settingsMenuButton && settingsMenu) {
        settingsMenuButton.addEventListener('click', function () {
            settingsMenu.classList.toggle('open');

            // Refresh the rules list when opening the menu
            if (settingsMenu.classList.contains('open')) {
                populateRulesList();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (event) {
            if (!settingsMenu.contains(event.target) &&
                !settingsMenuButton.contains(event.target) &&
                settingsMenu.classList.contains('open')) {
                settingsMenu.classList.remove('open');
            }
        });
    }

    // Save API key
    const saveApiKeyButton = document.getElementById('saveApiKey');
    if (saveApiKeyButton) {
        saveApiKeyButton.addEventListener('click', function () {
            const apiKeyInput = document.getElementById('geminiApiKey');
            const apiKey = apiKeyInput.value.trim();

            if (apiKey) {
                window.aiAnalyzer.saveApiKey(apiKey).then(result => {

                    if (result.success) {
                        showNotification('API key saved successfully', 'success');
                    } else {
                        showNotification('Failed to save API key: ' + result.error, 'error');
                    }
                });
            } else {
                showNotification('Please enter a valid API key', 'warning');
            }
        });
    }

    // Initialize rules management
    initializeRulesManagement();

    // Initialize AI analysis UI
    initializeAIAnalysis();

    // Load API key from storage
    chrome.storage.local.get(['geminiApiKey'], function (result) {
        if (result.geminiApiKey) {
            const apiKeyInput = document.getElementById('geminiApiKey');

            if (apiKeyInput) {
                apiKeyInput.value = result.geminiApiKey;
            }
        }
    });

    // Populate the UI with the loaded rules
    populateRulesList();
    populateRuleDropdown();
}

// Initialize rules management
function initializeRulesManagement() {
    const addRuleBtn = document.getElementById('addRuleBtn');
    const ruleDialog = document.getElementById('ruleDialog');
    const cancelRuleBtn = document.getElementById('cancelRuleBtn');
    const saveRuleBtn = document.getElementById('saveRuleBtn');
    const addCriterionBtn = document.getElementById('addCriterionBtn');

    if (!addRuleBtn || !ruleDialog || !cancelRuleBtn || !saveRuleBtn || !addCriterionBtn) {
        console.warn('One or more rule management elements not found');
        return;
    }

    // Open dialog to add new rule
    addRuleBtn.addEventListener('click', function () {
        openRuleDialog();
    });

    // Cancel rule dialog
    cancelRuleBtn.addEventListener('click', function () {
        ruleDialog.classList.remove('open');
    });

    // Add criterion
    addCriterionBtn.addEventListener('click', function () {
        addCriterion();
    });

    // Enter key in criterion input
    const newCriterionInput = document.getElementById('newCriterion');
    if (newCriterionInput) {
        newCriterionInput.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                addCriterion();
            }
        });
    }

    // Save rule
    saveRuleBtn.addEventListener('click', function () {
        saveRule();
    });
}

// Initialize AI analysis UI
function initializeAIAnalysis() {
    const accessibilityRuleSelect = document.getElementById('accessibilityRuleSelect');
    const analyzeWithAIBtn = document.getElementById('analyzeWithAI');

    if (!accessibilityRuleSelect || !analyzeWithAIBtn) {
        console.warn('AI analysis UI elements not found');
        return;
    }

    // Enable/disable analyze button based on rule selection
    accessibilityRuleSelect.addEventListener('change', function () {
        const ruleId = this.value;
        analyzeWithAIBtn.disabled = !ruleId;

        if (ruleId) {
            window.aiAnalyzer.setCurrentRule(ruleId);
        }
    });

    // Analyze button click
    analyzeWithAIBtn.addEventListener('click', function () {
        if (!window.aiAnalyzer || window.aiAnalyzer.isAnalyzing) return;

        // Show loading indicator
        this.innerHTML = '<div class="ai-spinner"></div><span>Analyzing...</span>';
        this.disabled = true;

        const aiAnalysisPanel = document.getElementById('aiAnalysisPanel');
        const aiAnalysisContent = document.getElementById('aiAnalysisContent');
        const aiAnalysisTitle = document.getElementById('aiAnalysisTitle');

        if (!aiAnalysisPanel || !aiAnalysisContent || !aiAnalysisTitle) {
            console.warn('AI analysis panel elements not found');
            this.innerHTML = '<span>Analyze</span>';
            this.disabled = false;
            return;
        }

        // Show the panel with loading message
        aiAnalysisPanel.style.display = 'block';
        aiAnalysisTitle.textContent = 'Analyzing...';
        aiAnalysisContent.innerHTML = '<p>AI is analyzing the element against the selected rule...</p>';

        // Call AI analyzer with current element data
        window.aiAnalyzer.analyzeElement(currentElementData)
            .then(result => {
                // Reset button
                this.innerHTML = '<span>Analyze</span>';
                this.disabled = false;

                if (result.success) {
                    // Show result
                    aiAnalysisTitle.textContent = result.ruleName || 'AI Analysis';
                    renderAIAnalysisResult(result.result, aiAnalysisContent);
                } else {
                    // Show error
                    aiAnalysisContent.innerHTML = `<p style="color: #d93025;">Error: ${result.error}</p>`;
                }
            })
            .catch(error => {
                // Reset button and show error
                this.innerHTML = '<span>Analyze</span>';
                this.disabled = false;

                aiAnalysisContent.innerHTML = `<p style="color: #d93025;">Error: ${error.message || 'Unknown error'}</p>`;
                console.error('AI analysis error:', error);
            });
    });
}

// Render AI analysis result - updated to use the externalized function
function renderAIAnalysisResult(result, container) {
    // Use the window-level function defined in aiUIHandler.js
    if (window.renderAIAnalysisResult && window.renderAIAnalysisResult !== renderAIAnalysisResult) {
        window.renderAIAnalysisResult(result, container);
        return;
    }

    // Fallback if the global function isn't available
    if (!result) {
        container.innerHTML = '<p style="color: #d93025;">Analysis failed: No result data received.</p>';
        return;
    }

    const statusClass = result.status && result.status.toLowerCase() === 'pass' ? 'pass' : 'fail';
    const statusText = result.status || 'N/A';
    const summaryText = result.summary || 'No summary provided.';
    const detailsText = result.details || 'No detailed explanation provided.';
    const suggestionsText = result.suggestions || 'No suggestions provided.';

    // Create a container div
    const resultDiv = document.createElement('div');
    resultDiv.className = 'ai-result';

    // Add status
    const statusDiv = document.createElement('div');
    statusDiv.className = 'ai-result-status ' + statusClass;
    statusDiv.textContent = statusText;
    resultDiv.appendChild(statusDiv);

    // Add summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'ai-result-summary';
    const summaryLabel = document.createElement('strong');
    summaryLabel.textContent = 'Summary: ';
    summaryDiv.appendChild(summaryLabel);
    summaryDiv.appendChild(document.createTextNode(summaryText));
    resultDiv.appendChild(summaryDiv);

    // Add details
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'ai-result-details';
    const detailsLabel = document.createElement('strong');
    detailsLabel.textContent = 'Details: ';
    detailsDiv.appendChild(detailsLabel);
    detailsDiv.appendChild(document.createTextNode(detailsText));
    resultDiv.appendChild(detailsDiv);

    // Add suggestions
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'ai-result-suggestions';
    const suggestionsLabel = document.createElement('strong');
    suggestionsLabel.textContent = 'Suggestions: ';
    suggestionsDiv.appendChild(suggestionsLabel);
    suggestionsDiv.appendChild(document.createTextNode(suggestionsText));
    resultDiv.appendChild(suggestionsDiv);

    // Clear container and append result
    container.innerHTML = '';
    container.appendChild(resultDiv);
}

// Add a new criterion to the list
function addCriterion() {
    const newCriterion = document.getElementById('newCriterion');
    const criteriaList = document.getElementById('ruleCriteriaList');

    if (!newCriterion || !criteriaList) return;

    const criterionText = newCriterion.value.trim();

    if (criterionText) {
        const criteriaItem = document.createElement('div');
        criteriaItem.className = 'rule-criteria-item';
        criteriaItem.innerHTML = `
            <span>${criterionText}</span>
            <button type="button" class="rule-action-btn remove-criterion">×</button>
        `;

        criteriaList.appendChild(criteriaItem);

        // Add event listener to remove button
        criteriaItem.querySelector('.remove-criterion').addEventListener('click', function () {
            criteriaList.removeChild(criteriaItem);
        });

        // Clear input
        newCriterion.value = '';
    }
}

// Open rule dialog for adding or editing a rule
function openRuleDialog(ruleId = null) {
    const dialog = document.getElementById('ruleDialog');
    const dialogTitle = document.getElementById('ruleDialogTitle');
    const ruleForm = document.getElementById('ruleForm');
    const criteriaList = document.getElementById('ruleCriteriaList');

    if (!dialog || !dialogTitle || !ruleForm || !criteriaList) return;

    // Clear form
    ruleForm.reset();
    criteriaList.innerHTML = '';

    if (ruleId) {
        // Edit mode
        dialogTitle.textContent = 'Edit Rule';

        // Find rule
        const rule = window.aiAnalyzer.rules.find(r => r.id === ruleId);
        if (rule) {
            document.getElementById('ruleId').value = rule.id;
            document.getElementById('ruleName').value = rule.name || '';
            document.getElementById('ruleDescription').value = rule.description || '';
            document.getElementById('ruleDetails').value = rule.details || '';

            // Add criteria
            if (rule.criteria && rule.criteria.length > 0) {
                rule.criteria.forEach(criterion => {
                    const criteriaItem = document.createElement('div');
                    criteriaItem.className = 'rule-criteria-item';
                    criteriaItem.innerHTML = `
                        <span>${criterion}</span>
                        <button type="button" class="rule-action-btn remove-criterion">×</button>
                    `;

                    criteriaList.appendChild(criteriaItem);

                    // Add event listener to remove button
                    criteriaItem.querySelector('.remove-criterion').addEventListener('click', function () {
                        criteriaList.removeChild(criteriaItem);
                    });
                });
            }
        }
    } else {
        // Add mode
        dialogTitle.textContent = 'Add Rule';
        document.getElementById('ruleId').value = '';
    }

    // Open dialog
    dialog.classList.add('open');
}

// Save the rule
async function saveRule() {
    const ruleId = document.getElementById('ruleId').value;
    const ruleName = document.getElementById('ruleName').value.trim();
    const ruleDescription = document.getElementById('ruleDescription').value.trim();
    const ruleDetails = document.getElementById('ruleDetails').value.trim();

    // Get criteria
    const criteriaElements = document.querySelectorAll('#ruleCriteriaList .rule-criteria-item span');
    const criteria = Array.from(criteriaElements).map(el => el.textContent.trim());

    // Validate form
    if (!ruleName || !ruleDescription) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }

    // Create rule object
    const rule = {
        name: ruleName,
        description: ruleDescription,
        details: ruleDetails,
        criteria: criteria
    };

    let result;

    if (ruleId) {
        // Update existing rule
        rule.id = ruleId;
        result = await window.aiAnalyzer.updateRule(ruleId, rule);
    } else {
        // Add new rule
        result = await window.aiAnalyzer.addRule(rule);
    }

    if (result && result.success) {
        // Close dialog
        document.getElementById('ruleDialog').classList.remove('open');

        // Refresh rules list
        populateRulesList();

        // Refresh dropdown
        populateRuleDropdown();

        showNotification('Rule saved successfully', 'success');
    } else {
        showNotification('Failed to save rule: ' + (result ? result.error : 'Unknown error'), 'error');
    }
}

// Populate the rules list in settings
function populateRulesList() {
    const rulesList = document.getElementById('rulesList');
    if (!rulesList || !window.aiAnalyzer || !window.aiAnalyzer.rules) return;

    rulesList.innerHTML = '';

    const rules = window.aiAnalyzer.rules;

    if (rules && rules.length > 0) {
        rules.forEach(rule => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'rule-item';
            ruleItem.innerHTML = `
                <span class="rule-name">${rule.name}</span>
                <div class="rule-actions">
                    <button type="button" class="rule-action-btn edit-rule" data-rule-id="${rule.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button type="button" class="rule-action-btn delete-rule" data-rule-id="${rule.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;

            rulesList.appendChild(ruleItem);
        });

        // Add event listeners
        document.querySelectorAll('.edit-rule').forEach(button => {
            button.addEventListener('click', function () {
                const ruleId = this.getAttribute('data-rule-id');
                openRuleDialog(ruleId);
            });
        });

        document.querySelectorAll('.delete-rule').forEach(button => {
            button.addEventListener('click', async function () {
                const ruleId = this.getAttribute('data-rule-id');
                if (confirm('Are you sure you want to delete this rule?')) {
                    const result = await window.aiAnalyzer.deleteRule(ruleId);
                    if (result && result.success) {
                        populateRulesList();
                        populateRuleDropdown();
                        showNotification('Rule deleted successfully', 'success');
                    } else {
                        showNotification('Failed to delete rule: ' + (result ? result.error : 'Unknown error'), 'error');
                    }
                }
            });
        });
    } else {
        rulesList.innerHTML = '<p>No rules found. Add a rule to get started.</p>';
    }
}

// Populate the rule dropdown
function populateRuleDropdown() {
    const select = document.getElementById('accessibilityRuleSelect');
    if (!select || !window.aiAnalyzer || !window.aiAnalyzer.rules) return;

    // Save current selection
    const currentValue = select.value;

    // Clear options
    select.innerHTML = '<option value="">Select accessibility rule...</option>';

    // Add options
    const rules = window.aiAnalyzer.rules;
    if (rules && rules.length > 0) {
        rules.forEach(rule => {
            const option = document.createElement('option');
            option.value = rule.id;
            option.textContent = rule.name;
            select.appendChild(option);
        });

        // Restore selection if it still exists
        if (currentValue && rules.some(rule => rule.id === currentValue)) {
            select.value = currentValue;
            window.aiAnalyzer.setCurrentRule(currentValue);
        }
    }
}

// Update the current element data when element details are received
function updateCurrentElementData(details) {
    currentElementData = {
        html: details.html || '',
        parentHtml: details.parentHtml || '',  // Include parent HTML
        childHtml: details.childHtml || '',    // Include child HTML
        accessibility: details.accessibility || '',
        cssProperties: details.cssProperties || '',
        attributes: details.attributes || ''
    };

    // Enable AI analyze button if a rule is selected
    const ruleSelect = document.getElementById('accessibilityRuleSelect');
    const analyzeButton = document.getElementById('analyzeWithAI');

    if (ruleSelect && analyzeButton) {
        analyzeButton.disabled = !ruleSelect.value;
    }
}

// Extend the existing message listener to update element data for AI analysis
chrome.runtime.onMessage.addListener(function (message) {
    // This is the code you want to add
    if (message.action === 'ELEMENT_DETAILS') {
        // Update node info in UI - this code is already in your existing listener

        // Update current element data for AI analysis
        updateCurrentElementData(message.payload);
    }
});