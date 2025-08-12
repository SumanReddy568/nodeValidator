/**
 * Default Accessibility Rules
 * Provides a comprehensive set of WCAG and ARIA accessibility rules for analysis.
 */
(function () {
    console.log('Initializing accessibility default rules...');
    const defaultRules = [{
        id: 'wcag-1.1.1',
        name: 'Non-text Content',
        description: 'All non-text content has a text alternative that serves the equivalent purpose.',
        details: 'Images must have appropriate alt text. UI controls should have descriptive labels.',
        criteria: [
            'Images have alt attributes',
            'UI controls have descriptive labels',
            'Buttons and controls have accessible names'
        ]
    }, {
        id: 'wcag-1.2.1',
        name: 'Audio-only and Video-only (Prerecorded)',
        description: 'For prerecorded audio-only and video-only content, a text transcript must be provided.',
        details: 'A text transcript provides an accessible alternative for users who are deaf or hard of hearing.',
        criteria: ['Text transcripts are available for prerecorded audio and video content']
    }, {
        id: 'wcag-1.2.2',
        name: 'Captions (Prerecorded)',
        description: 'Captions are provided for all prerecorded audio content in synchronized media.',
        details: 'Captions should be synchronized with the video to provide a text alternative for dialogue and important sounds.',
        criteria: ['Prerecorded videos have synchronized captions']
    }, {
        id: 'wcag-1.3.1',
        name: 'Info and Relationships',
        description: 'Information, structure, and relationships conveyed through presentation can be programmatically determined.',
        details: 'Use proper semantic HTML. Associate labels with form controls. Use correct heading hierarchy.',
        criteria: [
            'Proper semantic HTML is used',
            'Labels are associated with form controls',
            'Tables have proper headers',
            'Correct heading hierarchy is used'
        ]
    }, {
        id: 'wcag-1.3.3',
        name: 'Sensory Characteristics',
        description: 'Instructions do not rely solely on sensory characteristics like shape, size, or color.',
        details: 'Information should be conveyed in multiple ways. For example, use text labels in addition to color.',
        criteria: ['Instructions are not based only on color, shape, or position']
    }, {
        id: 'wcag-1.4.3',
        name: 'Contrast (Minimum)',
        description: 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1.',
        details: 'Sufficient color contrast is essential for users with low vision.',
        criteria: ['Text and background colors have a contrast ratio of at least 4.5:1']
    }, {
        id: 'wcag-1.4.4',
        name: 'Resize Text',
        description: 'Text can be resized up to 200% without loss of content or functionality.',
        details: 'Users with low vision must be able to zoom in on the page without content becoming unreadable.',
        criteria: ['Content remains readable and functional when zoomed to 200%']
    }, {
        id: 'wcag-1.4.10',
        name: 'Reflow',
        description: 'Content can be presented without loss of information or functionality, and without requiring horizontal scrolling at a width equivalent to 320px.',
        details: 'This ensures content is accessible on mobile devices and for users who are zoomed in.',
        criteria: ['Content is responsive and avoids horizontal scrolling at small screen sizes']
    }, {
        id: 'wcag-2.1.1',
        name: 'Keyboard',
        description: 'All functionality is operable through a keyboard interface.',
        details: 'Users with motor disabilities who cannot use a mouse must be able to navigate and interact with all elements using only a keyboard.',
        criteria: [
            'All functions are accessible via keyboard',
            'There are no "keyboard traps" where a user can get stuck'
        ]
    }, {
        id: 'wcag-2.4.1',
        name: 'Bypass Blocks',
        description: 'A mechanism is available to bypass blocks of content that are repeated on multiple Web pages.',
        details: 'This is typically a "Skip to content" link for keyboard and screen reader users.',
        criteria: ['A "Skip to content" link is available to bypass repeated content']
    }, {
        id: 'wcag-2.4.2',
        name: 'Page Titled',
        description: 'Web pages have titles that describe their topic or purpose.',
        details: 'A unique and descriptive title in the <title> tag helps users understand where they are on the site.',
        criteria: ['Every page has a descriptive title in the <title> tag']
    }, {
        id: 'wcag-2.4.4',
        name: 'Link Purpose (In Context)',
        description: 'The purpose of each link can be determined from the link text alone or from the link text together with its programmatically determined link context.',
        details: 'Avoid ambiguous link text like "click here." The link text should be descriptive enough to tell the user where they are going.',
        criteria: ['Link text is descriptive and meaningful']
    }, {
        id: 'wcag-2.4.7',
        name: 'Focus Visible',
        description: 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.',
        details: 'This is essential for keyboard users to know where they are on the page. The focus outline must be clear.',
        criteria: [
            'Interactive elements have visible focus states',
            'Focus indicators are clearly visible and contrast sufficiently'
        ]
    }, {
        id: 'wcag-3.1.1',
        name: 'Language of Page',
        description: 'The default human language of each Web page can be programmatically determined.',
        details: 'This helps screen readers pronounce the content correctly. Use the `lang` attribute on the `<html>` tag.',
        criteria: ['The html element has a lang attribute with a valid language code']
    }, {
        id: 'wcag-3.2.1',
        name: 'On Focus',
        description: 'Changing the setting of any user interface component does not automatically cause a change of context.',
        details: 'Users should not be surprised by a new page or a new section appearing just by interacting with a control.',
        criteria: ['Interacting with an element does not cause a change of context without user confirmation']
    }, {
        id: 'wcag-3.3.1',
        name: 'Error Identification',
        description: 'If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text.',
        details: 'Form errors should be clearly and explicitly stated next to the field that has the error.',
        criteria: [
            'Form validation errors are clearly described in text',
            'Errors are programmatically associated with their form fields'
        ]
    }, {
        id: 'wcag-3.3.2',
        name: 'Labels or Instructions',
        description: 'Labels or instructions are provided when content requires user input.',
        details: 'Every input field, checkbox, and radio button must have a visible, programmatically associated label.',
        criteria: ['All form fields have visible and programmatically associated labels']
    }, {
        id: 'wcag-4.1.2',
        name: 'Name, Role, Value',
        description: 'All user interface components have a name, role, and value that can be programmatically determined.',
        details: 'This is the foundational rule for making UI components accessible. Use semantic HTML or ARIA attributes.',
        criteria: ['UI components have programmatically determined names, roles, and values']
    }, {
        id: 'aria-valid-attr',
        name: 'ARIA Valid Attributes',
        description: 'Ensures that ARIA attributes are spelled correctly and are used with appropriate roles.',
        details: 'Incorrectly spelled or used ARIA attributes can confuse assistive technologies and degrade the user experience.',
        criteria: ['ARIA attributes are correctly spelled', 'ARIA attributes are used with compatible roles']
    }, {
        id: 'aria-prohibited-attr',
        name: 'ARIA Prohibited Attributes',
        description: 'An ARIA attribute is not used on an element where it is not allowed.',
        details: 'For example, `aria-label` should not be used on a `<span>` with no semantic role, as it may be ignored by screen readers.',
        criteria: ['ARIA attributes are only used on appropriate HTML elements']
    }, {
        id: 'html-lang-valid',
        name: 'HTML Lang Valid',
        description: 'The language code used in the `lang` attribute is a valid IANA subtag.',
        details: 'Using a valid language code ensures that assistive technologies can correctly announce the page content.',
        criteria: ['The html element has a valid `lang` attribute']
    }, {
        id: 'duplicate-id-aria',
        name: 'Duplicate ID',
        description: 'Elements on a page should have unique IDs, which is critical for ARIA attributes that reference other elements.',
        details: 'An `id` must be unique on a page. Duplicate IDs can cause accessibility issues and script errors.',
        criteria: ['All elements have unique `id` attributes']
    }, {
        id: 'heading-order',
        name: 'Heading Order',
        description: 'Headings should be nested in a logical order.',
        details: 'For example, an `<h1>` should not be followed directly by an `<h3>`. This helps users understand the page structure.',
        criteria: ['Heading elements follow a logical, hierarchical order']
    }, {
        id: 'label-orphaned',
        name: 'Orphaned Label',
        description: 'Form field labels should be associated with an input element using `for` and `id` attributes.',
        details: 'When a label is not programmatically associated with an input, screen readers may not announce it correctly.',
        criteria: ['Labels are correctly linked to their form controls']
    }, {
        id: 'skip-link',
        name: 'Skip Link',
        description: 'Provides a "skip to content" link that allows keyboard users to bypass repeated navigation links.',
        details: 'This is a crucial feature for keyboard accessibility, preventing users from having to tab through the main navigation on every page.',
        criteria: ['A "skip to content" link is present and functional']
    }, {
        id: 'role-required-carousel',
        name: 'Carousel Role Required',
        description: 'Interactive carousels must have the appropriate ARIA roles and attributes to be accessible.',
        details: 'Elements within a carousel should have roles like `region`, `tablist`, `tab`, and `tabpanel` to be correctly interpreted by assistive technologies.',
        criteria: ['Carousel elements have correct ARIA roles']
    }];
    window.accessibilityDefaultRules = {
        getDefaultRules: function () {
            return defaultRules;
        }
    };
    const event = new CustomEvent('accessibilityRulesLoaded');
    window.dispatchEvent(event);
    if (window.aiAnalyzer && typeof window.aiAnalyzer.onRulesLoaded === 'function') {
        window.aiAnalyzer.onRulesLoaded();
    }
    console.log('Accessibility default rules loaded and available');
})();