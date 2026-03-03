import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


//Get All Videos (Search + Sort + Pagination)
const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query

    const matchStage = {
        isPublished: true
    }

    if (query) {
        matchStage.title = { $regex: query, $options: "i" }
    }

    if (userId && isValidObjectId(userId)) {
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const sortOrder = sortType === "asc" ? 1 : -1

    const aggregate = Video.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        { $unwind: "$owner" },
        { $sort: { [sortBy]: sortOrder } }
    ])

    const videos = await Video.aggregatePaginate(aggregate, {
        page: Number(page),
        limit: Number(limit)
    })

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"))
})


//Publish Video
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required")
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video file and thumbnail are required")
    }

    const uploadedVideo = await uploadOnCloudinary(videoLocalPath)
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!uploadedVideo || !uploadedThumbnail) {
        throw new ApiError(500, "Error uploading files")
    }

    const video = await Video.create({
        title: title.trim(),
        description: description.trim(),
        videoFile: uploadedVideo.url,
        thumbnail: uploadedThumbnail.url,
        duration: uploadedVideo.duration || 0,
        owner: req.user._id
    })

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video published successfully"))
})


//Get Video By ID (+ increase views)
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)
        .populate("owner", "username fullName avatar")

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    video.views += 1
    await video.save()

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully"))
})


//Update Video
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized")
    }

    if (title) video.title = title.trim()
    if (description) video.description = description.trim()

    // Thumbnail update (optional)
    const thumbnailLocalPath = req.file?.path
    if (thumbnailLocalPath) {
        const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        video.thumbnail = uploadedThumbnail.url
    }

    await video.save()

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"))
})


//Delete Video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized")
    }

    await video.deleteOne()

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"))
})


//Toggle Publish Status
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized")
    }

    video.isPublished = !video.isPublished
    await video.save()

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                `Video ${video.isPublished ? "published" : "unpublished"} successfully`
            )
        )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}