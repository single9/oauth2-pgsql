const fs = require('fs');
const db = require('../libs/db.js');
const userModel = require('../models/user.js');
const { ADMIN_MAIL, ADMIN_PASSWORD } = process.env;

if (!(ADMIN_MAIL && ADMIN_PASSWORD)) {
  throw new Error('ADMIN_MAIL and ADMIN_PASSWORD are required');
}

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

    try {
      for (let i = 0; i < roles.length; i++) {
        await db.query('INSERT INTO roles (level, title) VALUES ($1, $2)', roles[i]);
        console.log(`> Creates role ${roles[i][1]} ok`);
      }

      await userModel.addUser(ADMIN_MAIL, ADMIN_PASSWORD, {
        name: 'Admin',
        role: 0,
      });
      console.log(`> Admin User ${ADMIN_MAIL} has been successfully added`);
      console.log('> Database successfully created');
    } catch (err) {
      console.error(err.message);
    } finally {
      db.end();
    }
  });
});
