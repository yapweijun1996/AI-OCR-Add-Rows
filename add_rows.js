/**
 * @file TNO AI OCR Add Rows Demo Script
 * @description This script provides functionality to automate the addition of multiple non-stock rows in a web form.
 * It defines a global function `window.$addRows` and immediately invokes it to add 10 sample rows.
 *
 * Supported keys for each row object:
 *  - code, brand, desc_short, desc_long, uom, qty, unit_list, disc_pct,
 *  - unit_price, amount, unit_w_gst, conv, qty_uomstk, uprice_uomstk, uomstk,
 *  - gst, acct_disp, dept_disp, proj_disp, rqt_day, rqt_mth, rqt_yr, batchnum
 */
(() => {
    // ==========================================================================================
    // SECTION: Configuration
    // ==========================================================================================

    /**
     * @description Set to true to simulate human-like typing, false to set values instantly.
     * This can be configured by a developer for demonstration purposes.
     */
    const ENABLE_TYPING_ANIMATION = false;

    /** @description The order in which to fill the fields in a row. */
    const FIELD_FILL_ORDER = [
        'code', 'brand', 'desc_short', 'desc_long',
        'uom', 'qty', 'disc_pct', 'gst', 'unit_list',
        'unit_w_gst', 'conv', 'qty_uomstk', 'uprice_uomstk', 'uomstk',
        'unit_price', 'amount',
        'acct_disp', 'dept_disp', 'proj_disp',
        'rqt_day', 'rqt_mth', 'rqt_yr', 'batchnum'
    ];

    // ==========================================================================================
    // SECTION: DOM and Event Helpers
    // ==========================================================================================

    /**
     * Finds an element by its name attribute.
     * @param {string} name - The name of the element.
     * @returns {HTMLElement|null} The found element or null.
     */
    const getElementByName = (name) => document.getElementsByName(name)[0] || null;

    /**
     * Finds an element using a CSS selector.
     * @param {string} selector - The CSS selector.
     * @returns {HTMLElement|null} The found element or null.
     */
    const querySelector = (selector) => document.querySelector(selector);

    /**
     * Checks if an element is currently visible in the DOM.
     * @param {HTMLElement} element - The element to check.
     * @returns {boolean} True if the element is visible.
     */
    const isElementVisible = (element) => element && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden';

    /**
     * Pauses execution for a specified duration.
     * @param {number} milliseconds - The time to sleep in milliseconds.
     * @returns {Promise<void>}
     */
    const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

    /**
     * Simulates focus events on an element.
     * @param {HTMLElement} element - The target element.
     */
    const fireFocusEvent = (element) => {
        element.focus();
        element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    };

    /**
     * Simulates blur events on an element.
     * @param {HTMLElement} element - The target element.
     */
    const fireBlurEvent = (element) => {
        element.blur();
        element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    };

    /**
     * Simulates a keyboard event on an element.
     * @param {HTMLElement} element - The target element.
     * @param {string} eventType - The type of key event (e.g., 'keydown').
     * @param {string} character - The character to simulate.
     */
    const fireKeyEvent = (element, eventType, character) => {
        const keyCode = (character && character.length === 1) ? character.toUpperCase().charCodeAt(0)
            : character === '.' ? 190
                : character === '-' ? 189
                    : 0;
        const keyEvent = new KeyboardEvent(eventType, { bubbles: true, cancelable: true, key: character, code: `Key${character}`, keyCode: keyCode, which: keyCode });
        try {
            Object.defineProperty(keyEvent, 'keyCode', { value: keyCode });
            Object.defineProperty(keyEvent, 'which', { value: keyCode });
        } catch (error) {
            // This may fail in some environments, but the event should still work.
        }
        element.dispatchEvent(keyEvent);
    };

    // ==========================================================================================
    // SECTION: Form Interaction Logic
    // ==========================================================================================

    /**
     * Simulates a user typing text into an input field, including focus and blur events.
     * @param {HTMLInputElement} element - The input element.
     * @param {string} text - The text to type.
     */
    async function typeFocusBlur(element, text) {
        if (!element) return;
        try {
            element.readOnly = false;
            element.disabled = false;
        } catch (error) {
            // Element might be in a state that prevents modification.
        }

        if (!ENABLE_TYPING_ANIMATION) {
            setValueDirectly(element, text);
            return;
        }

        // Inputs that do not support selection/typing should be set directly
        const type = (element.type || '').toLowerCase();
        const nonTextTypes = [
            'number','checkbox','radio','file',
            'date','datetime-local','month','week','time',
            'range','color'
        ];
        if (!isElementVisible(element) || nonTextTypes.includes(type)) {
            setValueDirectly(element, text);
            return;
        }

        fireFocusEvent(element);
        await sleep(5);

        // Some browsers expose selection APIs but throw on unsupported types.
        try { element.select?.(); } catch (_) {}
        try {
            element.setRangeText?.('', 0, element.value?.length ?? 0, 'end');
        } catch (_) {}
        element.value = '';
        element.setAttribute?.('value', element.value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(4);

        for (const character of String(text)) {
            fireKeyEvent(element, 'keydown', character);
            fireKeyEvent(element, 'keypress', character);
            element.value += character;
            element.setAttribute?.('value', element.value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            fireKeyEvent(element, 'keyup', character);
            await sleep(6);
        }

        element.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(8);
        fireBlurEvent(element);
        await sleep(10);
    }

    /**
     * Sets the value of an input element directly, bypassing user simulation.
     * @param {HTMLInputElement} element - The input element.
     * @param {string|number} value - The value to set.
     */
    function setValueDirectly(element, value) {
        if (!element) return;
        try {
            element.readOnly = false;
            element.disabled = false;
        } catch (error) {
            // Element might be in a state that prevents modification.
        }

        const type = (element.type || '').toLowerCase();

        // Handle checkbox/radio safely
        if (type === 'checkbox' || type === 'radio') {
            const desired = !!value;
            if (element.checked !== desired) {
                element.checked = desired;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                // Still emit change to mimic user interaction chains
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }

        // Default for text-like fields
        element.value = String(value ?? '');
        element.setAttribute?.('value', element.value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Simulates a human-like click on a checkbox to set its state.
     * @param {HTMLInputElement} checkbox - The checkbox element.
     * @param {boolean} isChecked - The desired checked state.
     */
    function clickCheckboxLikeHuman(checkbox, isChecked) {
        if (!checkbox) return;
        if (!!checkbox.checked !== !!isChecked) {
            checkbox.click(); // Toggles and fires change event
        }
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Gets the index of the last visible row on the form.
     * @returns {number|null} The index of the last row, or null if not found.
     */
    const getCurrentRowIndex = () => {
        const hiddenMaxRow = getElementByName('HddenMaxRowAdded');
        if (hiddenMaxRow && hiddenMaxRow.value && !isNaN(hiddenMaxRow.value)) {
            return parseInt(hiddenMaxRow.value, 10);
        }
        const visibleRows = [...document.querySelectorAll('tr[id^="rowtr"]')].filter(isElementVisible);
        const rowNumbers = visibleRows.map(row => parseInt(row.id.replace('rowtr', ''), 10)).filter(num => !isNaN(num));
        return rowNumbers.length ? Math.max(...rowNumbers) : null;
    };

    /**
     * Waits for a new row to become visible in the DOM.
     * @param {number} rowIndex - The index of the row to wait for.
     * @param {number} [timeoutMs=8000] - The maximum time to wait.
     * @returns {Promise<boolean>} True if the row becomes visible, false if it times out.
     */
    const waitForRowToBeShown = async (rowIndex, timeoutMs = 8000) => {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const hiddenMaxRow = getElementByName('HddenMaxRowAdded');
            const hiddenMaxValue = hiddenMaxRow && !isNaN(hiddenMaxRow.value) ? parseInt(hiddenMaxRow.value, 10) : null;
            const rowElement = document.getElementById(`rowtr${rowIndex}`);
            if ((hiddenMaxValue && hiddenMaxValue >= rowIndex) || (rowElement && isElementVisible(rowElement))) {
                return true;
            }
            await sleep(50);
        }
        return false;
    };

    /**
     * Ensures a hidden select list for prices exists for a given row.
     * @param {number} rowIndex - The index of the row.
     */
    function ensurePriceListExists(rowIndex) {
        const priceListName = `fmi_aup${rowIndex}_list`;
        if (getElementByName(priceListName)) return;
        const selectElement = document.createElement('select');
        selectElement.name = priceListName;
        selectElement.size = 7;
        selectElement.style.position = 'absolute';
        selectElement.style.visibility = 'hidden';
        (getElementByName(`fmi_aup${rowIndex}_disp`)?.form || document.forms[0] || document.body).appendChild(selectElement);
    }

    /**
     * Ensures a hidden select list for UOM exists for a given row.
     * @param {number} rowIndex - The index of the row.
     */
    function ensureUomListExists(rowIndex) {
        const uomListName = `uom_trans_code${rowIndex}_list`;
        if (getElementByName(uomListName)) return;
        const selectElement = document.createElement('select');
        selectElement.name = uomListName;
        selectElement.size = 7;
        selectElement.style.position = 'absolute';
        selectElement.style.visibility = 'hidden';
        (getElementByName(`uom_trans_code${rowIndex}_disp`)?.form || document.forms[0] || document.body).appendChild(selectElement);
    }

    /**
     * Temporarily suppresses inline event handlers on an element while executing a function.
     * @param {HTMLElement} element - The element with inline handlers.
     * @param {Function} callback - The function to execute.
     */
    function withSuppressedInlineHandlers(element, callback) {
        if (!element) return;
        const originalAttributes = {};
        ['onfocus', 'onblur', 'onkeyup', 'onchange'].forEach(attr => {
            originalAttributes[attr] = element.getAttribute(attr);
            if (originalAttributes[attr] != null) {
                element.setAttribute(attr, '');
            }
        });
        try {
            callback();
        } finally {
            Object.entries(originalAttributes).forEach(([attr, value]) => {
                if (value == null) {
                    element.removeAttribute(attr);
                } else {
                    element.setAttribute(attr, value);
                }
            });
        }
    }

    /**
     * Gets the name of a form field for a specific row and key.
     * @param {number} rowIndex - The index of the row.
     * @param {string} key - The key identifying the field.
     * @returns {string|undefined} The name of the form field.
     */
    function getColumnName(rowIndex, key) {
        const nameMap = {
            code: `stkcode_code${rowIndex}`,
            brand: `stkcode_brand${rowIndex}`,
            desc_short: `stkcode_desc${rowIndex}`,
            desc_long: `desc${rowIndex}`,
            uom: `uom_trans_code${rowIndex}_disp`,
            qty: `qnty_total${rowIndex}`,
            unit_list: `fmi_aup${rowIndex}_disp`,
            disc_pct: `discount_pct${rowIndex}`,
            unit_price: `price_unitrate_forex${rowIndex}`,
            amount: `extnamt_orig_forex${rowIndex}`,
            unit_w_gst: `uprice_wt_gst${rowIndex}`,
            conv: `uom_trans_code${rowIndex}_conv`,
            qty_uomstk: `qnty_uomstk${rowIndex}`,
            uprice_uomstk: `uprice_uomstk${rowIndex}`,
            uomstk: `uomstk_code${rowIndex}`,
            gst: `fmi_row_gst${rowIndex}`,
            acct_disp: `fmi_row_acctnum${rowIndex}_disp`,
            dept_disp: `fmi_row_deptunit${rowIndex}_disp`,
            proj_disp: `fmi_row_entprojfn${rowIndex}_disp`,
            rqt_day: `rowday${rowIndex}`,
            rqt_mth: `rowmth${rowIndex}`,
            rqt_yr: `rowyear${rowIndex}`,
            batchnum: `batchnum_code${rowIndex}`,
        };
        return nameMap[key];
    }

    // ==========================================================================================
    // SECTION: Core Application Logic
    // ==========================================================================================

    /**
     * Fills a single field in a row with a given value.
     * @param {number} rowIndex - The index of the row.
     * @param {string} key - The key identifying the field.
     * @param {*} value - The value to fill.
     */
    async function fillOneField(rowIndex, key, value) {
        const fieldName = getColumnName(rowIndex, key);
        if (!fieldName) return;

        if (key === 'gst') {
            clickCheckboxLikeHuman(getElementByName(fieldName), !!value);
            return;
        }

        if (key === 'unit_list') {
            const flag = getElementByName(`fmi_unit_price_editable${rowIndex}`);
            if (flag) flag.value = 'y';
            if (typeof window.UnitPriceEditable === 'function') {
                try {
                    UnitPriceEditable(rowIndex);
                } catch (error) {
                    // Ignore errors from legacy functions.
                }
            } else {
                try {
                    getElementByName(fieldName)?.click();
                } catch (error) {
                    // Ignore errors from legacy functions.
                }
            }
            ensurePriceListExists(rowIndex);
        }
        if (key === 'uom') {
            ensureUomListExists(rowIndex);
        }

        const element = getElementByName(fieldName);
        if (!element) return;

        // Skip typing into readonly/calculated fields, but set directly if invisible/hidden
        if ((key === 'unit_price' || key === 'amount') && (element.readOnly || element.hasAttribute('readonly'))) {
            return;
        }

        if (!isElementVisible(element) || element.type === 'hidden') {
            setValueDirectly(element, value);
            return;
        }

        const isSmartBox = (key === 'acct_disp' || key === 'dept_disp' || key === 'proj_disp');
        if (isSmartBox) {
            withSuppressedInlineHandlers(element, () => setValueDirectly(element, value));
            fireFocusEvent(element);
            await sleep(5);
            fireBlurEvent(element);
            await sleep(5);
            return;
        }

        await typeFocusBlur(element, String(value));
    }

    /**
     * Fills all the fields in a single row with data.
     * @param {number} rowIndex - The index of the row.
     * @param {object} data - An object containing the data for the row.
     */
    async function fillRow(rowIndex, data) {
        for (const key of FIELD_FILL_ORDER) {
            if (key in data && data[key] != null) {
                await fillOneField(rowIndex, key, data[key]);
                await sleep(12);
            }
        }
        try {
            if (typeof fixNumberDecimal === 'function') {
                fixNumberDecimal('number', 'all');
                fixNumberDecimal('text', 'all');
            }
        } catch (error) {
            // Ignore errors from legacy functions.
        }
    }

    /**
     * Adds a new non-stock row and fills it with the provided data.
     * @param {object} payload - The data for the new row.
     * @returns {Promise<number|null>} The index of the new row, or null on failure.
     */
    async function addOneRowAndFill(payload) {
        const currentRowIndex = getCurrentRowIndex();
        if (!Number.isFinite(currentRowIndex)) {
            console.warn('Cannot determine the current visible row.');
            return null;
        }
        const nextRowIndex = currentRowIndex + 1;

        const addButton = querySelector('#gononstockbtn');
        if (!addButton) {
            console.warn('Non-stock button #gononstockbtn not found.');
            return null;
        }
        addButton.click();

        const isRowShown = await waitForRowToBeShown(nextRowIndex);
        if (!isRowShown) {
            console.warn('Timed out waiting for new row', nextRowIndex);
            return null;
        }
        await sleep(30);

        await fillRow(nextRowIndex, payload || {});
        console.log('✅ Added & filled row', nextRowIndex);
        return nextRowIndex;
    }

    // ==========================================================================================
    // SECTION: Public API and Execution
    // ==========================================================================================

    /**
     * Public API to add multiple rows to the form.
     * @param {Array<object>} rows - An array of row data objects.
     * @returns {Promise<Array<number|null>>} A list of the new row IDs.
     */
    window.$addRows = async function (rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            console.warn('Pass an array of row objects to $addRows([...]).');
            return [];
        }
        const newRowIds = [];
        for (const payload of rows) {
            const newRowId = await addOneRowAndFill(payload || {});
            newRowIds.push(newRowId);
            await sleep(60);
        }
        return newRowIds;
    };

})();