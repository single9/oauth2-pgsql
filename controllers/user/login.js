const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const LocalStrategy = require('passport-local');
const userModel = require('../../models/user.js');
const utils = require('../../libs/utils.js');
const router = express.Router();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const loginSuccessPage = '/user/dashboard';

const googleAuthParams = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: BASE_URL + '/user/login/auth/google/callback'
};

const facebookAuthParams = {
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: BASE_URL + '/user/login/auth/facebook/callback'
};

function loginCallbackEndpoint(req, res) {
  const uri = req.flash('source_uri');
  res.redirect(uri[0] || loginSuccessPage);
}

passport.serializeUser(function(user, done) {
  done(null, user.id);
});
 
passport.deserializeUser(async function(userId, done) {
  try {
    const data = await userModel.findUserById(userId);
    return done(null, data);
  } catch (err) {
    utils.logger.error(err.stack || err);
    return done(null, false);
  }
});

passport.use(
  new LocalStrategy(
    // customize user field
    {
      usernameField: 'email',
      passportField: 'password',
      passReqToCallback : true,
    },
    // customize verify callback
    async (req, username, password, done) => {
      try {
        const data = await userModel.findUser(username, password);
        if (!data) {
          return done(null, false, req.flash('message', 'User not found'));
        }
        return done(null, data);
      } catch (error) {
        utils.logger.error(`${error.stack}`);
        return done(error, false, req.flash('message', 'User not found'));
      }
    },
  ),
);

passport.use(new GoogleStrategy(googleAuthParams, function(accessToken, refreshToken, profile, done) {
  const username = profile._json.email;
  const password = profile.id;

  (async function () {
    try {
      let data = await userModel.findUserByEmail(username);

      if (!data) {
        data = await userModel.addUser(username, password, {
          provider: 'google',
          name: profile.displayName,
          providerId: profile.id,
          avatarUrl: profile._json.picture,
        });
      }

      done(null, data);
    } catch (err) {
      done(err);
    }
  })();
}));

passport.use(new FacebookStrategy(Object.assign({
  passReqToCallback : true,
  profileFields: ['id', 'emails', 'name', 'displayName', 'picture.type(small)'],
}, facebookAuthParams), function(req, accessToken, refreshToken, profile, done) {
  const username = profile._json.email;
  const password = profile.id;

  (async function () {
    try {
      let data = await userModel.findUserByEmail(username);

      if (!data) {
        data = await userModel.addUser(username, password, {
          provider: 'facebook',
          name: profile.displayName,
          providerId: profile.id,
          avatarUrl: profile._json.picture.data.url,
        });
      }

      done(null, data);
    } catch (err) {
      done(err);
    }
  })();
}));

router.get('/', (req, res) => {
  const reqMsg = req.flash('message');
  const message = (reqMsg.length > 0 && reqMsg);
  res.render('login.html', { message });
});

router.post('/', passport.authenticate('local', {
  failureRedirect: '/user/login',
  failureFlash: true,
}), async (req, res, next) => {
  // set session
  req.session.user = req.user.id;
  return next();
}, loginCallbackEndpoint);

/**
 * @api {GET} /user/login/auth/google Sing in using Google
 * @apiName SiginUsingGoogle
 * @apiGroup User
 * @apiVersion  1.0.0
 * 
 * @apiParamExample  {http} Request-Example:
 * 
 * <a href="https://server_domain.com/user/login/auth/google">Sing in using Google</a>
 */
router.get('/auth/google',
  passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/plus.login',
      'https://www.googleapis.com/auth/userinfo.email',
    ]
  }));

router.get('/auth/google/callback', 
  passport.authenticate('google', {
    // successRedirect: loginSuccessPage,
    failureRedirect: '/user/login'
  }), loginCallbackEndpoint);


// Facebook Authorization
router.get('/auth/facebook',
  passport.authenticate('facebook', {
    scope: [
      'public_profile',
      'email',
    ]
  }));

router.get('/auth/facebook/callback', 
  passport.authenticate('facebook', {
    // successRedirect: loginSuccessPage,
    failureRedirect: '/user/login'
  }), loginCallbackEndpoint);

module.exports = router
