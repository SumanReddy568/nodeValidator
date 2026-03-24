window.generateAccessibleNamePrompt = function (elementData) {
  return `
You are a highly specialized accessibility expert. Your task is to perform a strict evaluation of a single HTML element to determine if it correctly implements an accessible name according to the "accessible-name" rule.

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

**3. Computed Accessibility Properties (ARIA attributes, roles, accessible name, accessible description, etc.):**
${elementData.accessibility}

**4. Computed CSS Properties (color, visibility, font-size, etc.):**
${elementData.cssProperties}

**5. Other Attributes:**
${elementData.attributes}

(Note: Visual inputs may also be attached when available as base64-encoded image inputs: a cropped screenshot of the target element and a full-page context screenshot.)

# INSTRUCTIONS
---
Your analysis must be methodical and precise.
Strict visual rule: Ignore any pink/magenta highlighted border or outline shown in screenshots/base images. That border is only for targeting the element and must NOT be treated as part of the UI, style, contrast, spacing, or accessibility behavior.

An accessible name is a short text label that assistive technologies (like screen readers) use to identify and announce an element to users. Every interactive or meaningful element must have a clear, descriptive accessible name so that users who cannot see the screen understand what the element is and what it does.

1. **Check if Element Requires an Accessible Name:**
   - First, determine if the target element requires an accessible name. Elements that require one include: interactive elements (buttons, links, inputs, form controls), images/graphics that convey meaning, and landmark regions.
   - If the element is hidden (display: none, visibility: hidden, aria-hidden="true", or not visible in screenshots), it is not currently exposed to users — consider marking it as "PASS".
   - For custom elements (divs, spans), consider them as requiring an accessible name only if they have an interactive ARIA role (e.g., role="button"), are keyboard focusable with interaction intent, or visually appear as a control in screenshots.
   - If the element is purely decorative, presentational, or non-interactive (e.g., layout divs, decorative icons), it does NOT require an accessible name — consider marking it as "PASS".

2. **Evaluate Accessible Name (Follow-up Check):** If the element DOES require an accessible name, perform the following checks:
   - **Name Exists:** The element must have an accessible name provided via one of: aria-label, aria-labelledby, visible text content (for buttons/links), alt attribute (for images), associated label element (for form inputs), or title attribute (as fallback). Placeholder alone is NOT sufficient.
   - **Name is Descriptive and Meaningful:** The name must not be empty or just whitespace. It must accurately describe the element's purpose or content (e.g., "Submit Order" instead of "Click Here").
   - **Name is Not Redundant:** The name should not unnecessarily duplicate surrounding context or other labels already read by assistive technology.

3. **Pass/Fail Formulation:** Assign a final status of "PASS" or "FAIL".
   - **PASS:** The element does not require an accessible name (decorative/presentational), OR it requires one and has a proper, descriptive accessible name.
   - **FAIL:** The element requires an accessible name but is missing one, the name is empty/meaningless, or the name does not accurately describe the element's purpose.

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
