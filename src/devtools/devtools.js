// This file initializes the DevTools extension and sets up communication between the DevTools panel and the background script.

// Create a panel with a robust error handler
try {
    chrome.devtools.panels.create(
        "Node Validator",
        "/public/images/icon.png",
        "/public/panel.html",
        function (panel) {
            console.log("Node Validator panel created");

            // Check for initial dock position when panel is first created
            checkDockPosition();

            // Handle panel shown event
            panel.onShown.addListener(function (window) {
                console.log("Node Validator panel shown");

                // Check dock position when panel is shown
                checkDockPosition();

                // Add a connection check when panel is shown
                try {
                    if (window && window.chrome && window.chrome.runtime) {
                        window.chrome.runtime.sendMessage({ action: 'PANEL_SHOWN' }, function (response) {
                            if (window.chrome.runtime.lastError) {
                                console.warn("Error connecting to extension:", window.chrome.runtime.lastError);
                            } else {
                                console.log("Connected to extension background");
                            }
                        });
                    }
                } catch (err) {
                    console.error("Error during panel shown:", err);
                }
            });
        }
    );
} catch (err) {
    console.error("Error creating Node Validator panel:", err);
}

// Function to check the dock position and notify the panel
function checkDockPosition() {
    try {
        // Signal the panel to evaluate its own layout and display warning if necessary.
        // The panel will use its dimensions to infer if it's side-docked.
        chrome.runtime.sendMessage({
            action: 'EVALUATE_DOCK_MODE_REQUEST' // New action name
        });
        console.log("Requested panel to evaluate its dock mode.");
    } catch (err) {
        console.error("Error requesting panel to evaluate dock mode:", err);
    }
}
