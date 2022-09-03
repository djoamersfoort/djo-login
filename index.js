const { AuthorizationCode } = require('simple-oauth2')
const session = require('express-session')
const axios = require('axios')

const randomString = length => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

  return new Array(length).join(chars[Math.floor(Math.random() * chars.length)])
}
class login {
  constructor (id, secret, redirect_uri, scope) {
    this.redirect_uri = redirect_uri
    this.scope = scope
    this.session = session({
      secret: randomString(15),
      saveUninitialized: true,
      cookie: { maxAge: 7 * 24 * 3600 * 1000 },
      resave: false
    })
    this.client = new AuthorizationCode({
      client: {
        id,
        secret
      },
      auth: {
        tokenHost: 'https://leden.djoamersfoort.nl',
        authorizePath: '/o/authorize/',
        tokenPath: '/o/token/'
      }
    })
  }

  socketSession = (socket, next) => this.session(socket.request, {}, next)
  authorize_uri (state = '') {
    return this.client.authorizeURL({
      redirect_uri: this.redirect_uri,
      scope: this.scope,
      state
    })
  }

  requireLogin = (req, res, next) => {
    this.session(req, res, () => {
      if (typeof req.session.user === 'undefined') return res.redirect(this.authorize_uri(req.url))

      next()
    })
  }
  callback = (req, res) => {
    this.session(req, res, async () => {
      if (typeof req.query.code === 'undefined') return res.send('No')

      const tokenParams = {
        code: req.query.code,
        redirect_uri: this.redirect_uri,
        scope: this.scope
      }
      const tokenDetails = await this.client.getToken(tokenParams)
      const accessToken = tokenDetails.token.access_token
      axios.get('https://leden.djoamersfoort.nl/api/v1/member/details', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }).then(_res => {
        req.session.djo = _res.data
        req.session.user = _res.data.id

        return res.redirect(req.query.state)
      })
        .catch(() => {
          return res.send('An error occurred while trying to fetch user data!')
        })
    })
  }
}

module.exports = login
