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

- **`index.html`**: The main HTML file that sets up the purchase order form and includes the library.
- **`ai-ocr-library.js`**: Single-file library that composes the functionality from the individual modules at runtime.
- **`add_rows.js`**: Provides the `window.$addRows` function to programmatically add and fill rows in the form.
- **`ocr-utils.js`**: Shared normalization utilities used by both OCR and CSV import flows.
- **`csv-import.js`**: Client-side CSV importer with header mapping and preview.
- **`ocr.js`**: The core of the OCR functionality and modal UI.
- **`test-template.csv`**: Example CSV that can be imported directly to add rows (headers align with internal fields).

## Setup and Usage

1.  **Open `index.html`** in a modern web browser.
2.  **Click "OCR Upload"** to open the modal.
3.  For OCR:
    - Enter your Gemini API key when prompted.
    - Drag and drop image files (JPEG or PNG) or click to select.
    - Click "Submit for OCR" to extract and auto-fill rows.
4.  For CSV Import (no API key required):
    - In the same modal, choose a `.csv` file.
    - Map CSV headers to system fields and review the live preview.
    - Click "Add Rows from CSV" to normalize and auto-fill rows using the same `$addRows` pipeline.
5.  **Review Results**: Verify the populated fields.

## Technical Details

- **Frontend**: Plain HTML/JS; no build step required.
- **Single-file Library (Recommended)**: Include one script:
  ```html
  <script src="ai-ocr-library.js"></script>
  ```
  This library already “calls each file” by bundling the logic from:
  - [`ocr-utils.js`](ocr-utils.js) → normalization
  - [`csv-import.js`](csv-import.js) → CSV importer (loads PapaParse from CDN)
  - [`add_rows.js`](add_rows.js) → window.$addRows form filler
  - [`ocr.js`](ocr.js) → OCR modal and orchestration

- **Alternative (Multi-file Load)**: If you prefer, you can load scripts individually in this order:
  ```html
  <script src="ocr-utils.js"></script>
  <script src="csv-import.js"></script>
  <script src="add_rows.js"></script>
  <script src="ocr.js"></script>
  ```

- **OCR**: Google Gemini API via `fetch` from the browser.
- **CSV**: PapaParse loaded on-demand from CDN by [`csv-import.js`](csv-import.js).
- **API Key Management**: Stored in `sessionStorage` for the session.

## Serverless/No Node.js

This project now runs entirely in the browser — no Node.js runtime, no bundler, and no build step required.

- Open the demo directly by double-clicking [index.html](index.html).
- All logic runs as plain browser scripts:
  - [ocr-utils.js](ocr-utils.js)
  - [csv-import.js](csv-import.js)
  - [add_rows.js](add_rows.js)
  - [ocr.js](ocr.js)

### Script loading order (for hosts embedding the library)

Load the scripts in this order to ensure globals are available:

```html
&lt;script src="ocr-utils.js"&gt;&lt;/script&gt;
&lt;script src="csv-import.js"&gt;&lt;/script&gt;
&lt;script src="add_rows.js"&gt;&lt;/script&gt;
&lt;script src="ocr.js"&gt;&lt;/script&gt;
```

- PapaParse is loaded on-demand from CDN by [csv-import.js](csv-import.js).
- The OCR flow calls Google Gemini via `fetch` directly from the browser in [ocr.js](ocr.js).

### Deployment

Any static hosting works (no server code needed):
- GitHub Pages: Commit and push; set Pages to serve from your default branch.
- Netlify/Vercel (static): Drag-and-drop or point to the repo; no build command required.
- Local: Just open [index.html](index.html) in a modern browser.

### Notes

- The file [package.json](package.json) remains only for repository metadata. It has no scripts and no devDependencies.
- If you previously used a bundled artifact (`dist/ai-ocr-library.js`), it has been removed. The page now includes the individual scripts as shown above.
