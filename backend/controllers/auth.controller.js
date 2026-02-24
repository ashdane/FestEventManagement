const Participant = require('../models/Participant')
const User = require('../models/User')
const Organizer = require('../models/Organizer');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const make_token = (id, role, participant_type) => { //helper function
    return jwt.sign({ id, role, participant_type }, process.env.JWT_SECRET, { expiresIn: '3d' })
}
const signup = async (req, res) => {
    try{
        const { usertype, participant_type, first_name, last_name, email, org_name, phone_number, password } = req.body
        if(participant_type == 'ITST' && !email.endsWith('@students.iiit.ac.in') && !email.endsWith('@research.iiit.ac.in'))
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
