const OAuth2Server = require('express-oauth-server');
const user = require('./user.js');
const db = require('../libs/db.js');
const { getClient } = user;

async function saveAuthorizationCode(code, expiresAt, client, userData) {
  const data = (await db.query(
    `INSERT INTO authorizations
        (authorization_code, expires_at, client_id, user_id) VALUES ($1, $2::timestamp, $3, $4)
     RETURNING *`, 
    [
      code, expiresAt, client.clientId, userData.id
    ]
  )).rows;

  const client_data = await getClient(data[0].client_id);
  // const user_data = await user.getUserByClientId(data[0].client_id);

  return data.length > 0 && {
    authorizationCode: data[0].authorization_code,
    expiresAt: data[0].expires_at,
    client: client_data,
    user: {id: userData.id},
  };
}

async function getAuthorizationCode(code) {
  const data = (
    await db.query('SELECT * FROM authorizations WHERE authorization_code = $1 AND revoked = false', [code])
  ).rows;

  if (data.length < 1) return undefined;

  const client_data = await getClient(data[0].client_id);
  const user_data = await user.findUserById(data[0].user_id);

  return {
    authorizationCode: data[0].authorization_code,
    expiresAt: data[0].expires_at,
    client: client_data,
    user: {id: user_data.id},
  };
}

const oauth = new OAuth2Server({
  debug: true,
  model: {
    async getClient(clientId, clientSecret) {
      //console.log('Get Client');
      return await getClient(clientId, clientSecret);
    },
    
    async saveAuthorizationCode(code, client, user) {
      //console.log('Save Authorization Code');
      const data = await saveAuthorizationCode(code.authorizationCode, code.expiresAt, client, user);
      return Object.assign({
        redirectUri: `${code.redirectUri}`,
      }, data)
    },

    async getAuthorizationCode(authorizationCode) {
      //console.log('Get Authorization code');
      return await getAuthorizationCode(authorizationCode);
    },

    async revokeAuthorizationCode(authorizationCode) {
      //console.log('Revoke Authorization Code');
      try {
        await db.query('UPDATE authorizations SET revoked = true WHERE authorization_code = $1', [
          authorizationCode.authorizationCode]
        );
        return true
      } catch (err) {
        return false;
      }
    },

    async validateScope(user, client, scope) {
      const getClientScope = (await db.query(`
        SELECT scope FROM clients WHERE client_id = $1
      `, [client.clientId])).rows;

      if (getClientScope.length > 0) {
        const validScope = getClientScope[0].scope || '';
        return scope && scope.split(' ')
                        .filter(s => validScope.indexOf(s) >= 0).join(' ') || 'all';
      } else {
        return false
      }
    },

    async saveToken(token, client, user) {
      //console.log('Save Token');

      const tokenSet = {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshToken: token.refreshToken, // NOTE this is only needed if you need refresh tokens down the line
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 days
      }

      const data = (await db.query(
        `INSERT INTO tokens
          ("access_token", "access_token_expires_at", "refresh_token", "refresh_token_expires_at", "client_id", user_id)
          VALUES
          ($1, $2::timestamp, $3, $4::timestamp, $5, $6)
        RETURNING *`,
        [
          tokenSet.accessToken, tokenSet.accessTokenExpiresAt, tokenSet.refreshToken, tokenSet.refreshTokenExpiresAt, client.clientId, user.id
        ]
      )).rows;

      if (data.length > 0) {
        return Object.assign({
          client,
          user,
        }, tokenSet);
      }
    },

    async getAccessToken(token) {
      // console.log('Get Access Token', token);
      const token_data = (
        await db.query('SELECT * FROM tokens WHERE access_token = $1', [token])
      ).rows[0];

      if (!token_data) {
        return false;
      }

      const client_data = await getClient(token_data.client_id);
      const user_data = await user.findUserById(token_data.user_id);

      return (token_data && client_data && user_data) && {
        accessToken: token_data.access_token,
        accessTokenExpiresAt: token_data.access_token_expires_at,
        refreshToken: token_data.refresh_token,
        refreshTokenExpiresAt: token_data.refresh_token_expires_at,
        client: client_data,
        user: {id: user_data.id},
      } || false;
    },

    // async generateRefreshToken(client, user, scope) {
    //   //console.log('generateRefreshToken', client, user);
    // },

    async getRefreshToken(token) {
      // console.log('Get Refresh Token');
      const token_data = (
        await db.query('SELECT * FROM tokens WHERE refresh_token = $1', [token])
      ).rows[0];

      const client_data = await getClient(token_data.client_id);
      const user_data = await user.findUserById(token_data.user_id);

      return (token_data && client_data && user_data) && {
        accessToken: token_data.access_token,
        accessTokenExpiresAt: token_data.access_token_expires_at,
        refreshToken: token_data.refresh_token,
        refreshTokenExpiresAt: token_data.refresh_token_expires_at,
        client: client_data,
        user: user_data,
      } || undefined;
    },

    async revokeToken(token) {
      // console.log('Revoke Token');

      try {
        await db.query(
          'DELETE FROM tokens WHERE access_token = $1', [token.accessToken]
        );
        return true
      } catch (err) {
        console.error(err);
        return false;
      }
    },

    // async verifyScope(accessToken, scope) {
    //   console.log('verifyScope', accessToken);
    //   const userHasAccess = true
    //   return userHasAccess
    // },

    async getUser(username, password) {
      // console.log('get user');
      const userData = await user.findUser(username, password);
      return userData && {
        id: userData.id,
        username: username,
      };
    },

    getUserFromClient(client) {
      console.log('getUserFromClient');
      return user.getUserByClientId(client.clientId);
    }
  },
  grants: ['authorization_code', 'refresh_token', 'implicit', 'password'],
  accessTokenLifetime: 15 * 60, // 15 mins
  allowEmptyState: true,
  allowExtendedTokenAttributes: true,
});

module.exports = oauth;
