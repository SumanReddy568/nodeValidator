/**
 * AI UI Handler - Manages the AI analysis panel UI interactions
 */
(function () {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function () {
        initializeAIUIHandlers();
        initializeSettingsMenu();
    });

    window.renderAIAnalysisResult = function (result, container) {
        if (!result || !result.result) {
            container.innerHTML = '<p style="color: #d93025;">Analysis failed: No result data received.</p>';
            return;
        }

        const aiResult = result.result;

        // Correctly handle the confidence value, which is a number
        const confidenceValue = aiResult.Confidence ?? null;

        const statusClass = aiResult.status && aiResult.status.toLowerCase() === 'pass' ? 'pass' : 'fail';
        const statusText = aiResult.status || 'N/A';
        const summaryText = aiResult.summary || 'No summary provided.';
        const detailsText = aiResult.details || 'No detailed explanation provided.';
        const suggestionsText = aiResult.suggestions || 'No suggestions provided.';

        container.innerHTML = '';

        const resultDiv = document.createElement('div');
        resultDiv.className = 'ai-result';

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

        // Show confidence if present and valid
        if (confidenceValue !== null && !isNaN(confidenceValue)) {
            const confidenceDiv = document.createElement('div');
            confidenceDiv.className = 'ai-result-confidence';
            const confidenceStrong = document.createElement('strong');
            confidenceStrong.textContent = 'Confidence: ';
            confidenceDiv.appendChild(confidenceStrong);
            confidenceDiv.appendChild(document.createTextNode(`${confidenceValue}%`));
            headerDiv.appendChild(confidenceDiv);
        }

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

        resultDiv.appendChild(headerDiv);
        resultDiv.appendChild(contentDiv);
        container.appendChild(resultDiv);

        // Add metadata section (check aiResult.metadata, result.metadata, or top-level keys)
        let metadata = aiResult.metadata || result.metadata;
        // If not found, check if metadata keys exist directly on aiResult
        if (!metadata && (
            aiResult.responseTime !== undefined ||
            aiResult.inputTokens !== undefined ||
            aiResult.outputTokens !== undefined
        )) {
            metadata = {
                responseTime: aiResult.responseTime,
                inputTokens: aiResult.inputTokens,
                outputTokens: aiResult.outputTokens
            };
        }
        if (metadata && (metadata.responseTime !== undefined || metadata.inputTokens !== undefined || metadata.outputTokens !== undefined)) {
            const metadataDiv = document.createElement('div');
            metadataDiv.className = 'ai-result-metadata';

            const metadataContent = `
                <p><strong>Response Time:</strong> ${metadata.responseTime ?? 'N/A'} ms</p>
                <p><strong>Input Tokens:</strong> ${metadata.inputTokens ?? 'N/A'}</p>
                <p><strong>Output Tokens:</strong> ${metadata.outputTokens ?? 'N/A'}</p>
            `;

            metadataDiv.innerHTML = metadataContent;
            container.appendChild(metadataDiv);
        }

        const aiAnalysisPanel = document.getElementById('aiAnalysisPanel');
        const statusButtonsSection = document.getElementById('statusButtonsSection');

        if (aiAnalysisPanel && statusButtonsSection) {
            expandCollapseManager.expandSection('aiAnalysisPanel');
            setTimeout(function () {
                contentDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    const expandCollapseManager = {
        sections: ['statusButtonsSection', 'aiAnalysisPanel'],

        expandSection: function (sectionId) {
            this.sections.forEach(id => {
                const section = document.getElementById(id);
                if (section && id !== sectionId) {
                    section.classList.add('collapsed');
                }
            });

            const sectionToExpand = document.getElementById(sectionId);
            if (sectionToExpand) {
                sectionToExpand.classList.remove('collapsed');
                sectionToExpand.style.display = 'block';

                const contentArea = sectionToExpand.querySelector('.collapsible-content');
                if (contentArea) {
                    contentArea.scrollTop = 0;
                    if (sectionId === 'statusButtonsSection') {
                        const commentsField = document.querySelector('.comments-field');
                        if (commentsField) {
                            setTimeout(() => {
                                const contentRect = contentArea.getBoundingClientRect();
                                const commentsRect = commentsField.getBoundingClientRect();

                                if (commentsRect.bottom > contentRect.bottom) {
                                    contentArea.scrollBy({
                                        top: commentsRect.bottom - contentRect.bottom + 20,
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
        const aiAnalysisPanel = document.getElementById('aiAnalysisPanel');
        const aiAnalysisHeader = document.getElementById('aiAnalysisHeader');
        const aiCollapseBtn = document.getElementById('aiCollapseBtn');

        const statusButtonsSection = document.getElementById('statusButtonsSection');
        const statusButtonsHeader = document.getElementById('statusButtonsHeader');
        const statusCollapseBtn = document.getElementById('statusCollapseBtn');

        if (aiAnalysisHeader && aiAnalysisPanel) {
            aiAnalysisHeader.addEventListener('click', function (e) {
                if (e.target.closest('.ai-rule-selector-inline') ||
                    e.target.closest('#analyzeWithAI')) {
                    return;
                }
                if (aiAnalysisPanel.classList.contains('collapsed')) {
                    expandCollapseManager.expandSection('aiAnalysisPanel');
                } else {
                    aiAnalysisPanel.classList.add('collapsed');
                }
            });
        }

        if (aiCollapseBtn) {
            aiCollapseBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!aiAnalysisPanel.classList.contains('collapsed')) {
                    aiAnalysisPanel.classList.add('collapsed');
                } else {
                    expandCollapseManager.expandSection('aiAnalysisPanel');
                }
            });
        }

        if (statusButtonsHeader && statusButtonsSection) {
            statusButtonsHeader.addEventListener('click', function (e) {
                if (e.target.closest('.controls-header-buttons')) {
                    return;
                }
                if (statusButtonsSection.classList.contains('collapsed')) {
                    expandCollapseManager.expandSection('statusButtonsSection');
                } else {
                    statusButtonsSection.classList.add('collapsed');
                }
            });
        }

        if (statusCollapseBtn) {
            statusCollapseBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!statusButtonsSection.classList.contains('collapsed')) {
                    statusButtonsSection.classList.add('collapsed');
                } else {
                    expandCollapseManager.expandSection('statusButtonsSection');
                }
            });
        }

        function initializeAIPanel() {
            const analyzeWithAI = document.getElementById('analyzeWithAI');
            const accessibilityRuleSelect = document.getElementById('accessibilityRuleSelect');

            if (analyzeWithAI) {
                analyzeWithAI.addEventListener('click', function (e) {
                    e.stopPropagation();
                    expandCollapseManager.expandSection('aiAnalysisPanel');
                    if (aiAnalysisPanel) {
                        setTimeout(function () {
                            aiAnalysisPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                    }
                });
            }

            if (accessibilityRuleSelect) {
                accessibilityRuleSelect.addEventListener('change', function (e) {
                    e.stopPropagation();
                    if (analyzeWithAI) {
                        analyzeWithAI.disabled = !this.value;
                    }
                });
            }
        }

        initializeAIPanel();

        setTimeout(() => {
            expandCollapseManager.expandSection('statusButtonsSection');
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
        }, 200);
    }

    function initializeSettingsMenu() {
        const settingsMenuButton = document.getElementById('settingsMenuButton');
        const settingsMenu = document.getElementById('settingsMenu');

        if (!settingsMenuButton || !settingsMenu) {
            console.warn('Settings menu elements not found');
            return;
        }

        settingsMenuButton.addEventListener('click', function (e) {
            e.stopPropagation();
            settingsMenu.classList.toggle('visible');
        });

        document.addEventListener('click', function (e) {
            if (settingsMenu.classList.contains('visible') &&
                !settingsMenu.contains(e.target) &&
                e.target !== settingsMenuButton) {
                settingsMenu.classList.remove('visible');
            }
        });

        settingsMenu.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }
})();
