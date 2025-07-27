import jwt from 'jsonwebtoken'

export const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt

    //check json web toke  exists & is verified
    if (token) {
            jwt.verify(token, process.env.jwtSecret, (err, decodedToken) => {
                if (err) {
                    console.log(err.message);
                    return res.status(401).json({ error: "Unauthorized" });
                } else {
                    console.log(decodedToken)
                    next()
                }
            })
    }
    else {
        return res
        .status(401)
        .json({error: "No token"})
    }
}