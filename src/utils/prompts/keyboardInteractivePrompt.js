window.generateKeyboardInteractivePrompt = function (elementData) {
  return `
You are a highly specialized accessibility expert. Your task is to perform a strict evaluation of a single HTML element to determine if it correctly implements keyboard interactivity according to the "keyboard-interactive" rule.

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

**3. Computed Accessibility Properties (ARIA attributes, roles, focusability, tab index, etc.):**
${elementData.accessibility}

**4. Computed CSS Properties (color, visibility, pointer-events, etc.):**
${elementData.cssProperties}

**5. Other Attributes:**
${elementData.attributes}

(Note: Visual inputs may also be attached when available as base64-encoded image inputs: a cropped screenshot of the target element and a full-page context screenshot.)

# INSTRUCTIONS
---
Your analysis must be methodical and precise.
strict_rule: Do not consider element highlighted border for evaluation, it is just for representation of the base element

1. **Identify Intent:** Determine if the Target HTML Element is intended to be interactive (button, link, input, clickable div with click handler, etc.).
2. **Check Focusability:** Verify the element is keyboard accessible:
   - Native interactive elements (button, input, select, textarea, a) should be naturally focusable
   - Custom interactive elements should have a valid tabindex (≥ 0)
   - Elements should not be hidden from keyboard focus (tabindex=-1 on interactive elements is generally wrong)
3. **Verify Keyboard Handlers:** Check if the element has appropriate keyboard event handlers (onkeydown, onkeyup, onkeypress) when needed for custom components.
4. **Check Pointer Event Handlers:** If the element has click handlers or pointer events, ensure they're also accessible via keyboard (Enter, Space for buttons; Arrow keys for complex widgets).
5. **Pass/Fail:** Assign a final status of "PASS" or "FAIL".
   - **PASS:** The element is properly keyboard accessible with appropriate focus management and keyboard event handlers.
   - **FAIL:** The element is interactive but not keyboard accessible, or lacks proper keyboard event handling.
6. **Summary & Details:** Provide a concise summary and a detailed technical explanation referencing the code.
7. **Suggestions:** Provide an actionable code snippet to fix any issues.

# RESPONSE FORMAT
---
The entire response MUST be a single, valid JSON object and nothing else.
IMPORTANT: Include a "Confidence" field (number between 0 and 100).
\`\`\`json
{
  "status": "PASS" or "FAIL",
  "Confidence": number,
  "summary": "string",
  "details": "string",
  "suggestions": "string"
}
\`\`\`
`;
};
