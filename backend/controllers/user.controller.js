const User = require('../models/User')
const Organizer = require('../models/Organizer'); 
const Participant = require('../models/Participant');

const save_user = async (req, res) => {
    try {
        const { role } = req.body;
        let newUser; //not just relying on the dynamically typed nature of JS, im making sure that newUser is not a global variable but only has block scope
        if (role === 'PPT')
            newUser = new Participant(req.body);
        else if (role === 'OGR')
            newUser = new Organizer(req.body);
        else
            newUser = new User(req.body);
        await newUser.save();
        return res.status(201).json(newUser); //201: created; POST succesfully stores something in db
    }
    catch (error) {
        console.error("Save Error:", error);
        return res.status(500).json({ message: error.message }); //500: Internal Server Error
    }
};

const get_users = async (req, res) => {
    try {
        const users = await User.find() // Gets all users from db
        return res.json(users)
    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }
}
const getAllOrganizers = async (req, res) => {
    try {
        const organizers = await User.find({ __t: 'Organizer' }).select('organization_name description'); //im only checking those rows with _t = Organizer. __t (discriminator key) is something added by mongoose to distruingish rows in case of using discriminators. also we are only retrieing the name and descriptionof those rows
        return res.status(200).json(organizers); // 200: OK
    }
    catch (error) {
        return res.status(500).json({ message: "Error fetching organizations" });
    }
};

module.exports = { save_user, get_users, getAllOrganizers }
