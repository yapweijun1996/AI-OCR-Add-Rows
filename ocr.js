/**
 * @file AI OCR Library
 * @description A self-contained library for adding OCR functionality to a webpage.
 * It injects its own UI (modal, button) and styles to prevent conflicts.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Ensure OCR UI and styles are injected into the page to make this script self-contained.
    injectAiOcrStyles();
    injectAiOcrUi();

    const aiOcrModal = document.getElementById('ai-ocr-modal');
    const aiOcrUploadBtn = document.getElementById('ai-ocr-UploadBtn');
    const aiOcrCloseButton = aiOcrModal?.querySelector('.ai-ocr-close-button');
    const aiOcrDropZone = document.getElementById('ai-ocr-drop-zone');
    const aiOcrFileInput = document.getElementById('ai-ocr-file-input');
    const aiOcrPreviewContainer = document.getElementById('ai-ocr-preview-container');
    const aiOcrSubmitBtn = document.getElementById('ai-ocr-submit');
    const aiOcrLoadingOverlay = document.getElementById('ai-ocr-loading-overlay');

    let uploadedFiles = [];
    const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // <-- IMPORTANT: Replace with your API key

    // ==========================================================================================
    // SECTION: Style and UI Injection (to make the script a self-contained library)
    // ==========================================================================================
    
    function injectAiOcrStyles() {
        const styleId = 'ai-ocr-modal-styles';
        if (document.getElementById(styleId)) return;

        const styles = `
            .ai-ocr-modal {
                position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%;
                overflow: auto; background-color: rgba(0,0,0,0.4);
            }
            .ai-ocr-modal-content {
                background-color: #fefefe; margin: 15% auto; padding: 20px;
                border: 1px solid #888; width: 80%; max-width: 600px;
            }
            .ai-ocr-close-button {
                color: #aaa; float: right; font-size: 28px; font-weight: bold;
            }
            .ai-ocr-close-button:hover, .ai-ocr-close-button:focus {
                color: black; text-decoration: none; cursor: pointer;
            }
            #ai-ocr-drop-zone {
                border: 2px dashed #ccc; border-radius: 5px; padding: 25px;
                text-align: center; cursor: pointer;
            }
            #ai-ocr-drop-zone.ai-ocr-dragover {
                background-color: #f0f0f0;
            }
            #ai-ocr-file-input {
                display: none;
            }
            #ai-ocr-preview-container {
                margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px;
            }
            .ai-ocr-preview-image {
                width: 100px; height: 100px; object-fit: cover; cursor: pointer;
                transition: transform 0.2s;
            }
            .ai-ocr-preview-image:hover {
                transform: scale(1.05);
            }
            #ai-ocr-image-preview-lightbox {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.8); display: flex;
                justify-content: center; align-items: center; z-index: 1001; cursor: pointer;
            }
            #ai-ocr-image-preview-lightbox img {
                max-width: 90vw; max-height: 90vh; object-fit: contain;
            }
            #ai-ocr-image-preview-lightbox .ai-ocr-close-lightbox {
                position: absolute; top: 20px; right: 35px; color: #fff;
                font-size: 40px; font-weight: bold; cursor: pointer;
            }
            .ai-ocr-controls {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #eee;
            }
            .ai-ocr-controls label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .ai-ocr-controls select {
                width: 100%;
                padding: 8px;
                margin-bottom: 10px;
                border-radius: 4px;
                border: 1px solid #ccc;
            }
            .ai-ocr-disclaimer {
                font-size: 0.8em;
                color: #666;
                text-align: center;
                margin-top: 10px;
            }
            #ai-ocr-loading-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.5); display: flex;
                justify-content: center; align-items: center; z-index: 1000;
            }
            .ai-ocr-typing-indicator {
                display: flex; justify-content: center; align-items: center;
            }
            .ai-ocr-typing-indicator span {
                width: 10px; height: 10px; margin: 0 5px; background-color: #fff;
                border-radius: 50%; animation: ai-ocr-typing 1.4s infinite both;
            }
            .ai-ocr-typing-indicator span:nth-child(1) { animation-delay: 0.2s; }
            .ai-ocr-typing-indicator span:nth-child(2) { animation-delay: 0.4s; }
            .ai-ocr-typing-indicator span:nth-child(3) { animation-delay: 0.6s; }
            @keyframes ai-ocr-typing {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(0.5); opacity: 0.5; }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    function injectAiOcrUi() {
        const body = document.body;

        if (!document.getElementById('ai-ocr-modal')) {
            const modal = document.createElement('div');
            modal.id = 'ai-ocr-modal';
            modal.className = 'ai-ocr-modal';
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="ai-ocr-modal-content">
                    <span class="ai-ocr-close-button">&times;</span>
                    <h2>Upload Images for OCR</h2>
                    <div id="ai-ocr-drop-zone">
                        <p>Drag & drop files here or click to select files</p>
                        <input type="file" id="ai-ocr-file-input" multiple accept="image/jpeg, image/png">
                    </div>
                    <div id="ai-ocr-preview-container"></div>
                    <div class="ai-ocr-controls">
                        <label for="ai-ocr-model-select">Select AI Model:</label>
                        <select id="ai-ocr-model-select">
                            <option value="gemini-2.5-flash" selected>Gemini 2.5 Flash (Fast)</option>
                            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Fastest)</option>
                            <option value="gemma-3-27b-it">Gemma 3 27B (Quality)</option>
                            <option value="gemma-3-12b-it">Gemma 3 12B (Balanced)</option>
                        </select>
                        <p class="ai-ocr-disclaimer">Disclaimer: AI may make mistakes. Please verify the extracted data.</p>
                    </div>
                    <button id="ai-ocr-submit">Submit for OCR</button>
                </div>
            `;
            body.appendChild(modal);
        }

        if (!document.getElementById('ai-ocr-loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'ai-ocr-loading-overlay';
            overlay.style.display = 'none';
            overlay.innerHTML = `
                <div class="ai-ocr-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
            body.appendChild(overlay);
        }

        if (!document.getElementById('ai-ocr-image-preview-lightbox')) {
            const lightbox = document.createElement('div');
            lightbox.id = 'ai-ocr-image-preview-lightbox';
            lightbox.style.display = 'none';
            lightbox.innerHTML = `
                <span class="ai-ocr-close-lightbox">&times;</span>
                <img src="" alt="Image Preview">
            `;
            body.appendChild(lightbox);

            lightbox.addEventListener('click', () => {
                lightbox.style.display = 'none';
            });
        }
    }

    // ==========================================================================================
    // SECTION: Modal Handling
    // ==========================================================================================

    aiOcrUploadBtn?.addEventListener('click', () => {
        aiOcrModal.style.display = 'block';
    });

    aiOcrCloseButton?.addEventListener('click', () => {
        aiOcrModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === aiOcrModal) {
            aiOcrModal.style.display = 'none';
        }
    });

    // ==========================================================================================
    // SECTION: Drag and Drop Functionality
    // ==========================================================================================

    aiOcrDropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        aiOcrDropZone.classList.add('ai-ocr-dragover');
    });

    aiOcrDropZone.addEventListener('dragleave', () => {
        aiOcrDropZone.classList.remove('ai-ocr-dragover');
    });

    aiOcrDropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        aiOcrDropZone.classList.remove('ai-ocr-dragover');
        const files = event.dataTransfer.files;
        handleFiles(files);
    });

    aiOcrDropZone.addEventListener('click', () => {
        aiOcrFileInput.click();
    });

    aiOcrFileInput.addEventListener('change', () => {
        const files = aiOcrFileInput.files;
        handleFiles(files);
    });

    // ==========================================================================================
    // SECTION: File Handling and Preview
    // ==========================================================================================

    function handleFiles(files) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                uploadedFiles.push(file);
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.classList.add('ai-ocr-preview-image');
                    
                    img.addEventListener('click', () => {
                        const lightbox = document.getElementById('ai-ocr-image-preview-lightbox');
                        const lightboxImg = lightbox.querySelector('img');
                        if (lightbox && lightboxImg) {
                            lightboxImg.src = img.src;
                            lightbox.style.display = 'flex';
                        }
                    });

                    aiOcrPreviewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        }
    }

    // ==========================================================================================
    // SECTION: Image Compression and API Submission
    // ==========================================================================================

    aiOcrSubmitBtn.addEventListener('click', async () => {
        if (uploadedFiles.length === 0) {
            alert('Please upload at least one image.');
            return;
        }

        if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
            alert('Please replace "YOUR_GEMINI_API_KEY" with your actual Gemini API key in ocr.js.');
            return;
        }

        aiOcrLoadingOverlay.style.display = 'flex';

        const compressedFiles = await Promise.all(uploadedFiles.map(compressImage));
        const ocrResults = await getOcrResults(compressedFiles);
        
        if (ocrResults) {
            window.$addRows(ocrResults);
        }

        // Clear the uploaded files and preview
        uploadedFiles = [];
        aiOcrPreviewContainer.innerHTML = '';
        aiOcrFileInput.value = ''; // Reset file input to allow re-uploading the same file
        aiOcrModal.style.display = 'none';
        aiOcrLoadingOverlay.style.display = 'none';
    });

    /**
     * Compresses an image to a maximum size of 100KB.
     * @param {File} file - The image file to compress.
     * @returns {Promise<File>} The compressed image file.
     */
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    let width = img.width;
                    let height = img.height;

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    let quality = 0.9;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    while (dataUrl.length > 100 * 1024 && quality > 0.1) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    fetch(dataUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                            resolve(compressedFile);
                        })
                        .catch(reject);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ==========================================================================================
    // SECTION: OCR Parsing & Normalization Helpers
    // ==========================================================================================
    const FIELD_SPEC = Object.freeze({
        string: ['code','brand','desc_short','desc_long','uom','uomstk','acct_disp','dept_disp','proj_disp','rqt_day','rqt_mth','rqt_yr','batchnum'],
        number: ['qty','unit_list','disc_pct','unit_price','amount','unit_w_gst','conv','qty_uomstk','uprice_uomstk'],
        boolean: ['gst']
    });

    function normalizeNumber(value) {
        if (value == null) return null;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        const str = String(value)
            .replace(/[\s,]/g, '')
            .replace(/[$]/g, '')
            .replace(/[A-Za-z%]+/g, '');
        const num = parseFloat(str);
        return Number.isFinite(num) ? num : null;
    }

    function coerceBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value > 0;
        if (typeof value === 'string') {
            const s = value.trim().toLowerCase();
            if (['y','yes','true','t','1','gst','incl','included'].includes(s)) return true;
            const n = normalizeNumber(value);
            return n != null ? n > 0 : false;
        }
        return false;
    }

    function normalizeAndValidate(items) {
        const arr = Array.isArray(items) ? items : (items ? [items] : []);
        return arr.map((raw) => {
            const out = {};
            for (const k of FIELD_SPEC.string) {
                let v = raw?.[k];
                if (v == null) v = '';
                v = Array.isArray(v) ? v.join(' ') : v;
                out[k] = String(v ?? '').replace(/\s+/g, ' ').trim();
            }
            for (const k of FIELD_SPEC.number) {
                out[k] = normalizeNumber(raw?.[k]);
            }
            for (const k of FIELD_SPEC.boolean) {
                out[k] = coerceBoolean(raw?.[k]);
            }
            // Ensure date parts are zero-padded 2-digit day/month and 4-digit year if present
            out.rqt_day = out.rqt_day ? String(out.rqt_day).padStart(2,'0') : '';
            out.rqt_mth = out.rqt_mth ? String(out.rqt_mth).padStart(2,'0') : '';
            out.rqt_yr = out.rqt_yr ? String(out.rqt_yr).padStart(4,'0') : '';
            
            return out;
        });
    }

    function safeJsonExtract(text) {
        if (!text) return [];
        const cleaned = String(text).replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        try {
            const parsed = JSON.parse(cleaned);
            return normalizeAndValidate(parsed);
        } catch (_) {
            // Try to locate first '[' and last ']' and parse that segment.
            const start = cleaned.indexOf('[');
            const end = cleaned.lastIndexOf(']');
            if (start !== -1 && end !== -1 && end > start) {
                const slice = cleaned.slice(start, end + 1);
                try {
                    const parsed = JSON.parse(slice);
                    return normalizeAndValidate(parsed);
                } catch (_) {}
            }
        }
        return [];
    }

    /**
     * Sends images to the Gemini API and returns the extracted data, with a retry mechanism.
     * @param {Array<File>} files - The compressed image files.
     * @returns {Promise<Array<object>|null>} The extracted row data.
     */
    async function getOcrResults(files) {
        const selectedModel = document.getElementById('ai-ocr-model-select').value;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;
        let retries = 3;

        const requests = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64Image = event.target.result.split(',')[1];
                    resolve({
                        inline_data: {
                            mime_type: file.type,
                            data: base64Image
                        }
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        const imageParts = await Promise.all(requests);

        const PROMPT = [
            'Task: Extract structured line items from the provided image(s).',
            'Output must be JSON ONLY: an array of objects. No extra text.',
            'Fields and types:',
            '- code: string',
            '- brand: string',
            '- desc_short: string (Primary item description, max 55 chars)',
            '- desc_long: string (Remarks, comments, or descriptions > 55 chars)',
            '- uom: string',
            '- qty: number',
            '- unit_list: number',
            '- disc_pct: number',
            '- unit_price: number',
            '- amount: number',
            '- unit_w_gst: number',
            '- conv: number',
            '- qty_uomstk: number',
            '- uprice_uomstk: number',
            '- uomstk: string',
            '- gst: number (1 if GST applies else 0)',
            '- acct_disp: string',
            '- dept_disp: string',
            '- proj_disp: string',
            '- rqt_day: string (2-digit, e.g. "05")',
            '- rqt_mth: string (2-digit, e.g. "09")',
            '- rqt_yr: string (4-digit, e.g. "2025")',
            '- batchnum: string',
            'Rules:',
            '- If a field is unavailable, use empty string "" for strings and null for numbers.',
            '- Normalize numbers: remove symbols and thousand separators; use dot as decimal.',
            '- Do not add extra fields.',
            '--- START EXAMPLES ---',
            'Example 1 (Full Data):',
            '[{"code":"ABC123","brand":"Acme","desc_short":"Widget","desc_long":"High tensile widget 10mm","uom":"EA","qty":10,"unit_list":1.5,"disc_pct":0,"unit_price":1.5,"amount":15,"unit_w_gst":1.61,"conv":1,"qty_uomstk":10,"uprice_uomstk":1.5,"uomstk":"EA","gst":1,"acct_disp":"S-100","dept_disp":"D-20","proj_disp":"P-03","rqt_day":"05","rqt_mth":"09","rqt_yr":"2025","batchnum":"B123"}]',
            'Example 2 (Missing Data):',
            '[{"code":"XYZ-987","brand":"","desc_short":"Bolt M5","desc_long":"Stainless Steel Bolt M5x20mm","uom":"PC","qty":100,"unit_list":0.2,"disc_pct":null,"unit_price":0.2,"amount":20,"unit_w_gst":null,"conv":1,"qty_uomstk":100,"uprice_uomstk":0.2,"uomstk":"PC","gst":0,"acct_disp":"","dept_disp":"","proj_disp":"","rqt_day":"","rqt_mth":"","rqt_yr":"","batchnum":""}]',
            'Example 3 (Multi-line Description):',
            '[{"code":"G-550","brand":"Generic","desc_short":"Grease Lubricant","desc_long":"High-performance synthetic grease. Temp range: -40C to 150C.","uom":"TUBE","qty":2,"unit_list":25,"disc_pct":10,"unit_price":22.5,"amount":45,"unit_w_gst":48.15,"conv":1,"qty_uomstk":2,"uprice_uomstk":22.5,"uomstk":"TUBE","gst":1,"acct_disp":"","dept_disp":"","proj_disp":"","rqt_day":"15","rqt_mth":"10","rqt_yr":"2025","batchnum":""}]',
            '--- END EXAMPLES ---',
            'Return ONLY the JSON array.'
        ].join('\n');

        const payload = {
            contents: [{
                parts: [
                    { text: PROMPT },
                    ...imageParts
                ]
            }],
            generationConfig: {
                temperature: 0,
                topK: 1,
                topP: 0.1
            }
        };

        while (retries > 0) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.status === 503) {
                    retries--;
                    if (retries > 0) {
                        console.warn(`API returned 503, retrying... (${retries} attempts left)`);
                        await new Promise(res => setTimeout(res, 2000));
                        continue;
                    } else {
                        throw new Error('The model is overloaded. Please try again later.');
                    }
                }

                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }

                const data = await response.json();
                const parts = data?.candidates?.[0]?.content?.parts || [];
                const text = parts.map(p => p.text || '').join('\n').trim();
                const items = safeJsonExtract(text);
                return items;
            } catch (error) {
                console.error('Error during OCR processing:', error);
                alert('An error occurred during OCR processing. Please check the console for details.');
                return null;
            }
        }
        return null;
    }
});