const User = require('./User');
const mongoose = require('mongoose')
const OrganizerSchema = new mongoose.Schema({
    description: String,
    category: String,
    organization_name: String
})

module.exports = User.discriminator('Organizer', OrganizerSchema);
// discriminator is basically schema inheritance
// the hidden key for this (__t) will be 'Organizer'