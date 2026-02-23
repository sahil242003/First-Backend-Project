import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {  //res is written as ( _ ) cause it's not in use
  try {
    const token =
    //It looks for the token in two places — either from cookies (for browser clients) or from the Authorization header (for mobile/API clients). The header typically looks like Bearer <token>, so it strips the "Bearer " prefix to get the raw token.
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); //req. has cookies option from app.js (line 15)

    if (!token) {
      throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(  //_id is from user.model.js (line. 72)
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    //This is the key part — it attaches the user object to req so that any subsequent controller (like logOutUser) can access req.user without needing to query the DB again. Then next() passes control to the next middleware or route handler.
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
