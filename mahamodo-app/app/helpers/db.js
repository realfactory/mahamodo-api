const db = require('../config/db.mysql.js');

async function db_Query(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (error, results, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

async function dbQuery(sql) {
    return new Promise((resolve, reject) => {
        const query = sql;
        db.query(query, (error, results) => {
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
        db.query(query, (error, results) => {
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

        db.query(query, (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                reject(new Error(`Error retrieving data from ${tableName}: ${error.message}`));
            } else {
                resolve(results.length > 0 ? results[0][columnName] : null);
            }
        });
    });
}

async function CreateColumnInTable(tableName) {
    const requiredColumns = ['counsel', 'prompt', 'createdAt', 'updatedAt'];
    const existingColumnsQuery = 'SHOW COLUMNS FROM ??';

    return new Promise((resolve, reject) => {
        db.query(existingColumnsQuery, [tableName], (error, results) => {
            if (error) return reject(error);

            const existingColumnNames = results.map(column => column.Field);
            const missingColumns = requiredColumns.filter(column => !existingColumnNames.includes(column));

            if (missingColumns.length === 0) return resolve();

            // Create missing columns
            let alterTableQueries = missingColumns.map(column => {
                if (column === 'prompt') return `ADD COLUMN ${column} TEXT`;
                if (column === 'counsel') return `ADD COLUMN ${column} TEXT`;
                if (column === 'createdAt' || column === 'updatedAt') {
                    return `ADD COLUMN ${column} DATETIME DEFAULT CURRENT_TIMESTAMP${column === 'updatedAt' ? ' ON UPDATE CURRENT_TIMESTAMP' : ''}`;
                }
            }).join(', ');

            const alterTableQuery = `ALTER TABLE ?? ${alterTableQueries}`;
            db.query(alterTableQuery, [tableName], (error) => {
                if (error) return reject(error);
                resolve();
            });
        });
    });
}

module.exports = {
    db_Query,
    dbQuery,
    getProvince,
    fcGetItemInTableDB,
    CreateColumnInTable
}