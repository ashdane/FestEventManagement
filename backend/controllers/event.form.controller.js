const { Event } = require('./event.shared');
const manageEventForm = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findOne({ _id: eventId, org_id: req.user.id });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (req.method !== 'GET') {
            const { registrationLayout = [] } = req.body;
            if (event.form_locked) {
                return res.status(400).json({ error: 'Form is locked after first registration' });
            }
            if (!Array.isArray(registrationLayout)) {
                return res.status(400).json({ error: 'registrationLayout must be an array' });
            }
            if (registrationLayout.length > 20) {
                return res.status(400).json({ error: 'Maximum 20 form fields allowed' });
            }
            for (const field of registrationLayout) {
                if (field.fieldType === 'DROPDOWN' && (!Array.isArray(field.options) || field.options.length === 0)) {
                    return res
                        .status(400)
                        .json({ error: `Dropdown field "${field.fieldName}" must include options` });
                }
            }
            event.event_registration_form = registrationLayout;
            await event.save();
            return res.status(200).json({
                message: 'Registration form updated successfully',
                registrationLayout: event.event_registration_form,
                form_locked: event.form_locked
            });
        }
        return res.status(200).json({
            registrationLayout: event.event_registration_form || [],
            form_locked: event.form_locked,
            status: event.status
        });
    } catch (error) {
        const statusCode = req.method === 'GET' ? 500 : 400;
        return res.status(statusCode).json({ error: error.message });
    }
};
module.exports = { manageEventForm };
