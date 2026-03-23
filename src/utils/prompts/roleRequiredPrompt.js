window.generateRoleRequiredPrompt = function(elementData) {
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
strict_rule: Do not not consider element highlighted border for evaluation, it just for representation of the base element
1. **Evaluate:** Determine if the Target HTML Element needs a specific explicit ARIA role based on its tag and attributes, and whether it correctly implements it or natively has it (e.g., a native <button> implicitly has the 'button' role).
2. Look at its accessibility properties: does it have the required ARIA role or native HTML equivalent? 
3. Look at interactivity: is it focusable? Does it have a valid tab index if it's an interactive role like 'button' or 'link'?
4. **Interactive Check:** Determine if the element is built to be an interactive element (e.g., buttons, links, inputs). If the element is not interactive, ensure that no ARIA role is assigned to it.
5. **Pass/Fail:** Assign a final status of "PASS" or "FAIL".
   - **PASS:** The element fully meets the requirement for having the proper role and interactivity state.
   - **FAIL:** The element is missing the required role, has an incorrect role, or lacks interactivity/focusability for its intended form/function.
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
}
