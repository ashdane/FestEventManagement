const organizerControllers = require('./event.organizer.controller');
const participantControllers = require('./event.participant.controller');
const formControllers = require('./event.form.controller');

module.exports = {
    ...organizerControllers,
    ...participantControllers,
    ...formControllers
};
