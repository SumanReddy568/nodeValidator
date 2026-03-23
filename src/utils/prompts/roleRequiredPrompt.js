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

(Note: A screenshot of the element in its context is also provided to help determine visual appearance, interactability, and context.)

# INSTRUCTIONS
---
Your analysis must be methodical and precise.
1. **Evaluate:** Determine if the Target HTML Element needs a specific explicit ARIA role based on its tag and attributes, and whether it correctly implements it or natively has it (e.g., a native <button> implicitly has the 'button' role).
2. Look at its accessibility properties: does it have the required ARIA role or native HTML equivalent? 
3. Look at interactability: is it focusable? Does it have a valid tab index if it's an interactive role like 'button' or 'link'?
4. **Pass/Fail:** Assign a final status of "PASS" or "FAIL".
   - **PASS:** The element fully meets the requirement for having the proper role and interactability state.
   - **FAIL:** The element is missing the required role, has an incorrect role, or lacks interactability/focusability for its intended form/function.
5. **Summary & Details:** Provide a concise summary and a detailed technical explanation referencing the code.
6. **Suggestions:** Provide an actionable code snippet to fix any issues.

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
