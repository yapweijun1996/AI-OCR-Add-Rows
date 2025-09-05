# AI OCR Purchase Order Assistant

This project is a web-based demonstration of an AI-powered Optical Character Recognition (OCR) tool designed to automate data entry for purchase order forms. It allows users to upload images of documents, extracts line-item data using the Google Gemini API, and automatically populates a web form with the extracted information.

## Features

- **AI-Powered OCR**: Utilizes the Google Gemini API to extract structured data from images.
- **Dynamic Form Population**: Automatically adds and fills rows in a purchase order form with the extracted data.
- **Self-Contained UI**: The OCR functionality is delivered as a self-contained JavaScript library that injects its own UI (modal, buttons, styles) to minimize conflicts with the host page.
- **User-Friendly Interface**: Features a drag-and-drop file upload zone, image previews, and a loading indicator during processing.
- **On-Demand API Key**: Prompts the user for their Gemini API key and stores it securely in `sessionStorage` for the duration of the browser session.
- **Image Compression**: Compresses images on the client-side before uploading to reduce bandwidth and improve performance.
- **Human-Like Data Entry**: The `add_rows.js` script simulates human typing and interaction with form fields, ensuring compatibility with forms that have complex event handling.

## File Structure

- **`index.html`**: The main HTML file that sets up the purchase order form and includes the necessary scripts. It also contains a demo script to populate the form with sample data on page load.
- **`ocr.js`**: The core of the OCR functionality. This script handles the UI injection, file uploads, image compression, and communication with the Gemini API.
- **`add_rows.js`**: A utility script that provides the `window.$addRows` function to programmatically add and fill rows in the form.
- **`style.css`**: Contains basic styling for the purchase order form.

## Setup and Usage

1.  **Open `index.html`**: Open the [`index.html`](index.html) file in a modern web browser.
2.  **Click "OCR Upload"**: Click the "OCR Upload" button to open the file upload modal.
3.  **Enter API Key**: When prompted, enter your Google Gemini API key. This key will be stored in `sessionStorage` and will be cleared when you close the browser tab.
4.  **Upload Images**: Drag and drop image files (JPEG or PNG) into the designated area, or click to select files from your computer.
5.  **Submit for OCR**: Once the images are uploaded, click the "Submit for OCR" button.
6.  **Review Results**: The script will process the images, extract the data, and automatically populate the purchase order form with the results.

## Technical Details

- **Frontend**: The application is built with plain HTML, CSS, and JavaScript, with no external frameworks or libraries.
- **API**: It uses the Google Gemini API for its powerful OCR capabilities.
- **API Key Management**: The Gemini API key is handled on the client-side and stored in `sessionStorage`, which means it is automatically cleared when the browser session ends. This is a simple approach for a demo application, but for a production environment, it is recommended to manage API keys on the server-side.
- **Modularity**: The OCR functionality in [`ocr.js`](ocr.js) is designed to be a self-contained library that can be easily integrated into other web pages with minimal setup.
