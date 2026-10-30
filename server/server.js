require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const getSources = require('./config/sources');
const syncJobs = require('./services/syncJobs');
const app = require('./app');

async function start() {
  getSources();
  await connectDB();
  await require('./models/job').init();
  const port = Number(process.env.PORT || 7878);
  const server = app.listen(port, '0.0.0.0', () => console.log(`NextRole API listening on ${port}`));
  const sync = async () => {
    try { console.log('Job sync:', JSON.stringify(await syncJobs())); }
    catch (error) { console.error('Job sync failed:', error.message); }
  };
  let timer;
  if (process.env.SYNC_ON_START === 'true') {
    void sync();
    timer = setInterval(sync, 6 * 60 * 60 * 1000); timer.unref();
  }
  const shutdown = () => {
    clearInterval(timer);
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
start().catch(error => {
  if (error.name === 'MongooseServerSelectionError') {
    console.error('Startup failed: MongoDB is unreachable. Check MONGODB_URI in server/.env.');
    console.error('For local development, run from the project root:');
    console.error('docker compose -f compose.yaml -f compose.dev.yaml up -d --wait mongodb');
  } else if (error.code === 18) {
    console.error('Startup failed: MongoDB authentication failed. Check the database username, password, and authSource in server/.env.');
  } else {
    console.error('Startup failed:', error.name, 'Check your database connection and configuration.');
  }
  process.exit(1);
});
