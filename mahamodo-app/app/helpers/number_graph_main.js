const connection = require("../config/db.mysql.js");
const calendar = require("./calendarAstronomy.js");
const db = require("./db.js");
const Support = require("./Support.js");
const parameter = require("./parameter.js");
const helpers = require("./helpers.js");
const main = require("./main.js");

async function frmTamnai_Number_Graph_Main(
  birthDate,
  Hour,
  min,
  CutTimeLocalYN,
  sProv
) {
  let lblDaySBirthSuriyaKati,
    yearAgeInfo,
    Day1To8Born,
    yourBirthday,
    yourBirthdayDateUse,
    SurisBirth;

  let fcGetItemInTableDB = "ใช่";
  let SetMonth5To1YN = "ไม่ใช่";
  let YearOldiBorn = "";
  let MonthOldiBorn = "";

  if (birthDate) {
    const NewBirthDate = await Support.fcDateGlobal(birthDate);
    const LunarDay = await main.calculateLunarDay(
      NewBirthDate,
      Hour,
      min,
      CutTimeLocalYN,
      sProv
    );

    const lblDayBirth = Support.fcDayi17ToS(LunarDay.daySuni);
    const getMoonBirth = await main.SetUpDownMThaiMoon(
      NewBirthDate,
      lblDayBirth.dayMooni,
      lblDayBirth.daySuni
    );

    if (!getMoonBirth.DownUps) {
      return false;
    }

    const birthTimeInfo = await main.adjustBirthTime(
      NewBirthDate,
      Hour,
      min,
      CutTimeLocalYN,
      sProv
    );

    yearAge = await helpers.calculateAges(NewBirthDate);
    yearAgeInfo = await helpers.formatTimeDifference(NewBirthDate, Hour, min);
    yourBirthday = birthTimeInfo.formattedDate;
    yourBirthdayDateUse = birthTimeInfo.dateUse;
    SurisBirth = lblDayBirth.replace("(กลางวัน)", "").replace("(กลางคืน)", "");
    lblDaySBirthSuriyaKati = "สุริยคติ: " + SurisBirth;

    if (fcGetItemInTableDB === "ใช่") {
      Day1To8Born = LunarDay.dayMooni;
    } else {
      Day1To8Born = LunarDay.daySuni;
    }

    MonthOldiBorn = getMoonBirth.MThai;
    YearOldiBorn = getMoonBirth.YThai;
  }

  let ii = 0;
  let DayBorn1To7Test = Day1To8Born === 8 ? 4 : Day1To8Born;
  let TD = [];

  for (let ii = 0; ii < 7; ii++) {
    TD[ii] = (DayBorn1To7Test + ii) % 7;
    if (TD[ii] === 0) TD[ii] = 7;
  }

  ii = 0;
  let fnMonths;

  if (SetMonth5To1YN == "ใช่") {
    if (MonthOldiBorn == 88) {
      fnMonths = await Month88_System5To1();
    } else {
      fnMonths = await MonthNormal_System5To1(MonthOldiBorn);
    }
  } else {
    if (MonthOldiBorn == 88) {
      fnMonths = await Month88();
    } else {
      fnMonths = await MonthNormal(MonthOldiBorn);
    }
  }

  const TM = fnMonths.TM;

  ii = 0;
  const TY = [];
  for (let i = 0; i < 12; i++) {
    ii++;
    let TYValue = YearOldiBorn + i;

    if (TYValue >= 13) {
      TYValue -= 12;
    }
    TY[ii - 1] = TYValue;
  }

  ii = 0;
  const TFinish = [];
  for (let ii = 0; ii < 12; ii++) {
    // Ensure TD, TM, TY values exist and are numbers
    let day = TD[ii];
    let month = TM[ii];
    let year = TY[ii];

    // Calculate TFinish for each index
    TFinish[ii] = day + month + year;

    if (TFinish[ii] >= 13) {
      TFinish[ii] -= 12;
      if (TFinish[ii] >= 13) {
        TFinish[ii] -= 12;
      }
    }

    // For the last 4 values, only use TM and TY
    if (ii >= 7) {
      TFinish[ii] = month + year;
      if (TFinish[ii] >= 13) {
        TFinish[ii] -= 12;
        if (TFinish[ii] >= 13) {
          TFinish[ii] -= 12;
        }
      }
    }
    // Output the result
    // console.log(`TFinish[${ii}] = ${TFinish[ii]}`);
  }

  const NumFinish = [[], [], [], [], []];
  let j = 0;
  for (let ii = 0; ii < 12; ii++) {
    j = j + 1;
    NumFinish[0].push(j); // index
    NumFinish[1].push(TFinish[ii]); // เลขสำเร็จ
    NumFinish[2].push(await Support.fcLifeToS(j)); // วิถีชีวิต
    NumFinish[3].push(""); // Initialize คู่เลขสัมพันธ์ as empty
    NumFinish[4].push(""); // Initialize new sub-array for unique values
    // console.log(`id = ${j} // เลขสำเร็จ= ${TFinish[ii]} // วิถีชีวิต = ${await Support.fcLifeToS(j)}`);
  }

  // Build คู่เลขสัมพันธ์
  for (let j = 1; j <= 12; j++) {
    let relatedLifePaths = [];
    // Loop through NumFinish to find matching เลขสำเร็จ
    for (let i = 0; i < NumFinish[0].length; i++) {
      if (NumFinish[1][i] === j) {
        relatedLifePaths.push(await Support.fcLifeToN(NumFinish[2][i]));
      }
    }

    // Concatenate the values and remove duplicates
    if (relatedLifePaths.length > 1) {
      let uniquePaths = [...new Set(relatedLifePaths)];
      NumFinish[3][j - 1] = uniquePaths.join("-");
    } else if (relatedLifePaths.length === 1) {
      NumFinish[3][j - 1] = relatedLifePaths[0];
    }
  }

  // Reorder คู่เลขสัมพันธ์ to match the original order of เลขสำเร็จ
  const orderedNumFinish3 = [];
  for (let ii = 0; ii < 12; ii++) {
    orderedNumFinish3.push(NumFinish[3][TFinish[ii] - 1] || NumFinish[2][ii]);
  }

  const outputNumFinish3 = [];
  const seenValues = new Set();

  for (let value of orderedNumFinish3) {
    const transformedValue = await transformValue(value);
    processValue(transformedValue);
  }

  async function transformValue(value) {
    if (typeof value !== "string" || !value) return "";

    // Split the value by '-' and map to prefixed letters
    const parts = value.split("-").map((num, index) => {
      return `${String.fromCharCode(65 + index)}${num}`;
    });

    // Join with '+' if there are only two parts, otherwise join with '-'
    return parts.length === 2 ? parts.join("-") : parts.join("-");
  }

  // Function to process and add unique values
  async function processValue(value) {
    if (!value) return; // Skip empty values
    const parts = value.split("-").map((v) => v.trim());
    const uniqueParts = parts.filter((part) => {
      if (!seenValues.has(part)) {
        seenValues.add(part);
        return true;
      }
      return false;
    });
    if (uniqueParts.length) {
      outputNumFinish3.push(uniqueParts.join("-"));
    }
  }

  NumFinish[3] = outputNumFinish3;

  // วิถีชีวิตที่สัมพันธ์กัน Extract unique concatenated values from NumFinish[3] and assign to NumFinish[4]
  NumFinish[4] = await extractUniqueConcatenatedValues(NumFinish[3]);

  return {
    yourBirthday,
    yourBirthdayDateUse,
    yearAge,
    yearAgeInfo,
    lblDaySBirthSuriyaKati,
    yearAgeInfo,
    NumFinish,
  };
}

async function frmTamnai_Number_Graph_Payakorn(NumFinish, yearAge) {
  const dataPayakorn = require("../json/GraphLifePayakorn.json");
  const GraphTitle = "คำทำนายกราฟชีวิต";
  const GraphRelationshipsArray = NumFinish[4]
    .filter((key) => dataPayakorn.Relationships[key])
    .map((key) => ({
      Key: key,
      Details: dataPayakorn.Relationships[key],
    }));

  function getGraphLvDescription(attribute, XFinish) {
    let range = "";
    if (XFinish >= 1 && XFinish <= 4) {
      range = "1-4";
    } else if (XFinish >= 5 && XFinish <= 8) {
      range = "5-8";
    } else if (XFinish >= 9 && XFinish <= 12) {
      range = "9-12";
    } else {
      return `${attribute} ของคุณ ไม่อยู่ในเกณฑ์ที่กำหนด`;
    }
    const description = dataPayakorn.GraphLv[attribute][range];
    if (description) {
      return {
        description: description.payakorn.replace("{XFinish}", XFinish),
        counsel : "",
      };
    }
  }

  const GraphLvArray = [];
  for (let n = 0; n < 12; n++) {

    const attribute = NumFinish[0][n];
    const XFinish = NumFinish[1][n];

    const Payakorn = getGraphLvDescription(attribute, XFinish);
    
    GraphLvArray.push({
      graphLv: XFinish,
      fortune: attribute,
      details: Payakorn,
    });
  }

  // 'ทำนาย อายุ....ปี ตกเลข......
  const TYearPlus1 = yearAge + 1;
  let iCountId1To12 = 0;
  let IdPointer;

  for (let LoopLife = 1; LoopLife <= TYearPlus1; LoopLife++) {
    iCountId1To12 += 1;
    IdPointer = iCountId1To12;
    if (iCountId1To12 === 12) {
      if (LoopLife === TYearPlus1) {
        IdPointer = iCountId1To12;
      } else {
        iCountId1To12 = 0;
      }
    }
  }

  const NumForAge = NumFinish[1][iCountId1To12 - 1];
  const now = new Date(); // Get the current date and time
  const YearBToday = now.getFullYear() + 543; // Extract the year

  // Retrieve and print the description
  const NumForAgePayakorn = getNumForAgeDescription(
    TYearPlus1,
    NumForAge,
    YearBToday
  );

  function getNumForAgeDescription(TYearPlus1, NumForAge, YearBToday) {
    const key = NumForAge.toString();
    const description = dataPayakorn.NumForAgeDescriptions[key];

    if (description) {
      return {
        title: description.title
          .replace("{TYearPlus1}", TYearPlus1)
          .replace("{NumForAge}", NumForAge)
          .replace("{YearBToday}", YearBToday),
        payakorn: description.payakorn
          .replace("{TYearPlus1}", TYearPlus1)
          .replace("{NumForAge}", NumForAge)
          .replace("{YearBToday}", YearBToday),
        counsel: description.counsel,
        prompt: description.prompt,
      };
    }

    return {
      title: "No description available.",
      payakorn: "",
      counsel: "",
      prompt: "",
    };
  }

  const transformGraphRelationships = (array) => {
    return array.map((item) => ({
      key: item.Key,
      details: item.Details,
    }));
  };


  const transformedGraphRelationships = transformGraphRelationships(
    GraphRelationshipsArray
  );

  return {
    GraphRelations: transformedGraphRelationships,
    GraphLv: GraphLvArray,
    NumForAgePayakorn: NumForAgePayakorn,
  };
}

async function Month88_System5To1() {
  let MonthOld88 = 4;
  let TM = [];
  let ii = 0;

  for (let i = 0; i < 12; i++) {
    TM[ii] = MonthOld88 + i;
    if (TM[ii] >= 13) {
      TM[ii] = TM[ii] - 12;
    }
    ii++;
  }

  return {
    TM,
    MonthOld88,
  };
}

async function MonthNormal_System5To1(MonthOldiBorn) {
  const monthMap = {
    5: 1,
    6: 2,
    7: 3,
    8: 4,
    9: 5,
    10: 6,
    11: 7,
    12: 8,
    1: 9,
    2: 10,
    3: 11,
    4: 12,
  };
  let M5To1 = monthMap[MonthOldiBorn];
  if (M5To1 === undefined) throw new Error("Invalid month");

  let TM = [];
  for (let i = 0; i < 12; i++) {
    let month = M5To1 + i;
    if (month >= 13) month -= 12;
    TM.push(month);
  }

  return {
    TM,
    MonthOldiBorn,
  };
}

async function Month88() {
  let MonthOld88 = 8;
  let TM = [];
  for (let i = 0; i < 12; i++) {
    let month = MonthOld88 + i;
    if (month >= 13) month -= 12;
    TM.push(month);
  }

  return {
    TM,
    MonthOld88,
  };
}

async function MonthNormal(MonthOldiBorn) {
  let TM = [];

  for (let i = 0; i < 12; i++) {
    let month = MonthOldiBorn + i;
    if (month >= 13) month -= 12;
    TM.push(month);
  }

  return {
    TM,
    MonthOldiBorn,
  };
}

async function extractUniqueConcatenatedValues(inputArray) {
  const uniqueConcatenatedValues = new Set(inputArray); // Start with the original values
  const usedParts = new Set();

  for (const value of inputArray) {
    if (!value) continue; // Skip empty values

    const parts = value.split("-").map((v) => v.trim());

    if (parts.length > 2) {
      // Generate all 2-part combinations for values with more than 2 parts
      const combinations = getAllCombinations(parts);

      for (const combination of combinations) {
        const combinedValue = combination.join("-");
        uniqueConcatenatedValues.add(combinedValue); // Add the combination
        combination.forEach((part) => usedParts.add(part));
      }
    }
  }

  return Array.from(uniqueConcatenatedValues);
}

// Helper function to get all 2-part combinations from an array
function getAllCombinations(parts) {
  const combinations = [];
  const length = parts.length;

  // Create combinations of any two parts
  for (let i = 0; i < length - 1; i++) {
    for (let j = i + 1; j < length; j++) {
      combinations.push([parts[i], parts[j]]);
      combinations.push([parts[j], parts[i]]);
    }
  }

  return combinations;
}

// Example usage
const NumFinish = {
  3: ["A1-B5", "A2-B6-C9", "A3-B7", "A4-B12"],
};

module.exports = {
  frmTamnai_Number_Graph_Main,
  frmTamnai_Number_Graph_Payakorn,
};
