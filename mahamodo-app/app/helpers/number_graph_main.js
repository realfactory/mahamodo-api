const connection = require('../config/db.mysql.js');
const calendar = require('./calendarAstronomy.js');
const db = require('./db.js');
const Support = require('./Support.js');
const parameter = require('./parameter.js');
const helpers = require('./helpers.js');
const main = require('./main.js');

async function frmTamnai_Number_Graph_Main(birthDate, Hour, min, CutTimeLocalYN, sProv) {
    // main
    let lblDaySBirthSuriyaKati, YearAgeInfo, Day1To8Born;
    let fcGetItemInTableDB = 'ใช่';
    let SetMonth5To1YN = 'ไม่ใช่';
    let MonthOldiBorn = 88;

    if (birthDate) {
        const NewBirthDate = await Support.fcDateGlobal(birthDate);
        const LunarDay = await main.calculateLunarDay(NewBirthDate, Hour, min, CutTimeLocalYN, sProv);
        const lblDayBirth = Support.fcDayi17ToS(LunarDay.daySuni);
        const birthTimeInfo = await main.adjustBirthTime(NewBirthDate, Hour, min, CutTimeLocalYN, sProv);
        YearAgeInfo = await helpers.formatTimeDifference(NewBirthDate, Hour, min);
        let YourBirthday = birthTimeInfo.formattedDate;
        let YourBirthdayDateUse = birthTimeInfo.dateUse;
        let birthDateMoonInfo = lblDayBirth.MoonInfo;
        let SurisBirth = lblDayBirth.replace("(กลางวัน)", "").replace("(กลางคืน)", "");
        lblDaySBirthSuriyaKati = "สุริยคติ: " + SurisBirth;
        // console.log(LunarDay);
        // console.log(SurisBirth,YourBirthday,YearAgeInfo);

        // '****************************************************************************************************************************
        if (fcGetItemInTableDB === 'ใช่') {
            Day1To8Born = LunarDay.dayMooni;
        } else {
            Day1To8Born = LunarDay.daySuni;
        }
        // '****************************************************************************************************************************
    }

    const LifeTextArray = [
        "",
        "วาสนา",
        "ทรัพย์",
        "เพื่อน",
        "ญาติ",
        "บริวาร",
        "ศัตรู",
        "คู่ครอง",
        "โรคภัย",
        "ความสุข",
        "การงาน",
        "ลาภยศ",
        "หายนะ",
        "วิถีชีวิต"
    ];

    // Initialize the lbColor array with some initial value (you need to define these colors)
    let lbColor = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];

    // Define the colors you're going to assign (as in your code)
    const lbColor2 = 'color2'; // Replace with actual color value
    const lbColor3 = 'color3';
    const lbColor4 = 'color4';
    const lbColor5 = 'color5';
    const lbColor6 = 'color6';
    const lbColor7 = 'color7';
    const lbColor8 = 'color8';
    const lbColor9 = 'color9';

    // Update the lbColor array based on your original logic
    let i = 2;
    lbColor[i] = lbColor2;
    i += 1;
    lbColor[i] = lbColor3;
    i += 1;
    lbColor[i] = lbColor4;
    i += 1;
    lbColor[i] = lbColor5;
    i += 1;
    lbColor[i] = lbColor6;
    i += 1;
    lbColor[i] = lbColor7;
    i += 1;
    lbColor[i] = lbColor8;
    i += 1;
    lbColor[i] = lbColor9;

    // Initialize the variables
    let ii = 0;
    let DayBorn1To7Test = (Day1To8Born === 8) ? 4 : Day1To8Born;
    let TD = [];

    // Add values to the TD array, adjusting if the day exceeds 7
    ii = 0; // TD1
    TD[ii] = DayBorn1To7Test;

    ii += 1; // TD2
    TD[ii] = DayBorn1To7Test + 1;
    if (TD[ii] >= 8) {
        TD[ii] = TD[ii] - 7;
    }

    ii += 1; // TD3
    TD[ii] = DayBorn1To7Test + 2;
    if (TD[ii] >= 8) {
        TD[ii] = TD[ii] - 7;
    }

    ii += 1; // TD4
    TD[ii] = DayBorn1To7Test + 3;
    if (TD[ii] >= 8) {
        TD[ii] = TD[ii] - 7;
    }

    ii += 1; // TD5
    TD[ii] = DayBorn1To7Test + 4;
    if (TD[ii] >= 8) {
        TD[ii] = TD[ii] - 7;
    }

    ii += 1; // TD6
    TD[ii] = DayBorn1To7Test + 5;
    if (TD[ii] >= 8) {
        TD[ii] = TD[ii] - 7;
    }

    ii += 1; // TD7
    TD[ii] = DayBorn1To7Test + 6;
    if (TD[ii] >= 8) {
        TD[ii] = TD[ii] - 7;
    }
    // For demonstration, let's log the TD array

    // 'ให้ค่า เดือน เรียงกันไป
    // '* เฉพาะฐานเดือน ใช้แบบเดือน ๑ เป็นเดือน ๑ หากท่านต้องการให้คำนวณแบบเดือน ๕ เป็นเดือน ๑ ให้ไปตั้งค่าใหม่ที่ เมนูหลัก-ตั้งค่าโปรแกรม
    ii = 0;

    let Months;

    // console.log(SetMonth5To1YN , MonthOldiBorn);

    if (SetMonth5To1YN == "ใช่") {
        if (MonthOldiBorn == 88) {
            Months = await Month88_System5To1(MonthOldiBorn);
        } else {
            Months = await MonthNormal_System5To1(MonthOldiBorn);
        }
        // '* เฉพาะฐานเดือน ใช้แบบเดือน ๑ เป็นเดือน ๑ หากท่านต้องการให้คำนวณแบบเดือน ๕ เป็นเดือน ๑ ให้ไปตั้งค่าใหม่ที่ เมนูหลัก-ตั้งค่าโปรแกรม
    } else {
        if (MonthOldiBorn == 88) {
            Months = await Month88(MonthOldiBorn);
        } else {
            Months = await MonthNormal(MonthOldiBorn);
        }
    }

    return {
        lblDaySBirthSuriyaKati,
        YearAgeInfo
    }
}

async function Month88_System5To1(MonthOld88) {
    // let MonthOld88 = 4;
    let TM = [];
    let ii = 0;

    for (let i = 0; i < 12; i++) {
        TM[ii] = MonthOld88 + i;
        if (TM[ii] >= 13) {
            TM[ii] = TM[ii] - 12;
        }
        ii++;
    }

    return TM;
}

async function MonthNormal_System5To1(MonthOldiBorn) {
    const monthMap = { 5: 1, 6: 2, 7: 3, 8: 4, 9: 5, 10: 6, 11: 7, 12: 8, 1: 9, 2: 10, 3: 11, 4: 12 };
    let M5To1 = monthMap[MonthOldiBorn];
    if (M5To1 === undefined) throw new Error("Invalid month");

    let TM = [];
    for (let i = 0; i < 12; i++) {
        let month = M5To1 + i;
        if (month >= 13) month -= 12;
        TM.push(month);
    }

    return TM;
}

async function Month88(MonthOld88) {
    // const MonthOld88 = 8;
    let TM = [];
    for (let i = 0; i < 12; i++) {
        let month = MonthOld88 + i;
        if (month >= 13) month -= 12;
        TM.push(month);
    }

    return TM;
}

async function MonthNormal(MonthOldiBorn) {
    let TM = [];
    
    for (let i = 0; i < 12; i++) {
        let month = MonthOldiBorn + i;
        if (month >= 13) month -= 12;
        TM.push(month);
    }

    return TM;
}


module.exports = {
    frmTamnai_Number_Graph_Main
}