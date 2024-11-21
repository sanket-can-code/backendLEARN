import connectDB from './db/index.js'
import dotenv from 'dotenv'

dotenv.config({
    path:'./env'
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () =>{
        console.log(`running at port ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("mongo failed", err);
})

