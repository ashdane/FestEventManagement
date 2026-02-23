const User = require('./User');
const mongoose = require('mongoose')

const RegistrationSchema = new mongoose.Schema(
    {
        event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Events', required: true },
        ticket_id: { type: String, required: true },
        participation_status: {
            type: String,
            enum: ['REGISTERED', 'COMPLETED', 'CANCELLED', 'REJECTED'],
            default: 'REGISTERED'
        },
        team_name: { type: String, default: 'N/A' },
        registered_at: { type: Date, default: Date.now }
    },
    { _id: false }
);

const ParticipantSchema = new mongoose.Schema({
    participant_type: String,
    first_name: String,
    last_name: String,
    organization_name: String,
    phone_number: String,
    areas_of_interests:
        {
        type: [String], 
        enum: ['TECH_EVENTS', 'CULTURAL_EVENTS', 'ENTERTAINMENT', 'NETWORKING'],
        default: []
        },
    orgs_of_interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    registrations: {
        type: [RegistrationSchema],
        default: []
    }
})

module.exports = User.discriminator('Participant', ParticipantSchema); 
// allows for the storing of participants in the main mongodb collection (users)
//  using a hidden field __t to differentiate
