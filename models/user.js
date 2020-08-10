const crypto = require('crypto');
const Hashids = require('hashids/cjs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../libs/db.js');
const HASH_SALT = process.env.HASH_SALT || 'test_salt_change_this';

/**
 * Add User to Database
 * @param {string} email Email
 * @param {string} password Password
 * @param {AddUserOptions} [opts] User Options
 */
async function addUser(email, password, opts = {}) {
  const uuid = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);

  // add user to database
  const userData = (await (
      db.query('INSERT INTO users (id, email, password, provider, provider_id, role) VALUES ($1, $2, $3, $4, $5, $6) returning *',
      [uuid, email, hashedPassword, opts.provider || 'local', opts.providerId, opts.role])
    )).rows[0];

  const userId = userData && userData.id; 
  
  // add user details
  await db.query('INSERT INTO user_details (user_id, name, avatar_url) VALUES ($1, $2, $3)', [
    userId, opts.name || email, opts.avatarUrl
  ]);

  return userData;
}

/**
 * Find user
 * @param {string} email    User email address
 * @param {string} password User Password
 */
async function findUser(email, password) {
  const data = (await db.query(`
  WITH user_data AS (
    SELECT * FROM users WHERE email = $1
  ), user_detail AS (
    SELECT * FROM user_details WHERE user_id = (SELECT id FROM user_data)
  )
  SELECT
    user_data.id AS id,
    user_data.email AS email,
    user_data.password AS password,
    user_data.provider AS provider,
    user_detail.*
  FROM user_detail, user_data
  `, [email])).rows;

  const found = await bcrypt.compare(password, data.length > 0 && data[0].password || '');

  return found && data[0];
}

/**
 * Find user by email
 * @param {string} email Email
 */
async function findUserByEmail(email) {
  const data = (await db.query(`
  WITH user_data AS (
    SELECT * FROM users WHERE email = $1
  ), user_detail AS (
    SELECT * FROM user_details WHERE user_id = (SELECT id FROM user_data)
  )
  SELECT
    user_data.id AS id,
    user_data.email AS email,
    user_data.password AS password,
    user_data.provider AS provider,
    user_detail.*
  FROM user_detail, user_data
  `, [email])).rows;

  return data.length > 0 && data[0];
}

/**
 * Find user by user ID
 * @param {string} userId User UUID
 */
async function findUserById(userId) {
  const data = (await db.query(`
  WITH user_data AS (
    SELECT * FROM users WHERE id = $1
  ), user_detail AS (
    SELECT * FROM user_details WHERE user_id = (SELECT id FROM user_data)
  )
  SELECT
    user_data.id AS id,
    user_data.email AS email,
    user_data.password AS password,
    user_data.provider AS provider,
    user_detail.*
  FROM user_detail, user_data
  `, [userId])).rows;

  return data.length > 0 && data[0];
}

/**
 * Update User Details
 * @param {string} userId User id
 * @param {UserUpdateInfo} updateInfo  User info object
 */
async function updateUserInfo(userId, updateInfo = {}) {
  const { name, avatarUrl } = updateInfo;
  const data = (await db.query(`
  UPDATE user_details SET name = $2, avatar_url = $3 WHERE user_id = $1
  `, [userId, name, avatarUrl || null])).rows;

  return data.length > 0 && data[0];
}

async function getUserAllowedClients(userId, opts = {}) {
  let sql = `
  WITH accessed AS (
    SELECT user_id, client_id, count(client_id) FROM public.tokens
    GROUP BY user_id, client_id
  )
  SELECT
    accessed.user_id AS user_id,
    user_details.name AS client_owner,
    clients.client_id AS client_id,
    clients.client_name AS client_name
  FROM accessed
  INNER JOIN clients ON accessed.client_id = clients.client_id
  INNER JOIN user_details ON user_details.user_id = clients.user_id
  WHERE accessed.user_id = $1
  `;

  if (opts.limit) {
    sql += ' LIMIT ' + limit;
  }

  if (opts.offset) {
    sql += ' OFFSET ' + offset;
  }

  const clients = (
    await db.query(sql, [userId])
  ).rows.map(row => {
    return {
      userId: row.user_id,
      clientId: row.client_id,
      clientOwner: row.client_owner,
      clientName: row.client_name
    }
  });

  return clients.length > 0 && clients;
}

/**
 * Get User By Client ID
 * @param {sting} clientId Client ID
 */
async function getUserByClientId(clientId) {
  const data = (await db.query(`
  WITH client AS (
    SELECT * FROM clients WHERE client_id = $1
  ), user_data AS (
    SELECT * FROM users WHERE id = (SELECT user_id FROM client)
  ), user_detail AS (
    SELECT * FROM user_details WHERE user_id = (SELECT user_id FROM client)
  )
  SELECT
    user_data.id AS id,
    user_data.email AS email,
    user_detail.*
  FROM user_data, user_detail
  `, [clientId])).rows;

  return data.length > 0 && data[0] || undefined;
}

/**
 * Get User Details By User ID
 * @param {string} userId User ID
 */
async function getUserDetail(userId) {
  const data = (await db.query('SELECT * FROM user_details WHERE user_id = $1', [userId])).rows;
  return data.length > 0 && data[0];
}

/**
 * Create Client
 * @param {string}   userId           User ID
 * @param {AddClientOptions} [opts]   Client Options
 */
async function createClient(userId, opts = {}) {
  const userData = (await db.query('SELECT email FROM users WHERE id = $1', [userId])).rows;

  if (userData.length < 1) {
    throw new Error(`userId ${userId} not found`);
  }

  let {
    name,
    postfix,
    grantsType,
    redirectUris
  } = opts;

  let grants = [];

  switch (grantsType) {
    case 'normal':
      grants = ['authorization_code', 'refresh_token'];
      break;
    case 'alias':
      grants = ['client_credentials'];
      break;
    default:
      grants = ['authorization_code', 'refresh_token'];
  }

  if (redirectUris) {
    redirectUris = redirectUris.split(',');
  }

  const clientId = (new Hashids(userData[0].emai, 16, HASH_SALT)).encode(Date.now()) + (postfix && ('.' + postfix) || '');
  const clientSecret = crypto.createHmac('sha256', userId + ':' + clientId + ':' + Date.now())
                .update(userData[0].email)
                .digest('hex');

  const data = await db.query(
    `INSERT INTO clients
      (client_id, client_secret, grants, user_id, grants_type, client_name, redirect_uris)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      clientId, clientSecret, grants, userId, grantsType, name, redirectUris
    ]
  );

  return data.rows[0];
}

/**
 * Get Client via client id and client secret
 * @param {string} clientId     Client ID
 * @param {string} clientSecret Client Secret
 */
async function getClient(clientId, clientSecret) {
  let data = undefined;

  if (!clientSecret) {
    data = await db.query('SELECT * FROM clients WHERE client_id = $1', [clientId]);
  } else {
    data = await db.query('SELECT * FROM clients WHERE client_id = $1 AND client_secret = $2', [clientId, clientSecret]);
  }

  return data.rows.length > 0 && {
    clientId: data.rows[0].client_id,
    clientSecret: clientSecret || data.rows[0].client_secret,
    grants: data.rows[0].grants,
    redirectUris: data.rows[0].redirect_uris,
    clientName: data.rows[0].client_name,
  } || undefined;
}

/**
 * Get Clients of User
 * @param {string} userId User ID
 */
async function getClientsByUserId(userId) {
  const data = (await db.query(`
    SELECT * FROM clients WHERE user_id = $1
  `, [userId])).rows;
  return data.length > 0 && data;
}

/**
 * Delete Client
 * @param {string} clientId Client ID
 */
async function deleteClient(clientId) {
  const data = (await db.query(`
    DELETE FROM clients WHERE client_id = $1
  `, [clientId])).rows;
  return data.length > 0 && data;
}

/**
 * Delete user authorized app
 * @param {string} userId   User ID
 * @param {string} clientId Client ID
 */
async function deleteUserApp(userId, clientId) {
  const data = (await db.query(`
    DELETE FROM tokens WHERE client_id = $1 AND user_id = $2
  `, [clientId, userId])).rows;
  return data.length > 0 && data;
}

module.exports = {
  addUser,
  findUser,
  findUserByEmail,
  findUserById,
  updateUserInfo,
  getUserAllowedClients,
  getClientsByUserId,
  getClient,
  deleteClient,
  deleteUserApp,
  getUserByClientId,
  getUserDetail,
  createClient,
};

/**
 * @typedef {Object} AddUserOptions
 * @property {string} [provider = 'local']   Provider
 * @property {string} [providerId]          Provider ID
 * @property {string} [name]                User name
 * @property {string} [avatarUrl]           User avatar URL
 * @property {number} [role]                User role
 */

/**
 * @typedef {Object} UserUpdateInfo
 * @property {string} name      User Name
 * @property {string} avatarUrl Avatar URL
 */

/**
 * @typedef {Object} AddClientOptions
 * @property {string}           [name]           Client Name
 * @property {string[]}         [redirectUris]   Client Redirect URIs
 * @property {"normal"|"alias"} [grantsType]     Grants Type
 */