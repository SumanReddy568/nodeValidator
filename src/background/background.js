let validationData = [];
let currentIndex = 0;
let validationTabId = null; // Track the tab being used for validation
let validationActive = false; // Add a flag to track active validation
let automatedMode = false; // Flag to track if we're in automated mode

const NodeStatus = {
    TruePositive: 'True Positive',
    FalsePositive: 'False Positive',
    FalseNegative: 'False Negative',
    NotValid: 'Not Valid',
    Pending: 'Pending'
};

chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.local.set({
        validationData: [],
        currentIndex: 0
    });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log('Background received message:', message.action);

    switch (message.action) {
        case 'UPLOAD_CSV':
            validationData = message.payload;
            currentIndex = 0;
            validationTabId = null;
            validationActive = false;
            automatedMode = false;
            chrome.storage.local.set({
                validationData,
                currentIndex,
                validationStopped: false // Reset stopped flag when uploading new data
            });
            sendResponse({ success: true });
            break;

        case 'START_VALIDATION':
            validationActive = true;
            automatedMode = message.payload.automated || false; // Check if automated mode

            // Allow starting from a specific index, now properly preserved in both manual and automated modes
            if (typeof message.payload.startIndex === 'number') {
                currentIndex = message.payload.startIndex;
            }

            // Also store the filter start index for proper UI updates and filtering
            if (typeof message.payload.filterStartIndex === 'number') {
                chrome.storage.local.set({ filterStartIndex: message.payload.filterStartIndex });
            }

            const { url, targetNode } = message.payload;

            console.log(`Starting validation in ${automatedMode ? 'automated' : 'manual'} mode from index ${currentIndex}`);

            // Get the current active tab and use it for validation
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs && tabs.length > 0) {
                    validationTabId = tabs[0].id;

                    // Navigate to the URL at the current index
                    chrome.tabs.update(validationTabId, { url: url }, function (tab) {
                        // Set up one-time listener for this specific navigation
                        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                            if (tabId === validationTabId && changeInfo.status === 'complete') {
                                chrome.tabs.onUpdated.removeListener(listener);

                                // Give the page a moment to fully render
                                setTimeout(() => {
                                    chrome.tabs.sendMessage(validationTabId, {
                                        action: 'HIGHLIGHT_NODE',
                                        payload: {
                                            targetNode: targetNode,
                                            index: currentIndex,
                                            automated: automatedMode
                                        }
                                    }, response => {
                                        // For automated mode, process the result immediately
                                        if (automatedMode && response) {
                                            processAutomatedResult(response, currentIndex);
                                        }
                                    });
                                }, 1000);
                            }
                        });
                    });

                    // Update storage with new index - critical for resuming
                    chrome.storage.local.set({
                        currentIndex: currentIndex,
                        validationStopped: false // Clear stopped flag when starting validation
                    });

                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'No active tab found' });
                }
            });
            return true;

        case 'STOP_VALIDATION':
            validationActive = false;
            automatedMode = false;
            // Record that validation was stopped so we can show resume button
            chrome.storage.local.set({
                validationStopped: true,
                // Don't update the currentIndex here to ensure we can resume from the right spot
            });
            sendResponse({ success: true });
            return true;

        case 'UPDATE_STATUS':
            // Immediately send a success response to prevent timeout
            sendResponse({ success: true });

            try {
                const { index, status, comments } = message.payload;
                console.log('Updating status for index', index, 'to', status);

                // Get current data
                chrome.storage.local.get(['validationData'], function (result) {
                    if (result.validationData && Array.isArray(result.validationData)) {
                        // Update the data
                        result.validationData[index].status = status;
                        result.validationData[index].comments = comments || '';

                        // Save back to storage
                        chrome.storage.local.set({ validationData: result.validationData }, function () {
                            // Notify the panel of the update
                            chrome.runtime.sendMessage({
                                action: 'UPDATE_STATUS_RESULT',
                                success: true,
                                index: index,
                                status: status,
                                comments: comments
                            });
                        });
                    } else {
                        console.error('Invalid validation data structure');
                        chrome.runtime.sendMessage({
                            action: 'UPDATE_STATUS_RESULT',
                            success: false,
                            error: 'Invalid validation data structure'
                        });
                    }
                });
            } catch (error) {
                console.error('Error updating status:', error);
                chrome.runtime.sendMessage({
                    action: 'UPDATE_STATUS_RESULT',
                    success: false,
                    error: error.message || 'Unknown error'
                });
            }
            return true; // Keep the message channel open for async response

        case 'NEXT_URL':
            if (!validationActive) {
                sendResponse({ success: false, error: 'Validation was stopped' });
                return true;
            }

            console.log(`NEXT_URL: Current index before increment: ${currentIndex}, Total items: ${validationData.length}`);

            // Check if the current index is valid
            if (currentIndex >= validationData.length) {
                console.log("Validation complete - reached end of data");
                validationActive = false;
                chrome.storage.local.set({
                    currentIndex: validationData.length,
                    validationStopped: false // Clear the stopped flag when complete
                }, function () {
                    sendResponse({ success: false, message: 'Validation complete' });
                });
                return true;
            }

            // Increment the index
            currentIndex++;

            // Check if we've reached the end after incrementing
            if (currentIndex >= validationData.length) {
                console.log("Validation complete - reached end of data");
                validationActive = false;
                chrome.storage.local.set({
                    currentIndex: validationData.length,
                    validationStopped: false // Clear the stopped flag when complete
                }, function () {
                    sendResponse({ success: false, message: 'Validation complete' });
                });
            } else {
                console.log(`Moving to next URL, index: ${currentIndex}`);
                chrome.storage.local.set({ currentIndex }, function () {
                    if (validationTabId !== null) {
                        openAndHighlight(currentIndex, validationTabId);
                        sendResponse({ success: true });
                    } else {
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            if (tabs && tabs.length > 0) {
                                validationTabId = tabs[0].id;
                                openAndHighlight(currentIndex, validationTabId);
                                sendResponse({ success: true });
                            } else {
                                sendResponse({ success: false, error: 'Validation tab not found' });
                            }
                        });
                    }
                });
            }
            return true;

        case 'GET_CURRENT_DATA':
            chrome.storage.local.get(['validationData', 'currentIndex'], function (data) {
                sendResponse({
                    validationData: data.validationData || [],
                    currentIndex: data.currentIndex || 0
                });
            });
            return true;

        case 'TOGGLE_VALIDATION_MODE':
            automatedMode = message.payload.automated;
            sendResponse({ success: true, mode: automatedMode ? 'automated' : 'manual' });
            return true;

        case 'RESET_VALIDATION':
            validationData = [];
            currentIndex = 0;
            validationTabId = null;
            validationActive = false;
            automatedMode = false;
            chrome.storage.local.set({ validationStopped: false }); // Clear the stopped flag
            sendResponse({ success: true });
            break;

        case 'PING':
            // Simple ping to check if background script is responsive
            sendResponse({ success: true, timestamp: Date.now() });
            break;

        case 'DOCK_POSITION':
            // Save the dock position to storage so panel can access it
            chrome.storage.local.set({ dockPosition: message.position }, function () {
                // Forward this message to any open panel
                chrome.runtime.sendMessage({
                    action: 'DOCK_POSITION_UPDATED',
                    position: message.position
                });
            });
            sendResponse({ success: true });
            break;

        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
    return true;
});

// Process results in automated mode - ensure index is incremented properly
function processAutomatedResult(response, index) {
    if (!automatedMode || !validationActive) return;

    // Update status based on element found or not
    const status = response && response.found ? 'True Positive' : 'Not Valid';
    const comments = response && response.found ?
        'Automatically marked as True Positive' :
        'Automatically marked as Not Valid - element not found';

    console.log(`Auto-marking item ${index} as ${status}`);

    // Update the data
    validationData[index].status = status;
    validationData[index].comments = comments;

    // Get the current filter start index for UI updates
    chrome.storage.local.get(['filterStartIndex'], function (data) {
        const filterStartIndex = typeof data.filterStartIndex === 'number' ? data.filterStartIndex : 0;

        // Save the current state
        chrome.storage.local.set({ validationData }, function () {
            // Notify the panel of the update
            chrome.runtime.sendMessage({
                action: 'UPDATE_STATUS_RESULT',
                success: true,
                automated: true,
                index: index,
                status: status,
                comments: comments,
                isLast: (index === validationData.length - 1),
                filterStartIndex: filterStartIndex
            });

            // Check if this is the last item
            if (index === validationData.length - 1) {
                console.log('Processed last item, will finish validation soon');
                // Last item - give a moment for UI to update then finish
                setTimeout(() => {
                    finishValidation();
                }, 1000);
            } else if (automatedMode && validationActive) {
                // Continue to next URL after a delay
                setTimeout(() => {
                    moveToNextUrl();
                }, 2000);
            }
        });
    });
}

// Move to next URL (extracted to a function for automated mode)
function moveToNextUrl() {
    currentIndex++;

    if (currentIndex < validationData.length) {
        console.log(`Automated: Moving to next URL, index: ${currentIndex}`);

        // Update storage first
        chrome.storage.local.set({ currentIndex }, function () {
            if (validationTabId !== null) {
                openAndHighlight(currentIndex, validationTabId);
            }
        });
    } else {
        console.log("Automated validation complete");
        validationTabId = null;
        validationActive = false;
        automatedMode = false;

        // Notify panel that validation is complete
        chrome.runtime.sendMessage({
            action: 'VALIDATION_COMPLETE',
            message: 'Automated validation complete'
        });
    }
}

// Improve the openAndHighlight function with more robust navigation
function openAndHighlight(index, tabId) {
    if (!validationData || validationData.length <= index) {
        console.error("Invalid index or missing validation data");
        return;
    }

    const currentRow = validationData[index];
    console.log(`Navigating to URL: ${currentRow.url} with selector: ${currentRow.targetNode}`);

    // Set up listener before navigation
    const listener = function (updatedTabId, changeInfo, tab) {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
            // Remove the listener since we only need it once
            chrome.tabs.onUpdated.removeListener(listener);

            // Wait a bit longer to ensure page is fully loaded and DOM is ready
            setTimeout(function () {
                console.log("Page loaded, sending highlight message");
                chrome.tabs.sendMessage(tabId, {
                    action: 'HIGHLIGHT_NODE',
                    payload: {
                        targetNode: currentRow.targetNode,
                        index: index,
                        automated: automatedMode,
                        isLast: (index === validationData.length - 1)
                    }
                }, function (response) {
                    // Handle the case when there was no response from content script
                    if (chrome.runtime.lastError) {
                        console.warn("Error sending message to content script:", chrome.runtime.lastError);
                        // Try injecting the content script and trying again
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ['src/content/content.js']
                        }, function () {
                            // Try sending the message again after script injection
                            setTimeout(function () {
                                chrome.tabs.sendMessage(tabId, {
                                    action: 'HIGHLIGHT_NODE',
                                    payload: {
                                        targetNode: currentRow.targetNode,
                                        index: index,
                                        automated: automatedMode,
                                        isLast: (index === validationData.length - 1)
                                    }
                                }, function (retryResponse) {
                                    processResponse(retryResponse);
                                });
                            }, 500);
                        });
                    } else {
                        processResponse(response);
                    }

                    function processResponse(response) {
                        console.log("Response from content script:", response);
                        // Update status if in automated mode
                        if (automatedMode) {
                            if (response && response.found) {
                                console.log("Element found, auto-marking as True Positive");
                                validationData[index].status = 'True Positive';
                                validationData[index].comments = 'Automatically marked as True Positive';
                            } else {
                                console.log("Element not found, auto-marking as Not Valid");
                                validationData[index].status = 'Not Valid';
                                validationData[index].comments = 'Automatically marked as Not Valid - element not found';
                            }

                            // Save the current validation data immediately to ensure consistency
                            chrome.storage.local.set({ validationData }, function () {
                                // Notify panel of status update
                                chrome.runtime.sendMessage({
                                    action: 'UPDATE_STATUS_RESULT',
                                    success: true,
                                    automated: true,
                                    index: index,
                                    status: validationData[index].status,
                                    comments: validationData[index].comments
                                });

                                // In automated mode, move to next URL after delay
                                if (automatedMode && validationActive) {
                                    setTimeout(function () {
                                        // Increment index first
                                        currentIndex++;

                                        // Update currentIndex in storage
                                        chrome.storage.local.set({ currentIndex }, function () {
                                            // Check if we've reached the end
                                            if (currentIndex < validationData.length) {
                                                openAndHighlight(currentIndex, tabId);
                                            } else {
                                                // End of validation - ensure we mark as completed
                                                finishValidation();
                                            }
                                        });
                                    }, 2000); // 2 second delay between validations
                                }
                            });
                        }
                    }
                });
            }, 2000); // Longer timeout to ensure page is fully loaded
        }
    };

    // Add the listener
    chrome.tabs.onUpdated.addListener(listener);

    // Navigate to the URL
    chrome.tabs.update(tabId, { url: currentRow.url });
}

// Add a function to ensure proper validation completion
function finishValidation() {
    // Make sure all data is processed before sending completion message
    let pendingCount = 0;

    // First check if any items are still pending
    for (let i = 0; i < validationData.length; i++) {
        if (!validationData[i].status || validationData[i].status === 'Pending') {
            pendingCount++;
            validationData[i].status = 'Not Valid';
            validationData[i].comments = 'Automatically marked as Not Valid - processing error';
        }
    }

    console.log(`Finishing validation. Found ${pendingCount} items still pending.`);

    // Save the final data with all pending items resolved
    chrome.storage.local.set({
        validationData: validationData,
        currentIndex: validationData.length, // Set to end to mark as complete
        validationStopped: false // Clear the stopped flag when complete
    }, function () {
        // Now that storage is updated, notify that we're done
        validationActive = false;
        automatedMode = false;

        setTimeout(() => {
            // Send completion message after a short delay to ensure storage updates first
            chrome.runtime.sendMessage({
                action: 'VALIDATION_COMPLETE',
                message: 'Automated validation complete',
                pendingFixed: pendingCount > 0
            });
        }, 500);
    });
}
