const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = 3000;

// Your NEW credentials
const CLIENT_ID = 'AByFxreBFNPWtncWTT55uUnP3kzhtL9FZZwbB0Ikg5JJNGi54D';
const CLIENT_SECRET = 'hdxkkYfYW0s9v3pfkY0Z6Xvwg4NIrBxvMaA2R6uW';
const REDIRECT_URI = 'http://localhost:3000/callback';

let state;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>New QuickBooks App Test</h1>
        <p>Testing with new app credentials</p>
        <p>Client ID: ${CLIENT_ID}</p>
        <p><a href="/auth">Start OAuth Flow</a></p>
      </body>
    </html>
  `);
});

app.get('/auth', (req, res) => {
  // Generate state
  state = crypto.randomBytes(32).toString('hex');
  
  // Create OAuth URL
  const authParams = new URLSearchParams({
    'client_id': CLIENT_ID,
    'scope': 'com.intuit.quickbooks.accounting',
    'redirect_uri': REDIRECT_URI,
    'response_type': 'code',
    'state': state
  });
  
  const authUrl = `https://appcenter.intuit.com/connect/oauth2?${authParams.toString()}`;
  
  console.log('\n=== New App OAuth Test ===');
  console.log('Client ID:', CLIENT_ID);
  console.log('Auth URL:', authUrl);
  console.log('========================\n');
  
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  console.log('\n=== Callback Received ===');
  console.log('Full URL:', req.url);
  console.log('Query params:', JSON.stringify(req.query, null, 2));
  console.log('=======================\n');
  
  const { code, state: returnedState, realmId, error, error_description } = req.query;
  
  if (error) {
    console.error('Error:', error);
    console.error('Description:', error_description);
    return res.status(400).send(`
      <h1>OAuth Error</h1>
      <p><strong>Error:</strong> ${error}</p>
      <p><strong>Description:</strong> ${error_description}</p>
      <p>This is a different app, so we're testing if the issue was with the previous app.</p>
      <p><a href="/">Try again</a></p>
    `);
  }
  
  if (!code) {
    return res.status(400).send('No authorization code received');
  }
  
  try {
    console.log('\n=== Exchanging code for tokens ===');
    console.log('Using Client ID:', CLIENT_ID);
    
    // Exchange code for tokens
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
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    console.log('\n=== SUCCESS! New App Connected ===');
    console.log('Access Token:', access_token.substring(0, 20) + '...');
    console.log('Realm ID:', realmId);
    console.log('================================\n');
    
    // Create .env content
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
          <h1>Success! New App Connected</h1>
          <p>Realm ID: <strong>${realmId}</strong></p>
          <p>This confirms the issue was with the previous app, not your QuickBooks account.</p>
          
          <h3>Environment Variables:</h3>
          <pre id="envVars">${envContent}</pre>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('envVars').textContent)">Copy to Clipboard</button>
          
          <p><strong>Next steps:</strong></p>
          <ol>
            <li>Copy the environment variables above</li>
            <li>Create/update your .env file</li>
            <li>Update your QuickBooks service with the new credentials</li>
            <li>Restart your MCP server</li>
          </ol>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Token exchange error:');
    console.error('Status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    console.error('Message:', error.message);
    
    res.status(500).send(`
      <h1>Token Exchange Error</h1>
      <pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
      <p>Check the console for more details.</p>
      <p><a href="/">Try again</a></p>
    `);
  }
});

app.listen(port, () => {
  console.log(`\nNew app OAuth test running at http://localhost:${port}`);
  console.log(`Client ID: ${CLIENT_ID}\n`);
});
