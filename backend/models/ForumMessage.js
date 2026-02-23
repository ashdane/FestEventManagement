const mongoose = require('mongoose');
const ForumMessageSchema = new mongoose.Schema(
    {
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Events', required: true, index: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorRole: { type: String, enum: ['PPT', 'OGR'], required: true },
        authorName: { type: String, required: true },
        text: { type: String, required: true, trim: true },
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumMessage', default: null },
        isAnnouncement: { type: Boolean, default: false },
        pinned: { type: Boolean, default: false },
        deleted: { type: Boolean, default: false },
        reactions: { type: [{ emoji: String, users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }], default: [] }
    },
    { timestamps: true }
);
module.exports = mongoose.model('ForumMessage', ForumMessageSchema);
