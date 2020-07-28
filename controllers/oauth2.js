const express = require('express');
const oauth2Model = require('../models/oauth2.js');
const userModel = require('../models/user.js');
const router = express.Router();

router.get('/', (req, res) => {  // send back a simple form for the oauth
  res.render('login.html');
});

router.post('/token',  (req, res, next) => {
  next();
}, oauth2Model.token({
  requireClientAuthentication: { // whether client needs to provide client_secret
    // 'authorization_code': false,
  },
}));

router.post('/authorize', async (req, res, next) => {
  console.log('Initial User Authentication')
  const {username, password} = req.body
  const loggedIn = await userModel.findUser(username, password)

  if (loggedIn) {
    req.body.user = {id: loggedIn.id, username: loggedIn.username}
    return next();
  }

  const params = [ // Send params back down
    'client_id',
    'redirect_uri',
    'response_type',
    'grant_type',
    'state',
    'client_secret',
  ]
    .map(a => `${a}=${req.body[a]}`)
    .join('&')
  return res.redirect(`/oauth?success=false&${params}`);
}, oauth2Model.authorize({
  authenticateHandler: {
    handle: req => req.body.user,
  },
}));

module.exports = router;
