const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 3308,  // Docker=3306, local=3308
  user: process.env.MYSQL_ROOT_USER || "root",
  password: process.env.MYSQL_ROOT_PASSWORD || "password", 
  database: process.env.MYSQL_DATABASE || "sd2-db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { query };
