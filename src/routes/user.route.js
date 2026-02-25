import { Router } from "express";
import {loginUser, logOutUser, registerUser, refreshAccessToken} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";  //used this cause without this we can only get data not files and this is middleware
import { verifyJWT } from "../middlewares/auth.middleware.js";

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


//.post is for sending/submitting data — it sends data in the request body, which is more secure and has no size limits.
router.route("/login").post(loginUser)

// router.route("/logout").post(verifyJWT, logOutUser)
router.route("/logout").post(verifyJWT, logOutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router;

//if there is an error change userRouter to router
