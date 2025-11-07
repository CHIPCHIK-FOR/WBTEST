// backend/src/services/wbService.js
const axios = require('axios');
const knex = require('../db/index');
const logger = require('./logger');
const { updateGoogleSheet } = require('./googleSheets');

function parseNumberOrNull(str) {
  if (str == null) return null;
  const s = String(str).trim().replace(',', '.');
  if (s === '-' || s === '') return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}


// Функция для получения тарифов с WBAPI
async function fetchTariffs(dateStr) {
  const token = process.env.WB_API_TOKEN;
  if (!token) throw new Error('WB_API_TOKEN not set in env');

  const url = `https://common-api.wildberries.ru/api/v1/tariffs/box?date=${dateStr}`;
  const res = await axios.get(url, {
    headers: { Authorization: token },
    timeout: 15000
  });
  const list = res.data && res.data.response && res.data.response.data && res.data.response.data.warehouseList;
  if (!Array.isArray(list)) return [];
  return list;
}
// Функция для добавления или получения склада по имени
async function upsertWarehouseByName(warehouseName, geoName) {
  
  let row = await knex('warehouses').where({ warehouse_name: warehouseName }).first();
  if (row) return row.id;
  const [id] = await knex('warehouses').insert({
    warehouse_name: warehouseName,
    geo_name: geoName || null
  }).returning('id');
  return (typeof id === 'object' && id.id) ? id.id : id;
}

// Функция для сохранения тарифа в БД
async function saveTariff(warehouseId, dateStr, tariffObj) {
  const payload = {
    warehouse_id: warehouseId,
    tariff_date: dateStr,
    box_delivery_base: parseNumberOrNull(tariffObj.boxDeliveryBase),
    box_delivery_coef_expr: parseNumberOrNull(tariffObj.boxDeliveryCoefExpr),
    box_delivery_liter: parseNumberOrNull(tariffObj.boxDeliveryLiter),
    box_delivery_marketplace_base: parseNumberOrNull(tariffObj.boxDeliveryMarketplaceBase),
    box_delivery_marketplace_coef_expr: parseNumberOrNull(tariffObj.boxDeliveryMarketplaceCoefExpr),
    box_delivery_marketplace_liter: parseNumberOrNull(tariffObj.boxDeliveryMarketplaceLiter),
    box_storage_base: parseNumberOrNull(tariffObj.boxStorageBase),
    box_storage_coef_expr: parseNumberOrNull(tariffObj.boxStorageCoefExpr),
    box_storage_liter: parseNumberOrNull(tariffObj.boxStorageLiter),
    updated_at: knex.fn.now()
  };
  await knex('tariffs')
    .insert(payload)
    .onConflict(['warehouse_id', 'tariff_date'])
    .merge();
}


// Функция для обновления тарифов
async function updateTariffs(date = null) {
  const dateStr = date || (new Date()).toISOString().split('T')[0]; 
  logger.info('Updating tariffs for date', dateStr);

  const list = await fetchTariffs(dateStr);
  logger.info('Fetched', list.length, 'warehouses from WB');

  for (const t of list) {
    const warehouseName = t.warehouseName || t.warehouse_name || 'unknown';
    const geoName = t.geoName || t.geo_name || null;
    try {
      const warehouseId = await upsertWarehouseByName(warehouseName, geoName);
      await saveTariff(warehouseId, dateStr, t);
    } catch (err) {
      logger.error('Error saving tariff for', warehouseName, err && err.message);
    }
  }

  if (process.env.SHEET_ID) {
    try {
      await updateGoogleSheet(process.env.SHEET_ID, 'stocks_coefs');
    } catch (err) {
      logger.error('Failed to export to Google Sheets:', err && err.message);
    }
  }

  logger.info('Update tariffs finished.');
}

module.exports = {
  fetchTariffs,
  updateTariffs,
};
