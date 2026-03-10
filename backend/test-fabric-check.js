process.chdir(__dirname);
require('dotenv').config();
const c = require('./utils/fabricClient');

async function main() {
  try {
    await c.initialize();
    console.log('Connected OK');
    
    const txns = await c.evaluateTransaction('GetAllTransactions');
    console.log('Transactions from chain:', JSON.parse(txns).length);
    
    const fb = await c.evaluateTransaction('GetAllFeedback');
    console.log('Feedback from chain:', JSON.parse(fb).length);
    
    const users = await c.evaluateTransaction('GetAllUsers');
    console.log('Users from chain:', JSON.parse(users).length);
    
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

main();
