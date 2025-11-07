// backend/src/services/googleSheets.js
const { google } = require('googleapis');
const path = require('path');
const knex = require('../db/index');
const logger = require('./logger');

const KEYFILE = process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, '../../credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Функция для получения клиента Google Sheets
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE,
    scopes: SCOPES
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  return sheets;
}
// Форматирование значения для ячейки
function fmtCell(val) {
  if (val === null || val === undefined) return '';
  return String(val);
}

// Функция для обновления Google Sheet с тарифами
async function updateGoogleSheet(spreadsheetId, sheetName = 'stocks_coefs') {
  if (!spreadsheetId) throw new Error('spreadsheetId required');
  const sheets = await getSheetsClient();

  // fetch data from DB and sort by coef asc (nulls last)
  const rows = await knex('tariffs')
    .join('warehouses', 'tariffs.warehouse_id', 'warehouses.id')
    .select(
      'warehouses.name as warehouse_name',
      'warehouses.geoname as geo_name',
      'tariffs.box_delivery_base',
      'tariffs.box_delivery_coef_expr',
      'tariffs.box_storage_base',
      'tariffs.tariff_date'
    )
    .orderBy('tariffs.box_delivery_coef_expr', 'asc');

  // prepare table rows
  const header = ['Склад', 'Регион', 'Доставка (база)', 'Коэффициент', 'Хранение (база)', 'Дата'];
  const values = [header].concat(rows.map(r => [
    fmtCell(r.name),
    fmtCell(r.geoname),
    fmtCell(r.box_delivery_base),
    fmtCell(r.box_delivery_coef_expr),
    fmtCell(r.box_storage_base),
    fmtCell(r.tariff_date ? r.tariff_date.toISOString().split('T')[0] : '')
  ]));

  // clear existing sheet range
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`
  });

  // write rows starting from A1
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values }
  });

  logger.info('Google Sheet updated:', spreadsheetId, sheetName);
}

module.exports = {
  updateGoogleSheet
};
