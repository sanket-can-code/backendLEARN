import { asyncHandler } from "../utils/asyncHandler.js"
import apiError from "../utils/apiError.js"
import User from '../models/user.models.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"

const registerUser = asyncHandler ( async (req, res,) =>{

    const {fullName, email, username, password} = req.body 

    if ([fullName, email, username, password].some((feild) => feild?.trim() === "")
    ) {
        throw new apiError(400,"All fields are compulsry!!")
    }

    const existedUser = User.findOne({
        $or:[{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409,"user exists")
    }

    const avtaarPath = req.files?.avtaar[0]?.path
    const coverImagePath = req.files.coverImage[0]?.path

    if (!avtaarPath) {
        throw new apiError(400, "avtaar is required")
    }

    const avtaar = await uploadOnCloudinary(avtaarPath)
    const coverImage = await uploadOnCloudinary(coverImagePath)

    if (!avtaar) {
        throw new apiError(400, "avtaar is required")
    }

    const user = await User.create({
        fullName,
        avtaar: avtaar.url,
        coverImage: coverImage.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new apiError(500, "something went wrong while registering")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered!!")
    )

})

export default registerUser 