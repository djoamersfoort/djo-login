# DJO Login

Express middleware for the DJO oauth server

You can find the scopes at [LedenAdministratie](https://github.com/djoamersfoort/ledenadministratie#oauth-scopes)

## Example

```javascript
const express = require('express')
const login = require('djoamersfoort/djo-login-js')

const djo = new login(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SCOPES)
const app = express()
// use djo.session instead of another session library for express
app.use(djo.session)

app.get('/', djo.requireLogin, (req, res) => {
  res.send(`Hello ${req.session.djo.firstName}`)
})

// required
app.get('/callback', djo.callback)

app.listen(3000)
```

## Installation
`npm i djoamersfoort/djo-login-js`