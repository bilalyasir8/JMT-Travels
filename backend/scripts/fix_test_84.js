const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'js', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

content = content.replace(
  '<label class="jmt-visa-label">Destination Country</label>',
  '<label for="visa-dest" class="jmt-visa-label">Destination Country</label>'
);

content = content.replace(
  '<input type="hidden" name="destination" value="Oman">',
  '<input type="hidden" id="visa-dest" name="destination" value="Oman">'
);

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('Successfully added for="visa-dest" and id="visa-dest" to app.js!');
