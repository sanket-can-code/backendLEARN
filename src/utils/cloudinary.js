import { v2 as cloudinary } from 'cloudinary'
import exp from 'constants'
import fs from 'fs'


cloudinary.config({ 
    cloud_name: process.env.cloud_name, 
    api_key: process.env.api_key, 
    api_secret: process.env.api_secret 
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath){
            return null
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log(response.url)
        return response
    }
    catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}

export { uploadOnCloudinary }