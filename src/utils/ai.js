/**
 * AI Analysis Module
 * * Provides accessibility analysis capabilities using AI (Gemini)
 */

// Use an IIFE to prevent global variable collisions
(function () {
    // Check if AIAnalyzer is already defined
    if (window.AIAnalyzer) {
        console.warn('AIAnalyzer already defined, skipping redefinition');
        return;
    }

    // Define the AIAnalyzer class
    class AIAnalyzer {
        constructor() {
            this.apiKey = null;
            this.rules = [];
            this.currentRule = null;
            this.isAnalyzing = false;
        }

        /**
         * Initialize the AI analyzer
         */
        async init() {
            console.log('AI Analyzer initialized');
            // Load API key and rules from storage
            await this.loadSettings();
        }

        /**
         * Load saved settings from storage
         */
        async loadSettings() {
            try {
                const storage = await chrome.storage.local.get(['geminiApiKey', 'accessibilityRules']);
                if (storage.geminiApiKey) {
                    this.apiKey = storage.geminiApiKey;
                }
                if (storage.accessibilityRules) {
                    this.rules = storage.accessibilityRules;
                } else {
                    // Set some default rules if none are found
                    this.rules = this.getDefaultRules();
                    await this.saveRules(this.rules);
                }
                return {
                    success: true,
                    rules: this.rules
                };
            } catch (error) {
                console.error('Error loading AI analyzer settings:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Get default accessibility rules
         */
        getDefaultRules() {
            return [{
                id: 'wcag-1.1.1',
                name: 'Non-text Content',
                description: 'All non-text content has a text alternative that serves the equivalent purpose.',
                details: 'Images must have appropriate alt text. UI controls should have descriptive labels.',
                criteria: [
                    'Images have alt attributes',
                    'Complex images have detailed descriptions',
                    'Buttons and controls have descriptive text',
                    'Icon buttons have accessible names'
                ]
            }, {
                id: 'wcag-1.3.1',
                name: 'Info and Relationships',
                description: 'Information, structure, and relationships conveyed through presentation can be programmatically determined.',
                details: 'Use proper semantic HTML. Associate labels with form controls. Use correct heading hierarchy.',
                criteria: [
                    'Proper semantic HTML is used',
                    'Labels are associated with form controls',
                    'Tables have proper headers',
                    'Correct heading hierarchy is used'
                ]
            }, {
                id: 'wcag-2.4.7',
                name: 'Focus Visible',
                description: 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.',
                details: 'Elements must have a visible focus state. Focus states should be obvious and clear.',
                criteria: [
                    'Interactive elements have visible focus states',
                    'Focus indicators are clearly visible',
                    'Focus styles contrast sufficiently with the background'
                ]
            }];
        }

        /**
         * Get API key from storage
         */
        getStoredApiKey() {
            return ''; // Will be loaded from storage during init
        }

        /**
         * Get rules from storage
         */
        getStoredRules() {
            return []; // Will be loaded from storage during init
        }

        /**
         * Save API key to storage
         */
        async saveApiKey(apiKey) {
            try {
                await chrome.storage.local.set({
                    geminiApiKey: apiKey
                });
                this.apiKey = apiKey;
                return {
                    success: true
                };
            } catch (error) {
                console.error('Error saving API key:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Save rules to storage
         */
        async saveRules(rules) {
            try {
                await chrome.storage.local.set({
                    accessibilityRules: rules
                });
                this.rules = rules;
                return {
                    success: true
                };
            } catch (error) {
                console.error('Error saving rules:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Add a new rule
         */
        async addRule(rule) {
            try {
                const newRule = {
                    id: rule.id || `rule-${Date.now()}`,
                    name: rule.name,
                    description: rule.description,
                    details: rule.details,
                    criteria: rule.criteria || []
                };

                const rules = [...this.rules, newRule];
                await this.saveRules(rules);
                return {
                    success: true,
                    rules
                };
            } catch (error) {
                console.error('Error adding rule:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Update an existing rule
         */
        async updateRule(ruleId, updatedRule) {
            try {
                const rules = this.rules.map(rule =>
                    rule.id === ruleId ? {
                        ...rule,
                        ...updatedRule
                    } : rule
                );
                await this.saveRules(rules);
                return {
                    success: true,
                    rules
                };
            } catch (error) {
                console.error('Error updating rule:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Delete a rule
         */
        async deleteRule(ruleId) {
            try {
                const rules = this.rules.filter(rule => rule.id !== ruleId);
                await this.saveRules(rules);
                return {
                    success: true,
                    rules
                };
            } catch (error) {
                console.error('Error deleting rule:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Set the current rule for analysis
         */
        setCurrentRule(ruleId) {
            this.currentRule = this.rules.find(rule => rule.id === ruleId) || null;
            return this.currentRule;
        }

        /**
         * Generate an improved prompt for Gemini based on element data and selected rule
         */
        generatePrompt(elementData, rule) {
            const promptText = `
                You are a highly specialized and precise accessibility expert. Your task is to perform a technical evaluation of a single HTML element against a specific WCAG guideline, providing a response in a strict, predictable JSON format.

                # ANALYSIS CONTEXT
                ---
                **WCAG Rule:** ${rule.id} - ${rule.name}
                **Rule Description:** ${rule.description}
                **Detailed Criteria:**
                ${rule.criteria.map((c, index) => `${index + 1}. ${c}`).join('\n')}

                # PROVIDED DATA
                ---
                **1. Target HTML Element:**
                \`\`\`html
                ${elementData.html}
                \`\`\`

                **2. Parent HTML Element (for structural context):**
                \`\`\`html
                ${elementData.parentHtml}
                \`\`\`

                **3. Child HTML Elements (for nested issues):**
                \`\`\`html
                ${elementData.childHtml}
                \`\`\`

                **4. Full Page Source (for broader context):**
                \`\`\`html
                ${elementData.pageSource}
                \`\`\`

                **5. Computed Accessibility Properties (e.g., ARIA attributes, computed roles):**
                ${elementData.accessibility}

                **6. Computed CSS Properties (e.g., color, visibility):**
                ${elementData.cssProperties}

                # INSTRUCTIONS
                ---
                Your analysis must be methodical and precise.

                1.  **Evaluate:** Determine if the "Target HTML Element" meets ALL of the "Detailed Criteria" for the specified WCAG Rule. Use the provided context (parent, children, and full page source) to inform your decision.
                
                2.  **Pass/Fail:** Assign a final status of "PASS" or "FAIL".
                    -   **PASS:** The element fully meets all specified criteria.
                    -   **FAIL:** The element fails to meet one or more specified criteria.

                3.  **Summary:** Provide a concise, 1-2 sentence summary of your finding.

                4.  **Details:** Write a detailed explanation.
                    -   If **FAIL**, explain which specific criteria were not met and provide a technical justification. Reference the code or attributes that are problematic.
                    -   If **PASS**, explain why it passes and mention any potential edge cases or a brief note on its robustness.

                5.  **Suggestions:** Provide a concrete, actionable code snippet to fix the identified issues.
                    -   If **FAIL**, provide a specific code example showing how to correct the problem.
                    -   If **PASS**, provide a code snippet that demonstrates a best-practice or shows how the current code is correct.

                # RESPONSE FORMAT
                ---
                The entire response MUST be a single, valid JSON object and nothing else. Do not include any pre-text, post-text, markdown, or code block delimiters outside of the JSON. The JSON keys and values must be exactly as specified below.
                IMPORTANT: Include a "Confidence" field (number between 0 and 100) representing your confidence in the PASS/FAIL decision.
                \`\`\`json
                {
                "status": "PASS" or "FAIL",
                "Confidence": "number (0-100)"
                "summary": "string",
                "details": "string",
                "suggestions": "string"
                }
                \`\`\`
                `;
            // console.log('Generated prompt:', promptText);
            return promptText;
        }

        /**
         * Analyze element against selected accessibility rule
         */
        async analyzeElement(elementData) {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'API key not set. Please set your Gemini API key in settings.'
                };
            }

            if (!this.currentRule) {
                return {
                    success: false,
                    error: 'No accessibility rule selected. Please select a rule first.'
                };
            }

            try {
                this.isAnalyzing = true;
                const prompt = this.generatePrompt(elementData, this.currentRule);
                console.log('Calling Gemini API...');
                const {
                    rawResponse,
                    responseTime,
                    tokenCount
                } = await this.callGeminiAPI(prompt);
                this.isAnalyzing = false;
                console.log('Gemini API response received');
                // console.log('Gemini raw response:', rawResponse);
                let result;
                const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    let jsonString = jsonMatch[0];
                    // console.log('Extracted JSON string:', jsonString);

                    try {
                        result = JSON.parse(jsonString);
                        console.log('Successfully parsed JSON:', result);
                    } catch (e) {
                        console.warn('Direct JSON parse failed. Attempting to repair.', e);
                        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

                        try {
                            result = JSON.parse(jsonString);
                            console.log('Successfully repaired and parsed JSON:', result);
                        } catch (e2) {
                            console.error('Failed to parse AI response JSON even after repair:', e2);
                            result = {
                                status: 'ERROR',
                                summary: 'Failed to parse AI response',
                                details: `The AI returned a response that could not be parsed as valid JSON.
                                            Raw Response: ${rawResponse}`,
                                // Return the raw response for debugging
                                suggestions: `Raw Response: ${rawResponse}`
                            };
                        }
                    }
                } else {
                    console.error('No JSON object found in AI response.');
                    result = {
                        status: 'ERROR',
                        summary: 'Unexpected AI response format',
                        details: `The AI did not return a properly formatted JSON response.
                                    Raw Response: ${rawResponse}`,
                        suggestions: `Raw Response: ${rawResponse}`
                    };
                }

                // Append metadata to the result object
                result.metadata = {
                    responseTime: responseTime,
                    inputTokens: tokenCount.input,
                    outputTokens: tokenCount.output,
                };


                return {
                    success: true,
                    ruleName: this.currentRule.name,
                    ruleId: this.currentRule.id,
                    result: result
                };
            } catch (error) {
                this.isAnalyzing = false;
                console.error('Error analyzing element:', error);
                return {
                    success: false,
                    error: error.message || 'Unknown error during analysis'
                };
            }
        }

        /**
         * Call Gemini API
         */
        async callGeminiAPI(prompt) {
            try {
                const startTime = performance.now();
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

                const requestBody = {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2048,
                        topP: 0.8,
                        topK: 40
                    }
                };

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-goog-api-key': this.apiKey
                    },
                    body: JSON.stringify(requestBody)
                });

                const endTime = performance.now();
                const responseTime = (endTime - startTime).toFixed(2);

                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
                }

                const data = await response.json();

                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
                    throw new Error('Unexpected API response format: missing candidate text.');
                }

                // Extract token usage
                const tokenCount = {
                    input: data.usageMetadata?.promptTokenCount || 0,
                    output: data.usageMetadata?.candidatesTokenCount || 0,
                };

                return {
                    rawResponse: data.candidates[0].content.parts[0].text,
                    responseTime: responseTime,
                    tokenCount: tokenCount
                };
            } catch (error) {
                console.error('Gemini API call failed:', error);
                throw new Error(`Gemini API call failed: ${error.message}`);
            }
        }
    }
    window.aiAnalyzer = new AIAnalyzer();
})();
