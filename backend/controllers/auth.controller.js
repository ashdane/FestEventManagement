const Participant = require('../models/Participant')
const User = require('../models/User')
const Organizer = require('../models/Organizer');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const make_token = (id, role, participant_type) => { //helper function
    return jwt.sign({ id, role, participant_type }, process.env.JWT_SECRET, { expiresIn: '3d' })
}
const isIiitEmail = (email = '') =>
    /@(([\w-]+\.)?students\.iiit\.ac\.in|([\w-]+\.)?research\.iiit\.ac\.in|([\w-]+\.)?iiit\.ac\.in)$/i.test(email);
const signup = async (req, res) => {
    try{
        const { usertype, first_name, last_name, email, org_name, phone_number, password } = req.body
        let participant_type = String(req.body.participant_type || '').trim().toUpperCase();
        if (!participant_type) participant_type = isIiitEmail(email) ? 'ITST' : 'NITST';
        if (participant_type === 'IIIT') participant_type = 'ITST';
        if (['NON_IIIT', 'NON-IIIT', 'NONIIIT', 'OTHER'].includes(participant_type)) participant_type = 'NITST';
        if (!['ITST', 'NITST'].includes(participant_type))
            return res.status(400).json({ message: 'Invalid participant type' });
        if(participant_type == 'ITST' && !isIiitEmail(email))
            return res.status(400).json({ message: 'Please enter your student institute ID!'}) //400: Bad Request // you have to return it, without returning, it keeps going on
        const participant = new Participant({ role: 'PPT', participant_type, first_name, last_name, email, org_name, phone_number, password })
        await participant.save()
        const participant_token = make_token(participant._id, participant.role, participant.participant_type)
        res.status(201).json({
            message: "participant created succesfully",
            participant: { email: participant.email, id: participant._id, role: participant.role, participant_type: participant.participant_type  },
            token: participant_token
        })
    } catch (err) { 
        console.error("Signup Error:", err); 
        return res.status(400).json({ message: "Signup works - Backend", error: err.message }); //400: Bad Request
    }
}
const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({email})
        if(!user) {
            console.log("User not found");
            return res.status(404).json({ error: `User not found` }) //404: Not Found
        }
        if (user.archived === true)
            return res.status(403).json({ error: 'Account archived. Contact admin.' })
        if (user.enabled === false)
            return res.status(403).json({ error: 'Account disabled. Contact admin.' })
        const match = await user.ValidatePassword(password)
        if(!match)
            return res.status(401).json({ error: "Incorrect Password!" }) //402: Unauthorized
        const role = user.role || 'PPT'; 
        const participant_type = user.participant_type || 'None';
        const user_token = make_token(user._id, role, participant_type)
        res.status(200).json({ //200: OK
             message: "Successful Login!",
             token: user_token,
             usertype: role, 
             id: user._id
        })
    }
    catch (error) { //error is a js object
        console.error('Login failed:', error.message) // streams to stderr
        res.status(500).json({ error: error.message, message: "Internal Server Error" }); // 500: Internal Server Error
    }
}
module.exports = { signup, login }
