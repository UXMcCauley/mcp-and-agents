#!/usr/bin/env node
// diagnose-quickbooks.js
// Diagnostic script to identify QuickBooks integration issues

const path = require('path');
const fs = require('fs');

console.log('🔬 QuickBooks Diagnostic Tool\n');

// Step 1: Check Node.js version
console.log('1. Node.js Environment:');
console.log(`   Version: ${process.version}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Architecture: ${process.arch}\n`);

// Step 2: Check project structure
console.log('2. Project Structure:');
const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'src/services/quickbooks.ts',
    'src/agents/quickbooks-finance-agent.ts',
    'src/config/default.ts'
];

requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
});

// Step 3: Check dependencies
console.log('\n3. Dependencies:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
    };
    
    const quickbooksDeps = [
        'node-quickbooks',
        'typescript',
        '@types/node'
    ];
    
    quickbooksDeps.forEach(dep => {
        console.log(`   ${dep}: ${deps[dep] || '❌ Missing'}`);
    });
} catch (error) {
    console.log(`   Error reading package.json: ${error.message}`);
}

// Step 4: Check build output
console.log('\n4. Build Output:');
const buildFiles = [
    'dist/services/quickbooks.js',
    'dist/agents/quickbooks-finance-agent.js',
    'dist/config/default.js'
];

buildFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
});

// Step 5: Check environment variables
console.log('\n5. Environment Variables:');
const envVars = [
    'QB_CLIENT_ID',
    'QB_CLIENT_SECRET',
    'QB_ACCESS_TOKEN',
    'QB_REFRESH_TOKEN',
    'QB_REALM_ID'
];

envVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`   ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
});

// Step 6: Try to load and test modules
console.log('\n6. Module Loading:');

// Test config loading
try {
    if (fs.existsSync('dist/config/index.js')) {
        require('./dist/config');
        console.log('   Config module: ✅');
    } else {
        console.log('   Config module: ❌ Not built');
    }
} catch (error) {
    console.log(`   Config module: ❌ Error - ${error.message}`);
}

// Test QuickBooks service loading
try {
    if (fs.existsSync('dist/services/quickbooks.js')) {
        require('./dist/services/quickbooks');
        console.log('   QuickBooks service: ✅');
    } else {
        console.log('   QuickBooks service: ❌ Not built');
    }
} catch (error) {
    console.log(`   QuickBooks service: ❌ Error - ${error.message}`);
}

// Test QuickBooks agent loading
try {
    if (fs.existsSync('dist/agents/quickbooks-finance-agent.js')) {
        require('./dist/agents/quickbooks-finance-agent');
        console.log('   QuickBooks agent: ✅');
    } else {
        console.log('   QuickBooks agent: ❌ Not built');
    }
} catch (error) {
    console.log(`   QuickBooks agent: ❌ Error - ${error.message}`);
}

// Step 7: Recommendations
console.log('\n7. Recommendations:');

const issues = [];

if (!fs.existsSync('dist')) {
    issues.push('Build the project: npm run build');
}

if (!process.env.QB_CLIENT_ID) {
    issues.push('Set up .env file with QuickBooks credentials');
}

if (!fs.existsSync('node_modules/node-quickbooks')) {
    issues.push('Install dependencies: npm install');
}

if (issues.length === 0) {
    console.log('   ✅ All checks passed! Try running: node simple-quickbooks-test.js');
} else {
    console.log('   Issues found:');
    issues.forEach(issue => console.log(`     - ${issue}`));
}

console.log('\n✨ Diagnostic complete!\n');

// Export a summary for programmatic use
module.exports = {
    nodeVersion: process.version,
    hasRequiredFiles: requiredFiles.every(file => fs.existsSync(file)),
    hasBuildOutput: buildFiles.every(file => fs.existsSync(file)),
    hasEnvVars: envVars.every(varName => process.env[varName]),
    recommendations: issues
};