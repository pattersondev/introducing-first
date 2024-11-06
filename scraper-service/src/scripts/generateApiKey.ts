import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory (replacement for __dirname in ES modules)
const __filename = process.argv[1];
const __dirname = path.dirname(__filename);

// Generate a secure random API key
const apiKey = crypto.randomBytes(32).toString('hex');

// Create or update .env files
const updateEnvFile = (filePath: string, apiKey: string) => {
    let envContent = '';
    
    // Read existing content if file exists
    if (fs.existsSync(filePath)) {
        envContent = fs.readFileSync(filePath, 'utf8');
    }

    // Replace or add API_KEY
    if (envContent.includes('API_KEY=')) {
        envContent = envContent.replace(/API_KEY=.*/, `API_KEY=${apiKey}`);
    } else {
        envContent += `\nAPI_KEY=${apiKey}`;
    }

    // Write back to file
    fs.writeFileSync(filePath, envContent.trim());
};

// Update both .env files
const serverEnvPath = path.join(__dirname, '../.env');

updateEnvFile(serverEnvPath, apiKey);

console.log('Generated API Key:', apiKey);
console.log('API key has been updated in both .env files'); 