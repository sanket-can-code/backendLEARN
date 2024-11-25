const asyncHandler = (fn) => async(req, res, next) => {
    try{
        await fn(req, res, next)
    }
    catch(err) {
        res.status (err.code || 400).json({
            sucess: false,
            message: err.message
        })
    }
}

export { asyncHandler }