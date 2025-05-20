# Node Validator: User Guide

## Introduction

Node Validator is a specialized Chrome DevTools extension designed for web testing professionals, QA teams, and developers. It enables systematic validation of HTML elements across multiple web pages using CSS selectors, with the ability to track, categorize, and export results.

This guide provides comprehensive instructions for using the Node Validator extension effectively.

## Installation

### Prerequisites
- Google Chrome browser
- Developer mode enabled in Chrome extensions

### Installation Steps
1. Clone the repository: `git clone https://github.com/sumanreddy568/nodeValidator.git`
2. Open Chrome and navigate to `chrome://extensions/`
3. Toggle on "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the cloned repository folder
5. Verify that "Node Validator" appears in your extensions list

## Getting Started

### Opening the Panel
1. Open Chrome DevTools by pressing F12 or right-clicking on a webpage and selecting "Inspect"
2. Look for the "Node Validator" tab in the DevTools panel 
3. Click on the tab to open the Node Validator panel

### Optimal Setup
For the best experience:
1. Position DevTools at the bottom of the window (dock to bottom)
2. Make sure the browser window is wide enough to view both the page and highlighted elements

## Preparing Your Data

### CSV File Format
Create a CSV file with the following columns:
- `url`: The complete URL to validate (including https://)
- `targetNode`: CSS selector for the element to validate

Example:
```csv
url,targetNode
https://example.com,#header-logo
https://example.com/about,.main-content h1
https://github.com,a.header-logo
```

### Selector Types
Node Validator supports multiple selector formats:
- **CSS Selectors**: `.class`, `#id`, `div > span`
- **XPath**: `//*[@id="main"]/div[2]`
- **JavaScript expressions**: `document.querySelector('.dashboard')`

## Basic Workflow

### Step 1: Upload CSV
1. Drag and drop your CSV file onto the upload area, or
2. Click the upload area to browse for your CSV file
3. The system will validate and import your data

### Step 2: Choose Validation Mode
Select your preferred validation mode:
- **Manual Mode** (default): Review each element individually
- **Automated Mode**: System automatically validates based on element presence

To toggle modes:
1. Locate the mode switch next to the dashboard title
2. Toggle on for Automated Mode, off for Manual Mode

### Step 3: Start Validation
1. (Optional) Set a starting index if you want to begin from a specific point
2. Click "Start Validation"
3. The system will navigate to the first URL
4. If the element is found, it will be highlighted on the page

### Step 4: Validate Elements
#### In Manual Mode:
1. Review the highlighted element (if found)
2. Select the appropriate status button:
   - **True Positive**: Element correctly found
   - **False Positive**: Element found but not as expected
   - **False Negative**: Element not found but should exist
   - **Not Valid**: Element correctly not found
   - **Needs Review**: Requires further examination
   - **Skip**: Move to next without making a decision
3. Add optional comments in the comments field
4. Click "Next URL" to proceed to the next element

#### In Automated Mode:
1. Watch as the system navigates through pages automatically
2. Elements are automatically marked as:
   - **True Positive** if found
   - **Not Valid** if not found
3. Progress is displayed in real-time

### Step 5: View Results
1. Monitor the statistics at the top of the dashboard
2. Track progress via the progress bar
3. Continue until all elements are validated

### Step 6: Export Results
1. When validation is complete, click "Export Results"
2. Save the CSV file to your preferred location
3. The exported file will include:
   - Original URL and selector
   - Validation status
   - Any comments added

## Advanced Features

### Resume Validation
If you need to stop validation partway through:
1. Click "Stop" to pause validation
2. When ready to continue, click "Resume Validation"
3. Validation will continue from where you left off

### Start from Specific Index
To begin validation from a specific point in your dataset:
1. Enter the desired index in the "Start from index" field
2. Click "Start Validation"
3. Validation will begin from the specified index

### Element Information
For each element, Node Validator displays:
- **URL**: Current page URL
- **Selector**: CSS selector being used
- **HTML Snippet**: Element's HTML code
- **Parent HTML Snippet**: Parent element's HTML
- **Child HTML Snippet**: HTML of direct children
- **Node Attributes**: All element attributes
- **Accessibility Info**: ARIA attributes and accessibility properties
- **CSS Properties**: Key computed styles

Each section has a copy button for easy copying.

### New Validation Run
To start fresh with new data:
1. Click "New Run" in the dashboard header
2. Confirm that you want to clear current validation data
3. You'll return to the upload screen

## Understanding Results

### Status Categories
- **TP** (True Positive): Element correctly found
- **FP** (False Positive): Element found but incorrect
- **FN** (False Negative): Element should exist but not found
- **Invalid**: Element correctly not found
- **Review**: Element needs further review
- **Pending**: Not yet validated

### Statistics Dashboard
The top of the panel shows:
- **URLs**: Number of unique URLs in dataset
- **Nodes**: Total number of elements to validate
- **TP/FP/FN/Invalid/Review**: Count of elements in each category
- **Pending**: Number of elements not yet validated

## Tips and Best Practices

1. **Use precise selectors**: More specific selectors are less likely to break with page changes
2. **Break up large CSV files**: For better performance, keep files under 1,000 rows
3. **Add detailed comments**: They will help during result analysis
4. **Use manual mode** for critical validations that need human judgment
5. **Use automated mode** for initial screening of large datasets
6. **Dock DevTools to bottom** for optimal UI experience
7. **Check the export regularly** to avoid losing data
8. **Use "Needs Review"** for elements you're uncertain about
9. **Watch for false positives**: Sometimes incorrect elements may match a selector

## Troubleshooting

### Common Issues

#### CSV Import Fails
- Check that your CSV has the correct column headers (`url`, `targetNode`)
- Ensure URLs include the protocol (http:// or https://)
- Check for special characters that might need escaping

#### Elements Not Being Found
- Verify the selector works in Chrome Console (`document.querySelector('your-selector')`)
- Try alternative selector formats (XPath, JavaScript expression)
- Check if the element loads dynamically after page load

#### UI Display Issues
- Dock DevTools to bottom for optimal experience
- Increase browser window width if UI seems cramped
- Try refreshing the DevTools panel

#### Navigation Problems
- Ensure URLs are accessible from your current network
- Check for page redirects that might affect element presence
- Verify URL formatting is correct (including protocol)

#### Extension Not Responding
- Refresh the DevTools panel
- Close and reopen DevTools
- Reload the page you're testing

## Keyboard Shortcuts

For efficient validation:
- Tab through status buttons
- Enter to select a status
- Alt+N (Windows/Linux) or Option+N (Mac) for Next URL
- Ctrl+S (Windows/Linux) or Cmd+S (Mac) to save comments

## Getting Help

If you encounter issues not covered in this guide:
- Check the project GitHub repository for known issues
- Submit a new issue with detailed steps to reproduce
- Include browser version and operating system information
