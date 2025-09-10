import jwt from 'jsonwebtoken'

export const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt_user

    //check json web toke  exists & is verified
    if (token) {
            jwt.verify(token, process.env.jwtSecret, (err, decodedToken) => {
                if (err) {
                    console.log(err.message);
                    return res.status(401).json({ error: "Unauthorized" });
                } else {
                    req.user = decodedToken;
                    console.log(decodedToken)
                    next()
                }
            })
    }
    else {
        return res
        .status(401)
        .json({error: "You have to be logged in first!"})
    }
}

// Require admin login
export const requireAdmin = (req, res, next) => {
  const token = req.cookies.jwt_admin;

  if (!token) {
    return res.status(401).json({ error: "You have to be logged in first!" });
  }

  jwt.verify(token, process.env.jwtSecret, (err, decodedToken) => {
    if (err) {
      console.log(err.message);
      return res.status(401).json({ error: "Unauthorized" });
    } else if (decodedToken.role !== "admin" && decodedToken.role !== "super_admin") {
      return res.status(403).json({ error: "Admins only!" });
    } else {
      req.admin = decodedToken;
      console.log("Admin decoded:", decodedToken);
      next();
    }
  });
};