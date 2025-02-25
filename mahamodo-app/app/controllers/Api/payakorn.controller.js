// Assuming db.mysql.js exports a db or pool
const connection = require("../../config/db.mysql.js");
const db = require("../../helpers/db.js");
const Validation = require("../../helpers/validation.js");
const main = require("../../helpers/main.js");
const Support = require("../../helpers/Support");
const GraphMain = require("../../helpers/number_graph_main.js");
const aiGenerator = require("../../helpers/aiGenerator.js");

const moment = require("moment");
const { logger } = require("sequelize/lib/utils/logger");

const DreamPredict = async (req, res) => {
  // Run validation and handle any validation errors within the Validation.validation function
  const validationResult = Validation.validation(req, res);
  if (validationResult) {
    return; // Stop further execution if the response was already sent
  }

  const { dream } = req.body;

  try {
    const results = await db.dbQuery(
      `SELECT * FROM dream WHERE sdream like '%${dream}%'`
    );

    if (results.length > 0) {
      return res.status(200).send({
        status: 200,
        success: true,
        message: "Data retrieved successfully.",
        data: results,
      });
    } else {
      return res.status(200).send({
        status: 200,
        success: true,
        message: "Data retrieved successfully.",
        data: null,
      });
    }
  } catch (error) {
    console.error("Error in DreamPredict:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Failed to fetch data.",
      errors: {
        code: "ERROR",
        details: error.message,
      },
    });
  }
};

const SompudLuk = async (req, res) => {
  // Assume Validation.validation sends a response if there are errors and halts if not
  const validationResult = Validation.validation(req, res);
  if (validationResult) {
    return; // Stop further execution if the response was already sent
  }

  const {
    new_payakorn_status,
    get_payakorn_summary_born,
    get_payakorn_summary_today,
    lukborn,
    date_of_birth,
    time_of_birth,
    province,
    current_date,
    current_hour,
    current_minute,
  } = req.body;

  let CutTimeLocalYN = "Y";
  if (province) {
    const findProvince = await main.fcGetLukTimeLocalThailandThisProvValue(
      province
    );
  } else {
    province = "กรุงเทพมหานคร";
  }

  const [finalHour, finalMinute] = time_of_birth.split(":");

  const finalCurrentDate = current_date || moment().format("YYYY-MM-DD");
  const finalCurrentHour = current_hour || moment().format("HH");
  const finalCurrentMinute = current_minute || moment().format("mm");

  let SuriyatDate,
    TodaySuriyatDate,
    SompodStar,
    SompodStar10,
    SompodStarToday,
    SompodStarToday10;

  // ' รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
  if (new_payakorn_status) {
    const NewBirthDate = await Support.fcDateGlobal(date_of_birth);
    SuriyatDate = await main.CastHoroscope_SumSuriyatMain_Born(
      NewBirthDate,
      finalHour,
      finalMinute,
      CutTimeLocalYN,
      province
    );
    SompodStar = await rdiOptionSompodBorn_Ra_CheckedChanged(1, SuriyatDate);
    SompodStar10 = await rdiOptionSompodBorn_Ra_CheckedChanged(2, SuriyatDate);
  } else {
    try {
      SuriyatDate = JSON.parse(lukborn);

      try {
        SompodStar = await rdiOptionSompodBorn_Ra_CheckedChanged(
          1,
          SuriyatDate
        );
        SompodStar10 = await rdiOptionSompodBorn_Ra_CheckedChanged(
          2,
          SuriyatDate
        );
      } catch (asyncError) {
        console.error("Error in asynchronous operations:", asyncError);
      }
    } catch (jsonError) {
      console.error("Error parsing JSON:", jsonError);
    }
  }

  // ' รับค่าสมผุส จร (สมผุสดาววันนี้)
  if (finalCurrentDate) {
    const NewTodayDate = await Support.fcDateGlobal(finalCurrentDate);
    TodaySuriyatDate = await main.CastHoroscope_SumSuriyatMain_Today(
      NewTodayDate,
      finalCurrentHour,
      finalCurrentMinute
    );
    SompodStarToday = await rdiOptionSompodBorn_Ra_CheckedChanged(
      3,
      TodaySuriyatDate
    );
    SompodStarToday10 = await rdiOptionSompodBorn_Ra_CheckedChanged(
      4,
      TodaySuriyatDate
    );
  }

  let PayakornBorn,
    summaryPayakornBorn = null,
    PayakornToday,
    summaryPayakornToday = null;

  if (new_payakorn_status) {
    try {
      PayakornBorn = await main.PayakornBorn(SuriyatDate);
    } catch (error) {
      console.error("Error fetching PayakornBorn data:", error);
      return res.status(500).send({
        status: 500,
        success: false,
        message: "Error PayakornBorn",
        errors: {
          code: "ERROR",
          details: error.message,
        },
      });
    }

    try {
      summaryPayakornBorn = createSummaryPayakornBorn(PayakornBorn);
    } catch (error) {
      console.error("Error fetching createSummaryPayakornBorn data:", error);
      return res.status(500).send({
        status: 500,
        success: false,
        message: "Error generating PayakornBorn text using gptAiGenerator.",
        errors: {
          code: "ERROR",
          details: error.message,
        },
      });
    }

  } else {
    PayakornBorn = [];
  }

  try {
    PayakornToday = await main.PayakornToday(SuriyatDate, TodaySuriyatDate);
  } catch (error) {
    console.error("Error fetching PayakornToday data:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Error PayakornToday",
      errors: {
        code: "ERROR",
        details: error.message,
      },
    });
  }

  try {
    summaryPayakornToday = createSummaryPayakornToday(PayakornToday)
  } catch (error) {
    console.error("Error fetching createSummaryPayakornToday data:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Error generating PayakornToday text using gptAiGenerator.",
      errors: {
        code: "ERROR",
        details: error.message,
      },
    });
  }

  async function rdiOptionSompodBorn_Ra_CheckedChanged(option, SuriyatDate) {
    let SompodStarOnLabel;
    SompodStarOnLabel = await main.CastHoroscope_SompodStarOnLabel_Born_Today(
      option,
      SuriyatDate
    );
    return SompodStarOnLabel;
  }

  const astrologyInfo = {
    yearAgeInfo: SuriyatDate.yearAgeInfo,
    yourBirthday: SuriyatDate.yourBirthday,
    yourBirthdayDateUse: SuriyatDate.yourBirthdayDateUse,
    birthDateMoonInfo: SuriyatDate.birthDateMoonInfo,
    surisBirth: SuriyatDate.surisBirth,
    lblDaySBirthSuriyaKati: SuriyatDate.lblDaySBirthSuriyaKati,
    lukBornRasees: PayakornBorn.LukBornRasees,
  };

  const res_lukborn = {
    // astrologyInfo: astrologyInfo,
    suriyatDate: SuriyatDate,
    payakornBorn: PayakornBorn,
    summaryPayakornBorn: summaryPayakornBorn,
  };

  const res_today = {
    payakornToday: PayakornToday,
    summaryPayakornToday: summaryPayakornToday,
  };

  const starForThaiHoroscopeChart = {
    sompodStarBorn: SompodStar,
    sompodStarToday: SompodStarToday,
  };

  return res.status(200).send({
    status: 200,
    success: true,
    message: "success",
    data: {
      lukborn: res_lukborn,
      luktoday: res_today,
      starForThaiHoroscopeChart: starForThaiHoroscopeChart,
    },
  });
};

const graphlife = async (req, res) => {
  // Validate request
  if (Validation.validation(req, res)) {
    return; // Stop further execution if the response was already sent
  }

  const { date_of_birth, time_of_birth, province, get_payakorn_summary } =
    req.body;
  const CutTimeLocalYN = 1;
  const sProv = province;
  const [finalHour, finalMinute] = time_of_birth.split(":");

  try {
    // Get main graph number
    const Number_Graph_Main = await GraphMain.frmTamnai_Number_Graph_Main(
      date_of_birth,
      finalHour,
      finalMinute,
      CutTimeLocalYN,
      sProv
    );

    if (!Number_Graph_Main) {
      return res.status(422).send({
        status: 422,
        success: false,
        message: "Validation Error",
        error: {
          code: "DATE_OUT_OF_RANGE",
          details: "The provided date is out of the acceptable range.",
        },
      });
    }

    // Get payakorn graph number
    const Number_Graph_Payakorn =
      await GraphMain.frmTamnai_Number_Graph_Payakorn(
        Number_Graph_Main.NumFinish,
        Number_Graph_Main.yearAge
      );

    const graphs = {
      graphNumbe: Number_Graph_Main.NumFinish[0],
      graphText: Number_Graph_Main.NumFinish[2],
      graphLv: Number_Graph_Main.NumFinish[1],
      relationships: Number_Graph_Main.NumFinish[4],
    };

    const Payakorn = {
      numForAge: Number_Graph_Payakorn.NumForAgePayakorn,
      relations: Number_Graph_Payakorn.GraphRelations,
      graphLv: Number_Graph_Payakorn.GraphLv,
    };

    // Generate summary using AI
    let summaryPayakornGraph = createSummaryPayakornGraph(
      Number_Graph_Payakorn
    );

    // Send successful response
    return res.status(200).send({
      status: 200,
      message: "Success",
      success: true,
      data: {
        yourBirthday: Number_Graph_Main.yourBirthday,
        yourBirthdayDateUse: Number_Graph_Main.yourBirthdayDateUse,
        yearAge: Number_Graph_Main.yearAge,
        yearAgeInfo: Number_Graph_Main.yearAgeInfo,
        lblDaySBirthSuriyaKati: Number_Graph_Main.lblDaySBirthSuriyaKati,
        graphs,
        payakornGraphs: Payakorn,
        summaryPayakornGraph: summaryPayakornGraph,
      },
    });
  } catch (error) {
    console.error("Error processing graph life data:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal Server Error",
      error: {
        code: "SERVER_ERROR",
        details: error.message,
      },
    });
  }
};

const SompudLukMove = async (req, res) => {

  const zodiacMaster = [
    { key: 0, value: "เมษ" },
    { key: 1, value: "พฤษภ" },
    { key: 2, value: "เมถุน" },
    { key: 3, value: "กรกฎ" },
    { key: 4, value: "สิงห์" },
    { key: 5, value: "กันย์" },
    { key: 6, value: "ตุลย์" },
    { key: 7, value: "พิจิก" },
    { key: 8, value: "ธนู" },
    { key: 9, value: "มังกร" },
    { key: 10, value: "กุมภ์" },
    { key: 11, value: "มีน" }
  ];
  
  const lukNameMaster = [
    { key: 10, value: "ลัคนา" },
    { key: 1, value: "อาทิตย์" },
    { key: 2, value: "จันทร์" },
    { key: 3, value: "อังคาร" },
    { key: 4, value: "พุธ" },
    { key: 5, value: "พฤหัส" },
    { key: 6, value: "ศุกร์" },
    { key: 7, value: "เสาร์" },
    { key: 8, value: "ราหู" },
    { key: 9, value: "เกตุ" },
    { key: 0, value: "มฤตยู" }
  ];
  
const finalCurrentDate = moment().format("YYYY-MM-DD");
const finalCurrentHour = moment().format("HH");
const finalCurrentMinute = moment().format("mm");

const startOfDay = moment("2025-01-01 00:00", "YYYY-MM-DD HH:mm");
const endOfDay = startOfDay.clone().add(3650, "days"); // 30 วันจาก startOfDay

// set Star Index
let starIndex = 3;

let currentTime = startOfDay.clone();
let previousDate = startOfDay;

let lblStarStayName_Old, lblStarStayRNo_Old, lukIndex, lukIndexName, todaySuriyatDate = "";
let sompodStarToday;

while (currentTime <= endOfDay) {

  currentTime.add(1, "hour");

  const newTodayDate = await Support.fcDateGlobal(currentTime.format("YYYY-MM-DD"));

  try {

    todaySuriyatDate = await main.CastHoroscope_SumSuriyatMain_Today(
      newTodayDate,
      currentTime.format("HH"),
      currentTime.format("mm")
    );

    sompodStarToday = await getSompodStarToday(3, todaySuriyatDate);

  } catch (error) {
    console.error(`Error occurred on ${currentTime.format("YYYY-MM-DD HH:mm")}:`, error);
    continue;
  }

  if (sompodStarToday.lblStarStayRNo[starIndex] !== lblStarStayRNo_Old) {

    // อัปเดต previousDate ก่อนดำเนินการต่อ
    previousDate = currentTime.clone();

    const formattedPreviousDate = previousDate.format("YYYY-MM-DD HH:mm:ss");

    try {
      // let queryResult = await db.dbQuery(`SELECT * FROM star_move WHERE move_date='${formattedPreviousDate}'`);
      // if (queryResult.length === 0) {
        const tableName = "star_move";
        const data = {
          move_date: formattedPreviousDate, // Formatted date
          star_index: starIndex, // Star index
          star_name: sompodStarToday.TitleTable[starIndex], // Star name
          zodiac_index: sompodStarToday.lblStarStayRNo[starIndex], // Star index
          zodiac_name: zodiacMaster.find(
            (item) => item.key === sompodStarToday.lblStarStayRNo[starIndex]
          )?.value || "Unknown", // Star name
        };

        console.log(data);

        // await db.db_Insert(tableName, data)
        //   .then(result => {
        //     console.log("Insert successful:", result);
        //   })
        //   .catch(error => {
        //     console.error("Insert failed:", error.message);
        //   });
      // }
    } catch (error) {
      console.error("Error occurred:", error.message);
      break;
    }
    
  }

  // Update old values for the next loop iteration
  lblStarStayName_Old = zodiacMaster.find(
    (item) => item.key === sompodStarToday.lblStarStayRNo[starIndex]
  )?.value || "";

  lblStarStayRNo_Old = sompodStarToday.lblStarStayRNo[starIndex];

  lukIndex = lukNameMaster.find(
    (item) => item.value === sompodStarToday.TitleTable[starIndex]
  )?.key || "";

  lukIndexName = sompodStarToday.TitleTable[starIndex];
 
  console.log(`end.. ${currentTime.format("YYYY-MM-DD HH:mm")}:`);
}
  
  // Helper function for getting star data
  async function getSompodStarToday(option, suriyatDate) {
    return await main.CastHoroscope_SompodStarOnLabel_Born_Today(option, suriyatDate);
  }
  
  // Response
  return res.status(200).send({
    status: 200,
    success: true,
    message: "success",
    data: {
      finalCurrentDate,
      finalCurrentHour,
      finalCurrentMinute,
      lukIndex,
      lukIndexName,
      lblStarStayRNo_Old,
      lblStarStayName_Old
    }
  });
}

const createSummaryPayakornBorn = (PayakornBorn) => {
  const ascendantPredictionTitle = PayakornBorn.ascendantPrediction?.title || "";
  const ascendantPredictionPayakorn = PayakornBorn.ascendantPrediction?.payakorn || "";
  const ascendantPrediction = ascendantPredictionTitle +' '+ ascendantPredictionPayakorn;
  const ascendantPredictionGem =
    PayakornBorn.AscendantPredictionGem?.payakorn || "";
  const starStayPatani = Support.joinArray(
    PayakornBorn.StarStay_Patani?.payakorn
  );
  const starStayGumLuk = Support.joinArray(
    PayakornBorn.StarStay_GumLuk?.payakorn
  );
  const starAsTanuSED = PayakornBorn.starAsTanuSED?.payakorn || "";
  const starSame = Support.joinArray(PayakornBorn.starSame?.payakorn);
  const standardStarsDuangRasee = Support.joinArray(
    PayakornBorn.standardStarsDuangRasee?.payakorn
  );
  const standardStarsDuangNavang = Support.joinArray(
    PayakornBorn.standardStarsDuangNavang?.payakorn
  );
  const starKalakini = PayakornBorn.starKalakini?.payakorn || "";

  const starSummaries = PayakornBorn.starBornTamPop.starBornTamPopGroup
  .map(item => {
    if (!item.prediction) return null; // ข้ามรายการที่ prediction เป็น null
    const starLiveinPops = item.prediction?.starLiveinPops || "";
    const payakorn = item.prediction?.payakorn || "";
    return `${starLiveinPops} ${payakorn}`.trim();
  })
  .filter(Boolean); // ลบ null หรือ undefined ออกจากผลลัพธ์

  const starBornTamPop = `${PayakornBorn.starBornTamPop.title || ""}: ${starSummaries.join(", ") || ""}`;

  const starSummariesPops = PayakornBorn.housesStarPops.housesStarPopsGroup
  .map(item => {
    if (!item.prediction) return null; // ข้ามรายการที่ prediction เป็น null
    const astrological_Houses = item?.astrological_Houses || "";
    const housesStarPops_Sub = item?.housesStarPops_Sub || "";
    const kasedsInPops = item.prediction?.kasedsInPops || "";
    const payakorn = item.prediction?.payakorn || "";
    return `${astrological_Houses} ${housesStarPops_Sub} ${kasedsInPops} ${payakorn}`.trim();
  })
  .filter(Boolean); // ลบ null หรือ undefined ออกจากผลลัพธ์

  const housesStarPops = `${PayakornBorn.housesStarPops.title || ""}: ${starSummariesPops.join(", ") || ""}`;


  return `${ascendantPrediction ?? ''} ${ascendantPredictionGem?? ''} ${starStayGumLuk?? ''} ${starStayPatani?? ''} ${starAsTanuSED ?? ''} ${starSame?? ''} ${standardStarsDuangRasee ?? ''} ${standardStarsDuangNavang ?? ''} ${starKalakini ?? ''} ${starBornTamPop ?? ''} ${housesStarPops ?? ''}`;
};

const createSummaryPayakornToday = (PayakornToday) => {
  // Extract data
  const {
    wanderingStarNowTitle,
    wanderingStarNowSub,
    starAsInRaseeiAsStarSub,
    starAsInRaseeiAsStarGroup,
  } = PayakornToday;

  let concatenatedPredictions = "";

  if (starAsInRaseeiAsStarGroup && starAsInRaseeiAsStarGroup.length > 0) {
    for (let index = 0; index < starAsInRaseeiAsStarGroup.length; index++) {
      const predictions = starAsInRaseeiAsStarGroup[index].predictions;
      predictions.forEach(({ prediction, details, probabilityText }) => {
        if (prediction !== "") {
          concatenatedPredictions += `${details} ${prediction} ${probabilityText} `;
        }
      });
    }
  }

  // Create a summary string with all parts
  let summary = "";
  if (concatenatedPredictions) {
    summary = `
      ${wanderingStarNowTitle || ""}
      ${starAsInRaseeiAsStarSub || ""}
      ${concatenatedPredictions.trim() || ""}
    `
      .replace(/\s+/g, " ")
      .trim();
  }

  return summary;
};

const createSummaryPayakornGraph = (Number_Graph_Payakorn) => {
  // Extract NumForAgePayakorn data
  const { title, payakorn } = Number_Graph_Payakorn.NumForAgePayakorn;
  // Format GraphRelations data
  const graphRelations = Number_Graph_Payakorn.GraphRelations.map(
    (relation) => `${relation.details.description}`
  ).join(" ");

  // Format GraphLv data
  const graphLv = Number_Graph_Payakorn.GraphLv.map(
    (lv) => `${lv.fortune}, ${lv.details.description}`
  ).join(" ");

  // Create SummaryPayakornGraph
  const summaryPayakornGraph = `
    ${payakorn}
    ${graphRelations}
    ${graphLv}
  `;
  return summaryPayakornGraph.replace(/\s+/g, " ").trim();
};

exports.DreamPredict = DreamPredict;
exports.SompudLuk = SompudLuk;
exports.graphlife = graphlife;
exports.SompudLukMove = SompudLukMove;
