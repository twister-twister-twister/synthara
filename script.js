const SUPABASE_URL = 'https://eilqdvwozakcvddbtrwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbHFkdndvemFrY3ZkZGJ0cndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTE5MDksImV4cCI6MjA3NDQ4NzkwOX0.D0n6-k1hLahbGkJyONgk-jJB8Z9-vv7rpKkehK_ge_c';

let authToken = null;

class ChatUI {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.chatForm = document.getElementById('chatForm');
        this.userInput = document.getElementById('userInput');
        this.loading = document.getElementById('loading');
        
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.getAuthToken(); // Fetch the auth token on initialization
    }

    async getAuthToken() {
        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/supabase/generate-token`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                },
            });

            if (!response.ok) {
                console.error("Error getting token:", response.status, response.statusText);
                const errorBody = await response.text();
                console.error("Error body:", errorBody);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            authToken = data.token;
        } catch (error) {
            console.error('Failed to get auth token:', error);
            this.addMessage('Failed to initialize chat. Please refresh the page.', 'ai');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const message = this.userInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.showLoading();

        try {
            const response = await this.getAIResponse(message);
            this.addMessage(response, 'ai');
        } catch (error) {
            this.addMessage('Sorry, I encountered an error. Please try again.', 'ai');
            console.error('Error:', error);
        }

        this.hideLoading();
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showLoading() {
        this.loading.style.display = 'block';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    async getAIResponse(message) {
        if (!authToken) {
            this.addMessage('Authentication failed. Please refresh the page.', 'ai');
            return;
        }

        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/supabase/gemini-proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${authToken}`, // Use the auth token
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                console.error("Error getting AI response:", response.status, response.statusText);
                const errorBody = await response.text();
                console.error("Error body:", errorBody);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            return data.response;
        } catch (error) {
            console.error('Chat error:', error);
            throw new Error('Failed to get AI response');
        }
    }
}

// Initialize chat
const chat = new ChatUI();
