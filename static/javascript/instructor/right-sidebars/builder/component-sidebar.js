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