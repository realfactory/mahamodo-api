// Assuming db.mysql.js exports a db or pool
const connection = require("../../config/db.mysql.js");
const db = require("../../helpers/db.js");
const moment = require("moment");

// Function to retrieve table names from the database
function fetchValidTables(callback) {
  connection.query("SHOW TABLES", (error, results) => {
    if (error) {
      console.error(`Error fetching table names: ${error.message}`);
      callback(error, null);
    } else {
      const tables = results.map((row) => Object.values(row)[0]);
      callback(null, tables);
    }
  });
}

const findDataInTable = (req, res) => {
  const { table, id } = req.params;

  fetchValidTables((err, validTables) => {
    if (err) {
      return res.status(500).send({
        status: 500,
        success: false,
        message: "Failed to retrieve table names",
        errors: {
          code: "TABLE_NAME_ERROR",
          details: `Error retrieving valid table names: ${err.message}`,
        },
      });
    }

    if (!validTables.includes(table)) {
      return res.status(422).send({
        status: 422,
        success: false,
        message: "Invalid table name provided.",
        errors: {
          code: "INVALID_TABLE_NAME",
          details: "The provided table name is not valid.",
        },
      });
    }

    let query = "";
    if (id) {
      query = `SELECT * FROM ?? WHERE id = ?`;
      connection.query(query, [table, id], (error, results) => {
        if (error) {
          console.error(`Error occurred: ${error.message}`);
          return res.status(500).send({
            status: 500,
            success: false,
            message: "Failed to retrieve data",
            errors: {
              code: "DATA_RETRIEVAL_ERROR",
              details: `Failed to retrieve data for ID ${id} in table ${table}: ${error.message}`,
            },
          });
        }
        res.status(200).send({
          status: 200,
          success: true,
          message: "Data retrieval successful.",
          data: results,
        });
      });
    } else {
      query = `SELECT * FROM ??`;
      connection.query(query, [table], (error, results) => {
        if (error) {
          console.error(`Error occurred: ${error.message}`);
          return res.status(500).send({
            status: 500,
            success: false,
            message: "Failed to retrieve data",
            errors: {
              code: "DATA_RETRIEVAL_ERROR",
              details: `Error retrieving data from table '${table}': ${error.message}`,
            },
          });
        }
        res.status(200).send({
          status: 200,
          success: true,
          message: "Data retrieval successful.",
          data: results,
        });
      });
    }
  });
};

const updateDataInTable = async (req, res) => {

  const { tableName, id, counsel, prompt } = req.body;

  if (!id || !tableName) {
    return res.status(422).send({
      status: 422,
      success: false,
      message: "Missing 'id' or 'tableName' for update.",
      error: {
        code: "MISSING_PARAMETERS",
        details:
          "Either 'id' or 'tableName' is missing for the update operation.",
      },
    });
  }

  fetchValidTables((err, validTables) => {
    if (err) {
      return res.status(500).send({
        status: 500,
        success: false,
        message: "Failed to retrieve table names",
        error: {
          code: "TABLE_NAME_ERROR",
          details: `Error retrieving valid table names: ${err.message}`,
        },
      });
    }

    if (!validTables.includes(tableName)) {
      return res.status(422).send({
        status: 422,
        success: false,
        message: "Invalid table name provided.",
        error: {
          code: "INVALID_TABLE_NAME",
          details: "The provided table name is not valid.",
        },
      });
    }

    // Ensure necessary columns exist before updating
    db.CreateColumnInTable(tableName)
      .then(() => {
        let updateQuery =
          "UPDATE ?? SET counsel = ?, prompt = ?, updatedAt = NOW() WHERE id = ?";
        connection.query(
          updateQuery,
          [tableName, counsel, prompt, id],
          (error, results) => {
            if (error) {
              console.error(`Error occurred: ${error.message}`);
              return res.status(500).send({
                status: 500,
                success: false,
                message: "",
                error: {
                  code: "INVALID_TABLE_NAME",
                  details: `Error updating data in ${tableName}: ${error.message}`,
                },
              });
            }

            if (results.affectedRows === 0) {
              return res.status(404).send({
                status: 404,
                success: false,
                message: "Record not found.",
                error: {
                  code: "RECORD_NOT_FOUND",
                  details: `No record found with ID '${id}' in table '${tableName}'.`,
                },
              });
            }

            // Fetch and return the updated data
            let selectQuery = "SELECT * FROM ?? WHERE id = ?";
            connection.query(selectQuery, [tableName, id], (error, results) => {
              if (error) {
                console.error(`Error occurred: ${error.message}`);
                return res.status(500).send({
                  status: 500,
                  success: false,
                  message: "Failed to fetch updated data.",
                  errors: {
                    code: "DATA_FETCH_ERROR",
                    details: `Error fetching updated data from table '${tableName}' with ID '${id}': ${error.message}`,
                  },
                });
              }

              res.status(200).send({
                status: 200,
                success: true,
                message: "Data updated successfully.",
                data: results[0], // Assuming 'id' is unique
              });
            });
          }
        );
      })
      .catch((error) => {
        console.error(`Error ensuring columns: ${error.message}`);
        return res.status(500).send({
          status: 500,
          message: `Failed to ensure columns in ${tableName}: ${error.message}`,
        });
      });
  });
};

exports.findDataInTable = findDataInTable;
exports.updateDataInTable = updateDataInTable;
