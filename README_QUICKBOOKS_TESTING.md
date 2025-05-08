# QuickBooks Integration Testing Guide

This guide will help you test the QuickBooks integration in your MCP application.

## Prerequisites

1. **QuickBooks Developer Account**: You need a QuickBooks developer account and a sandbox company
2. **OAuth 2.0 Credentials**: Client ID and Client Secret from QuickBooks Developer
3. **Active Tokens**: Valid access token and refresh token
4. **Environment Variables**: Properly configured QB_* environment variables

## Environment Setup

Add these to your `.env` file:

```env
QB_CLIENT_ID=your_client_id_here
QB_CLIENT_SECRET=your_client_secret_here
QB_ACCESS_TOKEN=your_access_token_here
QB_REFRESH_TOKEN=your_refresh_token_here
QB_REALM_ID=your_company_id_here
QB_EXPIRES_AT=1234567890
QB_USE_SANDBOX=true
QB_DEBUG=false
```

## Testing Methods

### 1. OAuth Token Test

Run the OAuth test to verify your tokens are working:

```bash
node test-quickbooks-oauth.js
```

This will:
- Check if all required environment variables are set
- Test token validity
- Automatically refresh tokens if needed
- Test basic API connectivity

### 2. Manual Integration Test

Run the manual integration test:

```bash
node test-quickbooks-manual.js
```

This tests:
- Quarterly financial analysis
- Payments received queries
- Profit & loss reports
- Agent processing capabilities

### 3. Full Demo

Run the complete demo showing MCP + QuickBooks:

```bash
node quickbooks-demo.js
```

This demonstrates:
- Natural language processing of financial requests
- QuickBooks API integration
- Report generation with recommendations

### 4. Unit Tests

Run the Jest unit tests:

```bash
npm test test/integration/quickbooks.test.ts
```

This covers:
- Service layer methods
- Agent processing logic
- Error handling
- Edge cases

## Common Issues & Solutions

### Issue 1: "Invalid Token" Errors

**Solution**: Run the OAuth test script to refresh tokens:
```bash
node test-quickbooks-oauth.js
```

The script will automatically detect expired tokens and refresh them.

### Issue 2: "Company Not Found" Errors

**Solution**: Verify your `QB_REALM_ID` is correct:
1. Go to QuickBooks Developer Dashboard
2. Find your sandbox company
3. Copy the Company ID (Realm ID)
4. Update your `.env` file

### Issue 3: "Insufficient Permissions" Errors

**Solution**: Ensure your QuickBooks app has the correct scopes:
- Accounting
- Payments (if testing payment features)
- Reports

### Issue 4: Sandbox vs Production

**Solution**: Make sure `QB_USE_SANDBOX` matches your token environment:
- Set to `true` for sandbox testing
- Set to `false` for production (be careful!)

## Test Data Setup

For comprehensive testing, your QuickBooks sandbox should have:

1. **Sample Transactions**: Add some test invoices and payments
2. **Multiple Payment Methods**: Credit card, bank transfer, cash, etc.
3. **Expense Categories**: Various expense types for reporting
4. **Date Range Coverage**: Transactions across different quarters

## Debugging Tips

1. **Enable Debug Mode**:
   ```env
   QB_DEBUG=true
   ```

2. **Check Logs**: Look for QuickBooks-related logs in your console
3. **API Response Inspection**: Add console.log statements to see raw API responses
4. **Token Expiration**: Run the OAuth test regularly to keep tokens fresh

## Test Scenarios

### Basic Functionality
1. Get company information
2. Fetch recent payments
3. Generate quarterly report
4. Analyze profit and loss

### Advanced Features
1. Multi-quarter comparisons
2. Payment method analysis
3. Expense categorization
4. Automated recommendations

### Integration Tests
1. NLP → QuickBooks flow
2. Context store persistence
3. Error recovery
4. Token refresh handling

## Troubleshooting Commands

```bash
# Check token expiration
node -e "console.log(new Date(parseInt(process.env.QB_EXPIRES_AT) * 1000))"

# Test basic connectivity
node -e "console.log(process.env.QB_ACCESS_TOKEN ? 'Token exists' : 'No token')"

# Rebuild and test
npm run build && node test-quickbooks-manual.js
```

## Success Indicators

A successful QuickBooks integration test will show:

1. ✅ All environment variables present
2. ✅ Token validation passes
3. ✅ API calls return data
4. ✅ Reports generate correctly
5. ✅ Error handling works
6. ✅ NLP correctly parses requests

## Next Steps

After successful testing:

1. **Production Tokens**: Get production tokens for live data
2. **Rate Limiting**: Implement proper rate limiting
3. **Caching**: Add caching for frequently accessed data
4. **Monitoring**: Set up alerts for token expiration
5. **Backup**: Regularly backup your OAuth credentials

## Support

If you encounter issues:

1. Check QuickBooks Developer forums
2. Review OAuth 2.0 documentation
3. Contact QuickBooks Developer Support
4. Check application logs for detailed errors

Happy testing! 🚀
