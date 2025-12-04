const chatVisibilityToggle = document.getElementById('builder-chat-visibility-toggle');
const messageInput = document.getElementById('builder-user-input');
const sendButton = document.getElementById('builder-send-button');
const chatMessages = document.getElementById('builder-chat-messages');
let socket;

function createListItem(item, index, startInEditMode = false) {
  // Check if the item is an object with a title, otherwise treat as a string
  const isObjectItem = typeof item === 'object' && item !== null && 'title' in item;

  const listItem = document.createElement('li');
  listItem.className = 'list-item';
  listItem.dataset.index = index;

  const itemContent = document.createElement('div');
  itemContent.className = 'item-text flex-grow';

  // Keep a reference to display elements for later use
  let titleEl, descEl;

  if (isObjectItem) {
    titleEl = document.createElement('div');
    titleEl.className = 'item-title';
    titleEl.textContent = item.title || '';

    descEl = document.createElement('div');
    descEl.className = 'item-description';
    descEl.textContent = item.description || '';

    itemContent.appendChild(titleEl);
    itemContent.appendChild(descEl);
  } else {
    // For string items, just display the text content
    itemContent.textContent = String(item);
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-group';

  const editButton = document.createElement('button');
  editButton.className = 'edit-button';
  editButton.innerHTML = '✎ Edit';

  const enterEditMode = () => {
    // Store current values before clearing the content
    const currentText = isObjectItem ? '' : itemContent.textContent;
    const currentTitle = isObjectItem ? titleEl.textContent : '';
    const currentDesc = isObjectItem ? descEl.textContent : '';

    itemContent.innerHTML = ''; // Clear display elements

    editButton.innerHTML = '✓ Save';
    editButton.className = 'save-button';

    if (isObjectItem) {
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = currentTitle;
      titleInput.placeholder = 'Title';
      titleInput.className = 'item-content-input title-input';

      const descInput = document.createElement('textarea');
      descInput.value = currentDesc;
      descInput.placeholder = 'Description';
      descInput.className = 'item-content-input description-input';
      descInput.rows = 3;

      itemContent.appendChild(titleInput);
      itemContent.appendChild(descInput);
      titleInput.focus();

      // Define SAVE action for object items
      editButton.onclick = () => {
        itemContent.innerHTML = '';
        titleEl.textContent = titleInput.value;
        descEl.textContent = descInput.value;
        itemContent.appendChild(titleEl);
        itemContent.appendChild(descEl);

        editButton.innerHTML = '✎ Edit';
        editButton.className = 'edit-button';
        editButton.onclick = enterEditMode; // Restore original edit handler
      };
    } else { // It's a string item
      const inputField = document.createElement('input');
      inputField.type = 'text';
      inputField.value = currentText;
      inputField.className = 'item-content-input';
      itemContent.appendChild(inputField);
      inputField.focus();

      // Define SAVE action for string items
      editButton.onclick = () => {
        itemContent.innerHTML = '';
        itemContent.textContent = inputField.value;

        editButton.innerHTML = '✎ Edit';
        editButton.className = 'edit-button';
        editButton.onclick = enterEditMode; // Restore original edit handler
      };
    }
  };

  editButton.onclick = enterEditMode;

  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-button';
  deleteButton.innerHTML = 'Delete';
  deleteButton.onclick = () => listItem.remove();

  listItem.appendChild(itemContent);
  buttonContainer.appendChild(editButton);
  buttonContainer.appendChild(deleteButton);
  listItem.appendChild(buttonContainer);

  if (startInEditMode) {
    editButton.click();
  }

  return listItem;
}

function createListMessageElement(message) {
  const isObjectList = message.display_type === 'object list';

  const messageDiv = document.createElement('div');
  messageDiv.className = 'builder-chat-message builder-agent-message';
  messageDiv.dataset.messageId = message.id || `list-${Date.now()}`;

  const listContainer = document.createElement('ul');
  listContainer.className = 'list-none pl-0 mb-4';

  (message.content || []).forEach((item, index) => {
    // The updated createListItem handles both strings and objects
    const listItem = createListItem(item, index);
    listContainer.appendChild(listItem);
  });

  const addItemPlaceholder = document.createElement('li');
  addItemPlaceholder.className = 'add-item-placeholder';
  addItemPlaceholder.textContent = '＋ Add Item';
  addItemPlaceholder.onclick = () => {
    // Create an empty object for an 'object list', or an empty string for a 'text list'
    const newItem = isObjectList ? { title: '', description: '' } : '';
    const newListItem = createListItem(newItem, listContainer.children.length - 1, true);
    listContainer.insertBefore(newListItem, addItemPlaceholder);
    const inputField = newListItem.querySelector('input');
    if (inputField) inputField.focus();
  };
  listContainer.appendChild(addItemPlaceholder);

  messageDiv.appendChild(listContainer);

  const buttonRow = document.createElement('div');
  buttonRow.className = 'flex justify-end mt-3';

  const confirmAllButton = document.createElement('button');
  confirmAllButton.className = 'confirm-all-button';
  confirmAllButton.textContent = 'Confirm';
  confirmAllButton.onclick = () => {
    const items = [];
    const listItems = listContainer.querySelectorAll('li:not(.add-item-placeholder)');
    listItems.forEach(li => {
      // Extract data based on whether it's an object list or text list
      if (isObjectList) {
        const title = li.querySelector('.item-title')?.textContent ?? '';
        const description = li.querySelector('.item-description')?.textContent ?? '';
        items.push({ title, description });
      } else {
        const txt = li.querySelector('.item-text')?.textContent ?? '';
        items.push(txt);
      }
    });

    // disable edits
    messageDiv.querySelectorAll('button').forEach(btn => {
      btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed';
    });

    // echo user confirmation
    addMessageToChat({ user: 'user', display_type: 'text', content: 'Confirm.' });

    // send back to server (align with your emit shape)
    const payload = {
      messageId: messageDiv.dataset.messageId,
      user: 'user',
      content: { items, user_message: document.getElementById('builder-user-input').value.trim() }
    };
    socket.emit('message', payload);
  };

  buttonRow.appendChild(confirmAllButton);
  messageDiv.appendChild(buttonRow);

  return messageDiv;
}


const BASE_BUBBLE_CLASS = 'builder-chat-message';
const AGENT_BUBBLE_CLASS = 'builder-agent-message';
const USER_BUBBLE_CLASS  = 'builder-user-message';

let agentTypingEl = null;

function createBubbleEl(role /* 'agent' | 'user' */) {
  const el = document.createElement('div');
  el.classList.add(BASE_BUBBLE_CLASS);
  el.classList.add(role === 'agent' ? AGENT_BUBBLE_CLASS : USER_BUBBLE_CLASS);
  return el;
}

function addMessageToChat(senderOrObj, contentMaybe) {
  // Normalize to object form
  let message;
  if (typeof senderOrObj === 'string') {
    message = { user: senderOrObj, display_type: 'text', content: contentMaybe };
  } else {
    message = senderOrObj || {};
  }

  const role = (message.user || message.sender || 'agent') === 'user' ? 'user' : 'agent';
  const chatMessages = document.getElementById('builder-chat-messages');

  let messageEl;
  // Route 'object list' and 'text list' to the same list creation function
  if (message.display_type === 'object list' || message.display_type === 'text list') {
    messageEl = createListMessageElement(message);
  } else {
    // Handles 'paragraph', 'text', and any other non-list display types
    messageEl = document.createElement('div');
    messageEl.className = `builder-chat-message ${role === 'user' ? 'builder-user-message' : 'builder-agent-message'}`;
    const p = document.createElement('p');
    p.textContent = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    messageEl.appendChild(p);
  }

  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


function addAgentTypingIndicator() {
  const chatMessages = document.getElementById('builder-chat-messages');
  if (agentTypingEl) return; // don't duplicate
  agentTypingEl = createBubbleEl('agent'); // <-- gets agent styling
  agentTypingEl.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>`;
  chatMessages.appendChild(agentTypingEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeAgentTypingIndicator() {
  if (agentTypingEl?.parentNode) agentTypingEl.parentNode.removeChild(agentTypingEl);
  agentTypingEl = null;
}