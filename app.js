//Necessary Imports
import pool from "./dB/db.js";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(express.static("uploads"));
app.use(cookieParser());

app.use(authRoutes);

//Routes
app.get("/fetchIds", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM lost_ids");
    console.log(rows);

    res.json(rows); //send rows as json back to client
  } catch (error) {
    res.status(500).json({ error: "Internal server Error" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/login.html"));
});

app.listen(port, () => {
  console.log(`Server is listening at port ${port}!`);
});
