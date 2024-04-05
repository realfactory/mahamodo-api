const connection = require('../config/db.mysql.js');

async function dbQuery(sql) {
    return new Promise((resolve, reject) => {
        const query = sql;
        // console.log(query);
        connection.query(query, (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                reject(new Error(`Error retrieving data from ${tableName}: ${error.message}`));
            } else {
                resolve(results);
            }
        });
    });
}

function getProvince() {
    return new Promise((resolve, reject) => {
        const query = "SELECT * FROM province";
        connection.query(query, (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                // reject(new Error(`Error retrieving data from the province table: ${error.message}`));
            } else {
                resolve(results);
            }
        });
    });
}

async function fcGetItemInTableDB(columnName, tableName, condition) {
    return new Promise((resolve, reject) => {
        const query = `SELECT ${columnName} FROM ${tableName} WHERE ${condition}`;

        connection.query(query, (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                reject(new Error(`Error retrieving data from ${tableName}: ${error.message}`));
            } else {
                resolve(results.length > 0 ? results[0][columnName] : null);
            }
        });
    });
}

module.exports = {
    dbQuery,
    getProvince,
    fcGetItemInTableDB
}