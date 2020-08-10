const express = require('express');
const userModel = require('../../models/user.js');
const oauthModel = require('../../models/oauth2.js');
const utils = require('../../libs/utils.js');
const router = express.Router();

// check if user is logged in
router.use((req, res, next) => {
  if (!(req.isAuthenticated())) {
    return res.redirect('/user/login');
  }

  // res.locals.user = {
  //   email: req.user.email,
  //   name: req.user.name,
  //   userId: req.user.id,
  //   provider: req.user.provider,
  //   avatarUrl: req.user.avatar_url || undefined,
  // }

  next();
})

// landing page for dashboard
router.get('/', (req, res) => {
  // clear sidebar nav css
  res.cookie('sidebar-nav', '');
  res.render('dashboard/main.html', {
    pageTitle: 'Dashboard',
    user: req.user,
  });
});

router.get('/profile', (req, res) => {
  // render
  // set css of profile link to active
  res.cookie('sidebar-nav', 'profile');
  res.render('dashboard/profile.html', {
    pageTitle: 'Profile',
    user: req.user,
  });
});

router.route('/oauth/clients')
  .get(async (req, res) => {
    const userId = req.user.id;
    const createdClients = await userModel.getClientsByUserId(userId);
    const allowedClients = await userModel.getUserAllowedClients(userId);
    // render
    res.cookie('sidebar-nav', 'oauth-clients');
    res.render('dashboard/oauth-clients.html', {
      pageTitle: '授權管理',
      createdClients,
      allowedClients,
      user: req.user,
    });
  })
  .post(async (req, res, next) => {
    const userId = req.user.id;
    const body = req.body;

    try {
      // grants: ['client_credentials', 'password', 'authorization_code', 'refresh_token']
      await userModel.createClient(userId, body);
      
      res.render('dashboard/success.html', {
        pageTitle: 'Success!',
        message: 'Client created successfully',
        user: req.user,
      });
    } catch (err) {
      utils.logger.error(err)
      next(err);
    }
  });

router.delete('/oauth/client/:clientId', async (req, res, next) => {
  const clientId = req.params.clientId;
  try {
    await userModel.deleteClient(clientId);
    utils.successMessageHelper(res, {
      message: 'Client deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/oauth/app/:clientId', async (req, res, next) => {
  const clientId = req.params.clientId;
  try {
    await userModel.deleteUserApp(req.user.id, clientId);
    utils.successMessageHelper(res, {
      message: 'Client deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router
