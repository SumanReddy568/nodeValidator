# Node Validator

## Overview
Node Validator is a Chrome DevTools extension designed for web QA and testing teams. It allows users to validate HTML elements across multiple URLs using CSS selectors. The extension provides a dedicated DevTools panel for easy validation and result management.

## Features
- DevTools panel integration for better workflow
- Upload CSV files with URLs and target node selectors
- Auto-navigate through URLs and highlight target elements
- Categorize elements with validation statuses:
  - True Positive (TP)
  - False Positive (FP)
  - False Negative (FN)
  - Not Valid
- Add comments for each validation
- Export results with validation status and comments
- Real-time progress tracking
- Summary statistics dashboard
- Modern and user-friendly interface
- Copy URL and selectors with one click
- GitHub integration

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/sumanreddy568/nodeValidator.git
   ```
2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" using the toggle in the top-right corner
   - Click "Load unpacked" and select the `nodeValidator` directory

## Usage
1. Open Chrome DevTools (F12 or Cmd/Ctrl+Shift+I)
2. Navigate to the "Node Validator" panel
3. Upload a CSV file with the required columns:
   - `url`: The full URL to visit
   - `targetNode`: CSS selector for the element to validate
4. Use the validation dashboard to:
   - Start/Stop validation process
   - Mark elements with appropriate status
   - Add optional comments
   - Navigate between URLs
   - Track progress
   - View validation statistics
5. Export results when finished

## CSV Format
### Input CSV
```csv
url,targetNode
https://example.com,#header
https://example.com/page,.main-content > h1
```

### Output CSV
```csv
url,targetNode,status,comments
https://example.com,#header,TP,Element found and verified
https://example.com/page,.main-content > h1,FN,Element structure changed
```

## Contributing
We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.