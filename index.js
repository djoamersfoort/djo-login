"use strict"

const {AuthorizationCode} = require("simple-oauth2")
const session = require("express-session")
const https = require("https")
const {randomUUID} = require("crypto")

class login {
    constructor(id, secret, redirectUri, scope) {
        this.redirectUri = redirectUri
        this.scope = scope
        this.session = session({
            "cookie": {"maxAge": 7 * 24 * 3600 * 1000},
            "resave": false,
            "saveUninitialized": true,
            "secret": randomUUID()
        })
        this.client = new AuthorizationCode({
            "auth": {
                "authorizePath": "/o/authorize/",
                "tokenHost": "https://leden.djoamersfoort.nl",
                "tokenPath": "/o/token/"
            },
            "client": {id, secret},
            "http": {"redirects": 5}
        })
    }

    socketSession = (socket, next) => {
        this.session(socket.request, {}, next)
    }

    authorize_uri = (state = "") => this.client.authorizeURL({
        "redirect_uri": this.redirectUri, "scope": this.scope, state
    })

    requireLogin = (req, res, next) => {
        this.session(req, res, () => {
            if (typeof req.session.user === "undefined") {
                return res.redirect(this.authorize_uri(req.url))
            }
            next()
        })
    }

    callback = (req, res) => {
        this.session(req, res, async() => {
            if (typeof req.query.code === "undefined") {
                return res.send("No")
            }
            const tokenParams = {
                "code": req.query.code,
                "redirect_uri": this.redirectUri,
                "scope": this.scope
            }
            const tokenDetails = await this.client.getToken(tokenParams)
            const accessToken = tokenDetails.token.access_token
            const djoReq = https.request(
                "https://leden.djoamersfoort.nl/api/v1/member/details",
                {"headers": {"Authorization": `Bearer ${accessToken}`}},
                djoRes => {
                    let data = ""
                    djoRes.on("data", chunk => {
                        data += chunk.toString()
                    })
                    djoRes.on("end", () => {
                        try {
                            data = JSON.parse(data)
                            req.session.djo = data
                            req.session.user = data.id
                            return res.redirect(req.query.state)
                        } catch {
                            res.send("An error occurred in user data request")
                        }
                    })
                })
            djoReq.on("error", () => {
                res.send("An error occurred in user data request")
            })
            djoReq.end()
        })
    }
}

module.exports = login
