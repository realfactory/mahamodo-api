// Assuming db.mysql.js exports a db or pool
const dbConfig = require('../../config/db.config.js');
const db = require('../../config/db.mysql.js');
const fc_db = require('../../helpers/db.js');
const Validation = require('../../helpers/validation.js');
const main = require('../../helpers/main.js');
const Support = require('../../helpers/Support');
const moment = require('moment');

// Function to retrieve table names from the database
function fetchValidTables(callback) {
    db.query("SHOW TABLES", (error, results) => {
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
            db.query(query, [table, id], (error, results) => {
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
            db.query(query, [table], (error, results) => {
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
        fc_db.CreateColumnInTable(tableName).then(() => {
            let updateQuery = 'UPDATE ?? SET counsel = ?, prompt = ?, updatedAt = NOW() WHERE id = ?';
            db.query(updateQuery, [tableName, counsel, prompt, id], (error, results) => {
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
                db.query(selectQuery, [tableName, id], (error, results) => {
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
        const results = await fc_db.dbQuery(`SELECT * FROM dream WHERE sdream like '%${dream}%'`);

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

    const {
        birth_day,
        birth_hour,
        birth_minute,
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

    const finalHour = birth_hour || 6;
    const finalMinute = birth_minute || 30;

    const finalCurrentDate = current_date || moment().format('YYYY-MM-DD');
    const finalCurrentHour = current_hour || moment().format('HH');
    const finalCurrentMinute = current_minute || moment().format('mm');

    let now = new Date(finalCurrentDate);
    // let currentDate = now.toISOString().split('T')[0];
    // let currentDate = new Intl.DateTimeFormat('en-CA', { // 'en-CA' uses YYYY-MM-DD format by default
    //     year: 'numeric',
    //     month: '2-digit',
    //     day: '2-digit',
    //     timeZone: 'Asia/Bangkok'
    // }).format(now);

    let SuriyatDate, TodaySuriyatDate, SompodStar, SompodStar10, SompodStarToday, SompodStarToday10;

    // ' รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
    if (birth_day) {
        const NewBirthDate = await Support.fcDateGlobal(birth_day);
        SuriyatDate = await main.CastHoroscope_SumSuriyatMain_Born(NewBirthDate, finalHour, finalMinute, CutTimeLocalYN, province);
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

    let Pakakorn = await main.PakakornSompod(SuriyatDate, TodaySuriyatDate);

    async function rdiOptionSompodBorn_Ra_CheckedChanged(option, SuriyatDate) {
        let SompodStarOnLabel;
        SompodStarOnLabel = await main.CastHoroscope_SompodStarOnLabel_Born_Today(option, SuriyatDate);
        return SompodStarOnLabel;
    }

    return res.status(200).send({
        status: 200,
        message: "",
        finalCurrentDate,
        finalCurrentHour,
        finalCurrentMinute,
        MappingProvince: MappingProvince,

        Somphusadao_birth: SompodStar,
        Somphusadao_birth_10: SompodStar10,
        Somphusadao_Today: SompodStarToday,
        Somphusadao_Today_10: SompodStarToday10,
        varBornLuk_PopsChars: Pakakorn.varBornLuk_PopsChars,

        varBornLuk_OwnerHousePopSS: Pakakorn.varBornLuk_OwnerHousePopSS,
        varBornLuk_KasediInPopistr: Pakakorn.varBornLuk_KasediInPopistr,

        AscendantPrediction_Title : Pakakorn.AscendantPrediction_Title,
        AscendantPrediction_Sub: Pakakorn.AscendantPrediction_Sub,
        AscendantPrediction_Desc: Pakakorn.AscendantPrediction_Desc,
        AscendantPredictionGem_Title: Pakakorn.AscendantPredictionGem_Title,
        AscendantPredictionGem_Desc: Pakakorn.AscendantPredictionGem_Desc,
        
        StarStay_GumLuk: Pakakorn.StarStay_GumLuk,
        StarStay_Patani: Pakakorn.StarStay_Patani,

        StarAsTanuSED_Title: Pakakorn.StarAsTanuSED_Title,
        StarAsTanuSED_Sub: Pakakorn.StarAsTanuSED_Sub,
        StarAsTanuSED_Desc: Pakakorn.StarAsTanuSED_Desc,

        Star_Same_Title: Pakakorn.Star_Same_Title,
        Star_Same_Sub: Pakakorn.Star_Same_Sub,
        Star_Same_Desc: Pakakorn.Star_Same_Desc,

        Standard_Stars_DuangRasee_Title: Pakakorn.Standard_Stars_DuangRasee_Title,
        Standard_Stars_DuangRasee_Sub: Pakakorn.Standard_Stars_DuangRasee_Sub,
        Standard_Stars_DuangRasee_Desc: Pakakorn.Standard_Stars_DuangRasee_Desc,

        Standard_Stars_DuangNavang_Sub: Pakakorn.Standard_Stars_DuangNavang_Sub,
        Standard_Stars_DuangNavang_Title: Pakakorn.Standard_Stars_DuangNavang_Title,
        Standard_Stars_DuangNavang_Desc: Pakakorn.Standard_Stars_DuangNavang_Desc,

        Star_Kalakini_Title: Pakakorn.Star_Kalakini_Title,
        Star_Kalakini_Sub: Pakakorn.Star_Kalakini_Sub,
        Star_Kalakini_Desc: Pakakorn.Star_Kalakini_Desc,

        Star_Born_TamPop_Title: Pakakorn.Star_Born_TamPop_Title, //คำทำนายพื้นดวงกำเนิด ตามดาวที่อยู่ในภพต่างๆ
        Star_Born_TamPop_Sub: Pakakorn.Star_Born_TamPop_Sub,
        Star_Born_TamPop_Desc: Pakakorn.Star_Born_TamPop_Desc,

        House_Star_Pops_Title: Pakakorn.House_Star_Pops_Title, //คำทำนายพื้นดวงกำเนิด ตามดาวเจ้าเรือนอยู่ในภพต่างๆ (ภพผสมภพ)
        House_Star_Pops_Sub: Pakakorn.House_Star_Pops_Sub,
        House_Star_Pops_Desc: Pakakorn.House_Star_Pops_Desc,

        Wandering_Star_Now_Title: Pakakorn.Wandering_Star_Now_Title, //คำทำนายเหตุการณ์ปัจจุบัน (ดาวจร)
        Wandering_Star_Now_Sub: Pakakorn.Wandering_Star_Now_Sub,
        StarAsInRaseeiAsStar_Sub: Pakakorn.StarAsInRaseeiAsStar_Sub,
        StarAsInRaseeiAsStar_Desc: Pakakorn.StarAsInRaseeiAsStar_Desc,
        StarAsInRaseeiAsStar_Move: Pakakorn.StarAsInRaseeiAsStar_Move,
        StarAsInRaseeiAsStar_Percent: Pakakorn.StarAsInRaseeiAsStar_Percent,
    });

};

exports.findDataInTable = findDataInTable;
exports.updateDataInTable = updateDataInTable;
exports.DreamPredict = DreamPredict;
exports.SompudLuk = SompudLuk;