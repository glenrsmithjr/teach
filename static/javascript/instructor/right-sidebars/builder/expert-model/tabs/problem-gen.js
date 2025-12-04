/**
 * IIFE (Immediately Invoked Function Expression) to create a private scope,
 * preventing pollution of the global namespace.
 */
(function() {
    const consoleContainer = document.getElementById('console-mode-content');
    
    /**
     * @type {Object.<string, Object>}
     * An object to store the constraint preferences for each field.
     * The key is the fieldId, and the value is an object of its rules.
     * Example:
     * {
     * "field-one-id": { "numericType": "integer", "min": "0", "max": "100" },
     * "field-two-id": { "regex": "^[A-Z]+$" }
     * }
     */
    const fieldConstraints = {};

    function initializeConsole(containerElement) {
        const selector = consoleContainer.querySelector('.em-console-field-selector');
        if (!selector) return;

        const currentVal = selector.value; // Preserve selection
        selector.innerHTML = '<option value="">-- Select a Field --</option>';
        containerElement.querySelectorAll('input').forEach(input => {
            if (!(['user-input', 'builder-show-grid', 'builder-snap-to-grid', 'builder-user-input'].includes(input.id))) {
                const label = containerElement.querySelector(`label[for="${input.id}"]`)?.textContent || input.id;
                selector.insertAdjacentHTML('beforeend', `<option value="${input.id}">${label}</option>`);
            }
        });
        selector.value = currentVal; // Restore selection
        // Reset views
        consoleContainer.querySelectorAll('.em-console-numeric-rules, .em-console-text-rules').forEach(el => el.style.display = 'none');
        // If a field was already selected, re-trigger the change event to show its rules
        if (currentVal) selector.dispatchEvent(new Event('change'));
    }

    consoleContainer.querySelector('.em-console-field-selector')?.addEventListener('change', e => {
        const fieldId = e.target.value;
        const typeToggleContainer = consoleContainer.querySelector('.em-console-type-toggle');
        const rulesContainer = consoleContainer.querySelector('.em-console-container');

        if (!fieldId) {
            rulesContainer.style.display = 'none';
            typeToggleContainer.style.display = 'none';
            return;
        }

        rulesContainer.style.display = 'block';
        typeToggleContainer.style.display = 'inline-flex';

        const field = document.getElementById(fieldId);
        const isNumeric = field.type === 'number' || field.inputMode === 'numeric';

        // Set the active toggle based on auto-detection or saved preference
        const savedType = fieldConstraints[fieldId]?.constraintType;
        updateConstraintTypeView(savedType || (isNumeric ? 'numeric' : 'text'));
        loadConstraintsForField(fieldId);
    });

    consoleContainer.addEventListener('click', e => {
        if (e.target.matches('.em-console-save-btn')) {
            saveConstraintsForField();
        }
        if (e.target.matches('.em-console-tab')) {
            const parent = e.target.closest('.em-console-text-rules');
            parent.querySelectorAll('.em-console-tab').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            parent.querySelectorAll('.em-console-tab-content').forEach(c => c.style.display = 'none');
            parent.querySelector(`#${e.target.dataset.tab}`).style.display = 'block';
        }
        if (e.target.matches('.em-type-toggle-btn')) {
            const type = e.target.dataset.type;
            updateConstraintTypeView(type);
        }
    });

    function updateConstraintTypeView(type) {
        const typeToggleContainer = consoleContainer.querySelector('.em-console-type-toggle');
        const numericRules = consoleContainer.querySelector('.em-console-numeric-rules');
        const textRules = consoleContainer.querySelector('.em-console-text-rules');

        // Update button active state
        typeToggleContainer.querySelectorAll('.em-type-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        // Update panel visibility
        numericRules.style.display = (type === 'numeric') ? 'block' : 'none';
        textRules.style.display = (type === 'text') ? 'block' : 'none';
    }

    function loadConstraintsForField(fieldId) {
        const constraints = fieldConstraints[fieldId] || {};

        // Handle all simple text/number inputs
        consoleContainer.querySelectorAll('.em-console-input:not([type="checkbox"])').forEach(input => {
            const rule = input.dataset.rule;
            input.value = constraints[rule] || '';
        });

        // Handle checkbox for numeric type
        const integerOnlyCheckbox = consoleContainer.querySelector('.em-console-input[data-rule="numericType"]');
        if (integerOnlyCheckbox) {
            integerOnlyCheckbox.checked = constraints.numericType === 'integer';
        }
    }

    function saveConstraintsForField() {
        const fieldId = consoleContainer.querySelector('.em-console-field-selector').value;
        if (!fieldId) return;

        if (!fieldConstraints[fieldId]) {
            fieldConstraints[fieldId] = {};
        }
        const currentConstraints = fieldConstraints[fieldId];
        
        // Find the active type (numeric or text)
        const activeTypeBtn = consoleContainer.querySelector('.em-type-toggle-btn.active');
        const activeType = activeTypeBtn ? activeTypeBtn.dataset.type : null;

        // Clear out rules associated with the *inactive* type to prevent conflicts
        const allRules = new Set(Array.from(consoleContainer.querySelectorAll('.em-console-input')).map(el => el.dataset.rule));
        const activeRules = new Set(Array.from(consoleContainer.querySelectorAll(`.em-console-${activeType}-rules .em-console-input`)).map(el => el.dataset.rule));
        
        allRules.forEach(rule => {
            if (!activeRules.has(rule)) {
                delete currentConstraints[rule];
            }
        });


        consoleContainer.querySelectorAll('.em-console-input').forEach(input => {
            // Only save rules from the visible panel
            const parentPanel = input.closest('.em-console-numeric-rules, .em-console-text-rules');
            if (!parentPanel || parentPanel.style.display === 'none') return;
            
            const rule = input.dataset.rule;
            let value;

            if (input.type === 'checkbox') {
                value = input.checked ? 'integer' : 'decimal';
            } else {
                value = input.value;
            }

            if (value && value.trim() !== '') {
                currentConstraints[rule] = value;
            } else {
                delete currentConstraints[rule];
            }
        });
        alert(`Constraints for "${fieldId}" saved!`);
        
        // Optional: log the current state to the browser console for testing
        console.log("Current constraints object:", fieldConstraints);
        console.log("Formatted constraints:", GetFieldConstraints());
    }

    /**
     * @global
     * Retrieves all stored constraints and formats them according to the specified structure.
     * @returns {Array<Object>} An array of constraint objects.
     */
    window.GetFieldConstraints = function() {
        const formattedConstraints = [];

        for (const fieldId of Object.keys(fieldConstraints)) {
            const storedRules = fieldConstraints[fieldId];
            let hasNumericRules = false;
            let hasTextRules = false;

            // --- Process Numeric Constraints ---
            const numericOutput = {
                "field": fieldId,
                "type": "numeric",
                "integers_only": false,
                "range_min": null,
                "range_max": null,
                "excluded values": []
            };

            if (storedRules.numericType) {
                numericOutput.integers_only = storedRules.numericType === 'integer';
                hasNumericRules = true;
            }
            if (storedRules.min && storedRules.min !== '') {
                numericOutput.range_min = parseFloat(storedRules.min);
                hasNumericRules = true;
            }
            if (storedRules.max && storedRules.max !== '') {
                numericOutput.range_max = parseFloat(storedRules.max);
                hasNumericRules = true;
            }
            if (storedRules.exclude && storedRules.exclude !== '') {
                numericOutput["excluded values"] = storedRules.exclude
                    .split(',')
                    .map(v => parseFloat(v.trim()))
                    .filter(v => !isNaN(v)); // Filter out invalid numbers
                if (numericOutput["excluded values"].length > 0) hasNumericRules = true;
            }
            
            if (hasNumericRules) {
                formattedConstraints.push(numericOutput);
            }

            // --- Process Text Constraints ---
            const textOutput = {
                "field": fieldId,
                "type": "text",
                "allowed_values": [],
                "regex_pattern": null
            };

            if (storedRules.validValues && storedRules.validValues !== '') {
                textOutput.allowed_values = storedRules.validValues
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v !== '');
                if (textOutput.allowed_values.length > 0) hasTextRules = true;
            }
            if (storedRules.regex && storedRules.regex !== '') {
                textOutput.regex_pattern = storedRules.regex;
                hasTextRules = true;
            }

            if (hasTextRules) {
                formattedConstraints.push(textOutput);
            }
        }

        return formattedConstraints;
    };

    // Expose the initialize function to the global scope so it can be called from other scripts
    window.initializeConsole = initializeConsole;

})();