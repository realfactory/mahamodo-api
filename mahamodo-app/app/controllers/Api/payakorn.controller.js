// Assuming db.mysql.js exports a db or pool
const connection = require('../../config/db.mysql.js');
const db = require('../../helpers/db.js');
const Validation = require('../../helpers/validation.js');
const main = require('../../helpers/main.js');
const Support = require('../../helpers/Support');
const GraphMain = require('../../helpers/number_graph_main.js');

const moment = require('moment');

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

const findDataInTable = (req, res) => {
    const {
        table,
        id
    } = req.params;

    fetchValidTables((err, validTables) => {
        if (err) {
            return res.status(500).send({
                status: 500,
                message: `Error retrieving valid table names: ${err.message}`
            });
        }

        if (!validTables.includes(table)) {
            return res.status(400).send({
                status: 400,
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
                        status: 500,
                        message: `Error retrieving data for ID ${id} in table ${table}: ${error.message}`
                    });
                }
                res.status(200).send({
                    status: 200,
                    message: results,
                });
            });
        } else {
            query = `SELECT * FROM ??`;
            connection.query(query, [table], (error, results) => {
                if (error) {
                    console.error(`Error occurred: ${error.message}`);
                    return res.status(500).send({
                        status: 500,
                        message: `Error retrieving data from table ${table}: ${error.message}`
                    });
                }
                res.status(200).send({
                    status: 200,
                    message: results,
                });
            });
        }
    });
};

const updateDataInTable = async (req, res) => {
    const {
        tableName,
        id,
        counsel,
        prompt
    } = req.body;

    if (!id || !tableName) {
        return res.status(400).send({
            status: 400,
            message: 'Missing id or tableName for update.'
        });
    }

    fetchValidTables((err, validTables) => {
        if (err) {
            return res.status(500).send({
                status: 500,
                message: `Error retrieving valid table names: ${err.message}`
            });
        }

        if (!validTables.includes(tableName)) {
            return res.status(400).send({
                status: 400,
                message: 'Invalid table name provided.'
            });
        }

        // Ensure necessary columns exist before updating
        db.CreateColumnInTable(tableName).then(() => {
            let updateQuery = 'UPDATE ?? SET counsel = ?, prompt = ?, updatedAt = NOW() WHERE id = ?';
            connection.query(updateQuery, [tableName, counsel, prompt, id], (error, results) => {
                if (error) {
                    console.error(`Error occurred: ${error.message}`);
                    return res.status(500).send({
                        status: 500,
                        message: `Error updating data in ${tableName}: ${error.message}`
                    });
                }

                if (results.affectedRows === 0) {
                    return res.status(404).send({
                        status: 404,
                        message: `No record found with ID ${id} in ${tableName}.`
                    });
                }

                // Fetch and return the updated data
                let selectQuery = 'SELECT * FROM ?? WHERE id = ?';
                connection.query(selectQuery, [tableName, id], (error, results) => {
                    if (error) {
                        console.error(`Error occurred: ${error.message}`);
                        return res.status(500).send({
                            status: 500,
                            message: `Error fetching updated data from ${tableName} with ID ${id}: ${error.message}`
                        });
                    }

                    res.status(200).send({
                        status: 200,
                        message: 'Data updated successfully.',
                        data: results[0] // Assuming 'id' is unique
                    });
                });
            });
        }).catch(error => {
            console.error(`Error ensuring columns: ${error.message}`);
            return res.status(500).send({
                status: 500,
                message: `Failed to ensure columns in ${tableName}: ${error.message}`
            });
        });
    });
};

const DreamPredict = async (req, res) => {
    // Run validation and handle any validation errors within the Validation.validation function
    const validationResult = Validation.validation(req, res);
    if (validationResult) {
        return; // Stop further execution if the response was already sent
    }

    const {
        dream
    } = req.body;

    try {
        const results = await db.dbQuery(`SELECT * FROM dream WHERE sdream like '%${dream}%'`);

        if (results.length > 0) {
            return res.status(200).send({
                status: 200,
                message: "Data retrieved successfully.",
                data: results
            });
        } else {
            return res.status(200).send({
                status: 200,
                message: "No data found matching the criteria.",
                data: []
            });
        }

    } catch (error) {
        console.error('Error in DreamPredict:', error);
        return res.status(500).send({
            status: 500,
            message: "Internal server error. Please try again later."
        });
    }
};

const SompudLuk = async (req, res, next) => {

    // Assume Validation.validation sends a response if there are errors and halts if not
    const validationResult = Validation.validation(req, res);
    if (validationResult) {
        return; // Stop further execution if the response was already sent
    }

    /* ############## format date Input ###################### 
        
        "date_of_birth": "1993-01-10",
        "time_of_birth": "10:30",
        "province" : "กระบี่",
        "unknow_time_of_birth" : 1
        "new_payakorn_status" : 1 or 0;

        ############## format date Input ###################### 
    */

    const {
        new_payakorn_status,
        lukborn,
        date_of_birth,
        time_of_birth,
        province,
        current_date,
        current_hour,
        current_minute
    } = req.body;

    let CutTimeLocalYN = "Y";
    let MappingProvince = "";
    if (province) {
        const findProvince = await main.fcGetLukTimeLocalThailandThisProvValue(province);
        if (findProvince.length > 0) {
            MappingProvince = "Y";
        } else {
            MappingProvince = "N";
        }
    } else {
        province = "Not provided";
    }

    const [finalHour, finalMinute] = time_of_birth.split(':');

    const finalCurrentDate = current_date || moment().format('YYYY-MM-DD');
    const finalCurrentHour = current_hour || moment().format('HH');
    const finalCurrentMinute = current_minute || moment().format('mm');

    let SuriyatDate, TodaySuriyatDate, SompodStar, SompodStar10, SompodStarToday, SompodStarToday10;

    // ' รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
    if (new_payakorn_status) {
        console.log("new Payakorn Born");
        const NewBirthDate = await Support.fcDateGlobal(date_of_birth);
        SuriyatDate = await main.CastHoroscope_SumSuriyatMain_Born(NewBirthDate, finalHour, finalMinute, CutTimeLocalYN, province);
        SompodStar = await rdiOptionSompodBorn_Ra_CheckedChanged(1, SuriyatDate);
        SompodStar10 = await rdiOptionSompodBorn_Ra_CheckedChanged(2, SuriyatDate);
    } else {
        console.log("Old Payakorn Born");
        // const jsonObject = JSON.parse(lukborn);
        // const cleanedString = jsonObject.replace(/\\/g, '');
        SuriyatDate = JSON.parse(lukborn);
        SompodStar = await rdiOptionSompodBorn_Ra_CheckedChanged(1, SuriyatDate);
        SompodStar10 = await rdiOptionSompodBorn_Ra_CheckedChanged(2, SuriyatDate);
    }

    // ' รับค่าสมผุส จร (สมผุสดาววันนี้)
    if (finalCurrentDate) {
        const NewTodayDate = await Support.fcDateGlobal(finalCurrentDate);
        TodaySuriyatDate = await main.CastHoroscope_SumSuriyatMain_Today(NewTodayDate, finalCurrentHour, finalCurrentMinute);
        SompodStarToday = await rdiOptionSompodBorn_Ra_CheckedChanged(3, TodaySuriyatDate);
        SompodStarToday10 = await rdiOptionSompodBorn_Ra_CheckedChanged(4, TodaySuriyatDate);
    }

    let Payakorn, PayakornBorn, PayakornToday;
    //  Payakorn = await main.PakakornSompod(SuriyatDate, TodaySuriyatDate);
    if (new_payakorn_status) {
        PayakornBorn = await main.PayakornBorn(SuriyatDate);
    } else {
        PayakornBorn = [];
    }
    PayakornToday = await main.PayakornToday(SuriyatDate, TodaySuriyatDate);

    async function rdiOptionSompodBorn_Ra_CheckedChanged(option, SuriyatDate) {
        let SompodStarOnLabel;
        SompodStarOnLabel = await main.CastHoroscope_SompodStarOnLabel_Born_Today(option, SuriyatDate);
        return SompodStarOnLabel;
    }

    const astrologyInfo = {
        YearAgeInfo: SuriyatDate.YearAgeInfo,
        YourBirthday: SuriyatDate.YourBirthday,
        YourBirthdayDateUse: SuriyatDate.YourBirthdayDateUse,
        birthDateMoonInfo: SuriyatDate.birthDateMoonInfo,
        SurisBirth: SuriyatDate.SurisBirth,
        lblDaySBirthSuriyaKati: SuriyatDate.lblDaySBirthSuriyaKati,
        LukBornRasees: PayakornBorn.LukBornRasees,
        // dayMooni : SuriyatDate.dayMooni,
        // daySuni : SuriyatDate.daySuni,
    }

    const res_lukborn = {
        astrologyInfo: astrologyInfo,
        SuriyatDate: SuriyatDate,
        PayakornBorn: PayakornBorn,
    };

    const res_today = {
        PayakornToday: PayakornToday
    }

    const StartforThaiHoroscopeChart = {
        SompodStarBorn: SompodStar,
        SompodStarToday: SompodStarToday,
    }

    return res.status(200).send({
        status: 200,
        message: "success",
        data: {
            lukborn: res_lukborn,
            luktoday: res_today,
            StartforThaiHoroscopeChart: StartforThaiHoroscopeChart,
        }
    });

};

const graphlife = async (req, res) => {

    const {
        birth_day,
        birth_hour,
        birth_minute,
        province,
    } = req.body;

    let CutTimeLocalYN = 1;
    let sProv = province;
    const Number_Graph_Main = GraphMain.frmTamnai_Number_Graph_Main(birth_day, birth_hour, birth_minute, CutTimeLocalYN, sProv);

    return res.status(200).send({
        status: 200,
        message: "",
    });

}

exports.findDataInTable = findDataInTable;
exports.updateDataInTable = updateDataInTable;
exports.DreamPredict = DreamPredict;
exports.SompudLuk = SompudLuk;
exports.graphlife = graphlife;