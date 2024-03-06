// Assuming db.mysql.js exports a connection or pool
const connection = require('../config/db.mysql.js');

// Function to retrieve table names from the database
function fetchValidTables(callback) {
    connection.query("SHOW TABLES", (error, results) => {
        if (error) {
            console.error(`Error fetching table names: ${error.message}`);
            callback(error, null);
        } else {
            const tables = results.map(row => Object.values(row)[0]);
            callback(null, tables);
        }
    });
}

exports.findAll = (req, res) => {
    const {
        table,
        id
    } = req.params;

    fetchValidTables((err, validTables) => {
        if (err) {
            return res.status(500).send({
                message: `Error retrieving valid table names: ${err.message}`
            });
        }

        if (!validTables.includes(table)) {
            return res.status(400).send({
                message: 'Invalid table name provided.'
            });
        }

        let query = '';
        if (id) {
            query = `SELECT * FROM ?? WHERE id = ?`;
            connection.query(query, [table, id], (error, results) => {
                if (error) {
                    console.error(`Error occurred: ${error.message}`);
                    return res.status(500).send({
                        message: `Error retrieving data for ID ${id} in table ${table}: ${error.message}`
                    });
                }
                res.send(results);
            });
        } else {
            query = `SELECT * FROM ??`;
            connection.query(query, [table], (error, results) => {
                if (error) {
                    console.error(`Error occurred: ${error.message}`);
                    return res.status(500).send({
                        message: `Error retrieving data from table ${table}: ${error.message}`
                    });
                }
                res.send(results);
            });
        }
    });
};

exports.update = (req, res) => {
    const {
        tableName,
        id,
        counsel,
        prompt
    } = req.body;

    if (!id || !tableName) {
        return res.status(400).send({
            message: 'Missing id or tableName for update.'
        });
    }

    fetchValidTables((err, validTables) => {
        if (err) {
            return res.status(500).send({
                message: `Error retrieving valid table names: ${err.message}`
            });
        }

        if (!validTables.includes(tableName)) {
            return res.status(400).send({
                message: 'Invalid table name provided.'
            });
        }
        
        let updateQuery = 'UPDATE ?? SET counsel = ?, prompt = ?, updatedAt = NOW() WHERE id = ?';
        connection.query(updateQuery, [tableName, counsel, prompt, id], (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                return res.status(500).send({
                    message: `Error updating data in ${tableName}: ${error.message}`
                });
            }

            if (results.affectedRows === 0) {
                return res.status(404).send({
                    message: `No record found with ID ${id} in ${tableName}.`
                });
            }

            // Fetch and return the updated data
            let selectQuery = 'SELECT * FROM ?? WHERE id = ?';
            connection.query(selectQuery, [tableName, id], (error, results) => {
                if (error) {
                    console.error(`Error occurred: ${error.message}`);
                    return res.status(500).send({
                        message: `Error fetching updated data from ${tableName} with ID ${id}: ${error.message}`
                    });
                }

                res.send({
                    message: 'Data updated successfully.',
                    data: results[0] // Assuming 'id' is unique, results[0] should be the updated record
                });
            });
        });
    });
};
