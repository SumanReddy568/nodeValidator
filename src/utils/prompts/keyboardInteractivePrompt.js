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

**6. Event Listeners (Inline and framework specific):**
${elementData.eventListeners}

(Note: Visual inputs may also be attached when available as base64-encoded image inputs: a cropped screenshot of the target element and a full-page context screenshot.)

# INSTRUCTIONS
---
Your analysis must be methodical and precise.
Strict visual rule: Ignore any pink/magenta highlighted border or outline shown in screenshots/base images. That border is only for targeting the element and must NOT be treated as part of the UI, style, contrast, spacing, or accessibility behavior.

Keyboard accessibility is a core accessibility requirement that ensures a user can fully operate a website or application using only a keyboard, without needing a mouse or touch input. This is especially important for users with motor disabilities, power users, and screen reader users who rely heavily on keyboard navigation.

1. **Check if Interactive Element:**
   - First, determine if the target element is intended to be interactive (e.g., buttons, links, inputs, dropdowns, modals).
   - If the element is hidden (display: none, visibility: hidden, aria-hidden="true", or not visible in screenshots), it is not currently exposed to users — consider marking it as "PASS".
   - For custom elements (divs, spans), consider them interactive if they have an interactive ARIA role (e.g., role="button"), are keyboard focusable with interaction intent, or visually appear as a control in screenshots.
   - If the element is NOT an interactive element, consider marking it as "PASS".

2. **Evaluate Interactive Elements (Follow-up Check):** If the element IS an interactive element, add the following follow-up checks:
   - **Reachable via keyboard:** All interactive elements must be reachable via keyboard, typically navigated using the Tab key. Custom components (e.g., a custom button or div) must be focusable (e.g., tabindex="0"). Note: Native HTML interactive elements (button, a, input, select, textarea) inherently satisfy keyboard reachability and activation.
   - **Keyboard Activation:** Users can activate actions using a keyboard. Enter or Space should trigger buttons, links, toggles. Custom components must respond to expected keyboard events.
   - **Visible and Logical Focus:** There must be a clear visual indicator of focus (outline, highlight). Tab order should follow the natural reading order (top → bottom, left → right).
   - **No Keyboard Traps:** Users should never get stuck in a component (like a modal or dropdown). They must be able to navigate in and out.

3. **Pass/Fail Formulation:** Assign a final status of "PASS" or "FAIL".
   - **PASS:** The element is non-interactive, OR it is interactive and fully meets all the keyboard accessibility follow-up checks.
   - **FAIL:** The element is interactive but fails any keyboard accessibility check (e.g., unreachable via keyboard, cannot activate using Enter/Space, lacks visible focus, or creates a keyboard trap).

4. **Summary & Details:** Provide a concise summary and a detailed technical explanation referencing the code.
5. **Suggestions:** Provide an actionable code snippet to fix any issues.

# RESPONSE FORMAT
---
CRITICAL: The entire response MUST be a single, valid JSON object and NOTHING ELSE.
- DO NOT include markdown code blocks (e.g., do NOT use backticks like \`\`\`json).
- DO NOT include any introductory or concluding text.
- Start your response directly with '{' and end it with '}'.
- Ensure all property names and string values are enclosed in double quotes.
- The "Confidence" field must be a raw number (0-100), not a string.

{
  "status": "PASS" | "FAIL",
  "Confidence": number,
  "summary": "string",
  "details": "string",
  "suggestions": "string"
}
`;
};
