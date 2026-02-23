import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js"; // imported this beacuse it is directly connected to mongoose DB
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

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
if(!username || !email){
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
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
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


export {registerUser, loginUser, logOutUser};
