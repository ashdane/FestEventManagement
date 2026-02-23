const User = require('./User');
const mongoose = require('mongoose')
const OrganizerSchema = new mongoose.Schema({
    description: String,
    category: String,
    org_name: String,
    contact_email: String,
    phone_number: String,
    discord_webhook_url: String,
    archived: { type: Boolean, default: false }
})
module.exports = User.discriminator('Organizer', OrganizerSchema);
