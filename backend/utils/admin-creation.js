const User = require('../models/User')

const createAdmin = async () => {
    const admin_check = await User.findOne({'role': 'ADMTR'}) //await only works in async function; cant be standalone
    if(!admin_check)
    {
        const first_user = new User({
            'email': 'felicity@iiit.ac.in',
            'password': '123',
            'role': 'ADMTR'
        }) 
        await first_user.save()
    }
}

module.exports = { createAdmin }