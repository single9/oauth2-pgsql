const {Pool} = require('pg');
const {
  DB_DATABASE,
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
} = process.env;

/** @type Database */
let instance = undefined;

class Database {
  constructor() {
    this.connect();
  }

  connect() {
    this.pool = new Pool({
      user: DB_USERNAME || 'admin',
      host: DB_HOST || '127.0.0.1',
      database: DB_DATABASE || 'auth',
      password: DB_PASSWORD || 'adminPassword',
      port: DB_PORT || 5432,
    });

    this.pool.connect()
      .then((client) => {
        console.log('> DB connected');
        client.release();
      })
      .catch(console.error);

    return this.pool;
  }

  close() {
    return this.pool.end();
  }
}

module.exports = (function () {
  if (instance)
    return instance.pool;
  else {
    instance = new Database();
    return instance.pool;
  }
})();
