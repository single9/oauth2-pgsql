const express = require('express');
const utils = require('../../libs/utils.js');
const userModel = require('../../models/user.js');
const router = express.Router();

router.use((req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/user/login');
  }

  next();
})

router.post('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await userModel.updateUserInfo(userId, req.body);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    utils.logger.error(`${err.stack || err}`);
    res.status(500).json({
      error: err
    });
  }
});

module.exports = router
