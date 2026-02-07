import mongoose from "mongoose";
import { db_name} from "../constants.js";


const connectDb = async () => {
    try{
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${db_name}`)
       console.log(`/MongoDB connected !! DB Host: ${connectionInstance.connection.host}`);
       
    }
    catch(error){
        console.log("MONGODB connection error", error);
        process.exit(1)
    }
}

export default connectDb