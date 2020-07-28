const express = require('express');
const userModel = require('../../models/user.js');
const router = express.Router();


/**
 * 
 * @api {GET} /resource/user/info/ Get protected user information
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
        "user_id": "8",
        "name": "Name",
        "gender": "0",
        "birth": "1992-10-10",
        "phone": "0987654321",
        "role": "9",
        "avatar_url": "https://lh6.googleusercontent.com/..."
    }
  }
 * 
 * 
 */
router.get('/info', async (req, res) => {
  const user = res.locals.oauth.token.user;

  res.json({
    success: true,
    data: await userModel.getUserDetail(user.id),
  });
});

module.exports = router
