const Organizer = require('../models/Organizer'); //the first time it runs, the require does work to cache the object, but on subsequent runs, require just provides the reference of the cached object
const createOrganizer = async (req, res) => { //express passes three things to all functions (requires object, response object and next function). it depends on the funciton and its parameters if it wants the function to call it. 2. the order matters, the first parameter is reserved for the requies object, the second for the response object and the third for the next function
    try {
        const { organization_name, email, password, description, category } = req.body;
        if (!password)
            return res.status(400).json({ error: "Password is required" }); //400: Bad Response //.json converts the js object in it to a json string. this is done internally by setting the Content-Type to application/json
        const newOrganizer = new Organizer({role: 'OGR', organization_name, email, password, description, category }); //  Organizer is an object (specifcally, a model constructor), newOrganizer is an instance of it
        await newOrganizer.save();
        const organizerResponse = newOrganizer.toObject(); //newOrganizer is a model instance //currently stored in RAM
        delete organizerResponse.password;
        res.status(201).json({ //201 Created
            message: "Organizer created successfully", 
            organizer: organizerResponse // I did this so as to allow for the removal of password before sending it
        });
    } 
    catch (error) {
        console.error("Error creating organizer:", error);
        return res.status(500).json({ error: error.message }); //500:Internal Server Error
    }
};
module.exports = { createOrganizer }; // in the module (file), I am createing a key value pair, the key is createOrganizer and the value is the function, If I did not use {}, i would be saying that the module refers to the function
