/*
This test suite exercises the database with specific, interleaved calls to simulate multi-client race conditions.
It also tests the schema with incorrect data, duplicate data and other likely real-world problems.
 */

/*
 TODO how can I check if "previous" exists? Maybe:

 WHERE parent in (SELECT id FROM events WHERE id = parent)

 I can't do this in CHECK, I have to write a BEFORE trigger to test the data

 */

const test = require('tape');
const fs = require('fs');
const initSqlJs = require('sql.js');
const uuid = require('uuid/v4');

const thingEntity = 'thing';
const thingCreatedEvent = 'thing-created';
const thingDeletedEvent = 'thing-deleted';

async function initDb() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const createScript = fs.readFileSync('./event-store.sql', 'utf8');
  console.log(createScript);
  const createResult = db.run(createScript);
  console.log(createResult);
  return db;
}

function shutdownDb(db) {
  const data = db.export();
  const buffer = new Buffer(data);
  fs.writeFileSync('test-db.sqlite', buffer);
}

// use t.plan() for async testing too.
test('setup', async setup => {
  const db = await initDb();
  setup.test('insert events', t => {
    t.test('insert entity_events', assert => {
      db.run(`INSERT INTO entity_events (entity, event) values ('${thingEntity}', '${thingCreatedEvent}')`);
      db.run(`INSERT INTO entity_events (entity, event) values ('${thingEntity}', '${thingDeletedEvent}')`);
      assert.end();
    });
    t.test('cannot insert duplicate entity events', assert => {
      assert.throws(() => db.run(`INSERT INTO entity_events (entity, event) values ('${thingEntity}', '${thingDeletedEvent}')`,
          'UNIQUE constraint failed: entity_events.entity, entity_events.event'));
      assert.end();
    });
  });

  shutdownDb(db);
});
