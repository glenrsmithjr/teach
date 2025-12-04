var tutorId = window.tutorId || 0;
var userId = window.userId || 0;

document.addEventListener('DOMContentLoaded', function () {
    // --- Global DOM Variables ---
    const sidebar = document.getElementById('builder-sidebar');
    const mainContent = document.getElementById('builder-main-content');
    const clearCanvasBtn = document.getElementById('builder-clear-canvas');
    const saveFormBtn = document.getElementById('builder-save-form');
    const previewTutorBtn = document.getElementById('builder-preview-tutor');
    const canvas = document.getElementById('builder-form-canvas');
    const gridOverlay = document.getElementById('builder-grid-overlay');
    //const showGridCheckbox = document.getElementById('builder-show-grid');
    const snapToGridCheckbox = document.getElementById('builder-snap-to-grid');
    const gridSizeInput = document.getElementById('builder-grid-size');
    const lockInterfaceBtn = document.getElementById('builder-lock-interface-btn');
    const createExpertModelBtn = document.getElementById('builder-create-expert-model-btn');
    const rightSidebarWrapper = document.getElementById('right-sidebar-content-wrapper');
    const workspace = document.querySelector('.builder-workspace');
    const loadingModal = document.getElementById('builder-loading-modal');
    const componentSidebarLoaded = true;

    // --- State Variables ---
    let selectedElement = null;
    let isDragging = false;
    let isResizing = false;
    let isRotating = false;
    let startX, startY;
    let elementStartX, elementStartY;
    let elementStartWidth, elementStartHeight;
    let zIndex = 10;
    let gridSize = parseInt(gridSizeInput.value);
    let elementCounter = 0;
    let isInterfaceLocked = false;
    let draggedElementPart = null; // Can be 'label' or null
    let draggedPart = null; // The actual label element being dragged

   const COMPONENT_TEMPLATES = {
    // --- Text & Input ---
    'label': () => `<label class="builder-label component-root" contenteditable="true">Label Text</label>`,
    'text': () => `<input type="text" class="builder-input component-root" placeholder="">`,
    'number-input': () => `<input type="number" class="builder-input component-root" value="0">`,
    'textarea': () => `<textarea class="builder-textarea component-root" placeholder=""></textarea>`,
    'paragraph': () => `<p class="builder-paragraph component-root" contenteditable="true">This is a paragraph.</p>`,
    'text-prompt': () => `
        <div class="component-root">
            <div class="builder-text-prompt" contenteditable="true">Enter a prompt and select text to create variables...</div>
            <div class="prompt-variable-list"></div>
            <div class="builder-component-controls">
                <button class="builder-btn builder-btn-outline create-prompt-variable-btn" style="width:100%; font-size:12px; padding: 4px;">Enter Variable Creation Mode</button>
            </div>
        </div>`,
    'date': () => `<input type="date" class="builder-input component-root">`,
    'rich-text': () => `<div class="builder-richtext component-root" contenteditable="true">Rich text content.</div>`,
    'h1': () => `<h1 class="text-2xl font-bold mb-6 text-center component-root" contenteditable="true">Tutor Title</h1>`,
    'h2': () => `<h1 class="text-2xl font-bold mb-6 text-center component-root" contenteditable="true">Tutor Title</h1>`,
    'h3': () => `<h1 class="text-2xl font-bold mb-6 text-center component-root"  contenteditable="true">Tutor Title</h1>`,

    // --- Choice Elements ---
    'select': () => `
        <div class="component-root">
            <select class="builder-select">
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
            </select>
            <div class="select-options-manager"></div>
        </div>
    `,
    'checkbox': () => `
        <div class="component-root">
            <div class="options-container">
                <div class="checkbox-item">
                    <input type="checkbox" id="checkbox1-${Date.now()}">
                    <label for="checkbox1-${Date.now()}" contenteditable="true">Option 1</label>
                </div>
            </div>
            <button class="add-option-btn">+ Add Option</button>
        </div>
    `,
    'radio': () => `
        <div class="component-root">
            <div class="options-container">
                <div class="radio-item">
                    <input type="radio" name="radio-group-${Date.now()}" id="radio1-${Date.now()}">
                    <label for="radio1-${Date.now()}" contenteditable="true">Option 1</label>
                </div>
            </div>
            <button class="add-option-btn">+ Add Option</button>
        </div>
    `,
    'toggle': () => `
        <div class="checkbox-item component-root">
            <label class="switch">
                <input type="checkbox">
                <span class="slider round"></span>
            </label>
        </div>
    `,
    'slider': () => `
        <div class="builder-slider-container component-root">
            <span class="slider-value-display">50</span>
            <input type="range" min="0" max="100" value="50">
            <div class="builder-slider-labels"><span>0</span><span>100</span></div>
        </div>`,
    'file-upload': () => `<input type="file" class="component-root">`,

    // --- Layout & Media ---
    'container': () => `<div class="builder-container component-root" data-dropzone="true"></div>`,
    'table': () => `
        <div class="component-root builder-table-container">
            <div class="builder-table-wrapper">
                <table class="builder-table">
                    <thead><tr><th contenteditable="true">Header 1</th><th contenteditable="true">Header 2</th></tr></thead>
                    <tbody><tr><td contenteditable="true">Cell 1</td><td contenteditable="true">Cell 2</td></tr><tr><td contenteditable="true">Cell 3</td><td contenteditable="true">Cell 4</td></tr></tbody>
                </table>
            </div>
        </div>`,
    'image': () => `
        <div class="component-root">
            <div class="builder-image-container">
                <img src="https://via.placeholder.com/150" alt="Placeholder image">
                <figcaption contenteditable="true">Image Caption</figcaption>
            </div>
            <div class="builder-component-controls">
                <div class="builder-control-row"><label>URL:</label><input class="image-url-input" type="text" value="https://via.placeholder.com/150"></div>
                <div class="builder-control-row"><label>Alt Text:</label><input class="image-alt-input" type="text" value="Placeholder image"></div>
            </div>
        </div>`,
    'video': () => `
         <div class="component-root">
            <div class="builder-media-container"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe></div>
            <div class="builder-component-controls"><div class="builder-control-row"><label>URL:</label><input class="media-url-input" type="text" value="https://www.youtube.com/embed/dQw4w9WgXcQ"></div></div>
        </div>`,
    'audio': () => `
        <div class="component-root">
            <div class="builder-media-container"><audio controls src=""></audio></div>
            <div class="builder-component-controls"><div class="builder-control-row"><label>URL:</label><input class="media-url-input" type="text" value=""></div></div>
        </div>`,
    'code': () => `<div class="builder-code-block component-root"><pre contenteditable="true"><code>// Your code here</code></pre></div>`,

    // --- Shapes & Annotation ---
    'shape-rect': () => `<div class="builder-shape component-root"><span class="builder-shape-text" contenteditable="false">Text</span></div>`,
    'shape-circle': () => `<div class="builder-shape builder-shape-circle component-root"><span class="builder-shape-text" contenteditable="false">Text</span></div>`,
    'line': () => `<div class="builder-line component-root"></div>`,
    'arrow': () => `<div class="builder-arrow component-root"><svg viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M 0 5 H 90 L 85 0 L 100 5 L 85 10 L 90 5" stroke="#343a40" stroke-width="2" fill="none" /></svg></div>`,

    // --- Interactive Tasks ---
    'matching': () => `
        <div class="matching-task component-root">
            <svg class="matching-canvas"></svg>
            <div class="matching-column" data-side="left">
                <div class="matching-item" data-id="L1" contenteditable="true">Left Item 1</div>
                <div class="matching-item" data-id="L2" contenteditable="true">Left Item 2</div>
            </div>
            <div class="matching-column" data-side="right">
                <div class="matching-item" data-id="R1" contenteditable="true">Right Item 1</div>
                <div class="matching-item" data-id="R2" contenteditable="true">Right Item 2</div>
            </div>
             <div class="builder-component-controls">
                <button class="add-match-item-btn" data-side="left">+ Left</button>
                <button class="add-match-item-btn" data-side="right">+ Right</button>
             </div>
        </div>`,
    'ordering': () => `
        <div class="interactive-task-container component-root">
            <div class="ordering-list">
                <div class="interactive-task-item" contenteditable="true">Item 1</div>
                <div class="interactive-task-item" contenteditable="true">Item 2</div>
                <div class="interactive-task-item" contenteditable="true">Item 3</div>
            </div>
             <div class="builder-component-controls"><button class="add-interactive-item-btn">+ Add Item</button></div>
        </div>`,
    'categorization': () => `
        <div class="categorization-container component-root">
            <div class="categorization-bank-wrapper"><strong>Uncategorized</strong><div class="categorization-bank interactive-task-container"><div class="interactive-task-item" contenteditable="true">Item A</div><div class="interactive-task-item" contenteditable="true">Item B</div></div></div>
            <div class="categorization-buckets-wrapper">
                <div class="categorization-bucket interactive-task-container"><strong contenteditable="true">Category 1</strong></div>
                <div class="categorization-bucket interactive-task-container"><strong contenteditable="true">Category 2</strong></div>
            </div>
             <div class="builder-component-controls">
                <button class="add-interactive-item-btn" data-target=".categorization-bank">+ Add Card</button>
                <button class="add-categorization-bucket-btn">+ Add Category</button>
            </div>
        </div>`,
    'fill-in-blanks': () => `
        <div class="component-root">
            <div class="fill-in-blanks-container" contenteditable="true">Double click to edit. Select text and use the button below to create a blank space.</div>
            <div class="builder-component-controls"><button class="create-blank-btn">Create Blank from Selection</button></div>
        </div>`,

    // --- Math Elements ---
    'fraction': () => `<div class="math-fraction component-root"><input type="text" class="math-input" placeholder="num" value="1"><span class="fraction-bar"></span><input type="text" class="math-input" placeholder="den" value="2"></div>`,
    'exponent': () => `<div class="math-exponent component-root"><input type="text" class="math-input" value="x"><sup><input type="text" class="math-input" value="2"></sup></div>`,
    'radical': () => `<div class="math-radical component-root"><span class="radical-symbol">√</span><span class="radicand-container"><input type="text" class="math-input" value="16"></span></div>`,
    'summation': () => `<div class="math-summation component-root"><div class="sum-limits"><input type="text" class="math-input limit-upper" value="n"><span class="sum-symbol">∑</span><input type="text" class="math-input limit-lower" value="i=1"></div><input type="text" class="math-input sum-expression" value="i" style="max-width:80px;"></div>`,
    'integral': () => `<div class="math-integral component-root"><div class="int-limits"><input type="text" class="math-input limit-upper" value="b"><span class="int-symbol">∫</span><input type="text" class="math-input limit-lower" value="a"></div><input type="text" class="math-input int-expression" value="f(x)" style="max-width:80px;"><span class="int-dx">dx</span></div>`,
    'matrix': () => `<div class="component-root"><div class="math-matrix-container"><div class="math-matrix"><span class="matrix-bracket left">[</span><div class="matrix-grid" style="grid-template-columns: repeat(2, 1fr);"><input type="text" class="math-input" value="a"><input type="text" class="math-input" value="b"><input type="text" class="math-input" value="c"><input type="text" class="math-input" value="d"></div><span class="matrix-bracket right">]</span></div></div><div class="matrix-controls">Rows: <input type="number" class="matrix-dim" data-dim="rows" value="2" min="1">Cols: <input type="number" class="matrix-dim" data-dim="cols" value="2" min="1"></div></div>`,
    'graph': () => `<div class="math-graph component-root"><svg width="100%" height="150" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="5" y1="95" x2="95" y2="95" stroke="#9ca3af" stroke-width="1"/><line x1="5" y1="5" x2="5" y2="95" stroke="#9ca3af" stroke-width="1"/><polygon points="95,92 100,95 95,98" fill="#9ca3af"/><polygon points="2,5 5,0 8,5" fill="#9ca3af"/><polyline points="5,95 25,60 50,40 75,50 95,20" fill="none" stroke="var(--builder-primary)" stroke-width="1.5"/></svg></div>`
};


    function loadScript(url, callback) {
        if (document.querySelector(`script[src="${url}"]`)) {
            if (callback) callback();
            return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = callback;
        document.head.appendChild(script);
    }

    // =================================================================
    // --- CORE BUILDER/CANVAS FUNCTIONALITY ---
    // =================================================================

    function initBuilder() {
        loadScript('https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js');
        lockInterfaceBtn.addEventListener('click', toggleInterfaceLock);
        checkCanvasEmpty();
        document.documentElement.style.setProperty('--builder-grid-size', `${gridSize}px`);

        gridSizeInput.addEventListener('change', () => {
            gridSize = parseInt(gridSizeInput.value);
            document.documentElement.style.setProperty('--builder-grid-size', `${gridSize}px`);
        });

        document.addEventListener('click', (e) => {
            const clickedHeader = e.target.closest('.builder-group-header');
            // Proceed only if a group header was clicked
            if (clickedHeader) {
                const clickedGroup = clickedHeader.closest('.builder-component-group');
                const allGroups = document.querySelectorAll('.builder-sidebar .builder-component-group');

                // If the clicked group is currently collapsed (and is about to be opened),
                // then loop through all groups and collapse any that aren't the one we just clicked.
                if (clickedGroup.classList.contains('collapsed')) {
                    allGroups.forEach(group => {
                        if (group !== clickedGroup) {
                            group.classList.add('collapsed');
                            group.querySelector('.builder-chevron')?.classList.add('collapsed');
                            group.querySelector('.builder-group-content')?.classList.add('collapsed');
                        }
                    });
                }

                // Finally, toggle the state of the clicked group. This will either open it
                // (after all others have been closed) or close it if it was already open.
                clickedGroup.classList.toggle('collapsed');
                clickedGroup.querySelector('.builder-chevron')?.classList.toggle('collapsed');
                clickedGroup.querySelector('.builder-group-content')?.classList.toggle('collapsed');
            }
        }, true);

        clearCanvasBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to clear the canvas?')) {
            Array.from(canvas.children).forEach(child => {
              if (!child.classList?.contains('builder-grid-overlay')) child.remove();
            });
            selectedElement = null;
            checkCanvasEmpty();
          }
        });

        function displaySuccess(message) {
            const contentContainer = document.querySelector('.space-y-8');
            if (!contentContainer) return;

            // Remove any existing success messages
            const existingSuccess = document.getElementById('dashboard-success-flash');
            if (existingSuccess) existingSuccess.remove();

            const successHtml = `
                <div id="dashboard-success-flash" class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md" role="alert">
                    <div class="flex">
                        <div class="py-1"><i class="fas fa-check-circle mr-3"></i></div>
                        <div>
                            <p class="font-bold">Success</p>
                            <p class="text-sm">${message}</p>
                        </div>
                    </div>
                </div>
            `;
            contentContainer.insertAdjacentHTML('afterbegin', successHtml);
        }

        saveFormBtn.addEventListener('click', async () => {
            saveForm();

        });

        previewTutorBtn.addEventListener('click', async () => {
            showLoading('Saving tutor...');
            const success = await saveForm();
            hideLoading();
            if (success) {
                const previewUrl = `/tutor-view/${tutorId}?user_id=${userId}&preview=true`;
                window.open(previewUrl, '_blank');
            }
            // No alert on failure, saveForm() already shows one.
        });

        // Add keyboard listener for deleting elements
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
                const activeEl = document.activeElement;
                // Do not delete if user is typing in an input/textarea/contenteditable
                if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable) {
                    return;
                }
                e.preventDefault();
                selectedElement.remove();
                selectedElement = null;
                checkCanvasEmpty();
            }
        });
    }

    function checkCanvasEmpty() {
      const hasAnyContent = Array.from(canvas.children).some(
        c => !c.classList?.contains('builder-grid-overlay') && !c.classList?.contains('builder-canvas-instruction')
      );

        if (hasAnyContent) {
            lockInterfaceBtn.classList.remove('hidden')
        } else {
            lockInterfaceBtn.classList.add('hidden')
        }


      let instruction = canvas.querySelector('.builder-canvas-instruction');
      if (!hasAnyContent && !instruction) {
        instruction = document.createElement('div');
        instruction.className = 'builder-canvas-instruction';
        instruction.innerHTML = `<i class="fas fa-mouse-pointer"></i><p>Drag and drop form elements here</p><p class="builder-small-text">Select elements from the sidebar</p>`;
        canvas.appendChild(instruction);
      } else if (hasAnyContent && instruction) {
        instruction.remove();
      }
    }

    function snapToGrid(value) {
        if (!snapToGridCheckbox.checked || isRotating) return value;
        return Math.round(value / gridSize) * gridSize;
    }

    document.addEventListener('dragstart', (e) => {
      if (isInterfaceLocked) { e.preventDefault(); return; }
      const item = e.target.closest('.builder-component-item');
      if (item) {
        const type = item.getAttribute('data-type');
        if (type) e.dataTransfer.setData('text/plain', type);
      }
    });

    canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('drag-over'); });
    canvas.addEventListener('dragleave', () => canvas.classList.remove('drag-over'));
    canvas.addEventListener('drop', (e) => { //
      e.preventDefault();
      canvas.classList.remove('drag-over');

      const type = e.dataTransfer.getData('text/plain');
      if (!type || !COMPONENT_TEMPLATES[type]) return;

      // Special handling for dropping new labels.
      if (type === 'label') {
          const dropTargetWrapper = e.target.closest('.builder-form-element');
          const formField = dropTargetWrapper ? dropTargetWrapper.querySelector('input, select, textarea') : null;

          // Only proceed if the label is dropped on a form element.
          if (formField) {
              // Check if a label already exists
              if (dropTargetWrapper.querySelector('label')) {
                  alert('This element already has a label.');
                  return;
              }
              const newLabelElement = document.createElement('label');
              newLabelElement.className = 'builder-label';
              newLabelElement.textContent = 'New Label';
              newLabelElement.setAttribute('contenteditable', 'true');

              // Ensure the form field has an ID for the 'for' attribute.
              if (!formField.id) {
                  formField.id = `field-${Date.now()}`;
              }
              newLabelElement.setAttribute('for', formField.id);

              // Add the new label inside the existing form element's content wrapper.
              dropTargetWrapper.querySelector('.builder-element-content').prepend(newLabelElement);
          }
          // If not dropped on a valid target, do nothing (the label disappears).
          return;
      }

      // Original logic for all other components.
      const rect = canvas.getBoundingClientRect();
      const posX = snapToGrid(e.clientX - rect.left);
      const posY = snapToGrid(e.clientY - rect.top);
      const newElement = createFormElementFromType(type, posX, posY);
      canvas.appendChild(newElement);
      addSpecialHandles(newElement);
      selectElement(newElement);
      checkCanvasEmpty();
    });

    function createFormElementFromType(type, posX, posY) {
      const element = document.createElement('div');
      elementCounter++;
      element.id = `element-${type}-${elementCounter}`;
      element.className = 'builder-form-element';
      element.style.left = `${posX}px`;
      element.style.top = `${posY}px`;
      element.style.zIndex = zIndex++;
      element.dataset.type = type;

        /* Set default sizes for certain elements
        if (['container', 'matching', 'ordering', 'categorization', 'fill-in-blanks', 'text-prompt'].includes(type)) {
            element.style.width = '300px';
            element.style.height = '200px';
        } else if (type === 'line' || type === 'arrow') {
            element.style.width = '150px';
            element.style.height = '20px';
        } else if (type === 'shape-circle') {
             element.style.width = '100px';
             element.style.height = '100px';
        }*/


      const contentContainer = document.createElement('div');
      contentContainer.className = 'builder-element-content';
      contentContainer.innerHTML = COMPONENT_TEMPLATES[type]();
      element.appendChild(contentContainer);

      const actions = document.createElement('div');
      actions.className = 'builder-element-actions';
      actions.innerHTML = `
        <button class="builder-action-btn builder-edit" title="Edit Identifier"><i class="fas fa-pencil-alt"></i></button>
        <button class="builder-action-btn builder-delete" title="Delete"><i class="fas fa-trash"></i></button>`;
      element.appendChild(actions);

      setupElementInteractions(element);
      initializeComponent(element);
      if (type === 'table') {
        const externalControls = document.createElement('div');
        externalControls.className = 'external-controls-wrapper';
        externalControls.innerHTML = `
            <div class="table-controls-group">
                <button class="table-control-btn add-table-row-btn" title="Add Row">+</button>
                <span class="table-control-label">Row</span>
                <button class="table-control-btn remove-table-row-btn" title="Remove Row">-</button>
            </div>
            <div class="table-controls-group">
                <button class="table-control-btn add-table-col-btn" title="Add Column">+</button>
                <span class="table-control-label">Col</span>
                <button class="table-control-btn remove-table-col-btn" title="Remove Column">-</button>
            </div>`;
        element.appendChild(externalControls);
      }

      return element;
    }


    function setupElementInteractions(element) { //
        element.addEventListener('mousedown', (e) => {
            if (isInterfaceLocked) return;

            // Allow clicks on interactive parts when selected
            if (element.classList.contains('selected')) {
                const isInteractive = e.target.closest('input, textarea, select, [contenteditable="true"], button, .interactive-task-item, .matching-item');
                if (isInteractive) return;
            }

            // Do not drag when clicking actions or resize handles.
            if (e.target.closest('.builder-action-btn') || e.target.closest('.builder-resize-handle')) {
                return;
            }

            e.preventDefault();
            selectElement(element);
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            elementStartX = element.offsetLeft;
            elementStartY = element.offsetTop;
            element.classList.add('dragging');
            element.style.zIndex = zIndex++;
        });
    }

    document.addEventListener('mousemove', (e) => { //
        if (isResizing && selectedElement) {
             e.preventDefault();
            let newWidth = elementStartWidth + (e.clientX - startX);
            let newHeight = elementStartHeight + (e.clientY - startY);
            if (newWidth > 40) selectedElement.style.width = `${newWidth}px`;
            if (newHeight > 40) selectedElement.style.height = `${newHeight}px`;
        } else if (isRotating && selectedElement) {
            e.preventDefault();
            const rect = selectedElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
            selectedElement.style.transform = `rotate(${angle}deg)`;
        } else if (isDragging && selectedElement) {
            e.preventDefault();
            let newX = elementStartX + (e.clientX - startX);
            let newY = elementStartY + (e.clientY - startY);
            selectedElement.style.left = `${snapToGrid(Math.max(0, newX))}px`;
            selectedElement.style.top = `${snapToGrid(Math.max(0, newY))}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging && selectedElement) selectedElement.classList.remove('dragging');
        isDragging = false;
        isResizing = false;
        isRotating = false;
        draggedElementPart = null;
        draggedPart = null;
    });

    function addSpecialHandles(element) {
        // Resize handles
        ['nw', 'ne', 'se', 'sw'].forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `builder-resize-handle builder-handle-${pos}`;
            element.appendChild(handle);
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                elementStartWidth = element.offsetWidth;
                elementStartHeight = element.offsetHeight;
                selectElement(element);
            });
        });

        // Rotation handle for certain types
        const type = element.dataset.type;
        if (['shape-rect', 'shape-circle', 'line', 'arrow'].includes(type)) {
            const handle = document.createElement('div');
            handle.className = `builder-resize-handle builder-handle-rotate`;
            element.appendChild(handle);
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                isRotating = true;
            });
        }
    }

    function selectElement(element) {
        if (selectedElement && selectedElement !== element) {
            selectedElement.classList.remove('selected');
            const oldManager = selectedElement.querySelector('.select-options-manager');
            if (oldManager) oldManager.innerHTML = '';

            // NEW: If the deselected element is a table, clear its selections
            if (selectedElement.dataset.type === 'table') {
                selectedElement.querySelectorAll('.selected-row, .selected-col').forEach(el => {
                    el.classList.remove('selected-row', 'selected-col');
                });
            }
        }

        selectedElement = element;

        if (element) {
            element.classList.add('selected');
            if (element.querySelector('select')) {
                populateSelectManager(element);
            }
        }
    }

    canvas.addEventListener('mousedown', (e) => { if (e.target === canvas || e.target === gridOverlay) selectElement(null); });

    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.builder-action-btn.builder-edit');
        if (editBtn) editElementIdentifier(editBtn.closest('.builder-form-element'));

        const deleteBtn = e.target.closest('.builder-action-btn.builder-delete');
        if (deleteBtn) {
            const element = deleteBtn.closest('.builder-form-element');
            if (selectedElement === element) selectedElement = null;
            element.remove();
            checkCanvasEmpty();
        }
    }, true);

    function editElementIdentifier(element) {
        const newId = prompt('Edit Element Identifier', element.id);
        if (newId && newId.trim() !== '') {
            element.id = newId.trim().replace(/\s+/g, '-');
        } else if (newId !== null) {
            alert('Identifier cannot be empty.');
        }
    }

    canvas.addEventListener('dblclick', (e) => {
        const target = e.target.closest('.builder-form-element.selected');
        if (!target) return;
        const editableEl = e.target.closest('label.builder-label, p.builder-paragraph');
        if (editableEl) {
            editableEl.setAttribute('contenteditable', 'true');
            editableEl.focus();
            document.execCommand('selectAll', false, null);
            const onBlur = () => editableEl.setAttribute('contenteditable', 'false');
            editableEl.addEventListener('blur', onBlur, { once: true });
            editableEl.addEventListener('keydown', (evt) => { if (evt.key === 'Enter') { evt.preventDefault(); editableEl.blur(); }}, { once: true });
        }

        const shapeText = e.target.closest('.builder-shape-text');
        if (shapeText && shapeText.closest('.builder-form-element.selected')) {
            shapeText.setAttribute('contenteditable', 'true');
            shapeText.focus();
            document.execCommand('selectAll', false, null);
            shapeText.addEventListener('blur', () => shapeText.setAttribute('contenteditable', 'false'), { once: true });
        }
    });

    async function saveForm() {
        // Check original canvas for elements before doing any work
        if (!canvas.querySelector('.builder-form-element')) {
            alert('Canvas is empty. Nothing to save.');
            return false;
        }

        // Create a clone of the canvas to manipulate for saving
        const canvasClone = canvas.cloneNode(true);

        // Remove builder-specific elements from the top level of the clone
        canvasClone.querySelector('.builder-grid-overlay')?.remove();
        canvasClone.querySelector('.builder-canvas-instruction')?.remove();

        // Find all form elements in the clone to clean them up
        const elements = canvasClone.querySelectorAll('.builder-form-element');

        elements.forEach(el => {
            // Remove selection state
            el.classList.remove('selected');

            // Remove builder UI: actions, handles, and controls
            el.querySelector('.builder-element-actions')?.remove();
            el.querySelectorAll('.builder-resize-handle').forEach(h => h.remove());
            el.querySelector('.external-controls-wrapper')?.remove();
            el.querySelector('.builder-component-controls')?.remove();
            el.querySelector('.select-options-manager')?.remove();
            el.querySelector('.matrix-controls')?.remove();
        });

        // Remove all contenteditable attributes from the clone to make the view static
        canvasClone.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.removeAttribute('contenteditable');
        });

        // Now get the innerHTML of the cleaned clone
        const canvasHTML = canvasClone.innerHTML;

        // Extract title from the first H1 tag (from the original canvas)
        const titleEl = canvas.querySelector('h1');
        const title = titleEl ? titleEl.textContent.trim() : 'Untitled Tutor';

        // Prepare payload based on the Tutor model
        const payload = {
            title: title,
            content: { html: canvasHTML }, // Store *cleaned* canvas HTML
            description: 'Default description', // Placeholder
            subject_area: 'General', // Placeholder
            settings: {} // Placeholder
        };

        // Use tutorId if it's a valid ID, otherwise use 0 to signify creation.
        const id_to_update = tutorId || 0;

        try {
            // Always call the update endpoint. The backend will handle creation if ID is 0 or not found.
            const response = await fetch(`/tutors/update/${id_to_update}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            console.log('Save result:', result);

            // If a new tutor was created (indicated by 201 status), update the global tutorId.
            if (response.status === 201 && result.tutor && result.tutor.id) {
                tutorId = result.tutor.id;
                console.log('New tutor created. Updated global tutorId to:', tutorId);
            }

            return true; // Indicate success
        } catch (error) {
            console.error('Error saving form:', error);
            alert(`An error occurred while saving: ${error.message}`);
            return false; // Indicate failure
        }
    }

    // --- DYNAMIC ELEMENT LOGIC ---

    canvas.addEventListener('click', e => {
        if (e.target.classList.contains('add-option-btn')) {
            const element = e.target.closest('.builder-form-element');
            if (!element) return;
            const container = element.querySelector('.options-container');
            if(container){
                const isRadio = !!element.querySelector('.radio-item');
                const optionCount = container.children.length;
                const groupName = isRadio ? element.querySelector('input[type="radio"]').name : '';
                const newItem = document.createElement('div');
                const newId = `option-${Date.now()}`;
                if (isRadio) {
                    newItem.className = 'radio-item';
                    newItem.innerHTML = `<input type="radio" name="${groupName}" id="${newId}"><label for="${newId}" contenteditable="true">Option ${optionCount + 1}</label>`;
                } else {
                    newItem.className = 'checkbox-item';
                    newItem.innerHTML = `<input type="checkbox" id="${newId}"><label for="${newId}" contenteditable="true">Option ${optionCount + 1}</label>`;
                }
                container.appendChild(newItem);
                newItem.querySelector('label').focus();
            }
        }
    });

    canvas.addEventListener('focusout', e => {
        if (e.target.tagName === 'LABEL' && e.target.isContentEditable) {
            const item = e.target.closest('.checkbox-item, .radio-item');
            if (item && e.target.textContent.trim() === '') {
                const container = item.parentElement;
                if (container.children.length > 1) {
                    item.remove();
                } else {
                    e.target.textContent = "Option 1";
                }
            }
        }
    });

    function updateMatrix(element) {
        const matrixContainer = element.querySelector('.math-matrix-container');
        const rowsInput = element.querySelector('.matrix-dim[data-dim="rows"]');
        const colsInput = element.querySelector('.matrix-dim[data-dim="cols"]');
        const rows = parseInt(rowsInput.value) || 1;
        const cols = parseInt(colsInput.value) || 1;
        const grid = matrixContainer.querySelector('.matrix-grid');
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        for (let i = 0; i < rows * cols; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'math-input';
            grid.appendChild(input);
        }
    }

    canvas.addEventListener('input', e => {
        if (e.target.classList.contains('matrix-dim')) {
            const element = e.target.closest('.builder-form-element');
            updateMatrix(element);
        }

        if (!selectedElement) return;

        // Image controls
        if (e.target.matches('.image-url-input')) selectedElement.querySelector('img').src = e.target.value;
        if (e.target.matches('.image-alt-input')) selectedElement.querySelector('img').alt = e.target.value;

        // Media (Video/Audio) controls
        if (e.target.matches('.media-url-input')) {
            const mediaEl = selectedElement.querySelector('iframe, video, audio');
            if(mediaEl) mediaEl.src = e.target.value;
        }

    });

    function populateSelectManager(element) {
        const manager = element.querySelector('.select-options-manager');
        const select = element.querySelector('select');
        if (!manager || !select) return;
        manager.innerHTML = '';
        Array.from(select.options).forEach((option, index) => {
            const optionEditor = document.createElement('div');
            optionEditor.className = 'option-editor-item';
            optionEditor.innerHTML = `
                <input type="text" value="${option.textContent}" data-index="${index}" class="option-editor-input">
                <button class="delete-option-btn" data-index="${index}">×</button>
            `;
            manager.appendChild(optionEditor);
        });
        const addButton = document.createElement('button');
        addButton.className = 'add-option-btn';
        addButton.textContent = '+ Add Option';
        manager.appendChild(addButton);
    }

    function updateSelectWithOptions(element) {
        const manager = element.querySelector('.select-options-manager');
        const select = element.querySelector('select');
        if (!manager || !select) return;
        select.innerHTML = '';
        manager.querySelectorAll('.option-editor-input').forEach(input => {
            const newOption = document.createElement('option');
            newOption.value = input.value.toLowerCase().replace(/\s+/g, '-');
            newOption.textContent = input.value;
            select.appendChild(newOption);
        });
    }

    canvas.addEventListener('click', e => {
        if (e.target.classList.contains('delete-option-btn')) {
            const element = e.target.closest('.builder-form-element');
            e.target.parentElement.remove();
            updateSelectWithOptions(element);
        }
        if (e.target.classList.contains('add-option-btn') && e.target.closest('.select-options-manager')) {
            const element = e.target.closest('.builder-form-element');
            const select = element.querySelector('select');
            const optionCount = select.options.length;
            const newOption = document.createElement('option');
            newOption.textContent = `Option ${optionCount + 1}`;
            select.appendChild(newOption);
            populateSelectManager(element);
        }

        if (!selectedElement) return;

        // Table controls
        if (e.target.matches('.add-table-row-btn')) addTableRow(selectedElement.querySelector('table'));
        if (e.target.matches('.add-table-col-btn')) addTableCol(selectedElement.querySelector('table'));
        if (e.target.matches('.remove-table-row-btn')) removeTableRow(selectedElement.querySelector('table'));
        if (e.target.matches('.remove-table-col-btn')) removeTableCol(selectedElement.querySelector('table'));

        // Interactive task item creation
        if (e.target.matches('.add-interactive-item-btn')) {
            const targetSelector = e.target.dataset.target || '.ordering-list';
            const targetList = selectedElement.querySelector(targetSelector);
            const newItem = document.createElement('div');
            newItem.className = 'interactive-task-item';
            newItem.textContent = 'New Item';
            newItem.setAttribute('contenteditable', 'true');
            targetList.appendChild(newItem);
        }
        if (e.target.matches('.add-categorization-bucket-btn')) {
            const bucketsWrapper = selectedElement.querySelector('.categorization-buckets-wrapper');
            const newBucket = document.createElement('div');
            newBucket.className = 'categorization-bucket interactive-task-container';
            newBucket.innerHTML = `<strong contenteditable="true">New Category</strong>`;
            bucketsWrapper.appendChild(newBucket);
            initCategorizationTask(selectedElement); // Re-init to make new bucket a sortable target
        }

        // Fill in Blanks
        if (e.target.matches('.create-blank-btn')) createBlank(selectedElement.querySelector('.fill-in-blanks-container'));

        // Text Prompt
        if (e.target.matches('.create-prompt-variable-btn')) toggleVariableCreationMode(e.target);
        if (e.target.matches('.delete-variable-btn, .delete-variable-btn *')) {
            const variable = e.target.closest('.prompt-variable');
            const varId = variable.id;
            const textPromptEl = variable.closest('.builder-form-element');

            // Remove from list
            const listItem = textPromptEl.querySelector(`.prompt-variable-list-item[data-var-id="${varId}"]`);
            if (listItem) listItem.remove();

            // Replace in text
            variable.replaceWith(document.createTextNode(variable.dataset.text));
        }

        // Matching Task
        if (e.target.matches('.add-match-item-btn')) {
            const side = e.target.dataset.side;
            const column = selectedElement.querySelector(`.matching-column[data-side="${side}"]`);
            const newItem = document.createElement('div');
newItem.className = 'matching-item';
            newItem.dataset.id = `${side.charAt(0).toUpperCase()}${Date.now()}`;
            newItem.textContent = `${side.charAt(0).toUpperCase() + side.slice(1)} Item`;
            newItem.setAttribute('contenteditable', 'true');
            column.appendChild(newItem);
        }
    });

    canvas.addEventListener('input', e => {
        if (e.target.classList.contains('option-editor-input')) {
            const element = e.target.closest('.builder-form-element');
            updateSelectWithOptions(element);
        }

        if (e.target.matches('.builder-slider-container input[type="range"]')) {
            updateSliderValue(e.target);
        }
    });


    function toggleInterfaceLock() {
      if (isInterfaceLocked) {
        // Trying to unlock
        console.log('trying to unlock');
        if (confirm('Unlocking will reset any expert model progress. Are you sure?')) {
          isInterfaceLocked = false;
          lockInterfaceBtn.textContent = 'Confirm Tutor';
          lockInterfaceBtn.classList.replace('builder-btn-danger', 'builder-btn-success');
          if (createExpertModelBtn) createExpertModelBtn.style.display = 'none';
          //canvas.classList.remove('canvas-locked');
          clearCanvasBtn.disabled = false;
          // Only reload the component sidebar if it's not currently loaded in
            emitUnlockTutor();
            loadRightSidebar(window.SIDEBAR_URLS.component);


        }
        // if user cancels, do nothing
      } else {
        // Currently unlocked -> lock it
        console.log('trying to lock');
        isInterfaceLocked = true;
        lockInterfaceBtn.textContent = 'Unlock Interface';
        lockInterfaceBtn.classList.replace('builder-btn-success', 'builder-btn-danger');
        if (createExpertModelBtn) createExpertModelBtn.style.display = 'inline-block';
        //canvas.classList.add('canvas-locked');
        selectElement(null);
        clearCanvasBtn.disabled = true;
        // Give indication to agent you want to build expert model
        addMessageToChat({ user: 'user', display_type: 'text', content: 'Tutor Confirmed.' });
        /*const payload = {
          sender: 'user',
          content: { message: "Tutor Confirmed", html: canvas.innerHTML}
        };
        socket.emit('message', payload);*/
        //emitRefineTutor("Tutor Confirmed");

        loadRightSidebar(window.SIDEBAR_URLS.expert);
      }
    }

    // Add event listener for the confirm tutor button
    createExpertModelBtn.addEventListener('click', () => {


        const payload = {
              sender: 'user', content: {tutor_state: extractInputFieldsFromDOM(canvas)}
            };
        socket.emit('message', payload);

    });

    /*createExpertModelBtn.addEventListener('click', () => {
      // keep existing flow if you want:
      //const payload = { sender: 'user', content: { tutor_state: extractInputFieldsFromDOM(canvas) } };
      //socket.emit('message', payload);

      // new explicit event to kick off expert-model creation on backend:
      emitCreateExpertModel();
    });*/


    async function loadRightSidebar(url) {
      if (!url) {
        console.error('Right sidebar URL is missing.');
        rightSidebarWrapper.innerHTML = '<p>Could not load sidebar content (no URL).</p>';
        return;
      }

      try {
        const response = await fetch(url, { credentials: 'include' }); // include session cookies
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const html = await response.text();

        rightSidebarWrapper.innerHTML = html;

        // re-execute inline scripts if present
        const scripts = Array.from(rightSidebarWrapper.querySelectorAll('script'));

        // Remove them from the wrapper so we don't leave duplicates in the DOM
        scripts.forEach(s => s.parentNode.removeChild(s));

        // Load/eval in order, awaiting external scripts
        for (const oldScript of scripts) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');

            // copy attrs except 'nonce' if you use CSP with automatic nonces
            for (const attr of oldScript.attributes) {
              if (attr.name.toLowerCase() !== 'nonce') {
                s.setAttribute(attr.name, attr.value);
              }
            }

            if (oldScript.src) {
              s.onload = resolve;
              s.onerror = () => reject(new Error(`Failed to load ${oldScript.src}`));
              document.body.appendChild(s);
            } else {
              s.textContent = oldScript.textContent || '';
              document.body.appendChild(s);
              resolve(); // inline executes immediately
            }
          });
        }
      } catch (error) {
        console.error('Error swapping sidebar:', error);
        rightSidebarWrapper.innerHTML = `<p>Could not load sidebar content (${error.message}).</p>`;
      }
    }

    // ---- Socket emit payload helper ----
    function getTutorPayload(extra = {}) {
      const canvas = document.getElementById('builder-form-canvas');
      const titleEl = canvas.querySelector('h1');
      const title = titleEl ? titleEl.textContent.trim() : 'Untitled Tutor';
      return {
        tutor_id: window.tutorId || 0,
        user_id: window.userId || 0,
        title,
        html: canvas.innerHTML,
        tutor_state: typeof extractInputFieldsFromDOM === 'function'
          ? extractInputFieldsFromDOM(canvas)
          : {}
      };
    }


    // --- CHAT AGENT & SOCKET.IO ---
    function initAgent() {
        socket = io();

        // ---- Outgoing actions (frontend -> backend) ----

        function emitCreateExpertModel() {
          // Intentionally send HTML to trigger handle_confirm_tutor path on backend
          socket.emit('create_expert_model', getTutorPayload());
        }

        function emitRefineTutor(userMessage = '') {
          // When tutor is locked, we send the HTML so agent can refine against current interface
          socket.emit('refine_tutor', getTutorPayload({ message: userMessage }));
        }

        function emitUnlockTutor() {
          // Clear expert-model state server-side when unlocking
          socket.emit('unlock_tutor', { tutor_id: window.tutorId || 0, user_id: window.userId || 0 });
        }

        // ---- Incoming acks/updates (backend -> frontend) ----
        socket.on('tutor_saved', (data) => {
          console.log('[socket] tutor_saved', data);
          // Optional: show a green flash
          const msg = data?.message || 'Tutor saved.';
          const contentContainer = document.querySelector('.space-y-8');
          if (contentContainer) {
            const existing = document.getElementById('dashboard-success-flash');
            if (existing) existing.remove();
            contentContainer.insertAdjacentHTML('afterbegin', `
              <div id="dashboard-success-flash" class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md" role="alert">
                <div class="flex">
                  <div class="py-1"><i class="fas fa-check-circle mr-3"></i></div>
                  <div>
                    <p class="font-bold">Success</p>
                    <p class="text-sm">${msg}</p>
                  </div>
                </div>
              </div>
            `);
          }
        });

        socket.on('expert_model_created', (data) => {
          console.log('[socket] expert_model_created', data);
          // Backend can also emit 'confirm_demonstrations' (you already handle this)
        });

        socket.on('tutor_refined', (data) => {
          console.log('[socket] tutor_refined', data);
          // If backend returns updated HTML, you can hot-swap:
          if (data?.html_content) {
            populateCanvasFromAgent({ content: { html_content: data.html_content } });
          }
        });

        socket.on('tutor_unlocked', (data) => {
          console.log('[socket] tutor_unlocked', data);
          // Optionally clear any local badges / states here
        });


        chatVisibilityToggle.addEventListener('click', () => {
            workspace.classList.toggle('chat-hidden');
            chatVisibilityToggle.textContent = workspace.classList.contains('chat-hidden') ? 'Show Chat' : 'Hide Chat';
        });

        sendButton.addEventListener('click', handleUserMessage);
        messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleUserMessage(); });

        socket.on('connect', () => console.log('Connected to server'));
        socket.on('show_loading', (data) => showLoading(data.text));
        socket.on('hide_loading', hideLoading);
        socket.on('message', (msg) => {
          const sender = msg?.user || msg?.sender || 'agent';

          if (sender === 'agent') {
            // typing indicator bubble using the same classes so styling remains
            const typingDiv = document.createElement('div');
            typingDiv.className = 'builder-chat-message builder-agent-message';
            typingDiv.id = 'builder-typing-indicator';
            typingDiv.innerHTML = `
              <div class="typing-dots"><span></span><span></span><span></span></div>
            `;
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            setTimeout(() => {
              const ind = document.getElementById('builder-typing-indicator');
              if (ind) ind.remove();
              addMessageToChat(msg); // will render text or list depending on display_type
            }, 1000);
          } else {
            addMessageToChat(msg); // user/system straight through
          }
        });

        socket.on('tutor_created', populateCanvasFromAgent);
        socket.on('confirm_demonstrations', (data) => {
        processStepDemonstrations(data.content.demonstrations);
});

        function handleUserMessage() {
            const messageText = messageInput.value.trim();
            if (messageText === '') return;
            addMessageToChat('user', messageText);
            socket.emit('message', { sender: 'user', content: { message: messageText } });
            messageInput.value = '';
        }
    }

    // This new function encapsulates all the setup logic for any element.
    function activateElement(element) {
        setupElementInteractions(element); // Attaches mousedown for dragging

        // This logic is now needed to find the existing handles and add listeners
        // It's safe to run on any element, new or loaded.
        element.querySelectorAll('.builder-resize-handle').forEach(handle => {
             handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();

                // Check for rotation handle
                if (handle.classList.contains('builder-handle-rotate')) {
                     isRotating = true;
                } else {
                    // Standard resize logic
                    isResizing = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    elementStartWidth = element.offsetWidth;
                    elementStartHeight = element.offsetHeight;
                    selectElement(element);
                }
            });
        });

        initializeComponent(element); // Attaches component-specific logic (e.g., SortableJS)
    }


    async function populateCanvasFromAgent(data) {
        console.log('Received pre-processed tutor data from agent:', data);

        // Clear existing elements from the canvas
        canvas.querySelectorAll('.builder-form-element').forEach(el => el.remove());
        selectedElement = null;

        const processedHtml = data.content.html_content;
        canvas.insertAdjacentHTML('beforeend', processedHtml);

        // Find all the new elements that were just added
        const newElements = Array.from(canvas.querySelectorAll('.builder-form-element'));

        // Loop through and "activate" each one by attaching all necessary event listeners.
        newElements.forEach(el => {
            activateElement(el);
        });
        // Clear all input values initially
        clearAllInputValues();
        checkCanvasEmpty(); // Update UI state
    }

    function clearAllInputValues() {
    const canvas = document.getElementById('builder-form-canvas');
    if (!canvas) return;

    // Select all input elements within the populated canvas
    const inputs = canvas.querySelectorAll('input');

    inputs.forEach(input => {
        const type = input.type?.toLowerCase();

        switch (type) {
            case 'checkbox':
            case 'radio':
                input.checked = false;
                break;
            case 'file':
                input.value = null; // Properly resets file inputs
                break;
            default:
                input.value = ''; // Clears text, number, date, range, etc.
                break;
        }
    });

    // Also clear textareas if any exist
    const textareas = canvas.querySelectorAll('textarea');
    textareas.forEach(t => t.value = '');

    // Optional: reset selects to their first option
    const selects = canvas.querySelectorAll('select');
    selects.forEach(s => s.selectedIndex = 0);
}


    function showLoading(text) {
      if (!loadingModal) return;
      const p = loadingModal.querySelector('p');
      if (p) p.textContent = text || 'Working on it...';
      loadingModal.style.display = 'flex';
    }

    function hideLoading() {
      if (!loadingModal) return;
      loadingModal.style.display = 'none';
    }

    // --- Component Initializers and Handlers ---
    function initializeComponent(element) {
        const type = element.dataset.type;
        if (type === 'ordering') initOrderingTask(element);
        if (type === 'categorization') initCategorizationTask(element);
        if (type === 'matching') initMatchingTask(element);
        if (type === 'slider') initSlider(element);
        if (type === 'table') initTable(element);
        if (type === 'text-prompt') initTextPrompt(element);
    }

    function updateTableComponentSize(table) {
        const formElement = table.closest('.builder-form-element');
        if (!formElement) return;

        // Use requestAnimationFrame to ensure DOM has updated after add/remove operation
        requestAnimationFrame(() => {
            const contentElement = formElement.querySelector('.builder-element-content');

            // Set both dimensions to auto to let the content determine the required size
            formElement.style.height = 'auto';
            formElement.style.width = 'auto';

            // Get the natural height and width of the content
            const newHeight = contentElement.offsetHeight;
            const newWidth = contentElement.offsetWidth;

            // Re-apply the explicit dimensions, necessary for the drag/resize functionality
            formElement.style.height = `${newHeight}px`;
            formElement.style.width = `${newWidth}px`;
        });
    }

    // Table Logic
    function initTable(element) {
        const table = element.querySelector('table');
        table.addEventListener('click', e => {
            const cell = e.target.closest('td, th');
            if (!cell) return;

            // Clear previous selections
            table.querySelectorAll('.selected-row, .selected-col').forEach(el => el.classList.remove('selected-row', 'selected-col'));

            if (cell.tagName === 'TH') { // Select column
                const colIndex = cell.cellIndex;
                Array.from(table.rows).forEach(row => {
                    if(row.cells[colIndex]) row.cells[colIndex].classList.add('selected-col');
                });
            } else { // Select row
                cell.parentElement.classList.add('selected-row');
            }
        });
    }

    function addTableRow(table) {
        const newRow = table.querySelector('tbody').insertRow(-1);
        const colCount = table.querySelector('thead tr').cells.length;
        for (let i = 0; i < colCount; i++) {
            const cell = newRow.insertCell(i);
            cell.textContent = 'New Cell';
            cell.setAttribute('contenteditable', 'true');
        }
        updateTableComponentSize(table); // Update size
    }

    function addTableCol(table) {
        table.querySelector('thead tr').insertAdjacentHTML('beforeend', '<th contenteditable="true">New Header</th>');
        Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
            const cell = row.insertCell(-1);
            cell.textContent = 'New Cell';
            cell.setAttribute('contenteditable', 'true');
        });
        updateTableComponentSize(table); // Update size in case of text wrapping
    }

    function removeTableRow(table) {
        const selectedRow = table.querySelector('.selected-row');
        if (selectedRow) {
            selectedRow.remove();
        } else if (table.rows.length > 2) { // Keep header + 1 row at least
            table.deleteRow(-1);
        }
        updateTableComponentSize(table); // Update size
    }

    function removeTableCol(table) {
        const selectedCell = table.querySelector('.selected-col');
        if (selectedCell) {
            const colIndex = selectedCell.cellIndex;
            if (table.rows[0].cells.length <= 1) return; // Don't delete last column
            Array.from(table.rows).forEach(row => row.deleteCell(colIndex));
        } else {
             if(table.rows[0].cells.length <= 1) return;
             Array.from(table.rows).forEach(row => row.deleteCell(-1));
        }
        updateTableComponentSize(table); // Update size
    }

    // Interactive Task Logic (SortableJS)
    function initOrderingTask(element) {
        const list = element.querySelector('.ordering-list');
        if (list && typeof Sortable !== 'undefined') {
            new Sortable(list, { animation: 150, ghostClass: 'sortable-ghost' });
        }
    }
    function initCategorizationTask(element) {
        const containers = element.querySelectorAll('.interactive-task-container');
        if (containers.length && typeof Sortable !== 'undefined') {
            containers.forEach(container => {
                new Sortable(container, {
                    group: `categorization-${element.id}`,
                    animation: 150,
                    ghostClass: 'sortable-ghost'
                });
            });
        }
    }

    // Matching Task Logic
    let matchStartElement = null;
    function initMatchingTask(element) {
        const taskArea = element.querySelector('.matching-task');
        taskArea.addEventListener('click', e => {
            if (e.target.classList.contains('matching-item')) {
                handleMatchClick(e.target, taskArea);
            }
        });
    }

    function handleMatchClick(item, taskArea) {
        if (!matchStartElement) {
            if (item.closest('.matching-column').dataset.side === 'right') return;
            item.classList.add('selected');
            matchStartElement = item;
        } else {
            if (item.closest('.matching-column').dataset.side === 'left') {
                matchStartElement.classList.remove('selected');
                item.classList.add('selected');
                matchStartElement = item;
            } else {
                const startId = matchStartElement.dataset.id;
                const endId = item.dataset.id;
                if(taskArea.querySelector(`[data-start="${startId}"][data-end="${endId}"]`)) return;

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.dataset.start = startId;
                line.dataset.end = endId;
                line.setAttribute('stroke', '#6b7280');
                line.setAttribute('stroke-width', '2');
                taskArea.querySelector('.matching-canvas').appendChild(line);

                drawConnections(taskArea);
                matchStartElement.classList.remove('selected');
                matchStartElement = null;
            }
        }
    }

    function drawConnections(taskArea) {
        const lines = taskArea.querySelectorAll('.matching-canvas line');
        lines.forEach(line => {
            const startEl = taskArea.querySelector(`[data-id="${line.dataset.start}"]`);
            const endEl = taskArea.querySelector(`[data-id="${line.dataset.end}"]`);
            if (!startEl || !endEl) {
                line.remove();
                return;
            };

            const rectA = startEl.getBoundingClientRect();
            const rectB = endEl.getBoundingClientRect();
            const containerRect = taskArea.getBoundingClientRect();

            const x1 = rectA.right - containerRect.left;
            const y1 = rectA.top + rectA.height / 2 - containerRect.top;
            const x2 = rectB.left - containerRect.left;
            const y2 = rectB.top + rectB.height / 2 - containerRect.top;

            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
        });
    }

    // Fill in Blanks Logic
    function createBlank(container) {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return;
        const range = selection.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) return;

        const blank = document.createElement('input');
        blank.type = 'text';
        blank.className = 'blank-input';
        blank.placeholder = selection.toString() || 'answer';

        range.deleteContents();
        range.insertNode(blank);
    }

    // Slider Logic
    function initSlider(element) {
        const slider = element.querySelector('input[type="range"]');
        updateSliderValue(slider); // Set initial position
    }
    function updateSliderValue(slider) {
        const display = slider.parentElement.querySelector('.slider-value-display');
        const min = +slider.min;
        const max = +slider.max;
        const val = +slider.value;
        display.textContent = val;

        const percent = ((val - min) * 100) / (max - min);
        display.style.left = `calc(${percent}% + (${8 - percent * 0.16}px))`; // Magic number adjustment
    }

    // Text Prompt Logic
    function initTextPrompt(element) {
        const promptDiv = element.querySelector('.builder-text-prompt');
        promptDiv.addEventListener('mouseup', () => {
            if (promptDiv.dataset.variableCreationMode === 'true') {
                createPromptVariable(promptDiv);
            }
        });
    }
    function toggleVariableCreationMode(button) {
        const promptDiv = button.closest('.component-root').querySelector('.builder-text-prompt');
        const isInMode = promptDiv.dataset.variableCreationMode === 'true';

        if (isInMode) {
            promptDiv.dataset.variableCreationMode = 'false';
            button.textContent = 'Enter Variable Creation Mode';
            button.classList.remove('variable-mode-active');
        } else {
            promptDiv.dataset.variableCreationMode = 'true';
            button.textContent = 'Exit Variable Creation Mode';
            button.classList.add('variable-mode-active');
        }
    }

    function createPromptVariable(container) {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) return;

        // Measure width of selection
        const tempSpan = document.createElement('span');
        tempSpan.appendChild(range.cloneContents());
        document.body.appendChild(tempSpan);
        const width = tempSpan.getBoundingClientRect().width;
        document.body.removeChild(tempSpan);

        if (width === 0) return;

        const selectedText = selection.toString();
        const varId = `prompt_variable_${Date.now()}`;

        const variableWrapper = document.createElement('span');
        variableWrapper.className = 'prompt-variable';
        variableWrapper.id = varId;
        variableWrapper.dataset.text = selectedText;
        variableWrapper.innerHTML = `<input class="prompt-variable-input" value="${selectedText}" style="width: ${width}px;" readonly><button class="delete-variable-btn"><i class="fas fa-trash"></i></button>`;

        range.deleteContents();
        range.insertNode(variableWrapper);
        selection.removeAllRanges();

        // Add to visible list
        const list = container.closest('.component-root').querySelector('.prompt-variable-list');
        const listItem = document.createElement('div');
        listItem.className = 'prompt-variable-list-item';
        listItem.dataset.varId = varId;
        listItem.innerHTML = `<span><strong>${varId}:</strong> ${selectedText}</span>`;
        list.appendChild(listItem);
    }


    // --- INITIALIZE ALL ---
    initBuilder();
    initAgent();
});