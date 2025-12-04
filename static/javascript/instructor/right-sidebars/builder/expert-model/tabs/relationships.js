let currentlyEditingStep = null;
let stepOrder = 1;
const relationshipContainer = document.getElementById('relationship-builder-container');


// Listen for clicks within the relationship builder
relationshipContainer.addEventListener('click', (e) => {
const card = e.target.closest('.em-relationship-card');
if (!card) return;

// Edit button clicked
if (e.target.matches('.em-edit-btn')) {
  enterEditMode(card.dataset.stepId);
}

// Save button clicked
if (e.target.matches('.em-save-btn')) {
  saveRelationship(card.dataset.stepId);
}
if (e.target.matches('.em-add-custom-input-btn')) addCustomInput(card.dataset.stepId);
});

class StepHierarchy {
        constructor() {
            this.problemData = null;
            this.expandedSteps = new Set();
        }

        loadProblem(problemData) {
            this.problemData = problemData;
            this.expandedSteps.clear();
            this.render();
        }

        toggleStep(stepId) {
            const stepElement = document.querySelector(`#hints-mode-content [data-step-id="${stepId}"]`);
            if (!stepElement) return;

            if (this.expandedSteps.has(stepId)) {
                this.expandedSteps.delete(stepId);
                stepElement.classList.remove('expanded');
            } else {
                this.expandedSteps.add(stepId);
                stepElement.classList.add('expanded');
            }
        }

        enableEdit(element) {
            element.contentEditable = 'true';
            element.focus();
            document.execCommand('selectAll', false, null);
        }

        disableEdit(element) {
            element.contentEditable = 'false';
            // Here you would add logic to save the change to the model
        }

        render() {
            if (!this.problemData) return;

            document.getElementById('hintsProblemTitle').textContent = this.problemData.title;
            const container = document.getElementById('stepHierarchy');

            container.innerHTML = this.problemData.steps.map(step => `
              <div class="em-step-node" data-step-id="${step.id}">
                <div class="em-step-header" onclick="hintsHierarchy.toggleStep(${step.id})">
                  <div class="em-step-number">${step.id}</div>
                  <div class="em-step-text em-editable" contenteditable="false"
                       ondblclick="hintsHierarchy.enableEdit(this)"
                       onblur="hintsHierarchy.disableEdit(this)"
                       onclick="event.stopPropagation()">${step.title}</div>
                  <div class="em-expand-icon">▶</div>
                </div>
                <div class="em-step-details">
                  <div class="em-step-content">
                    <div class="em-detail-section em-hint-section">
                      <div class="em-detail-label">💡 Hint</div>
                      <div class="em-detail-text em-editable" contenteditable="false"
                           ondblclick="hintsHierarchy.enableEdit(this)"
                           onblur="hintsHierarchy.disableEdit(this)">${step.hint}</div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('');
        }
    }

     // Create a single instance of the hierarchy manager
    const hintsHierarchy = new StepHierarchy();
    // Make toggleStep globally available for the onclick attribute
    window.hintsHierarchy = hintsHierarchy;

  // --- EVENT LISTENERS ---

  // Listen for Enter key on problem inputs
  allProblemInputs.forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim() !== '') {
        e.preventDefault();
        if (document.getElementById(`step-card-${e.target.id}`)) return; // Already exists

        e.target.classList.add('em-locked');
        e.target.disabled = true;

        createRelationshipStep(e.target.id);
      }
    });
  });

function createRelationshipStep(outputId) {
const outputLabel = document.querySelector(`label[for="${outputId}"]`)?.textContent || outputId;
const stepId = `step-card-${outputId}`;

const cardHTML = `
  <div class="em-relationship-card" id="${stepId}" data-step-id="${stepId}" data-output-id="${outputId}">
    <div class="em-card-header">
      <h4>Define relationship for: "${outputLabel}"</h4>
      <div class="em-card-actions">
        <button class="em-edit-btn" style="display:none;">Edit</button>
        <button class="em-save-btn">Save</button>
      </div>
    </div>
    <div class="em-card-body">
      <div class="em-view-state" style="display: none;">
        <div class="em-graph-view-container"></div>
      </div>
      ${getStepHTML()}
    </div>
  </div>`;

relationshipContainer.insertAdjacentHTML('beforeend', cardHTML);

// Initialize model entry
model[stepId] = {
    output: outputId,
    inputs: [],
    operator: null,
    order: stepOrder++
};
updateModelOrder();
enterEditMode(stepId);
}

function getStepHTML() {
return `<div class="em-edit-state">
        <h5>1. Ctrl+Click on inputs in the problem area</h5>
        <ul class="em-selected-inputs-list"></ul>
        <h5>2. (Optional) Add a custom input value</h5>
        <div class="em-custom-input-container">
            <input type="text" class="em-custom-input-field" placeholder="e.g., 10 or 'tax'">
            <button class="em-add-custom-input-btn">Add</button>
        </div>
        <h5>3. Select the operation used</h5>
        <select class="em-operator-select">
          <option value="">-- Select an Operation --</option>
          <optgroup label="Arithmetic">
            <option value="Add">Add</option>
            <option value="Subtract">Subtract</option>
            <option value="Multiply">Multiply</option>
            <option value="Divide">Divide</option>
            <option value="Average">Average</option>
            <option value="Sum">Sum</option>
          </optgroup>
          <optgroup label="String">
            <option value="Concatenate">Concatenate</option>
          </optgroup>
          <optgroup label="Comparison">
            <option value="Equals">Equals</option>
          </optgroup>
        </select>
      </div>`
}

/**
 * The main controller function that processes an array of steps sequentially.
 * @param {Array<Object>} stepsArray An array of step JSON objects from the backend.
 */
async function processStepDemonstrations(stepsArray) {
    if (stepsArray && stepsArray.length > 0) {
        const hintSteps = stepsArray.map((step, index) => ({
            id: index + 1,
            title: step.field,
            hint: step.hint
        }));
        hintsHierarchy.loadProblem({
            title: "Problem Solution Hints",
            steps: hintSteps
        });
    }
    for (const step of stepsArray) {
        await createAndAwaitConfirmation(step);
        console.log(`Step for "${step.field}" confirmed. Moving to the next.`);
    }

    addMessageToChat({sender: 'agent', content: "All steps have been confirmed."});

    const finalModel = collectFinalModelData();

    if (socket) {
        socket.emit('expert_model_defined', finalModel);
        console.log('Final expert model emitted:', finalModel);
    } else {
        console.error('Socket.IO instance not found on socket. Cannot emit final model.');
    }
}

/**
 * Creates a single relationship card and returns a Promise that resolves when the user confirms.
 * @param {Object} stepData The JSON data for a single step.
 * @returns {Promise<void>} A promise that resolves upon user confirmation.
 */
function createAndAwaitConfirmation(stepData) {
    return new Promise(async (resolve) => {
        console.log('stepData: ', stepData);
        const outputFieldElement = document.getElementById(stepData.field);
        console.log('outputelement: ', outputFieldElement);
        if (outputFieldElement) {
            outputFieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(r => setTimeout(r, 400));
            outputFieldElement.value = stepData.value;
            outputFieldElement.classList.add('em-output-field-highlight');
            for (const input_field of stepData.inputs) {
                const inputFieldElement = document.getElementById(input_field);
                inputFieldElement.classList.add('em-input-field-highlight');
            }
        }

        if (stepData.description) {
            addMessageToChat({
            sender: 'agent',
            content: stepData.description
        });
        }

        const outputId = stepData.field;
        const outputLabel = document.querySelector(`label[for="${outputId}"]`)?.textContent || outputId;

        const stepId = `step-card-${outputId}`;


        const cardHTML = `
          <div class="em-relationship-card" id="${stepId}" data-step-id="${stepId}" data-output-id="${outputId}">
            <div class="em-card-header">
              <h4>Review step for: "${outputLabel}"</h4>
              <div class="em-card-actions">
                <button class="em-relationship-confirm-btn">Confirm</button>
                <button class="em-edit-btn">Edit</button>
                <button class="em-save-btn" style="display:none;">Save</button>
              </div>
            </div>
            <div class="em-card-body">
              <div class="em-view-state"><div class="em-graph-view-container"></div></div>
              <div class="em-edit-state" style="display: none;">${getStepHTML()}</div>
            </div>
          </div>`;
        console.log('Creating card for', stepId, 'HTML:', cardHTML);

        relationshipContainer.insertAdjacentHTML('beforeend', cardHTML);
        const newCard = document.getElementById(stepId);

        if (stepData.description) {
            const viewState = newCard.querySelector('.em-view-state');
            const descriptionElement = document.createElement('p');
            descriptionElement.className = 'em-step-description';
            descriptionElement.textContent = stepData.description;
            viewState.prepend(descriptionElement);
        }

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

        const confirmBtn = newCard.querySelector('.em-relationship-confirm-btn');
        const editBtn = newCard.querySelector('.em-edit-btn');
        const saveBtn = newCard.querySelector('.em-save-btn');

        const onConfirm = () => {
            outputFieldElement.disabled = true;
            outputFieldElement.classList.remove('em-output-field-highlight');
            for (const input_field of stepData.inputs) {
                const inputFieldElement = document.getElementById(input_field);
                inputFieldElement.classList.remove('em-input-field-highlight');
            }
            newCard.classList.add('em-confirmed');
            confirmBtn.remove();
            editBtn.style.display = 'none';
            cleanupListeners();
            resolve();
        };
        const onEdit = () => {
            confirmBtn.style.display = 'none';
            enterEditMode(stepId);
        };
        const onSave = () => {
            outputFieldElement.disabled = true;
            outputFieldElement.classList.remove('em-output-field-highlight');
            for (const input_field of stepData.inputs) {
                const inputFieldElement = document.getElementById(input_field);
                inputFieldElement.classList.remove('em-input-field-highlight');
            }
            saveRelationship(stepId);
            newCard.classList.add('em-confirmed');
            editBtn.style.display = 'none';
            cleanupListeners();
            resolve();
        };
        const cleanupListeners = () => {
            confirmBtn.removeEventListener('click', onConfirm);
            editBtn.removeEventListener('click', onEdit);
            saveBtn.removeEventListener('click', onSave);
        };

        console.log('newCard:', newCard);
        confirmBtn.addEventListener('click', onConfirm);
        editBtn.addEventListener('click', onEdit);
        saveBtn.addEventListener('click', onSave);

        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

  function renderSelectedInputs(stepId) {
      const cardModel = model[stepId];
      const listElement = document.getElementById(stepId).querySelector('.em-selected-inputs-list');
      listElement.innerHTML = '';

      cardModel.inputs.forEach(input => {
          let listItem;
          if (input.type === 'element') {
              const label = document.querySelector(`label[for="${input.id}"]`)?.textContent || input.id;
              listItem = `<li>${label}</li>`;
          } else {
              listItem = `<li class="em-custom-input-item">Custom: "${input.value}"</li>`;
          }
          listElement.insertAdjacentHTML('beforeend', listItem);
      });
  }

  function enterEditMode(stepId) {
      if (currentlyEditingStep) {
          saveRelationship(currentlyEditingStep);
      }

      currentlyEditingStep = stepId;
      document.body.classList.add('em-editing-relationship');

      const outputElement = document.getElementById(model[stepId].output);
      if (outputElement) {
          outputElement.classList.add('em-is-output-for-current-card');
      }

      const card = document.getElementById(stepId);
      card.querySelector('.em-edit-state').style.display = 'block';
      card.querySelector('.em-view-state').style.display = 'none';
      card.querySelector('.em-edit-btn').style.display = 'none';
      card.querySelector('.em-save-btn').style.display = 'inline-block';

      updateInputHighlights(stepId);
  }

  function saveRelationship(stepId) {
      if (!stepId) return;

      const outputElement = document.getElementById(model[stepId].output);
      if (outputElement) {
          outputElement.classList.remove('em-is-output-for-current-card');
      }

      const card = document.getElementById(stepId);
      const operator = card.querySelector('.em-operator-select').value;
      model[stepId].operator = operator;

      card.querySelector('.em-edit-state').style.display = 'none';
      card.querySelector('.em-view-state').style.display = 'block';
      card.querySelector('.em-save-btn').style.display = 'none';
      card.querySelector('.em-edit-btn').style.display = 'inline-block';

      document.body.classList.remove('em-editing-relationship');
      allProblemInputs.forEach(inp => inp.classList.remove('em-selected-as-input'));
      currentlyEditingStep = null;

      drawRelationshipGraph(card, model[stepId]);
  }

  function toggleInputSelection(inputId) {
      const cardModel = model[currentlyEditingStep];
      const index = cardModel.inputs.findIndex(inp => inp.type === 'element' && inp.id === inputId);

      if (index > -1) {
          cardModel.inputs.splice(index, 1);
      } else {
          cardModel.inputs.push({ type: 'element', id: inputId });
      }

      renderSelectedInputs(currentlyEditingStep);
      updateInputHighlights(currentlyEditingStep);
  }

  function addCustomInput(stepId) {
      const card = document.getElementById(stepId);
      const inputField = card.querySelector('.em-custom-input-field');
      const value = inputField.value.trim();

      if (value) {
          model[stepId].inputs.push({ type: 'custom', value: value });
          inputField.value = '';
          renderSelectedInputs(stepId);
      }
  }

  function updateModelOrder() {
    const cards = relationshipContainer.querySelectorAll('.em-relationship-card');
    cards.forEach((card, index) => {
        const stepId = card.id;
        if (model[stepId]) {
            model[stepId].order = index + 1;
        }
    });
  }

  function updateInputHighlights(stepId) {
      allProblemInputs.forEach(inp => inp.classList.remove('em-selected-as-input'));
      const inputsForStep = model[stepId]?.inputs || [];
      inputsForStep.forEach(input => {
          if (input.type === 'element') {
             document.getElementById(input.id)?.classList.add('em-selected-as-input');
          }
      });
  }

  // --- DYNAMIC GRAPH DRAWING ---
  function drawRelationshipGraph(card, stepData) {
    const container = card.querySelector('.em-graph-view-container');
    container.innerHTML = '';

    if (!stepData.output || !stepData.operator || stepData.inputs.length === 0) {
        container.innerHTML = '<p style="color: var(--em-text-muted); font-size: 14px;">Incomplete relationship. Please edit and save.</p>';
        return;
    }

    const outputLabel = document.querySelector(`label[for="${stepData.output}"]`)?.textContent || stepData.output;

    const inputsHTML = stepData.inputs.map(input => {
        if (input.type === 'element') {
            const inputLabel = document.querySelector(`label[for="${input.id}"]`)?.textContent || input.id;
            return `<div class="em-graph-node" data-node-id="${input.id}">${inputLabel}</div>`;
        } else {
            return `<div class="em-graph-node em-custom-node" data-node-id="custom:${input.value}">${input.value}</div>`;
        }
    }).join('');

    let graphHTML = `
        <div class="em-graph-step">
            <div class="em-graph-inputs">${inputsHTML}</div>
            <div class="em-graph-operation">${stepData.operator}</div>
            <div class="em-graph-node em-output">${outputLabel}</div>
            <svg class="em-arrows" width="100%" height="100%"></svg>
        </div>
    `;
    container.innerHTML = graphHTML;
    setTimeout(() => updateArrowsForCard(card), 50);
  }

  function updateArrowsForCard(card) {
      const step = card.querySelector('.em-graph-step');
      if (!step) return;

      const svg = step.querySelector('svg.em-arrows');
      const stepRect = step.getBoundingClientRect();

      const inputNodes = Array.from(step.querySelectorAll('.em-graph-inputs .em-graph-node'));
      const operatorNode = step.querySelector('.em-graph-operation');
      const outputNode = step.querySelector('.em-graph-node.em-output');

      if (!operatorNode || !outputNode || inputNodes.length === 0) return;
      svg.innerHTML = '';

      const opRect = operatorNode.getBoundingClientRect();
      const endX = opRect.left - stepRect.left + opRect.width / 2;
      const endY = opRect.top - stepRect.top;

      inputNodes.forEach(input => {
          const inputRect = input.getBoundingClientRect();
          const startX = inputRect.left - stepRect.left + inputRect.width / 2;
          const startY = inputRect.bottom - stepRect.top;
          const controlY1 = startY + (endY - startY) * 0.3;
          const controlY2 = endY - (endY - startY) * 0.3;
          const pathData = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;
          createPath(svg, pathData);
      });

      const outRect = outputNode.getBoundingClientRect();
      const startOpX = opRect.left - stepRect.left + opRect.width / 2;
      const startOpY = opRect.bottom - stepRect.top;
      const endOutX = outRect.left - stepRect.left + outRect.width / 2;
      const endOutY = outRect.top - stepRect.top;
      const pathDataOpOut = `M ${startOpX} ${startOpY} L ${endOutX} ${endOutY}`;
      createPath(svg, pathDataOpOut);
  }

  function createPath(svg, d) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
  }

  window.addEventListener('resize', () => {
    document.querySelectorAll('.em-relationship-card').forEach(card => {
        if (card.querySelector('.em-view-state').style.display !== 'none') {
            updateArrowsForCard(card);
        }
    });
  });