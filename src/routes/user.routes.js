import { Router } from "express"
import registerUser from "../controllers/user.controllers.js"
import upload from '../middlewares/multer.js'

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avtaar",
            maxcount: 1
        },
        {
            name: "coverImg",
            maxcount: 1 
        }
    ]),
    registerUser
)

router.route("/register").post(registerUser)

export default router 