console.log('Node Validator Content Script loaded');

// NodeStatus enum equivalent
const NodeStatus = {
    TruePositive: 'True Positive',
    FalsePositive: 'False Positive',
    FalseNegative: 'False Negative',
    NotFound: 'Not Found',
    NotValid: 'Not Valid',
    NeedsReview: 'Needs Review', // Added
    Pending: 'Pending'
};

// Variables to track highlighted elements 
let highlightedElements = [];
let highlightTimeouts = [];
const HIGHLIGHT_DURATION = 5000; // 5 seconds

let currentNodeIndex = null;

// Listen for messages from the extension
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log('Content script received message:', message.action);

    if (message.action === 'HIGHLIGHT_NODE') {
        const { targetNode, index, automated } = message.payload;

        // Always send a response within a reasonable time to prevent hanging
        const timeoutId = setTimeout(() => {
            console.warn('Highlight operation timed out for selector:', targetNode);
            sendResponse({
                found: false,
                error: 'Operation timed out',
                index: index,
                message: 'Element highlighting operation timed out'
            });
        }, 5000); // 5 second timeout

        try {
            // Clear any existing highlights
            clearHighlights();

            console.log('Trying to find and highlight selector:', targetNode);

            // Try different ways to find the element
            const elements = findElements(targetNode);
            const found = elements && elements.length > 0;

            // Clear the timeout since we're responding now
            clearTimeout(timeoutId);

            if (found) {
                // Element found - highlight it
                console.log(`Found ${elements.length} elements matching "${targetNode}"`);

                try {
                    highlightElements(elements);
                    scrollToElement(elements[0]);
                } catch (highlightError) {
                    console.error('Error in highlight operation:', highlightError);
                }

                // Notify panel that element was found
                try {
                    chrome.runtime.sendMessage({
                        action: 'ELEMENT_STATUS',
                        found: true,
                        count: elements.length,
                        selector: targetNode
                    });
                } catch (messageError) {
                    console.error('Error sending element status message:', messageError);
                }

                // Send success response
                sendResponse({
                    found: true,
                    count: elements.length,
                    index: index,
                    message: `Found ${elements.length} element(s)`
                });
            } else {
                // Element not found
                console.warn(`Element not found: ${targetNode}`);

                // Notify panel that element was not found
                try {
                    chrome.runtime.sendMessage({
                        action: 'ELEMENT_STATUS',
                        found: false,
                        error: 'Element not found on page',
                        selector: targetNode
                    });
                } catch (messageError) {
                    console.error('Error sending element status message:', messageError);
                }

                sendResponse({
                    found: false,
                    index: index,
                    message: `No elements found matching "${targetNode}"`
                });
            }
        } catch (error) {
            // Clear the timeout since we're responding now
            clearTimeout(timeoutId);

            console.error(`Error finding element: ${error}`);

            // Notify panel of the error
            try {
                chrome.runtime.sendMessage({
                    action: 'ELEMENT_STATUS',
                    found: false,
                    error: error.message,
                    selector: targetNode
                });
            } catch (messageError) {
                console.error('Error sending error status message:', messageError);
            }

            sendResponse({
                found: false,
                error: error.message,
                index: index,
                message: `Error: ${error.message}`
            });
        }

        return true; // Keep message channel open for async response
    }

    return false;
});

/**
 * Try multiple strategies to find elements
 */
function findElements(selector) {
    console.log('Finding elements with selector:', selector);

    try {
        // Standard querySelector approach
        try {
            const elements = document.querySelectorAll(selector);
            if (elements && elements.length > 0) {
                return elements;
            }
        } catch (e) {
            console.warn('querySelector failed:', e);
        }

        // Try with JavaScript evaluation if it looks like a JavaScript expression
        if (selector.includes('document.') || selector.includes('window.')) {
            try {
                const result = eval(selector);
                if (result) {
                    if (result instanceof NodeList || Array.isArray(result)) {
                        return result;
                    } else if (result instanceof Element) {
                        return [result];
                    }
                }
            } catch (e) {
                console.warn('JavaScript evaluation failed:', e);
            }
        }

        // Try XPath if it starts with /
        if (selector.startsWith('/')) {
            try {
                const xpathResult = document.evaluate(
                    selector,
                    document,
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );

                const results = [];
                for (let i = 0; i < xpathResult.snapshotLength; i++) {
                    results.push(xpathResult.snapshotItem(i));
                }

                if (results.length > 0) {
                    return results;
                }
            } catch (e) {
                console.warn('XPath evaluation failed:', e);
            }
        }

        // Try using ID only if selector looks like an ID
        if (selector.startsWith('#')) {
            const idOnly = selector.substring(1);
            const byId = document.getElementById(idOnly);
            if (byId) {
                return [byId];
            }
        }

        return [];
    } catch (e) {
        console.error('Error finding elements:', e);
        return [];
    }
}

/**
 * Highlight the specified elements
 */
function highlightElements(elements) {
    clearHighlights();

    if (!elements || elements.length === 0) return;

    console.log(`Highlighting ${elements.length} elements`);

    elements.forEach(element => {
        try {
            // Get the HTML snippet first before any modifications
            const htmlSnippet = element.outerHTML || '-';

            // Get parent HTML snippet (parent element's outerHTML)
            let parentHtmlSnippet = '-';
            if (element.parentElement) {
                try {
                    parentHtmlSnippet = element.parentElement.outerHTML || '-';
                } catch (e) {
                    console.warn('Error getting parent HTML:', e);
                }
            }

            // Get child HTML snippet (all children combined)
            let childHtmlSnippet = '-';
            if (element.children && element.children.length > 0) {
                try {
                    // Ensure we're getting children as an array even if it's a HTMLCollection
                    const childrenArray = Array.from(element.children);

                    // Log for debugging
                    console.log('Found child elements:', childrenArray.length);

                    // Generate snippet only if children exist
                    if (childrenArray.length > 0) {
                        // Use a safer approach to build the child HTML
                        const childSnippets = [];
                        childrenArray.forEach(child => {
                            try {
                                if (child && child.outerHTML) {
                                    childSnippets.push(child.outerHTML);
                                }
                            } catch (e) {
                                console.warn('Error getting child HTML:', e);
                            }
                        });

                        if (childSnippets.length > 0) {
                            childHtmlSnippet = childSnippets.join('\n');
                            // Double check we have content
                            console.log('Child HTML snippet length:', childHtmlSnippet.length);
                        }
                    }
                } catch (e) {
                    console.warn('Error getting children:', e);
                }
            }

            // Extract node attributes
            let nodeAttributes = '-';
            try {
                if (element.attributes && element.attributes.length > 0) {
                    const attributesArray = Array.from(element.attributes).map(attr =>
                        `${attr.name}: "${attr.value}"`
                    );
                    nodeAttributes = attributesArray.join('\n');
                }
            } catch (e) {
                console.warn('Error extracting attributes:', e);
            }

            // Extract accessibility information
            let nodeAccessibility = '-';
            try {
                const a11yInfo = [];

                // Role
                if (element.getAttribute('role')) {
                    a11yInfo.push(`Role: ${element.getAttribute('role')}`);
                }

                // All ARIA attributes on this element
                Array.from(element.attributes)
                    .filter(attr => attr.name.startsWith('aria-'))
                    .forEach(attr => {
                        a11yInfo.push(`${attr.name}: "${attr.value}"`);
                    });

                // All ARIA attributes on descendants (robust)
                const allDescendants = element.querySelectorAll('*');
                allDescendants.forEach(desc => {
                    Array.from(desc.attributes)
                        .filter(attr => attr.name.startsWith('aria-'))
                        .forEach(attr => {
                            a11yInfo.push(`[descendant ${desc.tagName.toLowerCase()}] ${attr.name}: "${attr.value}"`);
                        });
                });

                // All ARIA attributes on closest 2 ancestors only
                let ancestor = element.parentElement;
                let ancestorLevel = 0;
                while (ancestor && ancestorLevel < 2) {
                    const ariaAttrs = Array.from(ancestor.attributes)
                        .filter(attr => attr.name.startsWith('aria-'));
                    if (ariaAttrs.length > 0) {
                        const tag = ancestor.tagName.toLowerCase();
                        const id = ancestor.id ? `#${ancestor.id}` : '';
                        const cls = ancestor.className ? `.${ancestor.className.split(' ').join('.')}` : '';
                        ariaAttrs.forEach(attr => {
                            a11yInfo.push(`[ancestor${ancestorLevel === 0 ? '' : ' (grandparent)'} ${tag}${id}${cls}] ${attr.name}: "${attr.value}"`);
                        });
                    }
                    ancestor = ancestor.parentElement;
                    ancestorLevel++;
                }

                // Tab index
                if (element.hasAttribute('tabindex')) {
                    a11yInfo.push(`tabindex: ${element.getAttribute('tabindex')}`);
                }

                // Is focusable
                const isFocusable = (element.tabIndex >= 0);
                a11yInfo.push(`Focusable: ${isFocusable}`);

                // Label info
                if (element.hasAttribute('id')) {
                    const labelFor = document.querySelector(`label[for="${element.id}"]`);
                    if (labelFor) {
                        a11yInfo.push(`Label: "${labelFor.textContent.trim()}"`);
                    }
                }

                if (a11yInfo.length > 0) {
                    nodeAccessibility = a11yInfo.join('\n');
                }
            } catch (e) {
                console.warn('Error extracting accessibility info:', e);
            }

            // Extract important CSS properties
            let nodeCssProperties = '-';
            try {
                const styles = window.getComputedStyle(element);
                const cssProps = [
                    'display', 'position', 'visibility', 'opacity',
                    'width', 'height',
                    'color', 'background-color',
                    'font-size', 'font-weight'
                ];

                const cssInfo = cssProps.map(prop => `${prop}: ${styles.getPropertyValue(prop)}`);
                nodeCssProperties = cssInfo.join('\n');
            } catch (e) {
                console.warn('Error extracting CSS properties:', e);
            }

            // Log the data being sent to ensure it's correct
            console.log('Sending element details to panel:', {
                htmlLength: htmlSnippet.length,
                parentHtmlLength: parentHtmlSnippet.length,
                childHtmlLength: childHtmlSnippet.length
            });

            // Send element details to panel in a safer way
            try {
                chrome.runtime.sendMessage({
                    action: 'ELEMENT_DETAILS',
                    payload: {
                        html: htmlSnippet,
                        parentHtml: parentHtmlSnippet,
                        childHtml: childHtmlSnippet,
                        attributes: nodeAttributes,
                        accessibility: nodeAccessibility,
                        cssProperties: nodeCssProperties
                    }
                });
            } catch (e) {
                console.error('Error sending element details message:', e);
            }

            // Rest of the highlighting logic
            const originalStyles = {
                outline: element.style.outline,
                outlineOffset: element.style.outlineOffset,
                position: element.style.position
            };

            // Apply highlighting
            element.style.outline = '2px solid #f72585';
            element.style.outlineOffset = '2px';
            if (getComputedStyle(element).position === 'static') {
                element.style.position = 'relative';
            }

            // Add to tracked elements
            highlightedElements.push({
                element: element,
                originalStyles: originalStyles
            });

            // Add pulsing effect with a badge showing the element was found
            const badge = document.createElement('div');
            badge.textContent = 'FOUND';
            badge.style.position = 'absolute';
            badge.style.top = '0';
            badge.style.right = '0';
            badge.style.backgroundColor = '#f72585';
            badge.style.color = 'white';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '3px';
            badge.style.fontSize = '10px';
            badge.style.fontWeight = 'bold';
            badge.style.zIndex = '9999';
            badge.style.animation = 'pulse 1.5s infinite';
            badge.style.fontFamily = 'Arial, sans-serif';

            // Add CSS animation for pulse
            if (!document.getElementById('nv-animation-style')) {
                const style = document.createElement('style');
                style.id = 'nv-animation-style';
                style.textContent = `
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.6; }
                        100% { opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }

            element.appendChild(badge);

            // Set timeout to remove highlight after some time
            const timeout = setTimeout(() => {
                if (element.contains(badge)) {
                    element.removeChild(badge);
                }
                // Don't remove the highlight completely - just the badge
            }, HIGHLIGHT_DURATION);

            highlightTimeouts.push(timeout);

        } catch (e) {
            console.error('Error highlighting element:', e);
        }
    });
}

/**
 * Clear all highlights
 */
function clearHighlights() {
    // Clear all timeout handlers
    while (highlightTimeouts.length > 0) {
        clearTimeout(highlightTimeouts.pop());
    }

    // Remove all highlights
    while (highlightedElements.length > 0) {
        const { element, originalStyles } = highlightedElements.pop();
        try {
            if (element) {
                // Restore original styles
                element.style.outline = originalStyles.outline;
                element.style.outlineOffset = originalStyles.outlineOffset;
                element.style.position = originalStyles.position;

                // Remove any badge elements we added
                const badges = element.querySelectorAll('div');
                badges.forEach(badge => {
                    if (badge.textContent === 'FOUND' && element.contains(badge)) {
                        element.removeChild(badge);
                    }
                });
            }
        } catch (e) {
            console.error('Error clearing highlight:', e);
        }
    }
}

/**
 * Scroll to the selected element
 */
function scrollToElement(element) {
    if (!element) return;

    try {
        // Scroll element into view with smooth behavior
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    } catch (e) {
        console.error('Error scrolling to element:', e);

        // Fallback method
        try {
            const rect = element.getBoundingClientRect();
            window.scrollTo({
                top: window.pageYOffset + rect.top - (window.innerHeight / 2),
                left: window.pageXOffset + rect.left - (window.innerWidth / 2),
                behavior: 'smooth'
            });
        } catch (e2) {
            console.error('Fallback scroll also failed:', e2);
        }
    }
}

// Function to create the status panel
function createStatusPanel() {
    // Remove existing panel if present
    const existingPanel = document.getElementById('node-validator-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    // Create new panel
    const panel = document.createElement('div');
    panel.id = 'node-validator-panel';
    panel.className = 'node-validator-panel';

    // Create panel content
    panel.innerHTML = `
    <div class="panel-header">
      <h3>Node Validator</h3>
      <button id="close-panel" class="panel-close-btn">&times;</button>
    </div>
    <div class="panel-content">
      <p>Mark this node as:</p>
      <div class="status-buttons">
        <button id="true-positive" class="status-btn success">True Positive</button>
        <button id="false-positive" class="status-btn warning">False Positive</button>
        <button id="false-negative" class="status-btn danger">False Negative</button>
        <button id="not-found" class="status-btn info">Not Found</button>
        <button id="not-valid" class="status-btn secondary">Not Valid</button>
        <button id="needs-review" class="status-btn review">Needs Review</button>
      </div>
      <div class="notes-section">
        <label for="validation-notes">Notes:</label>
        <textarea id="validation-notes" placeholder="Add optional notes here..."></textarea>
      </div>
      <div class="panel-actions">
        <button id="next-url" class="primary-btn">Next URL</button>
      </div>
    </div>
  `;

    // Apply styles inline to ensure they work everywhere
    applyInlineStyles(panel);

    // Append to body
    document.body.appendChild(panel);

    // Make panel draggable
    makeDraggable(panel);

    // Add event listeners
    document.getElementById('close-panel').addEventListener('click', function () {
        panel.remove();
        clearHighlights();
    });

    document.getElementById('true-positive').addEventListener('click', function () {
        updateStatus(NodeStatus.TruePositive);
    });

    document.getElementById('false-positive').addEventListener('click', function () {
        updateStatus(NodeStatus.FalsePositive);
    });

    document.getElementById('false-negative').addEventListener('click', function () {
        updateStatus(NodeStatus.FalseNegative);
    });

    document.getElementById('not-found').addEventListener('click', function () {
        updateStatus(NodeStatus.NotFound);
    });

    document.getElementById('not-valid').addEventListener('click', function () {
        updateStatus(NodeStatus.NotValid);
    });

    document.getElementById('needs-review').addEventListener('click', function () {
        updateStatus(NodeStatus.NeedsReview);
    });

    document.getElementById('next-url').addEventListener('click', function () {
        chrome.runtime.sendMessage({ action: 'NEXT_URL' }, function (response) {
            if (response && response.success) {
                console.log('Navigating to next URL');
            } else {
                alert('Validation complete! You can now export the results from the extension panel.');
            }
        });
    });
}

// Apply inline styles to the panel to ensure they work in all websites
function applyInlineStyles(panel) {
    // Panel styles
    panel.style.position = 'fixed';
    panel.style.top = '20px';
    panel.style.right = '20px';
    panel.style.width = '320px';
    panel.style.backgroundColor = '#ffffff';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    panel.style.zIndex = '9999';
    panel.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    panel.style.overflow = 'hidden';
    panel.style.transition = 'all 0.3s ease';

    // Panel header
    const header = panel.querySelector('.panel-header');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.background = 'linear-gradient(to right, #4776E6, #8E54E9)';
    header.style.color = 'white';
    header.style.padding = '10px 15px';
    header.style.cursor = 'move';
    header.style.userSelect = 'none';

    // Header title
    const h3 = header.querySelector('h3');
    h3.style.margin = '0';
    h3.style.fontSize = '16px';
    h3.style.fontWeight = '600';

    // Close button
    const closeBtn = header.querySelector('.panel-close-btn');
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '0';
    closeBtn.style.width = '24px';
    closeBtn.style.height = '24px';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.transition = 'background-color 0.2s';

    // Panel content
    const content = panel.querySelector('.panel-content');
    content.style.padding = '15px';

    // Status buttons container
    const statusButtons = content.querySelector('.status-buttons');
    statusButtons.style.display = 'grid';
    statusButtons.style.gridTemplateColumns = '1fr 1fr';
    statusButtons.style.gap = '8px';
    statusButtons.style.marginBottom = '15px';

    // Status buttons
    const buttons = statusButtons.querySelectorAll('.status-btn');
    buttons.forEach(function (btn) {
        btn.style.padding = '8px 12px';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = '500';
        btn.style.color = 'white';
        btn.style.transition = 'all 0.2s';
    });

    // Color specific buttons
    const successBtn = document.getElementById('true-positive');
    successBtn.style.backgroundColor = '#4CAF50';

    const warningBtn = document.getElementById('false-positive');
    warningBtn.style.backgroundColor = '#FF9800';

    const dangerBtn = document.getElementById('false-negative');
    dangerBtn.style.backgroundColor = '#F44336';

    const infoBtn = document.getElementById('not-found');
    infoBtn.style.backgroundColor = '#2196F3';

    const secondaryBtn = document.getElementById('not-valid');
    secondaryBtn.style.backgroundColor = '#9E9E9E';

    const reviewBtn = document.getElementById('needs-review');
    if (reviewBtn) {
        reviewBtn.style.backgroundColor = '#673ab7';
    }

    // Notes section
    const notesSection = content.querySelector('.notes-section');
    notesSection.style.marginBottom = '15px';

    const notesLabel = notesSection.querySelector('label');
    notesLabel.style.display = 'block';
    notesLabel.style.marginBottom = '5px';
    notesLabel.style.fontWeight = '500';

    const textarea = notesSection.querySelector('textarea');
    textarea.style.width = '100%';
    textarea.style.height = '60px';
    textarea.style.padding = '8px';
    textarea.style.border = '1px solid #ddd';
    textarea.style.borderRadius = '4px';
    textarea.style.resize = 'vertical';

    // Panel actions
    const actions = content.querySelector('.panel-actions');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';

    const nextBtn = actions.querySelector('.primary-btn');
    nextBtn.style.backgroundColor = '#4776E6';
    nextBtn.style.color = 'white';
    nextBtn.style.border = 'none';
    nextBtn.style.padding = '8px 16px';
    nextBtn.style.borderRadius = '4px';
    nextBtn.style.cursor = 'pointer';
    nextBtn.style.fontWeight = '500';
    nextBtn.style.transition = 'all 0.2s';
}

// Function to update status and navigate to next URL
function updateStatus(status) {
    if (currentNodeIndex === null) return;

    const notes = document.getElementById('validation-notes').value || '';

    chrome.runtime.sendMessage({
        action: 'UPDATE_STATUS',
        payload: {
            index: currentNodeIndex,
            status,
            notes
        }
    }, function (response) {
        if (response && response.success) {
            const panel = document.getElementById('node-validator-panel');
            if (panel) {
                const statusBtns = panel.querySelectorAll('.status-btn');
                statusBtns.forEach(function (btn) {
                    btn.classList.remove('selected');
                    btn.style.transform = '';
                    btn.style.boxShadow = '';
                });

                // Find and highlight the selected button
                const btnId = status.replace(' ', '-').toLowerCase();
                const selectedBtn = document.getElementById(btnId);
                if (selectedBtn) {
                    selectedBtn.classList.add('selected');
                    selectedBtn.style.transform = 'scale(0.95)';
                    selectedBtn.style.boxShadow = 'inset 0 2px 5px rgba(0, 0, 0, 0.1)';
                }
            }
        } else {
            console.error('Failed to update status', response ? response.error : 'Unknown error');
        }
    });
}

// Make an element draggable
function makeDraggable(element) {
    const header = element.querySelector('.panel-header');
    if (!header) return;

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        // Get the mouse cursor position at startup
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Call a function whenever the cursor moves
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        // Calculate the new cursor position
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set the element's new position
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // Stop moving when mouse button is released
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Let the background script know the content script is ready
chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_READY' });
