const mongoose = require('mongoose');
const EVENT_TYPES = ['Normal', 'Merchandise'];
const EVENT_TAGS = ['Workshops', 'Talks', 'Competitions', 'Media', 'Technical', 'Cultural', 'Literary'];
const ELIGIBILITY_TYPES = ['IIIT', 'NON_IIIT', 'ALL'];
const EVENT_STATUS = ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CLOSED'];
const REG_FIELD_TYPES = ['TEXT', 'NUMBER', 'DROPDOWN', 'CHECKBOX', 'FILE'];
const RegistrationFieldSchema = new mongoose.Schema(
    {
        fieldType: { type: String, required: true, enum: REG_FIELD_TYPES },
        fieldName: { type: String, required: true, trim: true },
        required: { type: Boolean, default: false },
        options: [{ type: String }]
    },
    { _id: true }
);
const EventSchema = new mongoose.Schema(
    {
        event_name: {
            type: String,
            required: true
        },
        event_description: { type: String, default: '' },
        event_type: {
            type: String,
            enum: EVENT_TYPES,
            default: 'Normal'
        },
        eligibility: {
            type: String,
            enum: ELIGIBILITY_TYPES,
            required: true,
            default: 'ALL'
        },
        reg_deadline: {
            type: Date,
            required: true
        },
        event_start: {
            type: Date,
            required: true
        },
        event_end: {
            type: Date,
            required: true
        },
        reg_limit: {
            type: Number,
            required: true
        },
        reg_fee: {
            type: Number,
            required: true
        },
        stockqty: {
            type: Number,
            default: 0
        },
        merchandiseDetails: {
            sizes: [{ type: String }],
            colors: [{ type: String }],
            purchaseLimitPerParticipant: { type: Number, default: 1 }
        },
        org_id: {
            type: mongoose.Schema.Types.ObjectId, // Change this to ObjectId for proper indexing/joining
            ref: 'Organizer',
            required: true
        },
        event_tag: [
            {
                type: String,
                enum: EVENT_TAGS
            }
        ],
        status: {
            type: String,
            enum: EVENT_STATUS,
            default: 'DRAFT'
        },
        registration_closed: {
            type: Boolean,
            default: false
        },
        event_registration_form: {
            type: [RegistrationFieldSchema],
            default: []
        },
        form_locked: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
EventSchema.virtual('effective_status').get(function() {
    if (['DRAFT', 'COMPLETED', 'CLOSED'].includes(this.status)) return this.status;
    const now = Date.now();
    const start = new Date(this.event_start).getTime();
    const end = new Date(this.event_end).getTime();
    if (now > end) return 'CLOSED';
    if (now >= start) return 'ONGOING';
    return this.status;
});
EventSchema.statics.getStats = async function(eventId) {
    const stats = await mongoose.model('Participant').aggregate([
        { $unwind: '$registrations' },
        { $match: { 'registrations.event_id': new mongoose.Types.ObjectId(eventId) } },
        {
            $group: {
                _id: null,
                regCount: {
                    $sum: { $cond: [{ $in: ['$registrations.participation_status', ['REGISTERED', 'COMPLETED']] }, 1, 0] }
                },
                attendance: {
                    $sum: { $cond: [{ $eq: ['$registrations.participation_status', 'COMPLETED'] }, 1, 0] }
                }
            }
        }
    ]);
    return {
        registrationsCount: stats[0]?.regCount || 0,
        attendanceCount: stats[0]?.attendance || 0
    };
};
EventSchema.statics.getTrendingMap = async function() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const grouped = await mongoose.model('Participant').aggregate([
        { $unwind: '$registrations' },
        { $match: { 'registrations.registered_at': { $gte: since } } },
        { $group: { _id: '$registrations.event_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    return grouped.reduce((map, item) => {
        map[String(item._id)] = item.count;
        return map;
    }, {});
};
module.exports = mongoose.model('Events', EventSchema);
