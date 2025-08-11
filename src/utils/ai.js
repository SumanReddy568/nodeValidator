/**
 * AI Analysis Module
 * 
 * Provides accessibility analysis capabilities using AI (Gemini)
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
                return { success: true, rules: this.rules };
            } catch (error) {
                console.error('Error loading AI analyzer settings:', error);
                return { success: false, error: error.message };
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
         * Generate prompt for Gemini based on element data and selected rule
         */
        generatePrompt(elementData, rule) {
            const promptText = `
You are an accessibility expert tasked with evaluating whether an HTML element complies with WCAG guidelines.

RULE TO EVALUATE: ${rule.id} - ${rule.name}
RULE DESCRIPTION: ${rule.description}
RULE DETAILS: ${rule.details}
RULE CRITERIA:
${rule.criteria.map(c => '- ' + c).join('\n')}

ELEMENT DATA:
1. HTML: 
${elementData.html}

2. ACCESSIBILITY PROPERTIES:
${elementData.accessibility}

3. CSS PROPERTIES:
${elementData.cssProperties}

4. NODE ATTRIBUTES:
${elementData.attributes}

INSTRUCTIONS:
1. Analyze if the element complies with the specified accessibility rule.
2. Determine a PASS/FAIL status based on your analysis.
3. If FAIL, explain specifically why it fails and what needs to be fixed.
4. If PASS, explain why it passes and any potential edge cases to be aware of.
5. Provide specific code suggestions for improvement if needed.

FORMAT YOUR RESPONSE IN THIS JSON STRUCTURE:
{
  "status": "PASS" or "FAIL",
  "summary": "Brief summary of the evaluation (1-2 sentences)",
  "details": "Detailed explanation of the evaluation",
  "suggestions": "Specific code suggestions for improvement if needed"
}

CRITICAL: The entire response MUST be a single, valid JSON object, and nothing else. Do not include any pre-text, post-text, or markdown.
`;
            console.log('Generated prompt:', promptText);
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
                const rawResponse = await this.callGeminiAPI(prompt);
                this.isAnalyzing = false;
                console.log('Gemini raw response:', rawResponse);
                let result;
                const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    let jsonString = jsonMatch[0];
                    console.log('Extracted JSON string:', jsonString);

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
                                suggestions: `Raw Response: ${rawResponse}` // Return the raw response for debugging
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

                console.log('API Request Body:', JSON.stringify(requestBody, null, 2));

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-goog-api-key': this.apiKey
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
                }

                const data = await response.json();
                console.log('API Raw Data:', data);

                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
                    throw new Error('Unexpected API response format: missing candidate text.');
                }

                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                console.error('Gemini API call failed:', error);
                throw new Error(`Gemini API call failed: ${error.message}`);
            }
        }
    }

    // Expose the AIAnalyzer globally
    window.aiAnalyzer = new AIAnalyzer();
})();


