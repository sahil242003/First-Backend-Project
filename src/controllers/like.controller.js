import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


//Toggle Video Like
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Video unliked"))
    }

    await Like.create({
        video: videoId,
        likedBy: req.user._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video liked"))
})


//Toggle Comment Like
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Comment unliked"))
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment liked"))
})


//Toggle Tweet Like
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Tweet unliked"))
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet liked"))
})


//Get All Liked Videos of Logged-in User
const getLikedVideos = asyncHandler(async (req, res) => {

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $ne: null }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video"
            }
        },
        {
            $unwind: "$video"
        },
        {
            $project: {
                _id: 0,
                video: 1
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))
})


export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}