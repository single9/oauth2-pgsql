const express = require('express');
const router = express.Router();

router.use('/register', require('./user/register.js'));
router.use('/login', require('./user/login.js'));
router.use('/dashboard', require('./user/dashboard.js'));
router.use('/update', require('./user/update.js'));
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/user/login');
});

module.exports = router
