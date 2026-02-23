const app = require('./app');
const DBconnection = require('./config/db');
const { createAdmin } = require('./utils/admin-creation');
require('dotenv').config();
const port = process.env.PORT || 3000;
DBconnection();
app.listen(port, async () => {
    console.log(`Listening on port ${port}`);
    await createAdmin();
});
