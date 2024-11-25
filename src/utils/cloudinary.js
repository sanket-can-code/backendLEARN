import { v2 as cloudinary } from 'cloudinary'
import exp from 'constants'
import fs from 'fs'


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_APIKEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath){
            return null
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        fs.unlinkSync(localFilePath)
        return response
    }
    catch (error) {
        console.log(error)
        fs.unlinkSync(localFilePath)
        return null
    }
}

export default uploadOnCloudinary 