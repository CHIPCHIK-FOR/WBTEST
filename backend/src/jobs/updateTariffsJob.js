// backend/src/jobs/updateTariffsJob.js
const CronJob = require('cron').CronJob;
const logger = require('../services/logger');
const { updateTariffs } = require('../services/wbService');

const job = new CronJob('0 * * * *', async () => {
  try {
    logger.info('CRON: start updateTariffs');
    await updateTariffs();
    logger.info('CRON: updateTariffs finished');
  } catch (err) {
    logger.error('CRON: updateTariffs error', err && err.message);
  }
});

module.exports = job;
