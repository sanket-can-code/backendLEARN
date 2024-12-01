import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from '../models/user.models.js'
import uploadOnCloudinary from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async(userID) =>{
    try {
        const user = await User.findById(userID)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
 
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
    }
    
    catch (err) {
        throw new ApiError(500,`${err} SOMETHING WENT WRONG WHILE GENERATING TOKENS`)
    }
}

const registerUser = asyncHandler( async (req, res) => {
     const {fullName, email, username, password } = req.body
 
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    console.log(avatarLocalPath)
    

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler ( async (req, res) =>{
    const {email, username, password } = req.body
    
    if (!(username || email)) {
        throw new ApiError(400, "Email or username is required")
    }

    const user = await User.findOne({
    $or: [{username}, {email}]
    })

    if (!user) { 
        throw new ApiError(400, "User doesnt exist")
    }

    const passwordValid = await user.isPasswordCorrect(password)
    // console.log(passwordValid);
    

    if (!passwordValid) { 
        throw new ApiError(400, "invalid password")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    console.log(accessToken)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("acessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "user loogged in sucessfully"
        )
    )

})

const logoutUser = asyncHandler ( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("acessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out"))
})

const refreshAccessToken = asyncHandler( async(req, res) => {
    const incomingRefreshToken = req.body.refreshToken || req.cookies.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        
        if (incomingRefreshToken !==user?.refreshToken){
            throw new ApiError(401, "refresh token is expired")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("acessToken", accessToken)
        .cookie("refreshToken", newrefreshToken)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newrefreshToken
                },
                "Acess token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, `${error} Some error occured`)
    }

})

const changeCurrentPassword = asyncHandler( async(req, res) => {
    const {oldPassword, newPassword} = req.body 

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new Error(400,"invalid password")  
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password changed sucessfully")
    )
})

const getCurrentUser = asyncHandler( async(req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse (200, req.user, "current user fetched sucessfully")
    )
})

const updateAccountDetails = asyncHandler( async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new Error(400, "Please fill all fields")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new: true} 
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse (200, user, "Account details updated sucessfully")
    )

})

//delete old avatar

const userAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new Error(400, "Please select an image")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new Error(400, "Failed to upload image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "avatar updated")
    ) 
})

const userCoverImage = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new Error(400, "Please select an image")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new Error(400, "Failed to upload image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "coverImage updat ed")
    )
})

const getUserChannelProfile = asyncHandler( async(req, res) => {
    const {username} = req.prams

    if(!username?.trim) {
        throw new ApiError(400, "username missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                local: "_id",
                foreignField: "chanel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                local: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"   
            }
        },
        {
            $addFields: {
                subscribersCount : {
                    $size: "$subscribers"
                },
                subscribedToCount : {
                    $size: "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    } 
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel.length) {
        throw new ApiError(400, "channel doesnt exist")
    }

    return res
    .status(200)
    .json (
        new ApiResponse (200, channel[0], "user channel fetched sucessfully")
    )

})

const getWatchHistory = asyncHandler( async(req, res) => {
    const user = await user.aggregate([
        {
            match: {
                _id: new mongoose.Types.ObjectId(req.User._id)
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
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
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
    ])

    return res
    .status(200)
    .json(
        new ApiResponse (200, user[0].watchHistory,"watch history fetched sucessfully")
    )
})

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    userAvatar, 
    userCoverImage,
    getUserChannelProfile,
    getWatchHistory
}