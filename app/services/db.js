const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  port: 3308,               // IMPORTANT: from docker-compose.yml
  user: "root",
  password: "password", 
  database: process.env.MYSQL_DATABASE || "uniswap",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { query };
