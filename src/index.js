import dotenv from 'dotenv'
dotenv.config({path: "./.env"})

import app from "../src/app.js";
import connectDB from "../src/db/index.db.js";

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is at http://localhost:${process.env.PORT}`);
    })
})
.catch((error) => {
    console.log(`MONGODB connection FAILED !!`, error);
})


//other way without creating seperate index.db.js file

/*
import express from "express"
const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()

*/