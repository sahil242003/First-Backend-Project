import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const healthcheck = asyncHandler(async (req, res) => {

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                uptime: process.uptime(),
                timestamp: Date.now(),
                environment: process.env.NODE_ENV || "development"
            },
            "Server is running successfully"
        )
    )
})

export {
    healthcheck
}