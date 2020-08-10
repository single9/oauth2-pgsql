OAuth2 with PostgreSQL
======================

主要使用技術
----------

- Express.js
- PostgreSQL
- Nunjucks

安裝
---

    npm install

    docker-compose up -d
    npm run setup

執行
---

    GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID> \
    GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET> \
    FACEBOOK_CLIENT_ID=<FACEBOOK_CLIENT_ID> \
    FACEBOOK_CLIENT_SECRET=<FACEBOOK_CLIENT_SECRET> \
    npm start

授權流程
=======

Authorization Code Grant
------------------------

link: https://oauth2-server.readthedocs.io/en/latest/model/overview.html#authorization-code-grant

```text
generateAccessToken(client, user, scope, [callback])
generateRefreshToken(client, user, scope, [callback])
generateAuthorizationCode(client, user, scope, [callback])
*getAuthorizationCode(authorizationCode, [callback])
*getClient(clientId, clientSecret, [callback])
*saveToken(token, client, user, [callback])
*saveAuthorizationCode(code, client, user, [callback])
*revokeAuthorizationCode(code, [callback])
validateScope(user, client, scope, [callback])
```
	
> *必備的 Function

### Flow

```text
-> *getClient (1st, get client data from db)
-> generateAuthorizationCode
-> *saveAuthorizationCode
-> *getClient (2nd)
-> *getAuthorizationCode
-> *revokeAuthorizationCode (Authorization Code 的任務完成)
-> validateScope (驗證使用者範疇)
-> *saveToken (儲存 token)
```
	
Refresh Token
-------------

### Params

- client_id: Your client id
- client_secret: Your client secret
- refresh_token: Your refresh token
- grant_type: refresh_token

### Flow

```text
-> *getClient
-> *getRefreshToken
-> generateRefreshToken
-> *saveToken
```

Password
------------------------

### Params

- username: Your username
- password: Your password
- client_id: Your client id
- client_secret: Your client secret
- grant_type: password

### Flow

```text
-> *getClient
-> *getUSer
-> validateScope
-> *saveToken
```

Client Credentials Grant
------------------------

### params

- client_id: Your client id
- client_secret: Your client secret
- grant_type: client_credentials

### Flow

```text
-> *getClient
-> *getUserFromClient
-> validateScope
-> *saveToken
```

授權
===========

1. 藉由上面的各種方式取得 Access Token
2. 做資料操作時，在 Header 加入授權資訊

```
Authorization: Bearer <Accrss Token>
```

3. 授權驗證無問題的話就會看到資料了

**目前 Access Token 預設存活 15 分鐘**

4. 社群帳號登入機制為登入即註冊
5. 帳號機制採用 Email 作為 Primary Key，無論何種登入方式，只要 Email 對了就可以登入。

TODO
====

- [x] 實作 OAuth2 基本功能
- [x] 使用 DB 儲存 token, code
- [x] 設計與建立 User 資料表
- [x] 使 Clinet 與 User 有關聯
- [x] 使 Token 與 User 和 Client 有關聯
- [X] 使用者註冊畫面
- [X] Google, Facebook 登入註冊串接
- [X] 使用者登入畫面
- [X] 使用者個人管理畫面
- [ ] OAuth2 串接應用範例
- [ ] 伺服器整體儀表板畫面
- [ ] 逾期 Token, Auth Code 清除機制
- [X] 伺服器部署腳本
