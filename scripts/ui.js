const prompt = document.querySelector('#prompt');
const footer = document.querySelector('footer');
const sendMessageButton = document.querySelector('#sendMessage');
let isGeneratingResponse = false;
let showWelcomeMessage = true;

function updateSendButton() {
  if (prompt.value.trim().length > 0 && !isGeneratingResponse) {
    sendMessageButton.disabled = false;
    sendMessageButton.style.cursor = 'pointer';
    sendMessageButton.style.background = '#fff';
  } else {
    sendMessageButton.disabled = true;
    sendMessageButton.style.cursor = 'default';
    sendMessageButton.style.background = '#888';
  }
}

prompt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

prompt.addEventListener('input', () => {
  updateSendButton();

  prompt.style.height = '0';
  const height = Math.min(Math.max(prompt.scrollHeight, 48), 192);
  prompt.style.height = `${height}px`;
  if (height >= 192) {
    prompt.classList.remove('noScroll');
  } else {
    prompt.classList.add('noScroll');
  }
});

sendMessageButton.addEventListener('click', () => {
  if (prompt.value.trim().length > 0) {
    sendMessage();
  }
});

function addUserPrompt(userPrompt) {
  const userPromptElement = document.createElement('div');
  userPromptElement.classList.add('message', 'user');
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.textContent = userPrompt;
  userPromptElement.appendChild(bubble);
  chat.appendChild(userPromptElement);
  prompt.value = '';
  updateSendButton();
}

async function addAssistantMessage(message) {
  if (message === null || message === undefined || message.trim().length === 0) {
    message = "I'm sorry, an error occurred while processing your request.";
  }
  const assistantMessage = document.createElement('div');
  assistantMessage.classList.add('message', 'assistant');
  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  assistantMessage.appendChild(bubble);
  chat.appendChild(assistantMessage);
  isGeneratingResponse = true;

  for (let i = 0; i < message.length; i++) {
    bubble.textContent += message[i];
    await new Promise(resolve => setTimeout(resolve, randNum(15, 50)));
  }
  
  isGeneratingResponse = false;
  updateSendButton();
  window.scrollTo(0, document.body.scrollHeight);
}

if (window.visualViewport) {
  const viewport = window.visualViewport;

  function updateKeyboard() {
    const keyboardHeight =
      Math.max(0, window.innerHeight - viewport.height);

    footer.style.bottom = `${keyboardHeight}px`;
  }

  viewport.addEventListener('resize', updateKeyboard);
  updateKeyboard();
}
