const bodyParser = require('body-parser');
const express = require('express');
const nunjucks = require('nunjucks');
const passport = require('passport');
const helmet = require('helmet');
const session = require('cookie-session')
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const utils = require('./libs/utils.js')
const app = express();

const PORT = process.env.PORT || 3000;

// nunjucks
nunjucks.configure('views', {
  noCache: process.env.NODE_ENV !== 'production',
  autoescape: true,
  express: app,
}).addGlobal('env', { // global variables
  mainPageTitle: 'User\'s Dashboard',
  NODE_ENV: process.env.NODE_ENV,
  SITE_TITLE: 'My OAuth2 Provider',
});

app.set('trust proxy', 1);

app.use(express.static(__dirname + '/public'));
app.use(helmet());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  name: 'my.sess',  // change this
  keys: ['Wa@edsc32', 'A)@FOWdd320'], // change this
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.redirect('/user/dashboard');
});

// controllers
app.use('/oauth', require('./controllers/oauth2.js'));
app.use('/client', require('./controllers/client.js'));

// Note that the next router uses middleware. That protects all routes within this middleware
app.use('/resource', require('./controllers/resource.js'));
app.use('/user', require('./controllers/user.js'));

app.all('*', (req, res, next) => {
  next(utils.errorMessageHelper({
    name: 'E_NOT_FOUND',
    message: 'Resource not found',
    statusCode: 404,
  }));
});

// error handler
app.use((err, req, res, next) => {
  utils.logger.error(`${err.stack}`);
  res.status(err.statusCode || 500).json(err);
  next();
});

app.listen(PORT, () => {
  utils.logger.info(`Listening on port ${PORT}`);
});
