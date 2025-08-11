/**
 * AI UI Handler - Manages the AI analysis panel UI interactions
 */
(function () {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function () {
        initializeAIUIHandlers();
    });

    // Define the global renderer function that panel.js will use
    window.renderAIAnalysisResult = function (result, container) {
        if (!result) {
            container.innerHTML = '<p style="color: #d93025;">Analysis failed: No result data received.</p>';
            return;
        }

        const statusClass = result.status && result.status.toLowerCase() === 'pass' ? 'pass' : 'fail';
        const statusText = result.status || 'N/A';
        const summaryText = result.summary || 'No summary provided.';
        const detailsText = result.details || 'No detailed explanation provided.';
        const suggestionsText = result.suggestions || 'No suggestions provided.';

        // Clear the container first
        container.innerHTML = '';

        // Create result elements
        const resultDiv = document.createElement('div');
        resultDiv.className = 'ai-result';

        // Create header with click handler
        const headerDiv = document.createElement('div');
        headerDiv.className = 'ai-result-header';

        const statusSpan = document.createElement('span');
        statusSpan.className = `ai-result-status ${statusClass}`;
        statusSpan.textContent = statusText;

        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'ai-result-summary';
        const summaryStrong = document.createElement('strong');
        summaryStrong.textContent = 'Summary: ';
        summaryDiv.appendChild(summaryStrong);
        summaryDiv.appendChild(document.createTextNode(summaryText));

        headerDiv.appendChild(statusSpan);
        headerDiv.appendChild(summaryDiv);

        // Create content section that will be scrollable
        const contentDiv = document.createElement('div');
        contentDiv.className = 'ai-result-content';

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'ai-result-details';
        const detailsStrong = document.createElement('strong');
        detailsStrong.textContent = 'Details: ';
        detailsDiv.appendChild(detailsStrong);
        detailsDiv.appendChild(document.createTextNode(detailsText));

        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'ai-result-suggestions';
        const suggestionsStrong = document.createElement('strong');
        suggestionsStrong.textContent = 'Suggestions: ';
        suggestionsDiv.appendChild(suggestionsStrong);
        suggestionsDiv.appendChild(document.createTextNode(suggestionsText));

        contentDiv.appendChild(detailsDiv);
        contentDiv.appendChild(suggestionsDiv);

        // Add toggle functionality for the content area
        headerDiv.addEventListener('click', function () {
            this.classList.toggle('collapsed');
            // No need to toggle the content div visibility as we're using CSS for that
        });

        resultDiv.appendChild(headerDiv);
        resultDiv.appendChild(contentDiv);
        container.appendChild(resultDiv);

        // Auto-expand the AI panel and collapse status buttons
        const aiAnalysisPanel = document.getElementById('aiAnalysisPanel');
        const statusButtonsSection = document.getElementById('statusButtonsSection');

        if (aiAnalysisPanel && statusButtonsSection) {
            // Expand AI panel and collapse status buttons
            expandCollapseManager.expandSection('aiAnalysisPanel');

            // Scroll to the AI analysis panel to ensure it's visible
            setTimeout(function () {
                contentDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    // Manager to handle exclusive expand/collapse behavior
    const expandCollapseManager = {
        sections: ['statusButtonsSection', 'aiAnalysisPanel'],

        expandSection: function (sectionId) {
            // Collapse all sections first
            this.sections.forEach(id => {
                const section = document.getElementById(id);
                if (section && id !== sectionId) {
                    section.classList.add('collapsed');
                }
            });

            // Then expand the requested section
            const sectionToExpand = document.getElementById(sectionId);
            if (sectionToExpand) {
                sectionToExpand.classList.remove('collapsed');
                sectionToExpand.style.display = 'block';

                // Ensure content area is properly visible when expanded
                const contentArea = sectionToExpand.querySelector('.collapsible-content');
                if (contentArea) {
                    // Reset scroll position when expanding
                    contentArea.scrollTop = 0;

                    // Ensure any special elements are visible
                    if (sectionId === 'statusButtonsSection') {
                        const commentsField = document.querySelector('.comments-field');
                        if (commentsField) {
                            // Wait a bit for layout to update
                            setTimeout(() => {
                                // Make sure comments are visible by scrolling content area if needed
                                const contentRect = contentArea.getBoundingClientRect();
                                const commentsRect = commentsField.getBoundingClientRect();

                                if (commentsRect.bottom > contentRect.bottom) {
                                    contentArea.scrollBy({
                                        top: commentsRect.bottom - contentRect.bottom + 20, // Extra 20px padding
                                        behavior: 'smooth'
                                    });
                                }
                            }, 100);
                        }
                    }
                }
            }
        }
    };

    function initializeAIUIHandlers() {
        // Setup for AI analysis panel collapse/expand
        const aiAnalysisPanel = document.getElementById('aiAnalysisPanel');
        const aiAnalysisHeader = document.getElementById('aiAnalysisHeader');
        const aiCollapseBtn = document.getElementById('aiCollapseBtn');

        // Setup for status buttons section collapse/expand
        const statusButtonsSection = document.getElementById('statusButtonsSection');
        const statusButtonsHeader = document.getElementById('statusButtonsHeader');
        const statusCollapseBtn = document.getElementById('statusCollapseBtn');

        if (aiAnalysisHeader && aiAnalysisPanel) {
            aiAnalysisHeader.addEventListener('click', function (e) {
                // Don't collapse when clicking on the select or analyze button
                if (e.target.closest('.ai-rule-selector-inline') ||
                    e.target.closest('#analyzeWithAI')) {
                    return;
                }

                // If it's already collapsed, expand it and collapse the other
                if (aiAnalysisPanel.classList.contains('collapsed')) {
                    expandCollapseManager.expandSection('aiAnalysisPanel');
                } else {
                    // If it's expanded, just collapse it
                    aiAnalysisPanel.classList.add('collapsed');
                }
            });
        }

        if (aiCollapseBtn) {
            aiCollapseBtn.addEventListener('click', function (e) {
                e.stopPropagation(); // Prevent triggering the header click

                // If it's expanded, collapse it
                if (!aiAnalysisPanel.classList.contains('collapsed')) {
                    aiAnalysisPanel.classList.add('collapsed');
                } else {
                    // If it's collapsed, expand it and collapse the other
                    expandCollapseManager.expandSection('aiAnalysisPanel');
                }
            });
        }

        if (statusButtonsHeader && statusButtonsSection) {
            statusButtonsHeader.addEventListener('click', function (e) {
                // Don't collapse when clicking navigation buttons
                if (e.target.closest('.controls-header-buttons')) {
                    return;
                }

                // If it's already collapsed, expand it and collapse the other
                if (statusButtonsSection.classList.contains('collapsed')) {
                    expandCollapseManager.expandSection('statusButtonsSection');
                } else {
                    // If it's expanded, just collapse it
                    statusButtonsSection.classList.add('collapsed');
                }
            });
        }

        if (statusCollapseBtn) {
            statusCollapseBtn.addEventListener('click', function (e) {
                e.stopPropagation(); // Prevent triggering the header click

                // If it's expanded, collapse it
                if (!statusButtonsSection.classList.contains('collapsed')) {
                    statusButtonsSection.classList.add('collapsed');
                } else {
                    // If it's collapsed, expand it and collapse the other
                    expandCollapseManager.expandSection('statusButtonsSection');
                }
            });
        }

        // Initialize AI panel behaviors
        function initializeAIPanel() {
            const analyzeWithAI = document.getElementById('analyzeWithAI');
            const accessibilityRuleSelect = document.getElementById('accessibilityRuleSelect');

            // Make sure AI panel is visible when clicking analyze
            if (analyzeWithAI) {
                analyzeWithAI.addEventListener('click', function (e) {
                    e.stopPropagation(); // Prevent collapsing the AI panel

                    // Expand AI panel and collapse status section
                    expandCollapseManager.expandSection('aiAnalysisPanel');

                    // Scroll to make the AI panel visible
                    if (aiAnalysisPanel) {
                        setTimeout(function () {
                            aiAnalysisPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                    }
                });
            }

            // Update button state based on selection
            if (accessibilityRuleSelect) {
                accessibilityRuleSelect.addEventListener('change', function (e) {
                    e.stopPropagation(); // Prevent collapsing the AI panel

                    if (analyzeWithAI) {
                        analyzeWithAI.disabled = !this.value;
                    }
                });
            }
        }

        // Initialize AI panel behaviors
        initializeAIPanel();

        // Ensure status section is expanded by default
        setTimeout(() => {
            expandCollapseManager.expandSection('statusButtonsSection');

            // Make sure comments field is visible by default
            const statusContent = document.getElementById('statusButtonsContent');
            const commentsField = document.querySelector('.comments-field');

            if (statusContent && commentsField) {
                const statusContentRect = statusContent.getBoundingClientRect();
                const commentsRect = commentsField.getBoundingClientRect();

                if (commentsRect.bottom > statusContentRect.bottom) {
                    statusContent.scrollBy({
                        top: commentsRect.bottom - statusContentRect.bottom + 20,
                        behavior: 'smooth'
                    });
                }
            }
        }, 200); // Slightly longer delay to ensure DOM is ready
    }
})();
