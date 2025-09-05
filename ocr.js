/**
 * @file AI OCR Library (Refactored)
 * @description Self-contained OCR UI and client for Google Gemini. Focused on clarity and maintainability.
 */
document.addEventListener('DOMContentLoaded', () => {
  initAiOcr();
});
function initAiOcr() {
  // ==========================================================================================
  // SECTION: Constants
  // ==========================================================================================
  const CSS_IDS = Object.freeze({
    modal: 'ai-ocr-modal',
    dropZone: 'ai-ocr-drop-zone',
    fileInput: 'ai-ocr-file-input',
    previewContainer: 'ai-ocr-preview-container',
    submit: 'ai-ocr-submit',
    loadingOverlay: 'ai-ocr-loading-overlay',
    modelSelect: 'ai-ocr-model-select',
    lightbox: 'ai-ocr-image-preview-lightbox',
    uploadBtn: 'ai-ocr-UploadBtn'
  });
  const CONFIG = Object.freeze({
    images: { maxSizeKB: 100, jpegQualityStart: 0.9, jpegQualityMin: 0.1, jpegQualityStep: 0.1 },
    api: { defaultModel: 'gemini-2.5-flash', retries: 3, retryDelayMs: 2000 }
  });
  // ==========================================================================================
  // SECTION: State
  // ==========================================================================================
  const state = { files: [], apiKey: '' };
  // ==========================================================================================
  // SECTION: Bootstrap
  // ==========================================================================================
  injectAiOcrStyles();
  injectAiOcrUi();
  // Cache DOM
  const dom = {
    modal: document.getElementById(CSS_IDS.modal),
    uploadBtn: document.getElementById(CSS_IDS.uploadBtn),
    closeBtn: document.querySelector(`#${CSS_IDS.modal} .ai-ocr-close-button`),
    dropZone: document.getElementById(CSS_IDS.dropZone),
    fileInput: document.getElementById(CSS_IDS.fileInput),
    previewContainer: document.getElementById(CSS_IDS.previewContainer),
    submitBtn: document.getElementById(CSS_IDS.submit),
    loadingOverlay: document.getElementById(CSS_IDS.loadingOverlay),
    modelSelect: document.getElementById(CSS_IDS.modelSelect),
    lightbox: document.getElementById(CSS_IDS.lightbox)
  };
  // Bind events
  bindModalEvents();
  bindDropUploadEvents();
  bindSubmit();
  // ==========================================================================================
  // SECTION: Event Bindings
  // ==========================================================================================
  function bindModalEvents() {
    dom.uploadBtn?.addEventListener('click', () => openModal());
    dom.closeBtn?.addEventListener('click', () => closeModal());
    window.addEventListener('click', (evt) => { if (evt.target === dom.modal) closeModal(); });
    // lightbox click to close
    dom.lightbox?.addEventListener('click', () => { dom.lightbox.style.display = 'none'; });
  }
  function bindDropUploadEvents() {
    if (!dom.dropZone || !dom.fileInput) return;
    dom.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dom.dropZone.classList.add('ai-ocr-dragover'); });
    dom.dropZone.addEventListener('dragleave', () => { dom.dropZone.classList.remove('ai-ocr-dragover'); });
    dom.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dom.dropZone.classList.remove('ai-ocr-dragover');
      const files = e.dataTransfer?.files;
      if (files) handleFiles(files);
    });
    dom.dropZone.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', () => { const files = dom.fileInput.files; if (files) handleFiles(files); });
  }
  function bindSubmit() {
    dom.submitBtn?.addEventListener('click', async () => {
      if (state.files.length === 0) { alert('Please upload at least one image.'); return; }
      state.apiKey = getApiKey();
      if (!state.apiKey) { alert('A valid Gemini API key is required to proceed.'); return; }
      setOverlayVisible(true);
      try {
        const compressed = await Promise.all(state.files.map(compressImage));
        const results = await getOcrResults(compressed);
        if (results && Array.isArray(results) && results.length) {
          if (typeof window.$addRows === 'function') {
            window.$addRows(results);
          } else {
            console.warn('$addRows is not available on window. Skipping automatic row fill.');
          }
        }
        resetAfterSubmission();
      } catch (err) {
        console.error('Error during OCR processing:', err);
        alert('An error occurred during OCR processing. Please check the console for details.');
      } finally {
        setOverlayVisible(false);
      }
    });
  }
  // ==========================================================================================
  // SECTION: UI Helpers
  // ==========================================================================================
  function openModal() { if (dom.modal) dom.modal.style.display = 'block'; }
  function closeModal() { if (dom.modal) dom.modal.style.display = 'none'; }
  function setOverlayVisible(show) { if (dom.loadingOverlay) dom.loadingOverlay.style.display = show ? 'flex' : 'none'; }
  function resetAfterSubmission() {
    state.files = [];
    if (dom.previewContainer) dom.previewContainer.innerHTML = '';
    if (dom.fileInput) dom.fileInput.value = '';
    closeModal();
  }
  // ==========================================================================================
  // SECTION: File Handling & Preview
  // ==========================================================================================
  function handleFiles(fileList) {
    for (const file of fileList) {
      if (!file?.type?.startsWith('image/')) continue;
      state.files.push(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const src = evt.target?.result;
        if (!src) return;
        const img = document.createElement('img');
        img.src = src;
        img.className = 'ai-ocr-preview-image';
        img.addEventListener('click', () => showInLightbox(src));
        dom.previewContainer?.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
  }
  function showInLightbox(src) {
    const box = dom.lightbox;
    if (!box) return;
    const img = box.querySelector('img');
    if (img) img.src = src;
    box.style.display = 'flex';
  }
  // ==========================================================================================
  // SECTION: API Key Handling
  // ==========================================================================================
  /**
   * Retrieves the Gemini API key, first from session storage, then by prompting the user.
   * The key is stored in session storage to persist for the duration of the browser session.
   * @returns {string|null} The API key or null if the user cancels the prompt.
   */
  function getApiKey() {
    const stored = sessionStorage.getItem('geminiApiKey');
    if (stored) return stored;
    const entered = prompt('Please enter your Gemini API key:');
    if (entered) { sessionStorage.setItem('geminiApiKey', entered); return entered; }
    return null;
  }
  // ==========================================================================================
  // SECTION: Image Compression
  // ==========================================================================================
  /**
   * Compress an image file toward CONFIG.images.maxSizeKB using canvas.toBlob.
   * Keeps original dimensions; reduces JPEG quality gradually.
   * @param {File} file
   * @returns {Promise<File>}
   */
  async function compressImage(file) {
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let q = CONFIG.images.jpegQualityStart;
    let blob = await canvasToBlob(canvas, 'image/jpeg', q);
    while (blob && blob.size > CONFIG.images.maxSizeKB * 1024 && q > CONFIG.images.jpegQualityMin) {
      q = Math.max(CONFIG.images.jpegQualityMin, q - CONFIG.images.jpegQualityStep);
      blob = await canvasToBlob(canvas, 'image/jpeg', q);
    }
    const outBlob = blob || await canvasToBlob(canvas, 'image/jpeg', CONFIG.images.jpegQualityMin);
    return new File([outBlob], file.name, { type: 'image/jpeg' });
  }
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
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
    const str = String(value).replace(/[\s,]/g,'').replace(/[$]/g,'').replace(/[A-Za-z%]+/g,'');
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
        out[k] = String(v ?? '').replace(/\s+/g,' ').trim();
      }
      for (const k of FIELD_SPEC.number) { out[k] = normalizeNumber(raw?.[k]); }
      for (const k of FIELD_SPEC.boolean) { out[k] = coerceBoolean(raw?.[k]); }
      out.rqt_day = out.rqt_day ? String(out.rqt_day).padStart(2,'0') : '';
      out.rqt_mth = out.rqt_mth ? String(out.rqt_mth).padStart(2,'0') : '';
      out.rqt_yr = out.rqt_yr ? String(out.rqt_yr).padStart(4,'0') : '';
      return out;
    });
  }
  function safeJsonExtract(text) {
    if (!text) return [];
    const cleaned = String(text).replace(/```(?:json)?/g,'').replace(/```/g,'').trim();
    try {
      return normalizeAndValidate(JSON.parse(cleaned));
    } catch (_) {
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return normalizeAndValidate(JSON.parse(cleaned.slice(start, end + 1)));
        } catch (_) {}
      }
    }
    return [];
  }
  // ==========================================================================================
  // SECTION: Gemini Client
  // ==========================================================================================
  function buildPrompt() {
    return [
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
  }
  /**
   * Sends images to the Gemini API and returns the extracted data.
   * Retries only on 503, all other errors are thrown upward.
   * @param {Array<File>} files
   * @returns {Promise<Array<object>|null>}
   */
  async function getOcrResults(files) {
    const model = dom.modelSelect?.value || CONFIG.api.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.apiKey}`;
    const imageParts = await Promise.all(
      files.map(file => fileToInlineDataPart(file))
    );
    const payload = {
      contents: [{ parts: [{ text: buildPrompt() }, ...imageParts] }],
      generationConfig: { temperature: 0, topK: 1, topP: 0.1 }
    };
    let attempts = CONFIG.api.retries;
    while (attempts > 0) {
      try {
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (resp.status === 503) {
          attempts--;
          if (attempts > 0) {
            console.warn(`API returned 503, retrying... (${attempts} attempts left)`);
            await delay(CONFIG.api.retryDelayMs);
            continue;
          }
          throw new Error('The model is overloaded. Please try again later.');
        }
        if (!resp.ok) throw new Error(`API request failed with status ${resp.status}`);
        const data = await resp.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts.map(p => p.text || '').join('\n').trim();
        return safeJsonExtract(text);
      } catch (e) {
        // Surface once and break
        throw e;
      }
    }
    return null;
  }
  async function fileToInlineDataPart(file) {
    const dataUrl = await readFileAsDataURL(file);
    const base64 = String(dataUrl).split(',')[1];
    return { inline_data: { mime_type: file.type, data: base64 } };
  }
  function delay(ms) { return new Promise(res => setTimeout(res, ms)); }
  // ==========================================================================================
  // SECTION: Style & UI Injection (markup largely unchanged)
  // ==========================================================================================
  function injectAiOcrStyles() {
    const styleId = 'ai-ocr-modal-styles';
    if (document.getElementById(styleId)) return;
    const styles = `
      .ai-ocr-modal { position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
      .ai-ocr-modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 600px; }
      .ai-ocr-close-button { color: #aaa; float: right; font-size: 28px; font-weight: bold; }
      .ai-ocr-close-button:hover, .ai-ocr-close-button:focus { color: black; text-decoration: none; cursor: pointer; }
      #ai-ocr-drop-zone { border: 2px dashed #ccc; border-radius: 5px; padding: 25px; text-align: center; cursor: pointer; }
      #ai-ocr-drop-zone.ai-ocr-dragover { background-color: #f0f0f0; }
      #ai-ocr-file-input { display: none; }
      #ai-ocr-preview-container { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; }
      .ai-ocr-preview-image { width: 100px; height: 100px; object-fit: cover; cursor: pointer; transition: transform 0.2s; }
      .ai-ocr-preview-image:hover { transform: scale(1.05); }
      #ai-ocr-image-preview-lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 1001; cursor: pointer; }
      #ai-ocr-image-preview-lightbox img { max-width: 90vw; max-height: 90vh; object-fit: contain; }
      #ai-ocr-image-preview-lightbox .ai-ocr-close-lightbox { position: absolute; top: 20px; right: 35px; color: #fff; font-size: 40px; font-weight: bold; cursor: pointer; }
      .ai-ocr-controls { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
      .ai-ocr-controls label { display: block; margin-bottom: 5px; font-weight: bold; }
      .ai-ocr-controls select { width: 100%; padding: 8px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #ccc; }
      .ai-ocr-disclaimer { font-size: 0.8em; color: #666; text-align: center; margin-top: 10px; }
      #ai-ocr-loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
      .ai-ocr-typing-indicator { display: flex; justify-content: center; align-items: center; }
      .ai-ocr-typing-indicator span { width: 10px; height: 10px; margin: 0 5px; background-color: #fff; border-radius: 50%; animation: ai-ocr-typing 1.4s infinite both; }
      .ai-ocr-typing-indicator span:nth-child(1) { animation-delay: 0.2s; }
      .ai-ocr-typing-indicator span:nth-child(2) { animation-delay: 0.4s; }
      .ai-ocr-typing-indicator span:nth-child(3) { animation-delay: 0.6s; }
      @keyframes ai-ocr-typing { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.5); opacity: 0.5; } }
    `;
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
  function injectAiOcrUi() {
    const body = document.body;
    if (!document.getElementById(CSS_IDS.modal)) {
      const modal = document.createElement('div');
      modal.id = CSS_IDS.modal;
      modal.className = 'ai-ocr-modal';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="ai-ocr-modal-content">
          <span class="ai-ocr-close-button">&times;</span>
          <h2>Upload Images for OCR</h2>
          <div id="${CSS_IDS.dropZone}">
            <p>Drag & drop files here or click to select files</p>
            <input type="file" id="${CSS_IDS.fileInput}" multiple accept="image/jpeg, image/png">
          </div>
          <div id="${CSS_IDS.previewContainer}"></div>
          <div class="ai-ocr-controls">
            <label for="${CSS_IDS.modelSelect}">Select AI Model:</label>
            <select id="${CSS_IDS.modelSelect}">
              <option value="gemini-2.5-flash-lite" selected>Gemini 2.5 Flash Lite (Fastest)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
              <option value="gemma-3-27b-it">Gemma 3 27B (Quality)</option>
              <option value="gemma-3-12b-it">Gemma 3 12B (Balanced)</option>
            </select>
            <p class="ai-ocr-disclaimer">Disclaimer: AI may make mistakes. Please verify the extracted data.</p>
          </div>
          <button id="${CSS_IDS.submit}">Submit for OCR</button>
        </div>
      `;
      body.appendChild(modal);
    }
    if (!document.getElementById(CSS_IDS.loadingOverlay)) {
      const overlay = document.createElement('div');
      overlay.id = CSS_IDS.loadingOverlay;
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
    if (!document.getElementById(CSS_IDS.lightbox)) {
      const lightbox = document.createElement('div');
      lightbox.id = CSS_IDS.lightbox;
      lightbox.style.display = 'none';
      lightbox.innerHTML = `
        <span class="ai-ocr-close-lightbox">&times;</span>
        <img src="" alt="Image Preview">
      `;
      body.appendChild(lightbox);
    }
  }
} // end initAiOcr