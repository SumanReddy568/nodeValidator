/**
 * This file ensures the service worker stays alive during validation.
 * It creates a persistent connection between the panel and background.
 */

// Send periodic pings to keep the service worker alive
const PING_INTERVAL = 20000; // 20 seconds
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
                    console.log('Background script may be inactive, but state is preserved in storage.');

                    // The next user action will properly reload state from storage
                    // so we don't need to do anything special here
                }
            });
        }
    }, PING_INTERVAL);
}

// Start pinging when this script loads
startPingInterval();

// Listen for reconnection events
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
