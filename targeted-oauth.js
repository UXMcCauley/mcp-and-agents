const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = 3000;

// Your credentials
const CLIENT_ID = 'ABCTmDsQPP76SJbbnPXN1qCiM0Wv8Pn1wz258a5p3Ld7ZHh9ly';
const CLIENT_SECRET = 'vWa2JuM9aeU6ZwQRYwjt6RRLtC7IuKOo8ehSGk2';
const REDIRECT_URI = 'http://localhost:3000/callback';
const SANDBOX_COMPANY_ID = '9341454621327509';

let state;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>QuickBooks Sandbox Connection</h1>
        <p>We'll connect to your sandbox company: <strong>Sandbox Company_US_1</strong></p>
        <p>Company ID: ${SANDBOX_COMPANY_ID}</p>
        <p><a href="/auth">Connect to Sandbox Company</a></p>
      </body>
    </html>
  `);
});

app.get('/auth', (req, res) => {
  // Generate state
  state = crypto.randomBytes(32).toString('hex');
  
  // Create OAuth URL with your specific sandbox company targeted
  const authParams = new URLSearchParams({
    'client_id': CLIENT_ID,
    'scope': 'com.intuit.quickbooks.accounting',
    'redirect_uri': REDIRECT_URI,
    'response_type': 'code',
    'state': state
  });
  
  const authUrl = `https://appcenter.intuit.com/connect/oauth2?${authParams.toString()}`;
  
  console.log('\n=== Sandbox Company Connection ===');
  console.log('Company ID:', SANDBOX_COMPANY_ID);
  console.log('Auth URL:', authUrl);
  console.log('===============================\n');
  
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  console.log('\n=== Callback Received ===');
  console.log('Query params:', req.query);
  console.log('=======================\n');
  
  const { code, state: returnedState, realmId, error, error_description } = req.query;
  
  if (error) {
    console.error('Error:', error);
    console.error('Description:', error_description);
    return res.status(400).send(`
      <h1>OAuth Error</h1>
      <p><strong>Error:</strong> ${error}</p>
      <p><strong>Description:</strong> ${error_description}</p>
      <p><strong>Your Sandbox Company ID:</strong> ${SANDBOX_COMPANY_ID}</p>
      <p><strong>Received Realm ID:</strong> ${realmId || 'None'}</p>
      <p>If these IDs don't match, that's the issue!</p>
    `);
  }
  
  if (!code) {
    return res.status(400).send('No authorization code received');
  }
  
  try {
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
    
    console.log('\n=== SUCCESS! ===');
    console.log('Access Token:', access_token.substring(0, 20) + '...');
    console.log('Realm ID:', realmId);
    console.log('================\n');
    
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
          </style>
        </head>
        <body>
          <h1>Success! Connected to Sandbox</h1>
          <p>Sandbox Company ID from Dashboard: <strong>${SANDBOX_COMPANY_ID}</strong></p>
          <p>Connected Realm ID: <strong>${realmId}</strong></p>
          <p>${realmId === SANDBOX_COMPANY_ID ? '✅ IDs match!' : '⚠️ IDs don\'t match - this might be an issue'}</p>
          
          <h3>Environment Variables:</h3>
          <pre>${envContent}</pre>
          
          <p>Copy these to your .env file and restart your MCP server.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(500).send(`
      <h1>Token Exchange Error</h1>
      <pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
    `);
  }
});

app.listen(port, () => {
  console.log(`\nTargeted Sandbox OAuth running at http://localhost:${port}`);
  console.log(`Sandbox Company ID: ${SANDBOX_COMPANY_ID}\n`);
});
