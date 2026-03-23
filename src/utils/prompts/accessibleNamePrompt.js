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
strict_rule: Do not consider element highlighted border for evaluation, it is just for representation of the base element

1. **Determine Necessity:** Identify if the Target HTML Element requires an accessible name:
   - Interactive elements (buttons, links, inputs, form controls) REQUIRE an accessible name
   - Images and graphics REQUIRE an accessible name (via alt text or aria-label)
   - Form inputs REQUIRE associated labels or aria-label
   - Landmark regions MAY need accessible names
   - Decorative elements do NOT require accessible names

2. **Check Accessible Name Sources (in order of precedence):**
   - aria-label or aria-labelledby attributes
   - Text content (for buttons, links)
   - alt attribute (for images)
   - title attribute (as fallback)
   - Associated label element (for form inputs)
   - Placeholder attribute (NOT sufficient for required names)

3. **Validate Name Quality:**
   - Name must be descriptive and meaningful (not empty, not just whitespace)
   - Name must accurately describe the element's purpose or content
   - Name should not be redundant with surrounding context

4. **Check Hidden/Invisible Elements:**
   - Ensure name is not hidden or irrelevant
   - Visually hidden but screen-reader accessible names are acceptable

5. **Pass/Fail:** Assign a final status of "PASS" or "FAIL".
   - **PASS:** The element has a proper, descriptive accessible name when required.
   - **FAIL:** The element is missing an accessible name, the name is empty/meaningless, or it's inaccurate.

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
