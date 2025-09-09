/**
 * @file csv-import.js
 * @description Client-side CSV importer with enhanced live header→field mapping, fuzzy autosuggest,
 *              live preview, and localStorage mapping profiles.
 *
 * Exposes window.aiOcrCsv with:
 *  - loadPapaParse(): Promise<Papa>
 *  - parseCsvFile(file): Promise<{ data: Array<object>, meta: { fields: string[] } }>
 *  - buildDefaultMapping(csvHeaders: string[], targetFields: string[]): Record<string,string|null>            // legacy (target->header)
 *  - buildDefaultReverseMapping(csvHeaders: string[], targetFields: string[]): Record<string,string|null>     // new (header->target)
 *  - renderMappingUI(containerEl, csvHeaders, targetFields, initialHeaderToTarget, onChange, previewRows)
 *  - applyMapping(rows, mapping): Array<object>        // accepts header->target or target->header
 *  - toTargetSourceMapping(mapping): Record<string,string>  // convert to target->header map (for downstream use)
 *  - listProfiles(): string[]
 *  - saveProfile(name, mapping, headers): void
 *  - loadProfile(name): { mapping, headers } | null
 *  - deleteProfile(name): void
 */
(function () {
  const global = (typeof window !== 'undefined') ? window : globalThis;
  if (global.aiOcrCsv) return; // avoid re-definition

  // Lightweight style injection (scoped by class)
  function injectStyles() {
    const id = 'ai-ocr-csv-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .ai-ocr-csv-mapping { margin-top: 10px; }
      .ai-ocr-csv-mapping table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .ai-ocr-csv-mapping th, .ai-ocr-csv-mapping td { border: 1px solid #ddd; padding: 6px; text-align: left; }
      .ai-ocr-csv-mapping th { background: #f7f7f7; position: sticky; top: 0; z-index: 1; }
      .ai-ocr-csv-mapping select { width: 100%; box-sizing: border-box; }
      .ai-ocr-csv-preview { margin-top: 12px; max-height: 260px; overflow: auto; border: 1px solid #eee; }
      .ai-ocr-csv-help { font-size: 12px; color: #555; margin: 6px 0; }
      .ai-ocr-csv-badge { display:inline-block; padding:2px 6px; font-size:11px; border-radius:4px; background:#eef; color:#225; margin-left:6px; }
      .ai-ocr-csv-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0; }
      .ai-ocr-csv-toolbar input[type="text"] { padding: 6px; min-width: 160px; }
      .ai-ocr-csv-toolbar button { padding: 6px 10px; }
      .ai-ocr-csv-stats { font-size: 12px; color: #333; margin: 6px 0; }
      .ai-ocr-csv-stats .danger { color: #B00020; font-weight: 600; }
      .ai-ocr-csv-stats .ok { color: #2E7D32; }
      .ai-ocr-csv-note { font-size: 11px; color: #666; }
    `;
    document.head.appendChild(style);
  }

  async function loadPapaParse() {
    injectStyles();
    if (global.Papa) return global.Papa;
    // Load from CDN
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    if (!global.Papa) throw new Error('PapaParse failed to load');
    return global.Papa;
  }

  function slug(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function parseCsvFile(file) {
    return new Promise(async (resolve, reject) => {
      try {
        const Papa = await loadPapaParse();
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: (results) => {
            // Normalize meta.fields to array of headers
            const fields = (results.meta && results.meta.fields) ? results.meta.fields : Object.keys(results.data?.[0] || {});
            resolve({ data: results.data || [], meta: { fields } });
          },
          error: (err) => reject(err),
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // Some common synonyms to improve default mapping
  const SYNONYMS = {
    code: ['sku','item_code','product_code','part_no','part','code'],
    brand: ['brand','maker','manufacturer'],
    desc_short: ['desc_short','short_desc','description','desc','item','item_desc','name','title'],
    desc_long: ['desc_long','long_desc','remarks','comment','note','notes','details'],
    uom: ['uom','unit','unit_of_measure','measure','uom_trans_code'],
    qty: ['qty','quantity','qnty','qnty_total'],
    unit_list: ['unit_list','list','list_price','price_list','aup','fmi_aup_disp','fmi_aup'],
    disc_pct: ['disc_pct','discount','discount_pct','discount_percent','disc','discount%','disc_percent'],
    unit_price: ['unit_price','unitprice','price','unit_rate','unitrate','net_unit','price_unitrate_forex','net_price'],
    amount: ['amount','total','line_total','extnamt_orig_forex','extended_amount'],
    unit_w_gst: ['unit_w_gst','price_with_gst','unit_gst','uprice_wt_gst'],
    conv: ['conv','conversion','conversion_factor','uom_trans_code_conv','factor'],
    qty_uomstk: ['qty_uomstk','qty_stock_uom','qnty_uomstk'],
    uprice_uomstk: ['uprice_uomstk','unit_price_stock','stock_uprice'],
    uomstk: ['uomstk','uom_stock','uomstk_code'],
    gst: ['gst','tax','vat','gst_flag','tax_applies'],
    acct_disp: ['acct_disp','account','account_display','account_name','gl_account'],
    dept_disp: ['dept_disp','department','department_display','dept_name'],
    proj_disp: ['proj_disp','project','project_display','project_name'],
    rqt_day: ['rqt_day','day','req_day'],
    rqt_mth: ['rqt_mth','month','req_month','mth'],
    rqt_yr: ['rqt_yr','year','req_year','yr'],
    batchnum: ['batchnum','batch_no','batch','lot','lot_no'],
  };

  // Legacy default mapping (target -> header)
  function buildDefaultMapping(csvHeaders, targetFields) {
    const headerSlugs = csvHeaders.map(h => ({ raw: h, slug: slug(h) }));
    const mapping = {};
    for (const field of targetFields) {
      const candidates = SYNONYMS[field] || [field];
      let chosen = null;
      const fieldSlug = slug(field);
      const exact = headerSlugs.find(h => h.slug === fieldSlug);
      if (exact) chosen = exact.raw;
      if (!chosen) {
        for (const syn of candidates) {
          const synSlug = slug(syn);
          const found = headerSlugs.find(h => h.slug === synSlug);
          if (found) { chosen = found.raw; break; }
        }
      }
      if (!chosen) {
        for (const syn of candidates) {
          const synSlug = slug(syn);
          const found = headerSlugs.find(h => h.slug.includes(synSlug) || synSlug.includes(h.slug));
          if (found) { chosen = found.raw; break; }
        }
      }
      mapping[field] = chosen; // may be null
    }
    return mapping;
  }

  // Simple similarity scoring between a CSV header and a target field using slugs and synonyms
  function scoreHeaderToField(header, field) {
    const hs = slug(header);
    const fs = slug(field);
    if (!hs || !fs) return 0;

    let score = 0;
    if (hs === fs) score += 10;
    if (hs.includes(fs) || fs.includes(hs)) score += 5;

    const syns = SYNONYMS[field] || [];
    for (const syn of syns) {
      const ss = slug(syn);
      if (hs === ss) score += 8;
      if (hs.includes(ss) || ss.includes(hs)) score += 3;
    }

    // Penalize extremely short headers to avoid misfires
    if (header.trim().length <= 2) score -= 2;
    return score;
  }

  // New: build mapping header -> target using fuzzy scoring
  function buildDefaultReverseMapping(csvHeaders, targetFields) {
    const mapping = {};
    for (const header of csvHeaders) {
      let bestField = null;
      let bestScore = -Infinity;
      for (const field of targetFields) {
        const sc = scoreHeaderToField(header, field);
        if (sc > bestScore) { bestScore = sc; bestField = field; }
      }
      // Apply a minimum threshold to avoid nonsense mappings
      if (bestScore >= 5) {
        mapping[header] = bestField;
      } else {
        mapping[header] = null; // not mapped
      }
    }
    return mapping;
  }

  // Convert mapping to target->header. Accepts either target->header or header->target.
  function toTargetSourceMapping(mapping) {
    if (!mapping || typeof mapping !== 'object') return {};
    const keys = Object.keys(mapping);
    if (!keys.length) return {};
    // Heuristic: if most keys look like target field names, assume it's already target->header
    const targetFields = getKnownTargetFields();
    const targetSet = new Set(targetFields);
    const targetKeyHits = keys.filter(k => targetSet.has(k)).length;
    if (targetKeyHits >= Math.max(1, Math.floor(keys.length * 0.6))) {
      // target -> header (values may be null/empty)
      const out = {};
      for (const t of keys) {
        const src = mapping[t];
        if (src) out[t] = src;
      }
      return out;
    }
    // Otherwise treat as header -> target
    const out = {};
    for (const [header, target] of Object.entries(mapping)) {
      if (target) out[target] = header;
    }
    return out;
  }

  function applyMapping(rows, mapping) {
    const tgtToSrc = toTargetSourceMapping(mapping);
    const fields = getKnownTargetFields();
    return rows.map(row => {
      const out = {};
      for (const f of fields) {
        const src = tgtToSrc[f];
        out[f] = (src && src in row) ? row[src] : '';
      }
      return out;
    });
  }

  // Mapping profile persistence
  const PROFILE_PREFIX = 'ai_ocr_csv_profile::';

  function listProfiles() {
    const keys = Object.keys(localStorage);
    return keys.filter(k => k.startsWith(PROFILE_PREFIX)).map(k => k.slice(PROFILE_PREFIX.length));
  }
  function saveProfile(name, mapping, headers) {
    if (!name) return;
    const payload = {
      mapping,           // header -> target (preferred)
      headers: headers || [],
      savedAt: new Date().toISOString(),
      version: 1
    };
    localStorage.setItem(PROFILE_PREFIX + name, JSON.stringify(payload));
  }
  function loadProfile(name) {
    if (!name) return null;
    const raw = localStorage.getItem(PROFILE_PREFIX + name);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }
  function deleteProfile(name) {
    if (!name) return;
    localStorage.removeItem(PROFILE_PREFIX + name);
  }

  function getKnownTargetFields() {
    if (global.aiOcrUtils && global.aiOcrUtils.FIELD_SPEC) {
      const F = global.aiOcrUtils.FIELD_SPEC;
      return [...F.string, ...F.number, ...F.boolean];
    }
    // fallback
    return Object.keys(SYNONYMS);
  }

  function renderMappingUI(containerEl, csvHeaders, targetFields, initialHeaderToTarget, onChange, previewRows = []) {
    injectStyles();
    if (!containerEl) return;
    containerEl.innerHTML = '';
    containerEl.classList.add('ai-ocr-csv-mapping');

    const selected = { ...(initialHeaderToTarget || {}) };
    const wrap = document.createElement('div');

    // Helper to ensure selected has all headers present
    for (const h of csvHeaders) {
      if (!(h in selected)) selected[h] = null;
    }

    const help = document.createElement('div');
    help.className = 'ai-ocr-csv-help';
    help.innerHTML = `Map CSV columns to system fields. Unmapped columns are ignored. 
      <span class="ai-ocr-csv-badge">Preview updates live</span>`;
    wrap.appendChild(help);

    // Toolbar: Auto map, profile save/load, reset
    const toolbar = document.createElement('div');
    toolbar.className = 'ai-ocr-csv-toolbar';

    const btnAuto = document.createElement('button');
    btnAuto.type = 'button';
    btnAuto.textContent = 'Auto map';
    toolbar.appendChild(btnAuto);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Profile name';
    toolbar.appendChild(nameInput);

    const btnSave = document.createElement('button');
    btnSave.type = 'button';
    btnSave.textContent = 'Save profile';
    toolbar.appendChild(btnSave);

    const loadSelect = document.createElement('select');
    const defaultLoadOption = document.createElement('option');
    defaultLoadOption.value = '';
    defaultLoadOption.textContent = 'Load profile...';
    loadSelect.appendChild(defaultLoadOption);
    toolbar.appendChild(loadSelect);

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.textContent = 'Delete';
    toolbar.appendChild(btnDelete);

    const btnReset = document.createElement('button');
    btnReset.type = 'button';
    btnReset.textContent = 'Reset';
    toolbar.appendChild(btnReset);

    wrap.appendChild(toolbar);

    // Stats
    const stats = document.createElement('div');
    stats.className = 'ai-ocr-csv-stats';
    wrap.appendChild(stats);

    // Table for mapping (per CSV header)
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>CSV Column</th><th>Map to Field</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');

    // Options for target fields
    const optionsHtml = ['<option value="">— Not Mapped —</option>']
      .concat(targetFields.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`))
      .join('');

    const selectsByHeader = {};
    for (const header of csvHeaders) {
      const tr = document.createElement('tr');
      const tdH = document.createElement('td');
      tdH.textContent = header;
      const tdS = document.createElement('td');
      const sel = document.createElement('select');
      sel.innerHTML = optionsHtml;
      if (selected[header]) sel.value = selected[header];
      sel.addEventListener('change', () => {
        selected[header] = sel.value || null;
        notifyChanged();
      });
      selectsByHeader[header] = sel;
      tdS.appendChild(sel);
      tr.appendChild(tdH);
      tr.appendChild(tdS);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);

    // Preview
    const preview = document.createElement('div');
    preview.className = 'ai-ocr-csv-preview';
    wrap.appendChild(preview);

    // Note
    const note = document.createElement('div');
    note.className = 'ai-ocr-csv-note';
    note.textContent = 'Tip: Save a mapping profile to reuse the same header mapping for future files.';
    wrap.appendChild(note);

    containerEl.appendChild(wrap);

    // Populate load profiles
    function refreshLoadOptions() {
      const existing = new Set();
      for (const opt of Array.from(loadSelect.options)) {
        existing.add(opt.value);
      }
      // reset
      loadSelect.innerHTML = '';
      const base = document.createElement('option');
      base.value = '';
      base.textContent = 'Load profile...';
      loadSelect.appendChild(base);

      const names = listProfiles().sort();
      for (const name of names) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        loadSelect.appendChild(opt);
      }
    }
    refreshLoadOptions();

    // Hook up toolbar actions
    btnAuto.addEventListener('click', () => {
      const suggested = buildDefaultReverseMapping(csvHeaders, targetFields);
      for (const h of csvHeaders) {
        selected[h] = suggested[h] || null;
        if (selectsByHeader[h]) selectsByHeader[h].value = selected[h] || '';
      }
      notifyChanged();
    });

    btnSave.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) { alert('Enter a profile name to save.'); return; }
      saveProfile(name, { ...selected }, csvHeaders.slice());
      refreshLoadOptions();
    });

    loadSelect.addEventListener('change', () => {
      const name = loadSelect.value;
      if (!name) return;
      const payload = loadProfile(name);
      if (!payload) { alert('Profile not found or invalid.'); return; }
      // Load mapping, but only apply to headers that exist in current CSV
      const map = payload.mapping || {};
      for (const h of csvHeaders) {
        const tgt = map[h] || null;
        selected[h] = tgt;
        if (selectsByHeader[h]) selectsByHeader[h].value = tgt || '';
      }
      notifyChanged();
    });

    btnDelete.addEventListener('click', () => {
      const name = loadSelect.value || nameInput.value.trim();
      if (!name) { alert('Select or enter a profile name to delete.'); return; }
      if (!confirm(`Delete profile "${name}"?`)) return;
      deleteProfile(name);
      refreshLoadOptions();
      if (loadSelect.value === name) loadSelect.value = '';
    });

    btnReset.addEventListener('click', () => {
      for (const h of csvHeaders) {
        selected[h] = null;
        if (selectsByHeader[h]) selectsByHeader[h].value = '';
      }
      notifyChanged();
    });

    function getSelectedTargetsSet() {
      return new Set(Object.values(selected).filter(Boolean));
    }

    function updateStats() {
      const unmappedHeaders = Object.values(selected).filter(v => !v).length;
      const chosenTargets = getSelectedTargetsSet();
      const unmappedTargets = targetFields.filter(f => !chosenTargets.has(f)).length;

      const parts = [];
      parts.push(`Unmapped CSV columns: ${unmappedHeaders ? `<span class="danger">${unmappedHeaders}</span>` : `<span class="ok">0</span>`}`);
      parts.push(`Unmapped target fields: ${unmappedTargets ? `<span class="danger">${unmappedTargets}</span>` : `<span class="ok">0</span>`}`);
      stats.innerHTML = parts.join(' · ');
    }

    function updatePreview() {
      preview.innerHTML = '';
      if (!previewRows?.length) {
        preview.textContent = 'No preview rows.';
        return;
      }
      const mapped = applyMapping(previewRows, selected); // header->target accepted
      const fields = targetFields;

      const pt = document.createElement('table');
      const pthead = document.createElement('thead');
      pthead.innerHTML = '<tr>' + fields.map(f => `<th>${escapeHtml(f)}</th>`).join('') + '</tr>';
      pt.appendChild(pthead);

      const ptbody = document.createElement('tbody');
      for (const row of mapped.slice(0, 5)) {
        const tr = document.createElement('tr');
        tr.innerHTML = fields.map(f => `<td>${escapeHtml(row[f])}</td>`).join('');
        ptbody.appendChild(tr);
      }
      pt.appendChild(ptbody);
      preview.appendChild(pt);
    }

    function notifyChanged() {
      updateStats();
      updatePreview();
      if (typeof onChange === 'function') onChange({ ...selected });
    }

    // initial
    notifyChanged();

    return {
      getMapping: () => ({ ...selected })
    };
  }

  function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

  global.aiOcrCsv = {
    loadPapaParse,
    parseCsvFile,
    buildDefaultMapping,
    buildDefaultReverseMapping,
    renderMappingUI,
    applyMapping,
    toTargetSourceMapping,
    listProfiles,
    saveProfile,
    loadProfile,
    deleteProfile,
  };
})();