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
const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
});
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
