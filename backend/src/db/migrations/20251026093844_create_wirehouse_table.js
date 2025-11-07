exports.up = function(knex) {
    return knex.schema
    .createTable('warehouses', function (table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 255).notNullable();
      table.string('geoname', 255);
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema.dropTable('warehouses');
};