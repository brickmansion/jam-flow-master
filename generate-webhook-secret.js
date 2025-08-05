// Run this to generate a secure webhook secret
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');
console.log('Generated webhook secret:');
console.log(secret);
console.log('\nAdd this as SEND_EMAIL_HOOK_SECRET in your Supabase secrets.');