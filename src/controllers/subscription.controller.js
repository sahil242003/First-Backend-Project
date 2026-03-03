import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


//Toggle Subscription
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }

    const subscriberId = req.user?._id  

    if (!subscriberId) {
        throw new ApiError(401, "Unauthorized request")
    }

    if (subscriberId.toString() === channelId) {
        throw new ApiError(400, "You cannot subscribe to yourself")
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    })

    if (existingSubscription) {
        //If already subscribed → unsubscribe
        await Subscription.findByIdAndDelete(existingSubscription._id)

        return res.status(200).json(
            new ApiResponse(200, {}, "Unsubscribed successfully")
        )
    }

    //If not subscribed → subscribe
    await Subscription.create({
        subscriber: subscriberId,
        channel: channelId
    })

    return res.status(200).json(
        new ApiResponse(200, {}, "Subscribed successfully")
    )
})


//Get Subscribers of a Channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID")
    }

    const subscribers = await Subscription.find({ channel: channelId })
        .populate("subscriber", "username email avatar")

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalSubscribers: subscribers.length,
                subscribers
            },
            "Subscribers fetched successfully"
        )
    )
})


//Get Channels User Has Subscribed To
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID")
    }

    const subscribedChannels = await Subscription.find({
        subscriber: subscriberId
    }).populate("channel", "username email avatar")

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalSubscribedChannels: subscribedChannels.length,
                subscribedChannels
            },
            "Subscribed channels fetched successfully"
        )
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}