import { mongoose, Schema } from "mongoose"
import { User } from "./user.models"


const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,
        ref: "User"  
    }
},{timestamps: true})

export const subscription = mongoose.model("subscription", subscriptionSchema)