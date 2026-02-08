import { configDotenv } from "dotenv";

import connectDb from "./db/index.js";
import { app } from "./app.js";

configDotenv()

configDotenv({
    path: './env'
})

connectDb()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT}`);
        
    })
})
.catch((err) => {
    console.log(`Mongo DB connection failed !!!`, err);
    
})

