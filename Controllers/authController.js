import pool from "../dB/db.js";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from 'jsonwebtoken';
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';
dotenv.config();

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

const createToken = (student_id) => {
  return jwt.sign({student_id}, process.env.jwtSecret, {
    expiresIn: maxAge
  });
}

//Signing up a user
export async function signup_post(req, res) {
  //middleware executes before this, so input is already saitized
  const { student_id, firstName, lastName, email, phone, password } =
    req.body;

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
    
    res.cookie('jwt', token, {httpOnly: true, maxAge: maxAge * 1000})
    res
      .status(201)
      .json({
        success: true, 
        message: "Student registered successfully",
        id: result.insertId
      });

  } catch (error) {
    console.error(error);
    res.status(500).json({success: false, message: "Internal server error" });
  }
}

export function login_post(req, res) {
  const { email, password } = req.body;
  console.log(password + " " + email);
  res.status(200).json({
    message: "You are logged in"
  })

  //Check if Student ID exisits in database
      //if not send back error "User does not exist"
  //if exists, get the passoword sent, hash it and compare with the password in the database
      //if not match, send back error
  //if match send back user id & jwt
    //User is logged in at this point, as long as they have the jwt they are authorized 
}

export default {
  signup_get,
  signup_post,
  login_get,
  login_post,
};
