// Supabase configuration
const SUPABASE_URL = 'https://eilqdvwozakcvddbtrwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbHFkdndvemFrY3ZkZGJ0cndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTE5MDksImV4cCI6MjA3NDQ4NzkwOX0.D0n6-k1hLahbGkJyONgk-jJB8Z9-vv7rpKkehK_ge_c';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Gemini API config
const GEMINI_API_KEY = "AIzaSyCGxhEPxoBpv3049w93Oiz-zQC99Ws2cT8";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GEMINI_API_KEY;

// UI Elements
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const messagesDiv = document.getElementById('messages');

function addMessage(sender, text) {
  const msg = document.createElement('div');
  msg.className = sender;
  msg.textContent = `${sender === 'user' ? 'You' : 'Synthara'}: ${text}`;
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendToGemini(prompt) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
}

// Optionally log conversation to Supabase
async function logToSupabase(userText, aiText) {
  await supabase.from('chat_logs').insert([{ user_message: userText, ai_message: aiText }]);
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = userInput.value.trim();
  if (!prompt) return;
  addMessage('user', prompt);
  userInput.value = '';
  const aiResponse = await sendToGemini(prompt);
  addMessage('ai', aiResponse);
  logToSupabase(prompt, aiResponse); // This will fail unless you've set up the 'chat_logs' table in Supabase!
});