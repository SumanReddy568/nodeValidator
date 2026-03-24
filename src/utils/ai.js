/**
 * AI Analysis Module
 * * Provides accessibility analysis capabilities using AI (Gemini)
 */
(function () {
  // Check if AIAnalyzer is already defined
  if (window.AIAnalyzer) {
    console.warn("AIAnalyzer already defined, skipping redefinition");
    return;
  }

  // Define the AIAnalyzer class
  class AIAnalyzer {
    constructor() {
      this.providers = {
        gemini: {
          name: "Google Gemini",
          apiKey: null,
          models: ["gemini-2.5-flash", "gemini-2.5-pro"],
        },
        vertex: {
          name: "Google Vertex AI",
          projectId: null,
          location: "us-central1",
          credentials: null,
          accessToken: null,
          tokenExpiry: null,
          models: ["gemini-2.5-flash", "gemini-2.5-pro"],
        },
        openai: {
          name: "OpenAI",
          apiKey: null,
          models: ["gpt-4o", "gpt-4o-mini", "o1-preview", "o1-mini"],
        },
      };
      this.currentProvider = "gemini";
      this.currentModel = "gemini-2.5-flash";
      this.rules = [];
      this.currentRule = null;
      this.isAnalyzing = false;
    }

    /**
     * Initialize the AI analyzer
     */
    async init() {
      console.log("AI Analyzer initialized");
      await this.loadSettings();
    }

    /**
     * Load saved settings from storage
     */
    async loadSettings() {
      try {
        const storage = await chrome.storage.local.get([
          "geminiApiKey",
          "vertexProjectId",
          "vertexLocation",
          "vertexServiceAccount",
          "vertexCredentials",
          "openaiApiKey",
          "aiProvider",
          "aiModel",
          "accessibilityRules",
        ]);

        if (storage.openaiApiKey && this.providers.openai) {
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
        if (storage.vertexCredentials) {
          this.providers.vertex.credentials = JSON.parse(storage.vertexCredentials);
        }

        // Load current provider and model
        this.currentProvider = this.providers[storage.aiProvider]
          ? storage.aiProvider
          : "gemini";
        this.currentModel =
          storage.aiModel || this.providers[this.currentProvider].models[0];

        if (
          storage.accessibilityRules &&
          storage.accessibilityRules.length > 0
        ) {
          this.rules = storage.accessibilityRules;
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
          model: this.currentModel,
        };
      } catch (error) {
        console.error("Error loading AI analyzer settings:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    /**
     * Get default accessibility rules
     */
    getDefaultRules() {
      return [
        {
          id: "role-required",
          name: "Role Required",
        },
        {
          id: "keyboard-interactive",
          name: "Keyboard Interactivity",
        },
        {
          id: "accessible-name",
          name: "Accessible Name",
        },
      ];
    }

    /**
     * Get API key from storage
     */
    getStoredApiKey() {
      return ""; // Will be loaded from storage during init
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
          geminiApiKey: apiKey,
        });
        this.providers.gemini.apiKey = apiKey;
        return {
          success: true,
        };
      } catch (error) {
        console.error("Error saving API key:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    /**
     * Save Vertex AI settings to storage
     */
    async saveVertexSettings(projectId, location, serviceAccountJson) {
      try {
        // Parse service account JSON if it's a string
        let credentials;
        if (typeof serviceAccountJson === "string") {
          credentials = JSON.parse(serviceAccountJson);
        } else {
          credentials = serviceAccountJson;
        }

        // Validate required fields
        if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
          throw new Error(
            "Invalid service account JSON. Must contain client_email, private_key, and project_id",
          );
        }

        await chrome.storage.local.set({
          vertexProjectId: projectId || credentials.project_id,
          vertexLocation: location || "us-central1",
          vertexCredentials: JSON.stringify(credentials),
        });

        this.providers.vertex.projectId = projectId || credentials.project_id;
        this.providers.vertex.location = location || "us-central1";
        this.providers.vertex.credentials = credentials;

        return {
          success: true,
        };
      } catch (error) {
        console.error("Error saving Vertex AI settings:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    /**
     * Save OpenAI settings to storage
     */
    async saveOpenAISettings(apiKey) {
      try {
        await chrome.storage.local.set({
          openaiApiKey: apiKey,
        });
        this.providers.openai.apiKey = apiKey;
        return {
          success: true,
        };
      } catch (error) {
        console.error("Error saving OpenAI settings:", error);
        return {
          success: false,
          error: error.message,
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
          aiModel: this.currentModel,
        });
        return {
          success: true,
          provider: this.currentProvider,
          model: this.currentModel,
        };
      } catch (error) {
        console.error("Error saving provider settings:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    /**
     * Get available providers
     */
    getProviders() {
      return Object.keys(this.providers).map((key) => ({
        id: key,
        name: this.providers[key].name,
        models: this.providers[key].models,
        configured: this.isProviderConfigured(key),
      }));
    }

    /**
     * Check if a provider is properly configured
     */
    isProviderConfigured(provider) {
      const prov = this.providers[provider];
      if (!prov) return false;

      switch (provider) {
        case "gemini":
          return !!prov.apiKey;
        case "vertex":
          return !!(prov.projectId && prov.credentials);
        case "openai":
          return !!prov.apiKey;
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
          accessibilityRules: rules,
        });
        this.rules = rules;
        return {
          success: true,
        };
      } catch (error) {
        console.error("Error saving rules:", error);
        return {
          success: false,
          error: error.message,
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
          criteria: rule.criteria || [],
        };

        const rules = [...this.rules, newRule];
        await this.saveRules(rules);
        return {
          success: true,
          rules,
        };
      } catch (error) {
        console.error("Error adding rule:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    /**
     * Update an existing rule
     */
    async updateRule(ruleId, updatedRule) {
      try {
        const rules = this.rules.map((rule) =>
          rule.id === ruleId
            ? {
                ...rule,
                ...updatedRule,
              }
            : rule,
        );
        await this.saveRules(rules);
        return {
          success: true,
          rules,
        };
      } catch (error) {
        console.error("Error updating rule:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    /**
     * Delete a rule
     */
    async deleteRule(ruleId) {
      try {
        const rules = this.rules.filter((rule) => rule.id !== ruleId);
        await this.saveRules(rules);
        return {
          success: true,
          rules,
        };
      } catch (error) {
        console.error("Error deleting rule:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    /**
     * Set the current rule for analysis
     */
    setCurrentRule(ruleId) {
      this.currentRule = this.rules.find((rule) => rule.id === ruleId) || null;
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
                ${rule.criteria.map((c, index) => `${index + 1}. ${c}`).join("\n")}

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
     * Normalize element data before building prompts.
     */
    normalizeElementData(elementData = {}) {
      const normalizeField = (value, fallback = "Not provided") => {
        if (typeof value !== "string") {
          return fallback;
        }

        const trimmedValue = value.trim();
        if (!trimmedValue || trimmedValue === "-") {
          return fallback;
        }

        return trimmedValue;
      };

      return {
        html: normalizeField(elementData.html),
        parentHtml: normalizeField(elementData.parentHtml),
        childHtml: normalizeField(elementData.childHtml),
        pageSource: normalizeField(elementData.pageSource),
        accessibility: normalizeField(elementData.accessibility),
        cssProperties: normalizeField(elementData.cssProperties),
        attributes: normalizeField(elementData.attributes),
      };
    }

    /**
     * Build a guaranteed runtime context block for custom prompts.
     */
    buildCustomPromptContext(elementData, rule) {
      return `

# RUNTIME ELEMENT DATA
---
Rule ID: ${rule.id}
Rule Name: ${rule.name}

Target HTML Element:
\`\`\`html
${elementData.html}
\`\`\`

Parent HTML Element:
\`\`\`html
${elementData.parentHtml}
\`\`\`

Child HTML Elements:
\`\`\`html
${elementData.childHtml}
\`\`\`

Full Page Source:
\`\`\`html
${elementData.pageSource}
\`\`\`

Accessibility Properties:
${elementData.accessibility}

CSS Properties:
${elementData.cssProperties}

Other Attributes:
${elementData.attributes}

You must use the runtime element data above for the evaluation and return only a valid JSON object.`;
    }

    /**
     * Interpolate supported tokens in saved custom prompts.
     */
    buildCustomPrompt(customPrompt, elementData, rule) {
      const normalizedElementData = this.normalizeElementData(elementData);
      const tokenValues = {
        element: JSON.stringify(normalizedElementData, null, 2),
        rule: rule.id,
        ruleName: rule.name,
        html: normalizedElementData.html,
        parentHtml: normalizedElementData.parentHtml,
        childHtml: normalizedElementData.childHtml,
        pageSource: normalizedElementData.pageSource,
        accessibility: normalizedElementData.accessibility,
        cssProperties: normalizedElementData.cssProperties,
        attributes: normalizedElementData.attributes,
      };

      const hasSupportedTokens =
        /\{(element|rule|ruleName|html|parentHtml|childHtml|pageSource|accessibility|cssProperties|attributes)\}/.test(
          customPrompt,
        );
      const hasLegacyPreviewPlaceholders =
        customPrompt.includes("<element>") ||
        customPrompt.includes("<parent>") ||
        customPrompt.includes("Accessibility properties...") ||
        customPrompt.includes("CSS properties...") ||
        customPrompt.includes("Element attributes...");

      let prompt = customPrompt;

      Object.entries(tokenValues).forEach(([token, value]) => {
        prompt = prompt.replace(new RegExp(`\\{${token}\\}`, "g"), value);
      });

      prompt = prompt
        .replace(/<element>/g, normalizedElementData.html)
        .replace(/<parent>/g, normalizedElementData.parentHtml)
        .replace(
          /Accessibility properties\.\.\./g,
          normalizedElementData.accessibility,
        )
        .replace(/CSS properties\.\.\./g, normalizedElementData.cssProperties)
        .replace(/Element attributes\.\.\./g, normalizedElementData.attributes);

      if (!hasSupportedTokens && !hasLegacyPreviewPlaceholders) {
        prompt += this.buildCustomPromptContext(normalizedElementData, rule);
      }

      return prompt;
    }

    /**
     * Analyze element against selected accessibility rule
     */
    async analyzeElement(elementData, options = {}) {
      if (!this.isProviderConfigured(this.currentProvider)) {
        return {
          success: false,
          error: `${this.providers[this.currentProvider].name} is not properly configured. Please set up your API credentials in settings.`,
        };
      }

      if (!this.currentRule) {
        return {
          success: false,
          error: "No accessibility rule selected. Please select a rule first.",
        };
      }

      try {
        this.isAnalyzing = true;
        let prompt;

        // Check for custom prompt in localStorage first
        const customPromptKey = `aiPrompt_${this.currentRule.id}`;
        const customPrompt = localStorage.getItem(customPromptKey);
        const normalizedElementData = this.normalizeElementData(elementData);

        if (customPrompt) {
          prompt = this.buildCustomPrompt(
            customPrompt,
            normalizedElementData,
            this.currentRule,
          );
        } else if (
          this.currentRule.id === "role-required" &&
          window.generateRoleRequiredPrompt
        ) {
          prompt = window.generateRoleRequiredPrompt(normalizedElementData);
        } else if (
          this.currentRule.id === "keyboard-interactive" &&
          window.generateKeyboardInteractivePrompt
        ) {
          prompt = window.generateKeyboardInteractivePrompt(
            normalizedElementData,
          );
        } else if (
          this.currentRule.id === "accessible-name" &&
          window.generateAccessibleNamePrompt
        ) {
          prompt = window.generateAccessibleNamePrompt(normalizedElementData);
        } else {
          prompt = this.generatePrompt(normalizedElementData, this.currentRule);
        }
        const imageDataUrls = Array.isArray(options.imageDataUrls)
          ? options.imageDataUrls.filter(Boolean)
          : [
              options.screenshotDataUrl,
              elementData?.screenshotDataUrl,
              elementData?.contextScreenshotDataUrl,
            ].filter(Boolean);
        console.log(
          `Calling ${this.providers[this.currentProvider].name} API...`,
        );

        let apiResponse;
        if (this.currentProvider === "gemini") {
          apiResponse = await this.callGeminiAPI(prompt, imageDataUrls);
        } else if (this.currentProvider === "vertex") {
          apiResponse = await this.callVertexAPI(prompt, imageDataUrls);
        } else if (this.currentProvider === "openai") {
          apiResponse = await this.callOpenAIAPI(prompt, imageDataUrls);
        } else {
          throw new Error(`Unsupported provider: ${this.currentProvider}`);
        }

        const { rawResponse, responseTime, tokenCount } = apiResponse;

        this.isAnalyzing = false;
        console.log(
          `${this.providers[this.currentProvider].name} API response received`,
        );
        // console.log('Gemini raw response:', rawResponse);
        let result;
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonString = jsonMatch[0];
          // console.log('Extracted JSON string:', jsonString);

          try {
            result = JSON.parse(jsonString);
            console.log("Successfully parsed JSON:", result);
          } catch (e) {
            console.warn("Direct JSON parse failed. Attempting to repair.", e);
            jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");

            try {
              result = JSON.parse(jsonString);
              console.log("Successfully repaired and parsed JSON:", result);
            } catch (e2) {
              console.error(
                "Failed to parse AI response JSON even after repair:",
                e2,
              );
              result = {
                status: "ERROR",
                summary: "Failed to parse AI response",
                details: `The AI returned a response that could not be parsed as valid JSON.
                                            Raw Response: ${rawResponse}`,
                // Return the raw response for debugging
                suggestions: `Raw Response: ${rawResponse}`,
              };
            }
          }
        } else {
          console.error("No JSON object found in AI response.");
          result = {
            status: "ERROR",
            summary: "Unexpected AI response format",
            details: `The AI did not return a properly formatted JSON response.
                                    Raw Response: ${rawResponse}`,
            suggestions: `Raw Response: ${rawResponse}`,
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
          result: result,
        };
      } catch (error) {
        this.isAnalyzing = false;
        console.error("Error analyzing element:", error);
        return {
          success: false,
          error: error.message || "Unknown error during analysis",
        };
      }
    }

    /**
     * Parse a base64 data URL into MIME type and payload.
     */
    parseDataUrl(dataUrl) {
      if (!dataUrl || typeof dataUrl !== "string") {
        return null;
      }

      const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
      if (!match) {
        return null;
      }

      return {
        mimeType: match[1],
        data: match[2],
      };
    }

    /**
     * Build multimodal content parts for providers that accept inline image data.
     */
    buildContentParts(prompt, imageDataUrls = []) {
      const parts = [{ text: prompt }];

      imageDataUrls
        .map((dataUrl) => this.parseDataUrl(dataUrl))
        .filter(Boolean)
        .forEach((imageData) => {
          parts.push({
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data,
            },
          });
        });

      return parts;
    }

    /**
     * Call Gemini API
     */
    async callGeminiAPI(prompt, imageDataUrls = []) {
      try {
        const startTime = performance.now();
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.currentModel}:generateContent`;

        const requestBody = {
          contents: [
            {
              parts: this.buildContentParts(prompt, imageDataUrls),
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 40,
          },
        };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": this.providers.gemini.apiKey,
          },
          body: JSON.stringify(requestBody),
        });

        const endTime = performance.now();
        const responseTime = (endTime - startTime).toFixed(2);

        if (!response.ok) {
          throw new Error(
            `API request failed with status ${response.status}: ${await response.text()}`,
          );
        }

        const data = await response.json();

        if (
          !data.candidates ||
          !data.candidates[0] ||
          !data.candidates[0].content ||
          !data.candidates[0].content.parts ||
          !data.candidates[0].content.parts[0] ||
          !data.candidates[0].content.parts[0].text
        ) {
          throw new Error(
            "Unexpected API response format: missing candidate text.",
          );
        }

        // Extract token usage
        const tokenCount = {
          input: data.usageMetadata?.promptTokenCount || 0,
          output: data.usageMetadata?.candidatesTokenCount || 0,
        };

        return {
          rawResponse: data.candidates[0].content.parts[0].text,
          responseTime: responseTime,
          tokenCount: tokenCount,
        };
      } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new Error(`Gemini API call failed: ${error.message}`);
      }
    }

    /**
     * Get OAuth2 access token from service account credentials
     */
    async getVertexAccessToken() {
      try {
        if (!this.providers.vertex.credentials) {
          throw new Error("Service account credentials not configured");
        }

        const now = Math.floor(Date.now() / 1000);
        const expiry = now + 3600; // 1 hour

        const payload = {
          iss: this.providers.vertex.credentials.client_email,
          scope: "https://www.googleapis.com/auth/cloud-platform",
          aud: "https://oauth2.googleapis.com/token",
          exp: expiry,
          iat: now,
        };

        // Create JWT header
        const header = {
          alg: "RS256",
          typ: "JWT",
        };

        // Encode to base64url
        const encodeBase64Url = (str) => {
          return btoa(str)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
        };

        const headerEncoded = encodeBase64Url(JSON.stringify(header));
        const payloadEncoded = encodeBase64Url(JSON.stringify(payload));
        const signatureInput = `${headerEncoded}.${payloadEncoded}`;

        // Sign JWT using service account private key
        const privateKey = this.providers.vertex.credentials.private_key;
        const keyData = this.pemToArrayBuffer(privateKey);

        const key = await crypto.subtle.importKey(
          "pkcs8",
          keyData,
          {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
          },
          false,
          ["sign"],
        );

        const signatureBytes = await crypto.subtle.sign(
          "RSASSA-PKCS1-v1_5",
          key,
          new TextEncoder().encode(signatureInput),
        );

        const signatureEncoded = encodeBase64Url(
          String.fromCharCode(...new Uint8Array(signatureBytes)),
        );
        const jwt = `${signatureInput}.${signatureEncoded}`;

        // Exchange JWT for access token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          throw new Error(
            `Failed to get access token: ${await tokenResponse.text()}`,
          );
        }

        const tokenData = await tokenResponse.json();
        this.providers.vertex.accessToken = tokenData.access_token;
        this.providers.vertex.tokenExpiry = now + tokenData.expires_in;

        return tokenData.access_token;
      } catch (error) {
        console.error("Error getting Vertex access token:", error);
        throw error;
      }
    }

    /**
     * Convert PEM formatted private key to ArrayBuffer for WebCrypto
     */
    pemToArrayBuffer(pem) {
      const b64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, "")
        .replace(/-----END PRIVATE KEY-----/, "")
        .replace(/\n/g, "");

      const binaryString = atob(b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }

    /**
     * Call Vertex AI API
     */
    async callVertexAPI(prompt, imageDataUrls = []) {
      try {
        const startTime = performance.now();

        // Get access token
        let accessToken = this.providers.vertex.accessToken;
        const now = Math.floor(Date.now() / 1000);

        // Check if token is expired or doesn't exist
        if (!accessToken || !this.providers.vertex.tokenExpiry || this.providers.vertex.tokenExpiry <= now) {
          accessToken = await this.getVertexAccessToken();
        }

        const apiUrl = `https://${this.providers.vertex.location}-aiplatform.googleapis.com/v1/projects/${this.providers.vertex.projectId}/locations/${this.providers.vertex.location}/publishers/google/models/${this.currentModel}:generateContent`;
        const requestBody = {
          contents: [
            {
              role: "user",
              parts: this.buildContentParts(prompt, imageDataUrls),
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 40,
          },
        };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify(requestBody),
        });

        const endTime = performance.now();
        const responseTime = (endTime - startTime).toFixed(2);

        if (!response.ok) {
          throw new Error(
            `Vertex API request failed with status ${response.status}: ${await response.text()}`,
          );
        }

        const data = await response.json();

        if (
          !data.candidates ||
          !data.candidates[0] ||
          !data.candidates[0].content ||
          !data.candidates[0].content.parts ||
          !data.candidates[0].content.parts[0] ||
          !data.candidates[0].content.parts[0].text
        ) {
          throw new Error(
            "Unexpected Vertex API response format: missing candidate text.",
          );
        }
        const tokenCount = {
          input: data.usageMetadata?.promptTokenCount || 0,
          output: data.usageMetadata?.candidatesTokenCount || 0,
        };
        return {
          rawResponse: data.candidates[0].content.parts[0].text,
          responseTime: responseTime,
          tokenCount: tokenCount,
        };
      } catch (error) {
        console.error("Vertex AI API call failed:", error);
        throw new Error(`Vertex AI API call failed: ${error.message}`);
      }
    }

    /**
     * Call OpenAI API
     */
    async callOpenAIAPI(prompt, imageDataUrls = []) {
      try {
        const startTime = performance.now();
        const apiUrl = "https://api.openai.com/v1/chat/completions";

        const content = [
          {
            type: "text",
            text: prompt,
          },
        ];

        imageDataUrls.filter(Boolean).forEach((dataUrl) => {
          content.push({
            type: "image_url",
            image_url: {
              url: dataUrl,
            },
          });
        });

        const requestBody = {
          model: this.currentModel,
          messages: [
            {
              role: "user",
              content: content.length > 1 ? content : prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.providers.openai.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        const endTime = performance.now();
        const responseTime = (endTime - startTime).toFixed(2);

        if (!response.ok) {
          throw new Error(
            `OpenAI API request failed with status ${response.status}: ${await response.text()}`,
          );
        }

        const data = await response.json();

        if (
          !data.choices ||
          !data.choices[0] ||
          !data.choices[0].message ||
          !data.choices[0].message.content
        ) {
          throw new Error(
            "Unexpected OpenAI API response format: missing candidate text.",
          );
        }

        const tokenCount = {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        };

        return {
          rawResponse: data.choices[0].message.content,
          responseTime: responseTime,
          tokenCount: tokenCount,
        };
      } catch (error) {
        console.error("OpenAI API call failed:", error);
        throw new Error(`OpenAI API call failed: ${error.message}`);
      }
    }
  }
  window.aiAnalyzer = new AIAnalyzer();
})();
