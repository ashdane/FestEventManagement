const mongoose = require('mongoose')
const bcrypt = require('bcrypt'); //error-it showed next is not a function because i had not imported bcrypt
const userSchema = new mongoose.Schema({
    role: { type: String, required: true },
    email: {
        type: String,
        required: [true, 'Please enter Email address!'],
        trim: true,
        unique: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
            },
            message: 'Your email address is invalid.'
        }
    },
    password: String,
    enabled: { type: Boolean, default: true }
})
userSchema.pre('save', async function() //`pre` is a feature of the schema. it attaches this to the schema model right before it is compiled. hashing users password before saving to DB
{
    try{
        if(!this.isModified('password')) // need this to ensure that hashing occurs only when password is modified, not when the email is modified
            return;
        const salt = await bcrypt.genSalt(10); //random string addded before hashing; ensure that the same passwords (by different users) have different hashes
        this.password = await bcrypt.hash(this.password, salt);
    }
    catch (error){
        throw error;
    }
})
userSchema.methods.ValidatePassword = async function(password) // to validate entered password
{
    try {
        return await bcrypt.compare(password, this.password);
    }
    catch (error) {
        throw new Error('Incorrect Password!')
    }
}
module.exports = mongoose.model("User", userSchema)
