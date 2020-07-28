const OAuth2Server = require('express-oauth-server');
const user = require('./user.js');
const db = require('../libs/db.js');

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
  } || undefined;
}

async function saveAuthorizationCode(code, expiresAt, client, userData) {
  const data = (await db.query(
    `INSERT INTO authorizations
        (authorization_code, expires_at, client_id) VALUES ($1, $2::timestamp, $3)
     RETURNING *`, 
    [
      code, expiresAt, client.clientId
    ]
  )).rows;

  const client_data = await getClient(data[0].client_id);
  const user_data = await user.getUserByClientId(data[0].client_id);

  return data.length > 0 && {
    authorizationCode: data[0].authorization_code,
    expiresAt: data[0].expires_at,
    client: client_data,
    user: {id: user_data.id},
  };
}

async function getAuthorizationCode(code) {
  const data = (await db.query('SELECT * FROM authorizations WHERE authorization_code = $1 AND revoked = false', [code])).rows;

  if (data.length < 1) return undefined;

  const client_data = await getClient(data[0].client_id);
  const user_data = await user.getUserByClientId(data[0].client_id);

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
      //console.log('validateScope');
      const verifyUserAndClient = (await db.query(`
        SELECT scope FROM clients WHERE client_id = $1 AND user_id = $2
      `, [client.clientId, user.id])).rows;

      if (verifyUserAndClient.length > 0) {
        const validScope = verifyUserAndClient[0].scope || '';
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
          ("access_token", "access_token_expires_at", "refresh_token", "refresh_token_expires_at", "client_id")
          VALUES
          ($1, $2::timestamp, $3, $4::timestamp, $5)
        RETURNING *`,
        [
          tokenSet.accessToken, tokenSet.accessTokenExpiresAt, tokenSet.refreshToken, tokenSet.refreshTokenExpiresAt, client.clientId
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
      //console.log('Get Access Token');
      const token_data = (
        await db.query('SELECT * FROM tokens WHERE access_token = $1', [token])
      ).rows[0];

      const client_data = await getClient(token_data.client_id);
      const user_data = await user.getUserByClientId(token_data.client_id);

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
      //console.log('Get Refresh Token');
      const token_data = (
        await db.query('SELECT * FROM tokens WHERE refresh_token = $1', [token])
      ).rows[0];

      const client_data = await getClient(token_data.client_id);
      const user_data = await user.getUserByClientId(token_data.client_id);

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
      //console.log('Revoke Token');

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
      //console.log('get user');
      const userData = await user.findUser(username, password);
      return userData && {
        id: userData.id,
        username: username,
      };
    },

    getUserFromClient(client) {
      //console.log('getUserFromClient');
      return user.getUserByClientId(client.clientId);
    }
  },
  grants: ['authorization_code', 'refresh_token', 'implicit', 'password'],
  accessTokenLifetime: 15 * 60, // 15 mins
  allowEmptyState: true,
  allowExtendedTokenAttributes: true,
});

module.exports = oauth;
