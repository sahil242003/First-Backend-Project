import { configDotenv } from "dotenv";

import connectDb from "./db/index.js";

configDotenv()

configDotenv({
    path: './env'
})

connectDb()


