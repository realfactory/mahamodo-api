const mysql = require('mysql2');

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME, // This should be DB_USER, not DB_PASSWORD
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT, // Corrected the typo 'prot' to 'port'
    dialect: process.env.DB_DIALECT,
});

// Function to check connection
function checkConnection() {
    connection.getConnection((err, conn) => {
        if (err) {
            console.error('Error connecting to the database:', err);
            return;
        }
        
        console.log('Connection to database established successfully.');
        conn.release(); // Release the connection back to the pool
    });
}

checkConnection(); // Call the function to check connection

module.exports = connection;