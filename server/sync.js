require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const mongoose = require('mongoose');
(async () => {
  try {
    await require('./config/db')();
    await require('./models/job').init();
    const result = await require('./services/syncJobs')();
    console.log(JSON.stringify(result, null, 2));
    if (result.results.some(item => !item.success)) process.exitCode = 1;
  } catch (error) { console.error('Sync failed:', error.name); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
