# AI OCR Purchase Order Assistant

This project is a web-based demonstration of an AI-powered Optical Character Recognition (OCR) tool designed to automate data entry for purchase order forms. It allows users to upload images of documents, extracts line-item data using the Google Gemini API, and automatically populates a web form with the extracted information.

## Features

- **AI-Powered OCR**: Utilizes the Google Gemini API to extract structured data from images.
- **CSV Import with Mapping**: Upload a CSV, map its headers to internal fields, preview, normalize, and add rows without using OCR.
- **Dynamic Form Population**: Automatically adds and fills rows in a purchase order form with the extracted data.
- **Self-Contained UI**: The OCR functionality is delivered as a self-contained JavaScript library that injects its own UI (modal, buttons, styles) to minimize conflicts with the host page.
- **User-Friendly Interface**: Features a drag-and-drop file upload zone, image previews, CSV header mapping preview, and a loading indicator during processing.
- **On-Demand API Key**: Prompts the user for their Gemini API key and stores it securely in `sessionStorage` for the duration of the browser session.
- **Image Compression**: Compresses images on the client-side before uploading to reduce bandwidth and improve performance.
- **Human-Like Data Entry**: The `add_rows.js` script simulates human typing and interaction with form fields, ensuring compatibility with forms that have complex event handling.

## File Structure

- **`index.html`**: The main HTML file that sets up the purchase order form and includes the necessary scripts. It also contains a demo script to populate the form with sample data on page load.
- **`add_rows.js`**: A utility script that provides the `window.$addRows` function to programmatically add and fill rows in the form.
- **`ocr-utils.js`**: Shared normalization utilities used by both OCR and CSV import flows.
- **`csv-import.js`**: Client-side CSV importer with header mapping and preview.
- **`ocr.js`**: The core of the OCR functionality and modal UI. It now also exposes the CSV import UI and calls into the CSV importer.
- **`test-template.csv`**: Example CSV that can be imported directly to add rows (headers align with internal fields).

## Setup and Usage

1.  **Open `index.html`**: Open the [`index.html`](index.html) file in a modern web browser.
2.  **Click "OCR Upload"**: Click the "OCR Upload" button to open the modal.
3.  For OCR:
    - Enter your Gemini API key when prompted.
    - Drag and drop image files (JPEG or PNG) or click to select.
    - Click "Submit for OCR" to extract and auto-fill rows.
4.  For CSV Import (no API key required):
    - In the same modal, use the "Or import CSV" section to choose a `.csv` file.
    - Map CSV headers to system fields in the mapping table and review the live preview.
    - Click "Add Rows from CSV" to normalize and auto-fill rows using the same `$addRows` pipeline.
5.  **Review Results**: Verify the populated fields. The automation simulates user input to maintain compatibility with legacy form handlers.

## Technical Details

- **Frontend**: Plain HTML, CSS, and JavaScript; no build step required.
- **OCR**: Google Gemini API via the client. The prompt enforces JSON-only output which is parsed and normalized.
- **CSV**: Client-side parsing via PapaParse CDN with a header-mapping UI and preview. Values are normalized using the same pipeline as OCR.
- **API Key Management**: The Gemini API key is stored in `sessionStorage` for the session. For production, move key handling server-side.
- **Modularity**:
  - OCR/CSV share normalization in [`ocr-utils.js`](ocr-utils.js).
  - CSV import logic in [`csv-import.js`](csv-import.js).
  - Modal UI and orchestration in [`ocr.js`](ocr.js).
