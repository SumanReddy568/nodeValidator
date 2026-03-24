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
   - PRECEDENCE RULE: If the target is non-interactive, mark PASS immediately for this rule unless it is clearly a meaningful standalone graphic exposed semantically to assistive tech.
   - Interactive elements (buttons, links, inputs, form controls) REQUIRE an accessible name
   - Images and graphics REQUIRE an accessible name (via alt text or aria-label)
   - Form inputs REQUIRE associated labels or aria-label
   - Landmark regions MAY need accessible names
   - Decorative elements do NOT require accessible names
   - Non-interactive SVG/icon elements inside non-interactive containers should be treated as decorative by default and PASS.
   - Only require an SVG accessible name when there is explicit semantic/meaningful intent (for example: role="img", aria-* labeling intent, or clear standalone informative graphic purpose).
   - Hidden elements should be treated as NON-interactive for this rule unless there is strong evidence they are intentionally exposed to assistive tech
   - For custom elements, require an accessible name ONLY when there is strong interactivity evidence such as:
     native activation behavior, interactive ARIA role, keyboard focusability with intended interaction, or explicit click/keyboard event handling
    - A single onclick handler alone is NOT sufficient to classify an element as interactive for this rule.
    - If onclick is present, confirm interactivity using screenshots plus at least one additional strong signal (for example: interactive role, keyboard support, focusability in context, or visible control-like UI intent).
   - Do NOT treat visual styling or metadata alone as interactivity evidence (for example: cursor: pointer, CSS classes, data-* attributes such as data-href)

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
   - Use visual evidence from screenshots as the PRIMARY signal for visibility and interactivity in this rule.
   - When onclick exists but the screenshot shows plain/non-control presentation, no visible affordance, or hidden/occluded state, treat as non-interactive unless stronger semantic evidence overrides.
   - If the element appears hidden/off-canvas/fully occluded/not rendered in screenshots, treat it as non-interactive for accessible-name necessity, even when CSS shows visibility: visible.
   - Use computed CSS visibility data as supporting/fallback evidence only when screenshots are missing or ambiguous.
   - If computed styles indicate hidden state (for example: display: none, visibility: hidden, opacity: 0), treat the element as non-interactive for accessible-name necessity
   - Visually hidden but intentionally screen-reader-accessible content is acceptable when semantic intent is clear

5. **Pass/Fail:** Assign a final status of "PASS" or "FAIL".
   - **PASS:** The element has a proper, descriptive accessible name when required.
   - **FAIL:** The element is missing an accessible name, the name is empty/meaningless, or it's inaccurate.
   - If the target is non-interactive, default to PASS and explain why accessible-name is not required for this element context.
   - Do NOT fail based on onclick alone.
   - Do NOT fail solely because an element looks clickable if hidden-state evidence indicates it is not currently interactive.
   - If interactivity is uncertain or based only on weak signals, prefer PASS with explanation rather than a false-positive FAIL.

6. **Summary & Details:** Provide a concise summary and a detailed technical explanation referencing the code.
7. **Suggestions:** Provide an actionable code snippet to fix any issues.

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
