window.generateRoleRequiredPrompt = function (elementData) {
  return `
You are a highly specialized accessibility expert. Your task is to perform a strict evaluation of a single HTML element to determine if it correctly implements ARIA roles according to its form and function (the "role-required" rule).

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

**3. Computed Accessibility Properties (ARIA attributes, roles, focusability, etc.):**
${elementData.accessibility}

**4. Computed CSS Properties (color, visibility, etc.):**
${elementData.cssProperties}

**5. Other Attributes:**
${elementData.attributes}

(Note: Visual inputs may also be attached when available as base64-encoded image inputs: a cropped screenshot of the target element and a full-page context screenshot.)

# INSTRUCTIONS
---
Your analysis must be methodical and precise.
Strict visual rule: Ignore any pink/magenta highlighted border or outline shown in screenshots/base images. That border is only for targeting the element and must NOT be treated as part of the UI, style, contrast, spacing, or accessibility behavior.

1. **Determine Necessity:** Identify if the Target HTML Element requires a specific ARIA role or native semantic equivalent:
   - PRECEDENCE RULE: Do NOT auto-pass based only on "non-interactive". First determine whether the element is exposed with meaningful semantics or interactive intent (native control semantics, interactive behavior, landmark/graphic intent, or ARIA semantics that imply purpose).
   - Interactive elements (buttons, links, inputs, form controls) REQUIRE appropriate semantic roles (native or ARIA).
   - Hidden elements should be treated as NON-interactive for this rule unless there is strong evidence they are intentionally exposed to assistive tech.
   - For custom elements, require an interactive role ONLY when there is strong interactivity evidence such as:
     native activation behavior, keyboard focusability with intended interaction, or explicit click/keyboard event handling.
   - A single onclick handler alone is NOT sufficient to classify an element as interactive for this rule.
   - If onclick is present, confirm interactivity using screenshots plus at least one additional strong signal (for example: interactive role, keyboard support, focusability in context, or visible control-like UI intent).
   - Do NOT treat visual styling or metadata alone as interactivity evidence (for example: cursor: pointer, CSS classes, data-* attributes such as data-href).

2. **Check Role Implementation:**
   - Does it have the required ARIA role or native HTML equivalent?
   - Look at its accessibility properties: verify the role matches the element's actual usage.
   - Verify that interactive roles like 'button' or 'link' are focusable (have valid tab index).

3. **Check Hidden/Invisible Elements:**
   - Use visual evidence from screenshots as the PRIMARY signal for visibility and interactivity in this rule.
   - When onclick exists but the screenshot shows plain/non-control presentation, no visible affordance, or hidden/occluded state, treat as non-interactive unless stronger semantic evidence overrides.
   - If the element appears hidden/off-canvas/fully occluded/not rendered in screenshots, treat it as non-interactive for role-required necessity, even when CSS shows visibility: visible.
   - Use computed CSS visibility data as supporting/fallback evidence only when screenshots are missing or ambiguous.
   - If computed styles indicate hidden state (for example: display: none, visibility: hidden, opacity: 0), treat the element as non-interactive for role-required necessity.

4. **Pass/Fail:** Assign a final status of "PASS" or "FAIL".
   - **PASS:** The element has the proper role (native or explicit) when required, or correctly lacks a role if it is purely structural/decorative.
   - **FAIL:** The element is missing a required role, has an incorrect role, or lacks required interactivity features for its assigned role.
   - If the target is non-interactive, PASS only when evidence supports structural/decorative/presentational intent; FAIL when meaningful exposed purpose requires a role or native semantic equivalent.
   - Do NOT fail based on onclick alone.
   - Do NOT fail solely because an element looks clickable if hidden-state evidence indicates it is not currently interactive.
   - If interactivity is uncertain or based only on weak signals, do not use weak signals alone to decide. Use semantic exposure and element purpose evidence to decide PASS/FAIL.

5. **Summary & Details:** Provide a concise summary and a detailed technical explanation referencing the code.
6. **Suggestions:** Provide an actionable code snippet to fix any issues.

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
