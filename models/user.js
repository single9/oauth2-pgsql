const crypto = require('crypto');
const Hashids = require('hashids/cjs');
const bcrypt = require('bcrypt');
const db = require('../libs/db.js');

async function addUser(email, password, opts = {
  provider: 'local',
}) {
  const hashedPassword = await bcrypt.hash(password, 10);

  // add user to database
  const userData = (await (
      db.query('INSERT INTO users (email, password, provider, provider_id) VALUES ($1, $2, $3, $4) returning *',
      [email, hashedPassword, opts.provider, opts.providerId])
    )).rows[0];

  const userId = userData && userData.id; 
  
  // add user details
  await db.query('INSERT INTO user_details (user_id, name, avatar_url) VALUES ($1, $2, $3)', [
    userId, opts.name || email, opts.avatarUrl
  ]);

  return userData;
}

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

async function updateUserInfo(userId, updateInfo = {}) {
  const { name, avatarUrl } = updateInfo;
  const data = (await db.query(`
  UPDATE user_details SET name = $2, avatar_url = $3 WHERE user_id = $1
  `, [userId, name, avatarUrl])).rows;

  return data.length > 0 && data[0];
}

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

async function getUserDetail(userId) {
  const data = (await db.query('SELECT * FROM user_details WHERE user_id = $1', [userId])).rows;
  return data.length > 0 && data[0];
}

async function createClient(userId, postfix = '', grants = ['client_credentials', 'password', 'authorization_code', 'refresh_token']) {
  const userData = (await db.query('SELECT email FROM users WHERE id = $1', [userId])).rows;

  if (userData.length < 1) {
    throw new Error(`userId ${userId} not found`);
  }

  const clientId = (new Hashids(userData[0].emai, 16, '0123456789abcdef')).encode(Date.now()) + (postfix && ('.' + postfix) || '');

  const clientSecret = crypto.createHmac('sha256', userId + ':' + clientId + ':' + Date.now())
                .update(userData[0].email)
                .digest('hex');

  const data = await db.query(
    'INSERT INTO clients (client_id, client_secret, grants, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [
      clientId, clientSecret, grants, userId
    ]
  );

  return data.rows[0];
}

async function getClientsById(userId) {
  const data = (await db.query(`
    SELECT * FROM clients WHERE user_id = $1
  `, [userId])).rows;
  return data.length > 0 && data;
}

async function deleteClient(clientId) {
  const data = (await db.query(`
    DELETE FROM clients WHERE client_id = $1
  `, [clientId])).rows;
  return data.length > 0 && data;
}

module.exports = {
  addUser,
  findUser,
  findUserByEmail,
  findUserById,
  updateUserInfo,
  getClientsById,
  deleteClient,
  getUserByClientId,
  getUserDetail,
  createClient,
};
