import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js"; // imported this beacuse it is directly connected to mongoose DB
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/apiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validation - not empty
  //check if user already exists: username, email
  //check for images, check for avtar
  //upload to cloudinary
  //create user object - create entry in DB
  //remove password and refresh token field from response
  //check for user creation
  //return res

  //get user details from frontend
  const { username, fullname, email, password } = req.body;

  //validation - not empty
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are required");
  }

  //check if user already exists: username, email
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  //check for images, check for avtar
  const avtarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPaths = req.files?.coverImage[0]?.path;

  if (!avtarLocalPath) {
    throw new ApiError(400, "Avtar file is required");
  }

  //upload to cloudinary
  const avtar = await uploadOnCloudinary(avtarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPaths)

  if(!avtar){
    throw new ApiError(400, "Avtar file is required");
  }

  ////create user object - create entry in DB
  const user = await User.create({
    fullname,
    avatar: avtar.url,
    coverImage: coverImage?.url || "",   //cause it's not compulsory
    email,
    password,
    username: username.toLowerCase()
  })

  //remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"  //this will avoid this field by putting (-) first
  )

  //check for user creation
  if(!createdUser){
    throw new ApiError(500, "Something went wrong while registration")
  }

  //return res
  return res.status(202).json(
    new ApiResponse(200, createdUser, "User created successfully")
  )
});

export default registerUser;
