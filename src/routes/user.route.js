import { Router } from "express";
import {loginUser, logOutUser, registerUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAcountDetalis, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory} from "../controllers/user.controller.js";
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
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAcountDetalis)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)

export default router;

//if there is an error change userRouter to router

//GET — used when only reading/fetching data, nothing changes on the server
//GET requests have no body — data is passed via URL params or query strings. They're also safe to repeat multiple times with the same result 

//PATCH only updates the fields you send

//GET    → "give me data" 
//POST   → "here's new data"
//PATCH  → "update part of this"
