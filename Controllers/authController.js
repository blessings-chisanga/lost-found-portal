import pool from "../dB/db.js";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function signup_get(req, res) {
  res.sendFile(path.join(__dirname, "../public/signup.html"));
}

export function login_get(req, res) {
  res.sendFile(path.join(__dirname, "../public/login.html"));
}
//Create token
const maxAge = 3 * 24 * 60 * 60;

//create jwt token function
const createToken = (student_id) => {
  return jwt.sign({ student_id }, process.env.jwtSecret, {
    expiresIn: maxAge,
  });
};

//Signing up a new user
export async function signup_post(req, res) {
  //middleware executes before this, so input is already saitized at this point
  const { student_id, firstName, lastName, email, phone, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Checking if student already exists
    const [existing] = await pool.execute(
      "SELECT * FROM students WHERE email = ? OR student_id = ?",
      [email, student_id]
    );

    if (existing.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    // If user does not exist, send to Database
    const [result] = await pool.execute(
      "INSERT INTO students (student_id, first_name, last_name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
      [student_id, firstName, lastName, email, phone, hashedPassword]
    );

    //Create JWT to log the signed up user to track their logged in status!
    const token = createToken(result.insertId);
    console.log(result);

    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

//login fucntionality
export async function login_post(req, res) {
   const { student_id, password } = req.body;

    try {
      const [result] = await pool.execute(
        "SELECT * FROM students WHERE student_id = ? OR email = ?",
        [student_id, student_id]
      );

      if (result.length == 0) {
        return res
        .status(400)
        .json({ success: false, message: "No such user was found" });
      } 

     const student = result[0];
     const validPassword = await bcrypt.compare(password, student.password_hash);

     if (!validPassword) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
     }

     const token = createToken(student.insertId);
     res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
     res.status(200).json({
       success: true,
       message: "Login Successful!",
       id: student.insertId,
     });


  
    } catch (error){
      console.error("database error", error.message);
      res.status(500).json({
        success: false,
        message: "Something went wrong while handling the login request",
      });
    }
}

export function logout_get(req, res) {
  res.cookie("jwt", "", { maxAge: 1 }); // Set cookie to expire immediately
  res.redirect("/login.html");          // Redirect to login page or homepage
}


export default {
  signup_get,
  signup_post,
  login_get,
  login_post,
  logout_get,
};
