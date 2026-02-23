const mongoose = require('mongoose') // 'mongoose' is a package which node runs and require caches, require passes on a reference to this cached object to mongoose

const DBconnection = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI) //async outside allows us to use await inside the function. mongoose.connect returns a promise (placeholder). this function's execution pauses here and waits for the promise to be resolved. while it is paused the code outside the function is allowed to run as normal
    console.log('Connected to MongoDB.') //sends to stdout (terminal in the case of backend)
  }
  catch (error) { //error is just the name that we use to refer to the actual error thrown (if thrown) in the try block.
    console.error(`Can't connect to MongoDB: ${error.message}`) // use ` not ' (back tick) // ${} : string interpolation
    process.exit(1) //tells the OS to kill the nodejs app (backend) if no connection to DB;
  }
}

module.exports = DBconnection // The file is this function; im exporting it as a function
// require('dotenv') caches the env lib code, .config() process the code and loads it into the process.env. process is a reference to the nodjs backend process
//module here referes to the current module (this file) and only exports the dbconnection function. so that when anyone imports this file (module) it gets access to this funciton