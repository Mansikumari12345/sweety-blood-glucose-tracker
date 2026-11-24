// Puts a fresh random JWT_SECRET into .env without printing it.
const fs = require('fs');
const crypto = require('crypto');
const file = '.env';
if (!fs.existsSync(file)) {
  console.error('No .env file here. Run: copy .env.example .env');
  process.exit(1);
}
const secret = crypto.randomBytes(32).toString('hex');
let text = fs.readFileSync(file, 'utf8');
if (/^JWT_SECRET=/m.test(text)) text = text.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
else text += `\nJWT_SECRET=${secret}\n`;
fs.writeFileSync(file, text);
console.log('JWT_SECRET saved in .env (not shown).');
