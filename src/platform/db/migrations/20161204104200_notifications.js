exports.up = function(knex, Promise) {
  return Promise.all([
  knex.schema.createTable('notifications', function (table) {
    table.increments('id').primary()
    table.integer('team_id').unsigned()
    table.foreign('team_id').references('teams.id')
    table.integer('user_id').unsigned()
    table.foreign('user_id').references('users.id')
    table.integer('story_id').unsigned()
    table.foreign('story_id').references('stories.id')
    table.string('url')
    table.string('subject_type')
    table.string('subject_text')
    table.string('object1_type')
    table.string('object1_text')
    table.string('object2_type')
    table.string('object2_text')
    table.boolean('is_read')
    table.timestamps()
  })
  ])
}

exports.down = function(knex, Promise) {
  return Promise.all([
  knex.schema.dropTable('notifications')
  ])
}
