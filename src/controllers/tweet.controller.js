import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


//Create Tweet
const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    const tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user._id
    })

    return res
        .status(201)
        .json(new ApiResponse(201, tweet, "Tweet created successfully"))
})


//Get All Tweets of a User
const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const tweets = await Tweet.find({ owner: userId })
        .populate("owner", "username fullName avatar")
        .sort({ createdAt: -1 })

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "User tweets fetched successfully"))
})


//Update Tweet
const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    if (!content?.trim()) {
        throw new ApiError(400, "Content cannot be empty")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    //Only owner can update
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to update this tweet")
    }

    tweet.content = content.trim()
    await tweet.save()

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet updated successfully"))
})


//Delete Tweet
const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    //Only owner can delete
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to delete this tweet")
    }

    await tweet.deleteOne()

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet deleted successfully"))
})


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}