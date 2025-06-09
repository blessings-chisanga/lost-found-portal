import mysql from 'mysql2/promise'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()
const app = express()
const port = 3000;
app.use(cors())

const pool = mysql.createPool({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
})

app.get('/home', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM lost_ids')
        console.log(rows)

        res.json(rows) //send rows as json back to client
    
    } catch (error) {
        res.status(500).json({error: 'Internal server Error'})
    }
   
})




app.listen(port, () => {
    console.log(`Server is listening at port ${port}!`)
})