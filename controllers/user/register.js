const express = require('express');
const utils = require('../../libs/utils.js');
const userModel = require('../../models/user.js');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('register.html');
});

router.post('/', async (req, res) => {
  const {email, password} = req.body
  try {
    const user = await userModel.addUser(email, password);
    res.render('register.html', {
      success: true,
      user: user,
    });
  } catch (err) {
    utils.logger.error(`${email} ${err.stack || err}`);
    res.render('register.html', {
      success: false,
      error: err.message
    });
  }
});

module.exports = router
