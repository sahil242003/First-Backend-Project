import { Router } from "express";
import registerUser from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";  //used this cause without this we can only get data not files and this is middleware

const router = Router();

router.route("/register").post(upload.fields(
    [
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]), 
registerUser);

export default router;

//if there is an error change userRouter to router
