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

const createAdminToken = (admin) => {
  return jwt.sign(
    { id: admin.id, role: admin.role, username: admin.username },
    process.env.jwtSecret,
    { expiresIn: maxAge }
  );
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

     const token = createToken(student.student_id);
     res.cookie("jwt_user", token, { httpOnly: true, maxAge: maxAge * 1000 });
     res.status(200).json({
       success: true,
       message: "Login Successful!",
       id: student.student_id,
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
  res.cookie("jwt_user", "", { maxAge: 1 }); // Set cookie to expire immediately
  res.redirect("/login.html");          // Redirect to login page or homepage
}

//Admin login function
export async function Adminlogin(req, res) {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.execute(
      "SELECT * FROM admins WHERE username = ? OR email = ?",
      [username, username]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "No such admin found" });
    }

    const admin = rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Create token with role
    const token = createAdminToken(admin);

    res.cookie("jwt_admin", token, {
      httpOnly: true,
      maxAge: maxAge * 1000,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production", // cookie secure in production
    });

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      id: admin.id,
      role: admin.role,
      full_name: admin.full_name,
    });

  } catch (error) {
    console.error("Database error", error.message);
    res.status(500).json({
      success: false,
      message: "Something went wrong while handling the login request",
    });
  }
}

export function Adminlogout(req, res) {
  res.cookie("jwt_admin", "", { maxAge: 1 }); // Set cookie to expire immediately
  res.redirect("/Adminlogin.html");          // Redirect to login page or homepage
}

export default {
  signup_get,
  signup_post,
  login_get,
  login_post,
  logout_get,
  Adminlogin,
  Adminlogout
};
