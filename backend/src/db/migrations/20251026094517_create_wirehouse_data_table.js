exports.up = function(knex) {
  return knex.schema
    .createTable('tariffs', function (table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('warehouse_id').references('id').inTable('warehouses');
      table.date('tariff_date').notNullable();
      table.float('box_delivery_base');
      table.float('box_delivery_coef_expr');
      table.float('box_delivery_liter');
      table.float('box_delivery_marketplace_base');
      table.float('box_delivery_marketplace_coef_expr');
      table.float('box_delivery_marketplace_liter');
      table.float('box_storage_base');
      table.float('box_storage_coef_expr');
      table.float('box_storage_liter');
      table.timestamps(true, true);
      
      // Уникальный индекс чтобы не было дубликатов за один день
      table.unique(['warehouse_id', 'tariff_date']);
    });
};

exports.down = function(knex) {
  return knex.schema.dropTable('tariffs');
};