const winston = require('winston');

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({filename: 'logs/error.log', level: 'error'}),
    new winston.transports.File({filename: 'logs/combined.log'}),
  ],
});

logger.add(new winston.transports.Console());

/**
 * Error Message Helper function
 * @param {ErrorMessage} param0 Error Message
 */
function errorMessageHelper({name = 'ERROR', message, statusCode = 500}) {
  let error = new Error();
  error.name = name;
  error.message = message;
  error.statusCode = statusCode;
  return error;
}

/**
 * Success Message Helper function
 * @param {Object}         res    Express response object
 * @param {SuccessMessage} param0 Error Message
 */
function successMessageHelper(res, {message, statusCode = 200}) {
  return res.status(statusCode).json({ message });
}

module.exports = {
  logger,
  errorMessageHelper,
  successMessageHelper
};

/**
 * Error Message Helper params
 * @typedef {Object} ErrorMessage
 * @property {string} name  Name of error. (Typically error code)
 * @property {string} message Message
 * @property {number} statusCode Status code
 */

 /**
 * Success Message Helper params
 * @typedef {Object} SuccessMessage
 * @property {string} message Message
 * @property {number} statusCode Status code
 */

