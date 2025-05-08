const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = 3000;

// Replace these with your actual values
const CLIENT_ID = 'ABCTmDsQPP76SJbbnPXN1qCiM0Wv8Pn1wz258a5p3Ld7ZHh9ly';
const CLIENT_SECRET = 'vWa2JuM9aeU6ZwQRYwjt6RRLtC7IuKOo8ehSGk2';
const REDIRECT_URI = 'http://localhost:3000/callback';

// Store state and code_verifier for OAuth flow
let state, codeVerifier;

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
  
  // Build authorization URL
  const authParams = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  
  const authUrl = `https://appcenter.intuit.com/connect/oauth2?${authParams.toString()}`;
  
  res.redirect(authUrl);
});

// Handle OAuth callback
app.get('/callback', async (req, res) => {
  const { code, state: returnedState, realmId } = req.query;
  
  if (returnedState !== state) {
    return res.status(400).send('Invalid state parameter');
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      }), {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    
    console.log('\n=== QuickBooks Credentials ===');
    console.log(`QB_CLIENT_ID=${CLIENT_ID}`);
    console.log(`QB_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`QB_REALM_ID=${realmId}`);
    console.log(`QB_ACCESS_TOKEN=${access_token}`);
    console.log(`QB_REFRESH_TOKEN=${refresh_token}`);
    console.log(`QB_EXPIRES_AT=${Date.now() + expires_in * 1000}`);
    console.log(`QB_USE_SANDBOX=true`);
    console.log(`QB_DEBUG=true`);
    console.log('============================\n');
    
    console.log('\nCopy these values to your .env file!\n');
    
    res.send(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>Success! QuickBooks Connected</h1>
          <p>Your Realm ID: <strong>${realmId}</strong></p>
          <p>Check your console for complete credentials.</p>
          
          <h3>Environment Variables:</h3>
          <pre>QB_CLIENT_ID=${CLIENT_ID}
QB_CLIENT_SECRET=${CLIENT_SECRET}
QB_REALM_ID=${realmId}
QB_ACCESS_TOKEN=${access_token}
QB_REFRESH_TOKEN=${refresh_token}
QB_EXPIRES_AT=${Date.now() + expires_in * 1000}
QB_USE_SANDBOX=true
QB_DEBUG=true</pre>
          
          <p>You can close this tab now.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error.response?.data || error.message);
    res.status(500).send(`
      <h1>Error</h1>
      <pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
    `);
  }
});

// Start server
app.listen(port, () => {
  console.log(`\nOAuth helper running at http://localhost:${port}`);
  console.log(`\nTo start the OAuth flow, open your browser and visit:`);
  console.log(`http://localhost:${port}/auth`);
  console.log('\nMake sure you have already:');
  console.log('1. Created a QuickBooks app at developer.intuit.com');
  console.log('2. Updated CLIENT_ID and CLIENT_SECRET in this script');
  console.log('3. Added http://localhost:3000/callback as a redirect URI\n');
});
