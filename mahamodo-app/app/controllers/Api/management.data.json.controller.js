const fs = require("fs").promises;
const path = require("path");
const moment = require('moment');

/**
 * Function to fetch data from a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Promise<object>} - Parsed JSON data.
 */
async function fetchDataFromJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading or parsing file: ${error.message}`);
    throw error;
  }
}

/**
 * Controller function to get specific data in the JSON file and respond.
 * @param {object} req - Request object.
 * @param {object} res - Response object.
 */
const finDataJsonGraphLife = async (req, res) => {
  const { key, subKey, id } = req.query;
  const jsonFilePath = path.join(
    __dirname,
    "../../json/GraphLifePayakorn.json"
  );

  try {
    const dataJson = await fetchDataFromJSON(jsonFilePath);

    let result = dataJson;

    if (key && result[key]) {
      result = result[key];
      if (subKey && result[subKey]) {
        result = result[subKey];
        if (id && result[id]) {
          result = result[id];
        }
      }
    }

    if (
      (key && !dataJson[key]) ||
      (subKey && !dataJson[key]?.[subKey]) ||
      (id && !dataJson[key]?.[subKey]?.[id])
    ) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Data not found.",
        error: {
          code: "NOT_FOUND",
          details:
            "The specified key, subKey, or ID was not found in the JSON structure.",
        },
      });
    }

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Data retrieval successful.",
      data: result,
    });
  } catch (error) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Failed to fetch data.",
      error: {
        code: "ERROR",
        details: error.message,
      },
    });
  }
};

/**
 * Function to fetch data from a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Promise<object>} - Parsed JSON data.
 */
async function fetchDataFromJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading or parsing file: ${error.message}`);
    throw error;
  }
}

/**
 * Function to update a specific entry in the JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @param {string} key - The main key under which the data is stored.
 * @param {string} subKey - The secondary key under the main key.
 * @param {object} newData - The new data to update.
 * @param {string} [id] - The ID or range key of the entry to update (optional).
 * @returns {Promise<object>} - Updated JSON data.
 */
async function updateJsonData(filePath, key, subKey, newData, id = null) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    const jsonData = JSON.parse(data);
    const timestamp = moment().format("YYYY-MM-DD HH:mm:ss");

    if (id) {
      if (jsonData[key] && jsonData[key][subKey] && jsonData[key][subKey][id]) {
        jsonData[key][subKey][id] = {
          ...jsonData[key][subKey][id],
          ...newData,
          updated_at: timestamp,
        };
        console.log("Data found and updated for key, subKey, and id.");
      } else {
        console.error("Key, subKey, or ID not found in JSON structure");
        throw new Error("Key, subKey, or ID not found in JSON structure");
      }
    } else {
      if (jsonData[key] && jsonData[key][subKey]) {
        jsonData[key][subKey] = {
          ...jsonData[key][subKey],
          ...newData,
          updated_at: timestamp,
        };
        console.log("Data found and updated for key and subKey.");
      } else {
        console.error("Key or subKey not found in JSON structure");
        throw new Error("Key or subKey not found in JSON structure");
      }
    }

    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), "utf8");
    console.log(
      `Data updated successfully for key: ${key}, subKey: ${subKey}${
        id ? `, id: ${id}` : ""
      }`
    );
    return id ? jsonData[key][subKey][id] : jsonData[key][subKey];
  } catch (error) {
    console.error(`Error updating data: ${error.message}`);
    throw error;
  }
}

/**
 * Controller function to update data in the JSON file and respond.
 * @param {object} req - Request object.
 * @param {object} res - Response object.
 */
const updateDataInJsonGraphLife = async (req, res) => {
  const { key, subKey, id, payakorn, counsel, prompt, desc } = req.body;
  const jsonFilePath = path.join(
    __dirname,
    "../../json/GraphLifePayakorn.json"
  );

  const newData = {
    payakorn: payakorn ?? null,
    counsel: counsel ?? null,
    prompt: prompt ?? null,
    desc: desc ?? null,
  };

  try {
    const updatedData = await updateJsonData(
      jsonFilePath,
      key,
      subKey,
      newData,
      id
    );

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Update data success",
      data: updatedData,
    });
  } catch (error) {
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Failed to update data",
      error: {
        code: "ERROR",
        details: error.message,
      },
    });
  }
};

module.exports = {
  finDataJsonGraphLife,
  updateDataInJsonGraphLife,
};
