// backend/src/app.js
require('dotenv').config();
const express = require('express');
const knex = require('./db/index');
const job = require('./jobs/updateTariffsJob');
const logger = require('./services/logger');
const { updateTariffs } = require('./services/wbService');
const { updateGoogleSheet } = require('./services/googleSheets');

const PORT = process.env.PORT || 3001;
const app = express();

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await knex.raw('select 1+1 as r');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// trigger update from WB immediately
app.post('/update', async (req, res) => {
  try {
    await updateTariffs();
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
});

// export to sheets manually
app.post('/exportToSheets', async (req, res) => {
  try {
    const sheetId = process.env.SHEET_ID;
    if (!sheetId) return res.status(400).json({ error: 'SHEET_ID not set' });
    await updateGoogleSheet(sheetId, 'stocks_coefs');
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/', (req, res) => {
  res.json({ message: 'Server is running 🚀' });
});

// start server and cron
app.listen(PORT, async () => {
  logger.info(`Server started on port ${PORT}`);
  // start cron job
  job.start();
  logger.info('CRON job started: hourly updates at minute 0');
});
