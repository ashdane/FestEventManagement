const express = require('express');
require('dotenv').config();
const DBconnection = require('./config/db');
const { createAdmin } = require('./utils/admin-creation');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const eventRoutes = require('./routes/event.routes');
const participantRoutes = require('./routes/participant.routes');
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/home', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/participants', participantRoutes);
if (require.main === module) {
    const port = process.env.PORT || 3000;
    DBconnection();
    app.listen(port, async () => {
        console.log(`Listening on port ${port}`);
        await createAdmin();
    });
}
module.exports = app;
