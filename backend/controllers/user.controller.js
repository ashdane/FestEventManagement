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
const getOrganizerProfile = async (req, res) => {
    try {
        const organizer = await Organizer.findById(req.user.id).select(
            'organization_name category description contact_email phone_number discord_webhook_url email'
        );
        if (!organizer) return res.status(404).json({ error: 'Organizer not found' });
        return res.status(200).json(organizer);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
const updateOrganizerProfile = async (req, res) => {
    try {
        if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
            return res.status(400).json({ error: 'Login email is non-editable' });
        }
        const editable = ['organization_name', 'category', 'description', 'contact_email', 'phone_number', 'discord_webhook_url'];
        const patch = {};
        editable.forEach((k) => {
            if (Object.prototype.hasOwnProperty.call(req.body, k)) patch[k] = req.body[k];
        });
        const organizer = await Organizer.findByIdAndUpdate(req.user.id, { $set: patch }, { new: true, runValidators: true })
            .select('organization_name category description contact_email phone_number discord_webhook_url email');
        if (!organizer) return res.status(404).json({ error: 'Organizer not found' });
        return res.status(200).json({ message: 'Organizer profile updated', organizer });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
module.exports = { save_user, get_users, getAllOrganizers, getOrganizerProfile, updateOrganizerProfile }
