const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'js', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// Strip trailing whitespace from every line
const cleaned = content.split('\n').map(line => line.trimEnd()).join('\n');
fs.writeFileSync(appJsPath, cleaned, 'utf8');
console.log('Successfully stripped trailing whitespace from app.js!');
