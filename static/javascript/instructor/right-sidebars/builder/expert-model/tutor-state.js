/**
 * Parses a container element to find all designated components and extracts their
 * current state into a structured array of objects. This function identifies components
 * by the '.builder-form-element' class and uses the 'data-type' attribute to apply
 * specific logic for extracting values, especially for complex components like math
 * elements, choice groups, and sliders.
 *
 * @param {HTMLElement} containerElement The live DOM element that contains the form components.
 * @param {Object} [options={}] Optional parameters.
 * @param {boolean} [options.lockWhenHasValue=false] If true, adds a 'locked' class and attribute to components that have a value.
 * @returns {Array<Object>} An array of objects, where each object represents a component with its ID, type, and structured value.
 */
function extractInputFieldsFromDOM(containerElement, { lockWhenHasValue = false } = {}) {
  // Guard clause for invalid input
  if (!containerElement || typeof containerElement.querySelectorAll !== 'function') {
    console.error("Invalid container element provided.");
    return [];
  }

  // Find all component wrappers.
  const componentElements = containerElement.querySelectorAll('.builder-form-element');
  const results = [];

  componentElements.forEach(componentEl => {
    // The component type is read from the 'data-type' attribute on the wrapper
    const type = componentEl.dataset.type;
    const mainEl = componentEl.querySelector('.component-root');

    // **FIX:** Prioritize the ID from the inner `component-root` element,
    // but fall back to the wrapper's ID for robustness.
    let id = mainEl ? mainEl.id : null;
    if (!id) {
        id = componentEl.id;
    }

    // Skip components without a usable ID or type
    if (!id || !type) {
      return;
    }

    let value = null;
    let isEditable = true;
    let hasValue = false; // Flag to check if a non-empty value was found

    // Helper to get a clean value from simple input or contenteditable elements
    const getSimpleValue = (element, isRichText = false) => {
      if (!element) return null;
      let val;
      if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
        val = element.value;
      } else if (element.isContentEditable) {
        val = isRichText ? element.innerHTML : element.textContent;
      }
      return (val != null && typeof val === 'string') ? val.trim() : val;
    };

    switch (type) {
      // --- Choice Elements ---
      case 'select': {
        const selectEl = componentEl.querySelector('select.builder-select');
        if (selectEl) {
          value = {
            selectedValue: selectEl.value,
            options: Array.from(selectEl.options).map(opt => ({
              value: opt.value,
              text: opt.textContent
            }))
          };
          hasValue = !!selectEl.value;
        }
        break;
      }
      case 'checkbox': {
        const items = componentEl.querySelectorAll('.checkbox-item');
        value = Array.from(items).map(item => {
          const input = item.querySelector('input[type="checkbox"]');
          const label = item.querySelector('label');
          return {
            id: input ? input.id : null,
            label: label ? label.textContent.trim() : '',
            checked: input ? input.checked : false
          };
        });
        hasValue = value.some(item => item.checked);
        break;
      }
      case 'radio': {
        const options = componentEl.querySelectorAll('.radio-item');
        const checkedInput = componentEl.querySelector('input[type="radio"]:checked');
        value = {
          selectedValue: checkedInput ? checkedInput.id : null,
          options: Array.from(options).map(item => {
            const input = item.querySelector('input[type="radio"]');
            const label = item.querySelector('label');
            return {
              id: input ? input.id : null,
              label: label ? label.textContent.trim() : '',
            };
          })
        };
        hasValue = !!value.selectedValue;
        break;
      }
      case 'toggle': {
        const toggleInput = componentEl.querySelector('input[type="checkbox"]');
        if (toggleInput) {
          value = toggleInput.checked; // boolean value
          hasValue = true; // A toggle always has a boolean state
        }
        break;
      }
      case 'slider': {
        const sliderInput = componentEl.querySelector('input[type="range"]');
        if (sliderInput) {
          value = parseFloat(sliderInput.value);
          hasValue = true; // A slider always has a value
        }
        break;
      }

      // --- Math Elements ---
      case 'fraction': {
        const inputs = componentEl.querySelectorAll('.math-input');
        if (inputs.length === 2) {
          value = {
            numerator: inputs[0].value,
            denominator: inputs[1].value
          };
          hasValue = !!(value.numerator || value.denominator);
        }
        break;
      }
      case 'exponent': {
        const inputs = componentEl.querySelectorAll('.math-input');
        if (inputs.length === 2) {
          value = {
            base: inputs[0].value,
            power: inputs[1].value
          };
          hasValue = !!(value.base || value.power);
        }
        break;
      }
      case 'radical': {
        const input = componentEl.querySelector('.math-input');
        if (input) {
          value = { radicand: input.value };
          hasValue = !!value.radicand;
        }
        break;
      }
      case 'summation': {
          const upper = componentEl.querySelector('.limit-upper');
          const lower = componentEl.querySelector('.limit-lower');
          const expression = componentEl.querySelector('.sum-expression');
          if(upper && lower && expression) {
              value = {
                  upper: upper.value,
                  lower: lower.value,
                  expression: expression.value
              };
              hasValue = !!(value.upper || value.lower || value.expression);
          }
          break;
      }
      case 'integral': {
          const upper = componentEl.querySelector('.limit-upper');
          const lower = componentEl.querySelector('.limit-lower');
          const expression = componentEl.querySelector('.int-expression');
          if(upper && lower && expression) {
              value = {
                  upper: upper.value,
                  lower: lower.value,
                  expression: expression.value
              };
              hasValue = !!(value.upper || value.lower || value.expression);
          }
          break;
      }
      case 'matrix': {
          const rowsInput = componentEl.querySelector('.matrix-dim[data-dim="rows"]');
          const colsInput = componentEl.querySelector('.matrix-dim[data-dim="cols"]');
          const cellInputs = componentEl.querySelectorAll('.matrix-grid .math-input');
          if (rowsInput && colsInput && cellInputs.length > 0) {
              const rows = parseInt(rowsInput.value, 10);
              const cols = parseInt(colsInput.value, 10);
              const data = [];
              let hasMatrixValue = false;
              for (let i = 0; i < rows; i++) {
                  const rowData = [];
                  for (let j = 0; j < cols; j++) {
                      const cellVal = cellInputs[i * cols + j]?.value || '';
                      if (cellVal) hasMatrixValue = true;
                      rowData.push(cellVal);
                  }
                  data.push(rowData);
              }
              value = { rows, cols, data };
              hasValue = hasMatrixValue;
          }
          break;
      }

      // --- Standard Text & Input ---
      case 'rich-text': {
        const contentEl = componentEl.querySelector('[contenteditable="true"]');
        value = getSimpleValue(contentEl, true); // Use innerHTML
        hasValue = !!value;
        break;
      }
      case 'number-input': {
        const inputEl = componentEl.querySelector('input[type="number"]');
        const rawValue = getSimpleValue(inputEl);
        const num = parseFloat(rawValue);
        value = Number.isNaN(num) ? null : num;
        hasValue = value !== null;
        break;
      }
      case 'text':
      case 'textarea':
      case 'date':
      case 'label':
      case 'paragraph':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'code':
      case 'text-prompt':
      default: {
        // Fallback for simple components or unrecognized types
        const inputEl = componentEl.querySelector('input, textarea, [contenteditable="true"]');
        if (inputEl) {
            value = getSimpleValue(inputEl);
            hasValue = !!value;
        }
        break;
      }
    }

    // Determine overall editable state of the component for the final output
    const editableEl = componentEl.querySelector('input, textarea, select, [contenteditable]');
    if (editableEl) {
        if(editableEl.tagName.toLowerCase() !== 'div' && editableEl.isContentEditable !== true) {
            isEditable = !editableEl.disabled && !editableEl.readOnly;
        } else if (editableEl.isContentEditable !== undefined) {
            isEditable = editableEl.isContentEditable;
        }
    }

    if (lockWhenHasValue && hasValue) {
      isEditable = false;
      componentEl.classList.add('locked');
      componentEl.setAttribute('data-locked', 'true');
    }

    results.push({
      id,
      type,
      contenteditable: isEditable,
      value: value
    });
  });

  return results;
}