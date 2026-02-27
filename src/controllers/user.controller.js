import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js"; // imported this beacuse it is directly connected to mongoose DB
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccesAndRefreshTokens = async(userId) => {
  try{
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken 
    await user.save({validateBeforeSave: false})

    return {accessToken, refreshToken}

  } catch(error){
    throw new ApiError(500, "something went wrong while generating refresh and access token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validation - not empty
  //check if user already exists: username, email
  //check for images, check for avtar
  //upload to cloudinary
  //create user object - create entry in DB  (cause in mongoDB Objects are generally made is it is NOSQL)
  //remove password and refresh token field from response  (after crating user in mongoDB we get response)
  //check for user creation
  //return res

  // console.log(req.files);
  // console.log(req.body);
  

  //get user details from frontend
  const { username, fullname, email, password } = req.body;

  //validation - not empty
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are required");
  }

  //check if user already exists: username, email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  //check for images, check for avtar
 const avatarLocalPath = req.files?.avatar?.[0]?.path
 const coverImageLocalPath = req.files?.coverImage?.[0]?.path

 //other way for coverImage logic

 //  let coverImageLocalPath;
 //  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
 //  coverImageLocalPath = req.files.coverImage[0].path}

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //upload to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "something went wrong while uploading to cloudinary");
  }

  //create user object - create entry in DB
  const user = await User.create({
    fullname,
    avatar: avatar.url, //that we got from cloudinary
    coverImage: coverImage?.url || "", //cause it's not compulsory
    email,
    password,
    username: username.toLowerCase(),
  });

  //remove password, refresh token field from response and check for user creation
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //(.select) this will avoid this field from response by putting (-) first
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registration");
  }

  //return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
//req body - data
//username or email
//find the user
//password check
//access and refresh token
//send cookies

//get data from body
const {email, password, username} = req.body

//check if username or email is not empty
//if(!username && !email)
if(!(username || email)){
  throw new ApiError(400, "username or email is required")
}

//check for user username or email from DB
const user = await User.findOne({
  $or: [{username}, {email}]
})

if(!user){
  throw new ApiError(404, "User not found")
}

//password check
const isPasswordValid = await user.isPasswordCorrect(password)  // use (user) not (User) cause user from response and User is from mongoDB

if(!isPasswordValid){
  throw new ApiError(401, "incorrect password")
}

//access refresh and access tokens
const {accessToken, refreshToken} = await generateAccesAndRefreshTokens(user._id)

const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

//send in cookies
const options = {
  httpOnly: true,
  secure: true
}

return res
.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", refreshToken, options)
.json(
  new ApiResponse(200, {       //from here all is data from apiResponse
    user: loggedInUser, accessToken, refreshToken
  }, "User logged in successfully")
)
})

const logOutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,  //from auth.middleware
    { //$set is mongoDB operator
      $unset: {
        refreshToken: 1 //this removes the field from document
      }
    },
    {
      // new: true
      returnDocument: "after"
    }
  )

  //cookie options
  //httpOnly means cookies can't be accessed via JavaScript (prevents XSS attacks), and secure means they only travel over HTTPS.
  const options = {
  httpOnly: true,
  secure: true
}

return res
.status(200)
.clearCookie("accessToken", options)
.clearCookie("refreshToken", options)
.json(new ApiResponse(200, {}, "User logged out successfully"))
})

//this is when access token gets expire and now we want to give user new access token without again taking users email and password so we match refresh token and then give user new access token
const refreshAccessToken = asyncHandler(async(req, res) => {
  //req refresh token in the form of cookies or in mobile from body
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401, "unauthorized request")
  }

  try {
    //verify refresh token
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401, "invalid refresh token")
    }
  
    // Even if the token is cryptographically valid, it compares it against the refresh token stored in the database. This catches two situations — if the user has already logged out (token cleared from DB), or if the token was already used once to generate a new one (rotation).
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "refresh token is expired or used")
    }
  
    const options = {
      httpOnly: true, 
      secure: true
    }
  
    //Generates a brand new access token and a new refresh token. This is called token rotation
    const {accessToken, newRefreshToken} = await generateAccesAndRefreshTokens(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const {oldPassword, newPassword, confirmPassword} = req.body

  if(newPassword !== confirmPassword){
    throw new ApiError(400, "new password and Confirmed password is not same")
  }

  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400, "invalid password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})  //cause user.model.js (line 60)

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "Password changed succefully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "User fetched succesfully"))
})

const updateAcountDetalis = asyncHandler(async(req, res) => {
  const {fullname, email} = req.body

  if(!fullname || !email){
    throw new ApiError(400, "all fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname, email
      }
    },
    {
      returnDocument: "after"
    }
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updateed successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path
  
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is not available")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400, "Error while updating avatar file")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {
      returnDocument: "after"
    }
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Avatar Upadated")
  )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path
  
  if(!coverImageLocalPath){
    throw new ApiError(400, "CoverImage file is not available")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
    throw new ApiError(400, "Error while updating coverImage file")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    {
      returnDocument: "after"
    }
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "CoverImage Upadated")
  )
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
  const {username} = req.params  //(req.params) means from req from url

  if(!username?.trim()){
    throw new ApiError(400, "Username is missing")
  }

  const channel = await User.aggregate([
    { //finds the user
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {   // for channel subscribers (to find channel subscriber find the channel docs)
        from: "subscriptions", //from subscription.model.js (line 18) in mongoDb name become plural and first letter becomes small
        localField: "_id",
        foreignField: "channel", //find docs where this user's _id is the channel
        as: "subscribers"  //store results in a "subscribers" array
      }
    },
    {
      $lookup: {  //for channels user subscribed to
        from: "Subscriptions",  //from subscription.model.js (line 18) in mongoDb name become plural and first letter becomes small
        localField: "_id",
        foreignField: "subscriber", //find docs where this user's _id is the subscriber
        as: "subscribedTo"  //store results in a "subscribedTo" array
      }
    },
    {
      $addFields:{
        subscribersCount: {
          $size: "$subscribers"
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(404, "channel does't exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0], "user channel fetched successfully")  //in return first value is important that's why channel[0]
  )
})

const getWatchHistory = asyncHandler(async(req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1, 
                    username: 1,
                    avatar: 1
                  }
                },
                {
                  $addFields: {
                    owner: {
                      $first: "$owner"
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully"))
})

export {registerUser, loginUser, logOutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAcountDetalis, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory};
