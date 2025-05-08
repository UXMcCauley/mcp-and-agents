const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = 3000;

// Your actual credentials
const CLIENT_ID = 'ABCTmDsQPP76SJbbnPXN1qCiM0Wv8Pn1wz258a5p3Ld7ZHh9ly';
const CLIENT_SECRET = 'vWa2JuM9aeU6ZwQRYwjt6RRLtC7IuKOo8ehSGk2';
const REDIRECT_URI = 'http://localhost:3000/callback';

// Store state and code_verifier for OAuth flow
let state, codeVerifier;

// Root page with instructions
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>QuickBooks OAuth Helper</h1>
        <p>Click the link below to start the OAuth flow:</p>
        <p><a href="/auth">Start OAuth Flow</a></p>
      </body>
    </html>
  `);
});

// Start the OAuth flow
app.get('/auth', async (req, res) => {
  // Generate state and code verifier
  state = crypto.randomBytes(32).toString('hex');
  codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Generate code challenge
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Build authorization URL with all required parameters
  const authParams = new URLSearchParams({
    'client_id': CLIENT_ID,
    'scope': 'com.intuit.quickbooks.accounting',
    'redirect_uri': REDIRECT_URI,
    'response_type': 'code',
    'state': state
  });
  
  const authUrl = `https://appcenter.intuit.com/connect/oauth2?${authParams.toString()}`;
  
  console.log('\n=== Starting OAuth Flow ===');
  console.log('Client ID:', CLIENT_ID);
  console.log('Redirect URI:', REDIRECT_URI);
  console.log('State:', state);
  console.log('Auth URL:', authUrl);
  console.log('=========================\n');
  
  res.redirect(authUrl);
});

// Handle OAuth callback
app.get('/callback', async (req, res) => {
  console.log('\n=== OAuth Callback Received ===');
  console.log('Full callback URL:', req.url);
  console.log('Query params:', req.query);
  console.log('==============================\n');
  
  const { code, state: returnedState, realmId, error, error_description } = req.query;
  
  // Check for errors from QuickBooks
  if (error) {
    console.error('OAuth Error:', error);
    console.error('Error Description:', error_description);
    console.error('Full query params:', req.query);

    return res.status(400).send(`
    <h1>OAuth Error Debug</h1>
    <p><strong>Error:</strong> ${error}</p>
    <p><strong>Description:</strong> ${error_description}</p>
    <p><strong>Full params:</strong> ${JSON.stringify(req.query)}</p>
    
    <h3>Common Causes & Solutions:</h3>
    <ul>
      <li><strong>If you see "access_denied":</strong> Make sure to select a SANDBOX company, not a production company</li>
      <li><strong>If you see "redirect_uri_mismatch":</strong> The redirect URI doesn't match (but yours looks correct)</li>
      <li><strong>If you see "unsupported_response_type":</strong> Check your app's OAuth configuration</li>
    </ul>
    
    <p><a href="/">Try again</a></p>
  `);
  }
  
  if (!code) {
    return res.status(400).send(`
      <h1>Error</h1>
      <p>No authorization code received.</p>
      <p>Received parameters: ${JSON.stringify(req.query)}</p>
    `);
  }
  
  if (returnedState !== state) {
    return res.status(400).send('Invalid state parameter - possible security issue');
  }
  
  try {
    console.log('\n=== Exchanging code for tokens ===');
    console.log('Authorization code:', code);
    console.log('Realm ID:', realmId);
    
    // For initial testing, let's use a simpler flow without PKCE
    const tokenResponse = await axios.post('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', 
      new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI
      }), {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    
    console.log('Token response status:', tokenResponse.status);
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    console.log('\n=== SUCCESS! QuickBooks Credentials ===');
    console.log(`QB_CLIENT_ID=${CLIENT_ID}`);
    console.log(`QB_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`QB_REALM_ID=${realmId}`);
    console.log(`QB_ACCESS_TOKEN=${access_token}`);
    console.log(`QB_REFRESH_TOKEN=${refresh_token}`);
    console.log(`QB_EXPIRES_AT=${Date.now() + expires_in * 1000}`);
    console.log(`QB_USE_SANDBOX=true`);
    console.log(`QB_DEBUG=true`);
    console.log('====================================\n');
    
    // Create a properly formatted .env content
    const envContent = `QB_CLIENT_ID=${CLIENT_ID}
QB_CLIENT_SECRET=${CLIENT_SECRET}
QB_REALM_ID=${realmId}
QB_ACCESS_TOKEN=${access_token}
QB_REFRESH_TOKEN=${refresh_token}
QB_EXPIRES_AT=${Date.now() + expires_in * 1000}
QB_USE_SANDBOX=true
QB_DEBUG=true`;
    
    res.send(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; }
            .copy-btn { margin-top: 10px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>Success! QuickBooks Connected</h1>
          <p>Your Realm ID (Company ID): <strong>${realmId}</strong></p>
          <p>Access Token expires in: <strong>${expires_in} seconds</strong></p>
          
          <h3>Add these to your .env file:</h3>
          <pre id="envVars">${envContent}</pre>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('envVars').textContent)">Copy to Clipboard</button>
          
          <p><strong>Next steps:</strong></p>
          <ol>
            <li>Copy the environment variables above</li>
            <li>Create or update your .env file in your project root</li>
            <li>Restart your MCP server</li>
          </ol>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('\nError exchanging code for tokens:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    console.error('Error message:', error.message);
    
    res.status(500).send(`
      <h1>Token Exchange Error</h1>
      <p>Failed to exchange authorization code for tokens.</p>
      <pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
      <p>Check the console for more details.</p>
    `);
  }
});

// Start server
app.listen(port, () => {
  console.log(`\nQuickBooks OAuth Helper started!`);
  console.log(`\nOpen your browser and visit: http://localhost:${port}`);
  console.log('\nOr go directly to: http://localhost:${port}/auth to start OAuth flow\n');
});
