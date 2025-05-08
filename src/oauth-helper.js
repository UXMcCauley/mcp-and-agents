// oauth-helper.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

// Import open properly
let open;
try {
    open = require('open');
} catch (error) {
    console.log('open module not found, you can still visit the URL manually');
}

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
        .digest('base64url');

    // Build authorization URL
    const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('scope', 'com.intuit.quickbooks.accounting');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    res.redirect(authUrl.toString());
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

        const { access_token, refresh_token } = tokenResponse.data;

        console.log('\n=== QuickBooks Credentials ===');
        console.log(`QB_REALM_ID=${realmId}`);
        console.log(`QB_ACCESS_TOKEN=${access_token}`);
        console.log(`QB_REFRESH_TOKEN=${refresh_token}`);
        console.log(`QB_CLIENT_ID=${CLIENT_ID}`);
        console.log(`QB_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`QB_USE_SANDBOX=true`);
        console.log(`QB_DEBUG=true`);
        console.log('============================\n');

        res.send(`
      <html>
        <body>
          <h1>Success! Check your console for the credentials.</h1>
          <p>Your Realm ID: ${realmId}</p>
          <p>Access Token: ${access_token.substring(0, 20)}...</p>
          <p>Refresh Token: ${refresh_token.substring(0, 20)}...</p>
          <p>Add these to your .env file.</p>
          <p>You can close this tab now.</p>
        </body>
      </html>
    `);
    } catch (error) {
        console.error('Error exchanging code for tokens:', error.response?.data || error.message);
        res.status(500).send('Error getting tokens');
    }
});

// Start server
app.listen(port, () => {
    console.log(`OAuth helper running at http://localhost:${port}`);
    console.log(`Visit http://localhost:${port}/auth to start the OAuth flow`);

    // Only open browser if open module is available
    if (open) {
        open(`http://localhost:${port}/auth`);
    } else {
        console.log('\nPlease open your browser manually and visit: http://localhost:${port}/auth');
    }
});