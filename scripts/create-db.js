const fs = require('fs');
const db = require('../libs/db.js');

fs.readFile(__dirname + '/db.sql', (err, data) => {
  if (err) throw err;

  // console.log(data.toString());
  db.query(data.toString(), async (err, results) => {
    if (err) throw err;

    const roles = [
      [0, 'root'],
      [1, 'admin'],
      [9, 'normal'],
    ];

    for (let i = 0; i < roles.length; i++) {
      try {
        await db.query('INSERT INTO roles (level, title) VALUES ($1, $2)', roles[i]);
      } catch (err) {
        console.error(err.message, roles[i]);
      }
    }

    console.log('> DB created!');
    db.end();
  });
});
