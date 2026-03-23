/**
 * AI Analysis Module
 * * Provides accessibility analysis capabilities using AI (Gemini)
 */
(function () {
    // Check if AIAnalyzer is already defined
    if (window.AIAnalyzer) {
        console.warn('AIAnalyzer already defined, skipping redefinition');
        return;
    }

    // Define the AIAnalyzer class
    class AIAnalyzer {
        constructor() {
            this.providers = {
                gemini: {
                    name: 'Google Gemini',
                    apiKey: null,
                    models: ['gemini-2.5-flash', 'gemini-2.5-pro']
                },
                vertex: {
                    name: 'Google Vertex AI',
                    projectId: null,
                    location: 'us-central1',
                    apiKey: null,
                    models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini']
                }
            };
            this.currentProvider = 'gemini';
            this.currentModel = 'gemini-2.5-flash';
            this.rules = [];
            this.currentRule = null;
            this.isAnalyzing = false;
        }

        /**
         * Initialize the AI analyzer
         */
        async init() {
            console.log('AI Analyzer initialized');
            await this.loadSettings();
        }

        /**
         * Load saved settings from storage
         */
        async loadSettings() {
            try {
                const storage = await chrome.storage.local.get([
                    'geminiApiKey', 
                    'vertexProjectId',
                    'vertexLocation', 
                    'vertexServiceAccount',
                    'openaiApiKey',
                    'aiProvider',
                    'aiModel',
                    'accessibilityRules'
                ]);
                
                if (storage.openaiApiKey) {
                    this.providers.openai.apiKey = storage.openaiApiKey;
                }
                
                if (storage.geminiApiKey) {
                    this.providers.gemini.apiKey = storage.geminiApiKey;
                }
                if (storage.vertexProjectId) {
                    this.providers.vertex.projectId = storage.vertexProjectId;
                }
                if (storage.vertexLocation) {
                    this.providers.vertex.location = storage.vertexLocation;
                }
                if (storage.vertexServiceAccount) {
                    this.providers.vertex.apiKey = storage.vertexServiceAccount;
                }
                
                // Load current provider and model
                this.currentProvider = storage.aiProvider || 'gemini';
                this.currentModel = storage.aiModel || this.providers[this.currentProvider].models[0];
                
                if (storage.accessibilityRules) {
                    this.rules = storage.accessibilityRules.filter(r => r.id === 'role-required');
                    if (this.rules.length === 0) {
                        this.rules = this.getDefaultRules();
                        await this.saveRules(this.rules);
                    }
                } else {
                    this.rules = this.getDefaultRules();
                    await this.saveRules(this.rules);
                }

                if (this.rules.length > 0) {
                    this.currentRule = this.rules[0];
                }

                return {
                    success: true,
                    rules: this.rules,
                    provider: this.currentProvider,
                    model: this.currentModel
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
                id: 'role-required',
                name: 'Role Required'
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
                this.providers.gemini.apiKey = apiKey;
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
         * Save Vertex AI settings to storage
         */
        async saveVertexSettings(projectId, location, serviceAccountKey) {
            try {
                await chrome.storage.local.set({
                    vertexProjectId: projectId,
                    vertexLocation: location || 'us-central1',
                    vertexServiceAccount: serviceAccountKey
                });
                this.providers.vertex.projectId = projectId;
                this.providers.vertex.location = location || 'us-central1';
                this.providers.vertex.apiKey = serviceAccountKey;
                return {
                    success: true
                };
            } catch (error) {
                console.error('Error saving Vertex AI settings:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Set current AI provider
         */
        async setProvider(provider, model = null) {
            if (!this.providers[provider]) {
                throw new Error(`Unknown provider: ${provider}`);
            }
            
            this.currentProvider = provider;
            this.currentModel = model || this.providers[provider].models[0];
            
            try {
                await chrome.storage.local.set({
                    aiProvider: this.currentProvider,
                    aiModel: this.currentModel
                });
                return {
                    success: true,
                    provider: this.currentProvider,
                    model: this.currentModel
                };
            } catch (error) {
                console.error('Error saving provider settings:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Get available providers
         */
        getProviders() {
            return Object.keys(this.providers).map(key => ({
                id: key,
                name: this.providers[key].name,
                models: this.providers[key].models,
                configured: this.isProviderConfigured(key)
            }));
        }

        /**
         * Check if a provider is properly configured
         */
        isProviderConfigured(provider) {
            const prov = this.providers[provider];
            if (!prov) return false;
            
            switch (provider) {
                case 'gemini':
                    return !!prov.apiKey;
                case 'vertex':
                    return !!(prov.projectId && prov.apiKey);
                default:
                    return false;
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
        async analyzeElement(elementData, options = {}) {
            if (!this.isProviderConfigured(this.currentProvider)) {
                return {
                    success: false,
                    error: `${this.providers[this.currentProvider].name} is not properly configured. Please set up your API credentials in settings.`
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
                let prompt;
                if (this.currentRule.id === 'role-required' && window.generateRoleRequiredPrompt) {
                    prompt = window.generateRoleRequiredPrompt(elementData);
                } else {
                    prompt = this.generatePrompt(elementData, this.currentRule);
                }
                console.log(`Calling ${this.providers[this.currentProvider].name} API...`);
                
                let apiResponse;
                if (this.currentProvider === 'gemini') {
                    apiResponse = await this.callGeminiAPI(prompt);
                } else if (this.currentProvider === 'vertex') {
                    apiResponse = await this.callVertexAPI(prompt);
                } else if (this.currentProvider === 'openai') {
                    apiResponse = await this.callOpenAIAPI(prompt);
                } else {
                    throw new Error(`Unsupported provider: ${this.currentProvider}`);
                }
                
                const {
                    rawResponse,
                    responseTime,
                    tokenCount
                } = apiResponse;
                
                this.isAnalyzing = false;
                console.log(`${this.providers[this.currentProvider].name} API response received`);
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
                    provider: this.currentProvider,
                    model: this.currentModel,
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
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.currentModel}:generateContent`;

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
                        'X-goog-api-key': this.providers.gemini.apiKey
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

        /**
         * Call Vertex AI API
         */
        async callVertexAPI(prompt) {
            try {
                const startTime = performance.now();
                const apiUrl = `https://${this.providers.vertex.location}-aiplatform.googleapis.com/v1/projects/${this.providers.vertex.projectId}/locations/${this.providers.vertex.location}/publishers/google/models/${this.currentModel}:generateContent`;
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
                        'X-goog-api-key': this.providers.vertex.apiKey
                    },
                    body: JSON.stringify(requestBody)
                });

                const endTime = performance.now();
                const responseTime = (endTime - startTime).toFixed(2);

                if (!response.ok) {
                    throw new Error(`Vertex API request failed with status ${response.status}: ${await response.text()}`);
                }

                const data = await response.json();

                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
                    throw new Error('Unexpected Vertex API response format: missing candidate text.');
                }
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
                console.error('Vertex AI API call failed:', error);
                throw new Error(`Vertex AI API call failed: ${error.message}`);
            }
        }

        /**
         * Call OpenAI API
         */
        async callOpenAIAPI(prompt) {
            try {
                const startTime = performance.now();
                const apiUrl = 'https://api.openai.com/v1/chat/completions';

                const requestBody = {
                    model: this.currentModel,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.2,
                    max_tokens: 2048
                };

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.providers.openai.apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });

                const endTime = performance.now();
                const responseTime = (endTime - startTime).toFixed(2);

                if (!response.ok) {
                    throw new Error(`OpenAI API request failed with status ${response.status}: ${await response.text()}`);
                }

                const data = await response.json();

                if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                    throw new Error('Unexpected OpenAI API response format: missing candidate text.');
                }

                const tokenCount = {
                    input: data.usage?.prompt_tokens || 0,
                    output: data.usage?.completion_tokens || 0
                };

                return {
                    rawResponse: data.choices[0].message.content,
                    responseTime: responseTime,
                    tokenCount: tokenCount
                };
            } catch (error) {
                console.error('OpenAI API call failed:', error);
                throw new Error(`OpenAI API call failed: ${error.message}`);
            }
        }
    }
    window.aiAnalyzer = new AIAnalyzer();
})();
