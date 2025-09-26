const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Chat endpoint with validation
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: message
                    }]
                }]
            })
        });

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]) {
            throw new Error('Invalid API response');
        }

        res.json({ response: data.candidates[0].content.parts[0].text });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
