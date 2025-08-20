console.log('Node Validator Content Script loaded');

// Use an IIFE to prevent global variable collisions
(function () {
    // Check if NodeStatus is already defined
    if (typeof window.NodeStatus !== 'undefined') {
        console.warn('NodeStatus already defined, using existing definition');
    } else {
        // NodeStatus enum equivalent
        window.NodeStatus = {
            TruePositive: 'True Positive',
            FalsePositive: 'False Positive',
            FalseNegative: 'False Negative',
            NotFound: 'Not Found',
            NotValid: 'Not Valid',
            NeedsReview: 'Needs Review',
            Pending: 'Pending'
        };
    }

    // Variables to track highlighted elements 
    let highlightedElements = [];
    let highlightTimeouts = [];
    const HIGHLIGHT_DURATION = 5000; // 5 seconds

    let currentNodeIndex = null;

    // Listen for messages from the extension
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        console.log('Content script received message:', message.action);

        if (message.action === 'GET_PAGE_SOURCE') {
            const pageSource = document.documentElement.outerHTML;
            sendResponse({ html: pageSource });
            return true;
        }

        if (message.action === 'CLEAR_HIGHLIGHTS') {
            // Clear content script highlights
            clearHighlights();
            // ALSO clear interactive highlights
            document.querySelectorAll('.nv-interactive-highlight').forEach(el => {
                el.classList.remove('nv-interactive-highlight');
                el.style.outline = '';
                el.style.outlineOffset = '';
            });
            sendResponse({ success: true });
            return true;
        }

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
        function getInlineEventListeners(element) {
            const events = [];
            // List of common event attributes
            const eventAttrs = [
                'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmouseout',
                'onmouseenter', 'onmouseleave', 'onkeydown', 'onkeyup', 'onchange', 'oninput', 'onsubmit'
            ];
            eventAttrs.forEach(attr => {
                if (element[attr]) {
                    events.push(`${attr}: ${element[attr].toString()}`);
                }
            });
            return events;
        }
        elements.forEach(element => {
            try {
                // First, make sure the element is visible
                showHiddenElement(element);
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
                        const childrenArray = Array.from(element.children);
                        if (childrenArray.length > 0) {
                            const childSnippets = childrenArray.map(child => child.outerHTML || '').filter(Boolean);
                            childHtmlSnippet = childSnippets.join('\n');
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

                // Extract accessibility information - UPDATED SECTION
                let nodeAccessibility = '-';
                try {
                    const a11yInfo = [];

                    // First, check for role attribute directly (ensure it's captured)
                    if (element.hasAttribute('role')) {
                        a11yInfo.push(`role: "${element.getAttribute('role')}"`);
                    }

                    // Check for all attributes that start with "alt"
                    Array.from(element.attributes)
                        .filter(attr => attr.name.startsWith('alt'))
                        .forEach(attr => {
                            a11yInfo.push(`${attr.name}: "${attr.value}"`);
                        });

                    // All ARIA attributes on this element (including role again to ensure it's not missed)
                    Array.from(element.attributes)
                        .filter(attr => attr.name.startsWith('aria-') || attr.name === 'role')
                        .forEach(attr => {
                            a11yInfo.push(`${attr.name}: "${attr.value}"`);
                        });

                    // All ARIA attributes and roles on descendants
                    const allDescendants = element.querySelectorAll('*');
                    allDescendants.forEach(desc => {
                        const relevantAttributes = Array.from(desc.attributes)
                            .filter(attr => attr.name.startsWith('aria-') || attr.name === 'role');

                        if (relevantAttributes.length > 0) {
                            const tagInfo = `[descendant ${desc.tagName.toLowerCase()}]`;
                            relevantAttributes.forEach(attr => {
                                a11yInfo.push(`${tagInfo} ${attr.name}: "${attr.value}"`);
                            });
                        }
                    });

                    // All ARIA attributes and roles on closest 2 ancestors
                    let ancestor = element.parentElement;
                    let ancestorLevel = 0;
                    while (ancestor && ancestorLevel < 2) {
                        const relevantAttributes = Array.from(ancestor.attributes)
                            .filter(attr => attr.name.startsWith('aria-') || attr.name === 'role');

                        if (relevantAttributes.length > 0) {
                            const tag = ancestor.tagName.toLowerCase();
                            const id = ancestor.id ? `#${ancestor.id}` : '';
                            const cls = ancestor.className ? `.${ancestor.className.split(' ').join('.')}` : '';
                            const ancestorInfo = `[ancestor${ancestorLevel === 0 ? '' : ' (grandparent)'} ${tag}${id}${cls}]`;

                            relevantAttributes.forEach(attr => {
                                a11yInfo.push(`${ancestorInfo} ${attr.name}: "${attr.value}"`);
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

                console.log('Sending element details to panel:', {
                    htmlLength: htmlSnippet.length,
                    parentHtmlLength: parentHtmlSnippet.length,
                    childHtmlLength: childHtmlSnippet.length
                });

                try {
                    chrome.runtime.sendMessage({
                        action: 'ELEMENT_DETAILS',
                        payload: {
                            html: htmlSnippet,
                            parentHtml: parentHtmlSnippet,
                            childHtml: childHtmlSnippet,
                            attributes: nodeAttributes,
                            accessibility: nodeAccessibility,
                            cssProperties: nodeCssProperties,
                            // inlineEvents
                        }
                    });
                } catch (e) {
                    console.error('Error sending element details message:', e);
                }

                const originalStyles = {
                    outline: element.style.outline,
                    outlineOffset: element.style.outlineOffset,
                    position: element.style.position
                };

                element.style.setProperty('outline', '2px solid #f72585', 'important');
                element.style.setProperty('outline-offset', '2px', 'important');
                if (getComputedStyle(element).position === 'static') {
                    element.style.setProperty('position', 'relative', 'important');
                }

                highlightedElements.push({
                    element: element,
                    originalStyles: originalStyles
                });

                const badge = document.createElement('div');
                badge.textContent = 'FOUND';
                badge.style.cssText = `
                    position: absolute;
                    top: 0;
                    right: 0;
                    background-color: #f72585 !important;
                    color: white !important;
                    padding: 2px 6px !important;
                    border-radius: 3px !important;
                    font-size: 10px !important;
                    font-weight: bold !important;
                    z-index: 9999 !important;
                    animation: pulse 1.5s infinite !important;
                    font-family: Arial, sans-serif !important;
                `;

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

                const timeout = setTimeout(() => {
                    if (element.contains(badge)) {
                        element.removeChild(badge);
                    }
                }, HIGHLIGHT_DURATION);

                highlightTimeouts.push(timeout);

                // const inlineEvents = getInlineEventListeners(element);
                // console.log('Inline event listeners:', inlineEvents);

            } catch (e) {
                console.error('Error highlighting element:', e);
            }
        });
    }

    /**
     * Temporarily overrides hidden styles to make an element visible.
     * Stores original styles as data attributes for later restoration.
     */
    function showHiddenElement(element) {
        if (element.hasAttribute('data-nv-original-display')) return; // Already processed

        const computedStyle = window.getComputedStyle(element);

        if (computedStyle.display === 'none') {
            element.setAttribute('data-nv-original-display', computedStyle.display);
            element.style.setProperty('display', 'block', 'important');
        }
        if (computedStyle.visibility === 'hidden') {
            element.setAttribute('data-nv-original-visibility', computedStyle.visibility);
            element.style.setProperty('visibility', 'visible', 'important');
        }
        if (computedStyle.opacity === '0') {
            element.setAttribute('data-nv-original-opacity', computedStyle.opacity);
            element.style.setProperty('opacity', '1', 'important');
        }
    }

    /**
     * Restores the original styles of an element after it was made visible.
     */
    function restoreHiddenElement(element) {
        if (element.hasAttribute('data-nv-original-display')) {
            element.style.display = element.getAttribute('data-nv-original-display');
            element.removeAttribute('data-nv-original-display');
        }
        if (element.hasAttribute('data-nv-original-visibility')) {
            element.style.visibility = element.getAttribute('data-nv-original-visibility');
            element.removeAttribute('data-nv-original-visibility');
        }
        if (element.hasAttribute('data-nv-original-opacity')) {
            element.style.opacity = element.getAttribute('data-nv-original-opacity');
            element.removeAttribute('data-nv-original-opacity');
        }
    }

    /**
     * Clear all highlights
     */
    function clearHighlights() {
        while (highlightTimeouts.length > 0) {
            clearTimeout(highlightTimeouts.pop());
        }

        while (highlightedElements.length > 0) {
            const { element, originalStyles } = highlightedElements.pop();
            try {
                if (element) {
                    element.style.outline = originalStyles.outline;
                    element.style.outlineOffset = originalStyles.outlineOffset;
                    element.style.position = originalStyles.position;

                    restoreHiddenElement(element);

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
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            });
        } catch (e) {
            console.error('Error scrolling to element:', e);
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

    function createStatusPanel() {
        const existingPanel = document.getElementById('node-validator-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'node-validator-panel';
        panel.className = 'node-validator-panel';
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

        applyInlineStyles(panel);
        document.body.appendChild(panel);
        makeDraggable(panel);

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

    function applyInlineStyles(panel) {
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
            transition: all 0.3s ease;
        `;

        const header = panel.querySelector('.panel-header');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(to right, #4776E6, #8E54E9);
            color: white;
            padding: 10px 15px;
            cursor: move;
            user-select: none;
        `;

        const h3 = header.querySelector('h3');
        h3.style.cssText = `
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        `;

        const closeBtn = header.querySelector('.panel-close-btn');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        `;

        const content = panel.querySelector('.panel-content');
        content.style.cssText = `
            padding: 15px;
        `;

        const statusButtons = content.querySelector('.status-buttons');
        statusButtons.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 15px;
        `;

        const buttons = statusButtons.querySelectorAll('.status-btn');
        buttons.forEach(function (btn) {
            btn.style.cssText = `
                padding: 8px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                color: white;
                transition: all 0.2s;
            `;
        });

        document.getElementById('true-positive').style.backgroundColor = '#4CAF50';
        document.getElementById('false-positive').style.backgroundColor = '#FF9800';
        document.getElementById('false-negative').style.backgroundColor = '#F44336';
        document.getElementById('not-found').style.backgroundColor = '#2196F3';
        document.getElementById('not-valid').style.backgroundColor = '#9E9E9E';
        document.getElementById('needs-review').style.backgroundColor = '#673ab7';

        const notesSection = content.querySelector('.notes-section');
        notesSection.style.marginBottom = '15px';

        const notesLabel = notesSection.querySelector('label');
        notesLabel.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        `;

        const textarea = notesSection.querySelector('textarea');
        textarea.style.cssText = `
            width: 100%;
            height: 60px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: vertical;
        `;

        const actions = content.querySelector('.panel-actions');
        actions.style.cssText = `
            display: flex;
            justify-content: flex-end;
        `;

        const nextBtn = actions.querySelector('.primary-btn');
        nextBtn.style.cssText = `
            background-color: #4776E6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        `;
    }

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

    function makeDraggable(element) {
        const header = element.querySelector('.panel-header');
        if (!header) return;

        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_READY' });
})();
