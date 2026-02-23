const express = require('express')
const router = express.Router()
const uc = require('../controllers/user.controller')

router.post("/users", uc.save_user)
router.get("/users", uc.get_users)
router.get("/organizers", uc.getAllOrganizers)
module.exports = router

