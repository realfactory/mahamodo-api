const connection = require('../config/db.mysql.js');
const calendar = require('./calendarAstronomy.js');
const db = require('./db.js');
const Support = require('./Support.js');
const parameter = require('./parameter.js');
const helpers = require('./helpers.js');


async function frmTamnai_Number_Graph_Main(birth_day) {
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
    let Day1To8Born = 8; // This should be set to the actual value you have
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
    // console.log(TD);

    // 'ให้ค่า เดือน เรียงกันไป
    // '* เฉพาะฐานเดือน ใช้แบบเดือน ๑ เป็นเดือน ๑ หากท่านต้องการให้คำนวณแบบเดือน ๕ เป็นเดือน ๑ ให้ไปตั้งค่าใหม่ที่ เมนูหลัก-ตั้งค่าโปรแกรม

    // main
    if (birth_day) {
        const NewBirthDate = await Support.fcDateGlobal(birth_day);
    }

}

module.exports = {
    frmTamnai_Number_Graph_Main
}