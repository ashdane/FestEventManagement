const express = require('express')
const ac = require('../controllers/auth.controller')
const router = express.Router() // a "sub-app"; allows for modularization of app; must be mounted (aka cant exist by itself) on actual app instance
router.post('/signup', ac.signup)
router.post('/login', ac.login) //(endpoint path, controller action)
module.exports = router
