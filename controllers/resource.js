const express = require('express');
const cors = require('cors');
const oauth2Model = require('../models/oauth2.js');
const router = express.Router();

// enable CORS
router.use(cors({ origin: '*' }));
// check oauth token
router.use(oauth2Model.authenticate());

/**
 * 
 * @api {GET} /resource/authenticated Check authenticated or not
 * @apiName GetUserInfo
 * @apiGroup Resource
 * @apiVersion  1.0.0
 * 
 * @apiSuccess (200) {boolean} success Is it OK?
 * @apiSuccess (200) {object}  data    Response data
 * 
 * 
 * @apiSuccessExample {json} Success-Response:
 * {
    "success": true,
    "data": {
        "message": "you are now authenticated!"
    }
  }
 * 
 * 
 */
router.get('/authenticated', (req,res) => {  // Successfully reached if can hit this :)
  res.json({
    success: true,
    data: {
      message: 'you are now authenticated!'
    }
  });
});

// To user resources controller
router.use('/user', require('./resources/user.js'));

module.exports = router
