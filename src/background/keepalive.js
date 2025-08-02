/**
 * This file ensures the service worker stays alive during validation.
 * It creates a persistent connection between the panel and background.
 */

// Send periodic pings to keep the service worker alive
const PING_INTERVAL = 10000; // 10 seconds
let pingIntervalId = null;

// Function to start pinging the background script
function startPingInterval() {
    if (pingIntervalId) {
        clearInterval(pingIntervalId);
    }

    pingIntervalId = setInterval(() => {
        if (chrome && chrome.runtime) {
            chrome.runtime.sendMessage({ action: 'KEEPALIVE_PING' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('Background script connection error:', chrome.runtime.lastError);

                    // If connection is lost, try to re-establish it
                    setTimeout(() => {
                        chrome.runtime.sendMessage({ action: 'RECONNECT' });
                    }, 1000);
                }
            });
        }
    }, PING_INTERVAL);
}

// Start pinging when this script loads
startPingInterval();

// Add a listener for reconnection events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'RECONNECTED') {
        console.log('Reconnected to background script');
        sendResponse({ success: true });
    }
    return true; // Keep the message channel open for async response
});

// Export the startPingInterval function
if (typeof window !== 'undefined') {
    window.startKeepalive = startPingInterval;
}
