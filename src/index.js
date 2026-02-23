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