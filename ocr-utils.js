/**
 * @file ocr-utils.js
 * @description Shared normalization utilities for AI OCR and CSV import.
 * Exposes a global window.aiOcrUtils with:
 *  - FIELD_SPEC
 *  - normalizeNumber
 *  - coerceBoolean
 *  - normalizeAndValidate
 *  - safeJsonExtract
 */
(function () {
  const global = (typeof window !== 'undefined') ? window : globalThis;
  if (global.aiOcrUtils) return; // Do not overwrite if already present

  // Field specification used for normalization/mapping
  const FIELD_SPEC = Object.freeze({
    string: [
      'code','brand','desc_short','desc_long','uom','uomstk',
      'acct_disp','dept_disp','proj_disp','rqt_day','rqt_mth','rqt_yr','batchnum'
    ],
    number: [
      'qty','unit_list','disc_pct','unit_price','amount',
      'unit_w_gst','conv','qty_uomstk','uprice_uomstk'
    ],
    boolean: ['gst']
  });

  function normalizeNumber(value) {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    // Remove spaces, thousands separators, currency symbols, percent words, etc.
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

      // Strings
      for (const k of FIELD_SPEC.string) {
        let v = raw?.[k];
        if (v == null) v = '';
        v = Array.isArray(v) ? v.join(' ') : v;
        out[k] = String(v ?? '').replace(/\s+/g, ' ').trim();
      }

      // Numbers
      for (const k of FIELD_SPEC.number) {
        out[k] = normalizeNumber(raw?.[k]);
      }

      // Booleans
      for (const k of FIELD_SPEC.boolean) {
        out[k] = coerceBoolean(raw?.[k]);
      }

      // Date padding
      out.rqt_day = out.rqt_day ? String(out.rqt_day).padStart(2, '0') : '';
      out.rqt_mth = out.rqt_mth ? String(out.rqt_mth).padStart(2, '0') : '';
      out.rqt_yr  = out.rqt_yr  ? String(out.rqt_yr).padStart(4, '0') : '';

      return out;
    });
  }

  function safeJsonExtract(text) {
    if (!text) return [];
    const cleaned = String(text)
      .replace(/```(?:json)?/g, '')
      .replace(/```/g, '')
      .trim();
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

  global.aiOcrUtils = {
    FIELD_SPEC,
    normalizeNumber,
    coerceBoolean,
    normalizeAndValidate,
    safeJsonExtract,
  };
})();