const jwt = require('jsonwebtoken')
const extractUserType = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] //bearer<space>token
    if(!token)
        return res.status(401).json({ error: 'No token found for user!' }); //401: unauthorized, 201: crated
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
}
const isAdmin = (req, res, next) => {
    if(req.user.role == 'ADMTR')
        next()
    else
        return res.status(403).json({ error: 'Only for Admins!' }); //403: Forbidden 401: unauthorized, 201: crated
}
const isOrganizer = (req, res, next) => {
    if(req.user.role == 'OGR')
        next()
    else
        return res.status(403).json({ error: 'Only for Organizers!' }); //403: Forbidden 401: unauthorized, 201: crated
}
const isParticipant = (req, res, next) => {
    if(req.user.role == 'PPT')
        next()
    else
        return res.status(403).json({ error: 'Only for Participants!' });
}
module.exports = { extractUserType, isAdmin, isOrganizer, isParticipant }
