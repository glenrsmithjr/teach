//document.addEventListener('DOMContentLoaded', () => {


console.log('[expert-model-sidebar] loaded and executing');
//const lockInterfaceBtn = document.getElementById('builder-lock-interface-btn');
//const createExpertModelBtn = document.getElementById('builder-create-expert-model-btn');
const canvas = document.getElementById('builder-form-canvas');
//let socket;


  const model = {
        relationships: {},
        constraints: {}
    };

  const allProblemInputs = document.querySelectorAll('input');


  // UUID Generator ---
    function generateUUID() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }






// Listen for Clicks on the whole document for input selection
document.addEventListener('click', (e) => {
if (!currentlyEditingStep || !e.ctrlKey) return;

// Allow selecting locked fields that aren't the current card's output
const targetInput = e.target.closest('input');
if (targetInput) {
    e.preventDefault();
    toggleInputSelection(targetInput.id);
}
});

  // Tab switching
  document.querySelector('.em-sidebar-tabs').addEventListener('click', (e) => {
        if (e.target.matches('.em-tab-btn')) {
            document.querySelectorAll('.em-sidebar-pane').forEach(p => p.style.display = 'none');
            document.querySelectorAll('.em-tab-btn').forEach(b => b.classList.remove('active'));

            const mode = e.target.dataset.mode;
            document.getElementById(`${mode}-mode-content`).style.display = 'block';
            e.target.classList.add('active');

            if (mode === 'console') {
                initializeConsole(canvas);
            }
        }
    });

/**
 * Gathers the final state of all confirmed relationship cards.
 * @returns {Array<Object>} An array of objects representing the full expert model.
 */
function collectFinalModelData() {
    const finalData = [];
    const confirmedCards = document.querySelectorAll('.em-relationship-card.em-confirmed');

    confirmedCards.forEach(card => {
        const stepId = card.dataset.stepId;
        if (model[stepId]) {
            const stepModel = model[stepId];
            finalData.push({
                output: stepModel.output,
                inputs: stepModel.inputs.map(input => {
                    if (input.type === 'element') {
                        return { type: 'element', id: input.id };
                    }
                    return { type: 'custom', value: input.value };
                }),
                operator: stepModel.operator,
                description: stepModel.description,
                order: stepModel.order
            });
        }
    });
    return finalData.sort((a, b) => a.order - b.order);
}




/**
 * Parses a JSON object representing a pre-defined step and creates a
 * fully populated relationship card in the UI.
 * @param {object} stepData The JSON data for the step from the backend.
 */
function loadStepFromJson(stepData) {
    const outputId = stepData.field;
    if (!outputId || document.getElementById(`step-card-${outputId}`)) {
        console.warn(`Skipping step creation for "${outputId}" as it already exists or is invalid.`);
        return;
    }

    const outputLabel = document.querySelector(`label[for="${outputId}"]`)?.textContent || outputId;
    const stepId = `step-card-${outputId}`;

    const cardHTML = `
      <div class="em-relationship-card" id="${stepId}" data-step-id="${stepId}" data-output-id="${outputId}">
        <div class="em-card-header">
          <h4>Define relationship for: "${outputLabel}"</h4>
          <div class="em-card-actions">
            <button class="em-relationship-confirm-btn">Confirm</button>
            <button class="em-edit-btn">Edit</button>
            <button class="em-save-btn" style="display:none;">Save</button>
          </div>
        </div>
        <div class="em-card-body">
          <div class="em-view-state">
             <div class="em-graph-view-container"></div>
          </div>
          <div class="em-edit-state" style="display: none;">
             ${getStepHTML()}
          </div>
        </div>
      </div>`;

    relationshipContainer.insertAdjacentHTML('beforeend', cardHTML);
    const newCard = document.getElementById(stepId);

    // --- Populate the model for this new step ---
    const operatorName = stepData.operator.name;
    const formattedOperator = operatorName.charAt(0).toUpperCase() + operatorName.slice(1);

    model[stepId] = {
        output: outputId,
        inputs: stepData.inputs.map(inputId => ({ type: 'element', id: inputId })),
        operator: formattedOperator,
        order: stepOrder++,
        description: stepData.description
    };

    renderSelectedInputs(stepId);
    newCard.querySelector('.em-operator-select').value = formattedOperator;

    drawRelationshipGraph(newCard, model[stepId]);
    updateModelOrder();
}











//});