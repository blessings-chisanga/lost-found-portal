import pool from "../dB/db.js";

export const fetchLostIds = async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM lost_ids");
      console.log(rows);
  
      res.json(rows); //send rows as json back to client
    } catch (error) {
      res.status(500).json({ error: "Internal server Error" });
    }
};

export default {
    fetchLostIds
};