import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from './_shared/cors.js';
import { create, verify } from 'https://deno.land/x/djwt@v2.9.1/mod.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const JWT_SECRET_KEY = Deno.env.get('JWT_SECRET_KEY') || 'your-secret-key';

const header = {
  alg: 'HS256',
  typ: 'JWT',
};

async function generateToken() {
  const payload = {
    iss: 'supabase',
    sub: 'gemini-proxy',
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 3600, // Token expires in 1 hour
  };

  return await create({ header, payload, key: JWT_SECRET_KEY });
}

async function verifyToken(token) {
  try {
    if (typeof token !== 'string') {
      console.log("Token is not a string");
      return false;
    }

    if (!JWT_SECRET_KEY) {
      console.error("JWT_SECRET_KEY is not set!");
      return false;
    }

    try {
      await verify(token, JWT_SECRET_KEY, header.alg);
      return true;
    } catch (e) {
      console.error("Token verification failed:", e);
      return false;
    }

  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

async function geminiProxy(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader ? authHeader.split(' ')[1] : null;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Authorization token is required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!(await verifyToken(token))) {
    return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitizedMessage = message.substring(0, 500);

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set in environment variables.');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: sanitizedMessage }] }],
        }),
      },
    );

    if (!geminiResponse.ok) {
      console.error('Gemini API responded with an error:', geminiResponse.status, geminiResponse.statusText);
      try {
        const errorBody = await geminiResponse.json();
        console.error('Error body:', JSON.stringify(errorBody));
      } catch (parseError) {
        console.error('Failed to parse error body:', parseError);
      }
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from Gemini API' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      console.error('Gemini API error:', geminiData);
      return new Response(
        JSON.stringify({ error: 'No response from Gemini API' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const responseText = geminiData.candidates[0].content.parts[0].text;
    const sanitizedResponseText = responseText.substring(0, 2000);

    return new Response(
      JSON.stringify({ response: sanitizedResponseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname === '/generate-token') {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      if (!JWT_SECRET_KEY) {
        console.error("JWT_SECRET_KEY is not set!");
        return new Response(
          JSON.stringify({ error: 'Server configuration error: JWT_SECRET_KEY is not set' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const payload = {
        iss: 'supabase',
        sub: 'gemini-proxy',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600, // Token expires in 1 hour
      };

      const token = await create({ header, payload, key: JWT_SECRET_KEY });

      return new Response(
        JSON.stringify({ token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (error) {
      console.error('Token generation error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  } else if (pathname === '/gemini-proxy') {
    return geminiProxy(req);
  } else {
    return new Response("Not Found", { status: 404 });
  }
});
