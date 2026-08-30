const chat = document.querySelector('#chat');
let rawPrompt = '';

async function sendMessage() {

  // Disable welcome message after first user message
  if (showWelcomeMessage) {
    showWelcomeMessage = false;
    document.querySelector('#welcomeMessage').style.display = 'none';
  }

  rawPrompt = prompt.value.trim();

  if (!rawPrompt || isGeneratingResponse) {
    return;
  }

  addUserPrompt(rawPrompt);

  const message = normalizePrompt(rawPrompt);
  const firstWord = message.split(/\s+/)[0];

  try {
    const response = await generateResponse(message);
    await addAssistantMessage(response);
  } catch (error) {
    console.error('Error generating response:', error);
    await addAssistantMessage(
      "Sorry, something went wrong while processing that."
    );
  }
}