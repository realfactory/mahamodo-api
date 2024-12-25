const connection = require('../config/db.mysql.js');
const calendar = require('./calendarAstronomy.js');
const db = require('./db.js');
const Support = require('./Support.js');
const parameter = require('./parameter.js');
const helpers = require('./helpers.js');

async function cutTimeLocal(date, hour, minute, cutTimeLocalYN = false, sProv) {

    if (!cutTimeLocalYN) {
        return {
            date: date,
            adjustedHour: hour,
            adjustedMinute: minute
        }
    }

    let adjustedHour, adjustedMinute, province;

    // Calculate the total minutes by converting the hours to minutes and adding the minutes, then adjust by the local offset.
    if (cutTimeLocalYN) {
        // check province in Database
        let queryResult = await db.dbQuery(`SELECT * FROM luktimelocal_thailand WHERE ProvName='${sProv}'`);
        if (queryResult.length == 1) {
            province = queryResult[0].ProvName;
        } else {
            province = 'กรุงเทพมหานคร';
        }

        const timeLocalResponse = await fcGetLukTimeLocalThailandThisProvValue(province);
        let minuteLocal = parseInt(timeLocalResponse[0].ProvTime.substring(4, 6));
        let totalMinutes = parseInt(hour) * 60 + parseInt(minute) - minuteLocal;
        adjustedHour = Math.floor(totalMinutes / 60);
        adjustedMinute = totalMinutes % 60;

        // Adjust date and hour for underflow/overflow
        if (adjustedHour >= 24) {
            date.setDate(date.getDate() + 1);
            adjustedHour -= 24;
        } else if (adjustedHour < 0) {
            date.setDate(date.getDate() - 1);
            adjustedHour += 24;
        }
    }

    return {
        date,
        adjustedHour,
        adjustedMinute
    }

}

async function calculateLunarDay(date, hour, minute, cutTimeLocalYN = false, sProv) {

    let intTimeAllMBorn, minuteLocal, totalMLocalMAndBornM, timeLocal;
    let day = date.getDate();
    let month = date.getMonth() + 1; // JavaScript months are 0-indexed.
    let year = date.getFullYear();
    let yearTh = date.getFullYear() + 543;

    let dateFormat = new Date(year, month - 1, day); // Setup initial date format.

    if (cutTimeLocalYN) {

        // check province in Database
        let queryResult = await db.dbQuery(`SELECT * FROM luktimelocal_thailand WHERE ProvName='${sProv}'`);
        if (queryResult.length == 1) {
            province = queryResult[0].ProvName;
        } else {
            province = 'กรุงเทพมหานคร';
        }

        timeLocal = await fcGetLukTimeLocalThailandThisProvValue(province);
        minuteLocal = parseInt(timeLocal[0].ProvTime.substring(4, 6), 10);
        intTimeAllMBorn = (hour * 60) + minute;
        totalMLocalMAndBornM = intTimeAllMBorn - minuteLocal;

        if (intTimeAllMBorn < minuteLocal) {
            totalMLocalMAndBornM += 1440;
            dateFormat.setDate(dateFormat.getDate() - 1);
        }

        hour = Math.floor(totalMLocalMAndBornM / 60);
        minute = totalMLocalMAndBornM % 60;

    } else {

        intTimeAllMBorn = (hour * 60) + minute;
        totalMLocalMAndBornM = intTimeAllMBorn;
        hour = Math.floor(totalMLocalMAndBornM / 60);
        minute = totalMLocalMAndBornM % 60;

    }

    let dayMooni = dateFormat.getDay() + 1;
    let daySuni = dayMooni;

    if (hour * 60 + minute < 6 * 60) {
        dayMooni = (dayMooni - 1) || 7;
    }

    if ((daySuni === 3 && hour * 60 + minute >= 18 * 60) || (daySuni === 4 && hour * 60 + minute < 6 * 60)) {
        dayMooni = 8;
    }

    return {
        dayMooni,
        daySuni
    };

}

async function fcGetLukTimeLocalThailandThisProvValue(sProv) {
    return new Promise((resolve, reject) => {
        const query = "SELECT * FROM luktimelocal_thailand WHERE ProvName = ?";
        connection.query(query, [sProv], (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                reject(new Error(`Error retrieving data from luktimelocal_thailand table: ${error.message}`));
            } else {
                resolve(results);
            }
        });
    });
}

async function SetUpDownMThaiMoon(date, DayMooni, DaySuni) {

    return new Promise(async (resolve, reject) => {
        let sqlMoon;
        let MoonInfo;
        let cboBorn_Country_Option = true;
        try {
            let chkSetUpDownMThaiMoon = await db.fcGetItemInTableDB("chkSetUpDownMThaiMoon", "settingoption", "id=1");
            if (chkSetUpDownMThaiMoon === 'ใช่') {
                let day = date.getDate().toString().padStart(2, '0');
                let month = (date.getMonth() + 1).toString().padStart(2, '0');
                let year = (date.getFullYear() + 543).toString();

                if (DaySuni === DayMooni) {
                    sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${day}/${month}/${year}'`;
                } else {

                    if (cboBorn_Country_Option) {
                        date.setFullYear(year - 543);
                    }

                    date.setDate(date.getDate() - 1);

                    let iNumBack = date.getDate().toString().padStart(2, '0');
                    let iMonthBack = (date.getMonth() + 1).toString().padStart(2, '0');
                    let iYearBBack = (cboBorn_Country_Option ? date.getFullYear() + 543 : date.getFullYear()).toString();

                    sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${iNumBack}/${iMonthBack}/${iYearBBack}'`;

                }
            } else {
                let day = date.getDate().toString().padStart(2, '0');
                let month = (date.getMonth() + 1).toString().padStart(2, '0');
                let year = (date.getFullYear() + 543).toString();
                sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${day}/${month}/${year}'`;
            }

            if (DaySuni === 4 && DayMooni === 8) {
                let day = date.getDate().toString().padStart(2, '0');
                let month = (date.getMonth() + 1).toString().padStart(2, '0');
                let year = (date.getFullYear() + 543).toString();
                sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${day}/${month}/${year}'`;
            }

            if (sqlMoon) {
                let resMoon = await db.dbQuery(sqlMoon);
                if (resMoon && resMoon.length > 0) {
                    let DownUps = resMoon[0].downup === 1 ? "แรม" : "ขึ้น";
                    let Nighti = resMoon[0].night;
                    let MThai = resMoon[0].mthai;
                    let YThai = resMoon[0].ythai;
                    let DThai = resMoon[0].dayi;

                    MoonInfo = await DownThaiMoonInfo(DownUps, Nighti, MThai, YThai);

                    // UpDownBornS = DownUps 'เก็บค่า "ขึ้น" หรือ "แรม" ไว้ในตัวแปร Public เพื่อนำไปใช้
                    // UDiBorn = Nighti 'เก็บค่า จำนวนค่ำ ไว้ในตัวแปร Public เพื่อนำไปใช้
                    // MonthOldiBorn = MThai 'เก็บค่า เดือนไทย ไว้ในตัวแปร Public เพื่อนำไปใช้

                    resolve({
                        DownUps: DownUps,
                        Nighti: Nighti,
                        DThai : DThai,
                        MThai: MThai,
                        YThai: YThai,
                        MoonInfo: MoonInfo,
                    });

                } else {
                    resolve({
                        DownUps: "",
                        Nighti: "",
                        MThai: "",
                        YThai: "",
                        MoonInfo: "",
                    });

                    console.log("No data returned from the query.");

                }
            } else {
                console.log("SQL query was not defined.");
            }
        } catch (error) {
            console.log("Error in SetUpDownMThaiMoon: " + error);
        }
    });
}

async function DownThaiMoonInfo(DownUps, Night, MThai, YThai) {
    let varsBornStringUDLuk = "";
    if (DownUps !== '-') {
        varsBornStringUDLuk = `ตรงกับ ${DownUps} ${Night} ค่ำ เดือน ${MThai} ปี${Support.fcYearOldiToS(YThai)}`;
    }
    return varsBornStringUDLuk;
}

async function adjustBirthTime(birthDate, birthHour, birthMinute, cutTimeLocalYN, sProv) {

    const newDate = await cutTimeLocal(birthDate, birthHour, birthMinute, cutTimeLocalYN, sProv);

    // Extract day, month, and year from birthDate
    let day = newDate.date.getDate();
    let month = newDate.date.getMonth() + 1; // Adjust for zero-based index
    let year = newDate.date.getFullYear() + 543;

    // Initialize variables for adjusted time
    let adjustedHour = newDate.adjustedHour;
    let adjustedMinute = newDate.adjustedMinute;
    const zeroPad = (num, places) => String(num).padStart(places, '0');

    const formattedDate = `เกิด ${zeroPad(day, 2)}/${zeroPad(month, 2)}/${year} เวลา ${zeroPad(adjustedHour, 2)}:${zeroPad(adjustedMinute, 2)} น.${cutTimeLocalYN ? ' (ตัดเวลาท้องถิ่น)' : ''}`;
    const dateUse = `${zeroPad(day, 2)}/${zeroPad(month, 2)}/${year}`;

    return {
        formattedDate,
        dateUse
    };

}

async function CastHoroscope_SpeedAndDirect_AllStar(RadSpeed) {
    // รับค่าสมผุสเมื่อวาน 
    // เอาค่าสมผุส Rad(iStar, 0) ที่ได้มา (จากคำบรรทัดบน) ใส่ในตัวแปร RadSpeed(iStar, 1, 0)
    // ' 1 = พักร (ถอยหลัง) 2 = มนท์ (ช้าหรือหยุดนิ่ง) 3 = ปกติ 4 = เสริด (เดินหน้าหรือเร็ว)

    let TemToday, TemYesterday, TemDif1;
    for (let iStar = 0; iStar <= 9; iStar++) {
        TemToday = RadSpeed[iStar][0][0]; // 'สมผุสปัจจุบัน
        TemYesterday = RadSpeed[iStar][1][0]; //'สมผุสเมื่อวาน
        RadSpeed[iStar][4][0] = 3; //'ค่า พักร มนท์ เสริด เริ่มต้นที่ ปกติ

        TemDif1 = (TemToday - TemYesterday);

        if (TemDif1 < 0) {
            RadSpeed[iStar][4][0] = 1; // Retrograde
        }
        if (TemDif1 < -20000) {
            TemDif1 += 21600;
        }

        if (iStar === 2) {
            let aRaYes, BB1Yes, aOngYes, aLibYes;
            let aRaToday, BB1Today, aOngToday, aLibToday;

            aRaYes = Math.floor(TemYesterday / 1800); // Determine the zodiac sign yesterday
            aRaToday = Math.floor(TemToday / 1800); // Determine the zodiac sign today

            if (aRaYes === 11 && aRaToday === 0) {
                // If yesterday the star was in sign 11 and today it's in sign 0, set status to normal instead of retrograde
                RadSpeed[iStar][4][0] = 3;
            }
        }

        switch (iStar) {
            case 0:
                if (TemDif1 < 0) RadSpeed[iStar][4][0] = 1; // Retrograde
                if (TemDif1 === 0) RadSpeed[iStar][4][0] = 2; // Slow or stationary
                if (TemDif1 === 1) RadSpeed[iStar][4][0] = 3; // Normal
                if (TemDif1 > 1) RadSpeed[iStar][4][0] = 4; // Fast
                if (TemDif1 > 20000) {
                    if (Math.abs(TemDif1 - 21600) === 1) RadSpeed[iStar][4][0] = 3; // Normal
                    if (Math.abs(TemDif1 - 21600) > 1) RadSpeed[iStar][4][0] = 4; // Fast
                }
                break;

            case 3: // ดาว 1 และ 2 ไม่มี
                if (TemDif1 >= 1 && TemDif1 <= 26) RadSpeed[iStar][4][0] = 2; // Slow
                if (TemDif1 >= 27 && TemDif1 <= 39) RadSpeed[iStar][4][0] = 3; // Normal
                if (TemDif1 >= 40 && TemDif1 <= 56) RadSpeed[iStar][4][0] = 4; // Fast
                if (TemDif1 > 20000) {
                    if (Math.abs(TemDif1 - 21600) >= 1 && Math.abs(TemDif1 - 21600) <= 26) RadSpeed[iStar][4][0] = 2; // Slow
                    if (Math.abs(TemDif1 - 21600) >= 27 && Math.abs(TemDif1 - 21600) <= 39) RadSpeed[iStar][4][0] = 3; // Normal
                    if (Math.abs(TemDif1 - 21600) >= 40 && Math.abs(TemDif1 - 21600) <= 56) RadSpeed[iStar][4][0] = 4; // Fast
                }
                break;

            case 4:
                if (TemDif1 >= 1 && TemDif1 <= 34) RadSpeed[iStar][4][0] = 2; // Slow
                if (TemDif1 >= 35 && TemDif1 <= 97) RadSpeed[iStar][4][0] = 3; // Normal
                if (TemDif1 >= 98 && TemDif1 <= 117) RadSpeed[iStar][4][0] = 4; // Fast
                if (TemDif1 > 20000) {
                    if (Math.abs(TemDif1 - 21600) >= 1 && Math.abs(TemDif1 - 21600) <= 34) RadSpeed[iStar][4][0] = 2; // Slow
                    if (Math.abs(TemDif1 - 21600) >= 35 && Math.abs(TemDif1 - 21600) <= 97) RadSpeed[iStar][4][0] = 3; // Normal
                    if (Math.abs(TemDif1 - 21600) >= 98 && Math.abs(TemDif1 - 21600) <= 117) RadSpeed[iStar][4][0] = 4; // Fast
                }
                break;

            case 5:
                if (TemDif1 >= 1 && TemDif1 <= 4) RadSpeed[iStar][4][0] = 2; // Slow
                if (TemDif1 >= 5 && TemDif1 <= 8) RadSpeed[iStar][4][0] = 3; // Normal
                if (TemDif1 >= 9 && TemDif1 <= 17) RadSpeed[iStar][4][0] = 4; // Fast
                if (TemDif1 > 20000) {
                    if (Math.abs(TemDif1 - 21600) >= 1 && Math.abs(TemDif1 - 21600) <= 4) RadSpeed[iStar][4][0] = 2; // Slow
                    if (Math.abs(TemDif1 - 21600) >= 5 && Math.abs(TemDif1 - 21600) <= 8) RadSpeed[iStar][4][0] = 3; // Normal
                    if (Math.abs(TemDif1 - 21600) >= 9 && Math.abs(TemDif1 - 21600) <= 17) RadSpeed[iStar][4][0] = 4; // Fast
                }
                break;

            case 6:
                if (TemDif1 >= 1 && TemDif1 <= 24) RadSpeed[iStar][4][0] = 2; // Slow
                if (TemDif1 >= 25 && TemDif1 <= 72) RadSpeed[iStar][4][0] = 3; // Normal
                if (TemDif1 >= 73 && TemDif1 <= 84) RadSpeed[iStar][4][0] = 4; // Fast
                if (TemDif1 > 20000) {
                    if (Math.abs(TemDif1 - 21600) >= 1 && Math.abs(TemDif1 - 21600) <= 24) RadSpeed[iStar][4][0] = 2; // Slow
                    if (Math.abs(TemDif1 - 21600) >= 25 && Math.abs(TemDif1 - 21600) <= 72) RadSpeed[iStar][4][0] = 3; // Normal
                    if (Math.abs(TemDif1 - 21600) >= 73 && Math.abs(TemDif1 - 21600) <= 84) RadSpeed[iStar][4][0] = 4; // Fast
                }
                break;

            case 7:
                if (TemDif1 === 1) RadSpeed[iStar][4][0] = 2; // Slow
                if (TemDif1 >= 2 && TemDif1 <= 5) RadSpeed[iStar][4][0] = 3; // Normal
                if (TemDif1 >= 6 && TemDif1 <= 10) RadSpeed[iStar][4][0] = 4; // Fast
                if (TemDif1 > 20000) {
                    if (Math.abs(TemDif1 - 21600) === 1) RadSpeed[iStar][4][0] = 2; // Slow
                    if (Math.abs(TemDif1 - 21600) >= 2 && Math.abs(TemDif1 - 21600) <= 5) RadSpeed[iStar][4][0] = 3; // Normal
                    if (Math.abs(TemDif1 - 21600) >= 6 && Math.abs(TemDif1 - 21600) <= 10) RadSpeed[iStar][4][0] = 4; // Fast
                }
                break;
        }
    }

    return RadSpeed;
}

// 'รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
async function CastHoroscope_SumSuriyatMain_Born(dataInput, Hour, min, CutTimeLocalYN, sProv) {

    const LunarDay = await calculateLunarDay(dataInput, Hour, min, CutTimeLocalYN, sProv);
    const lblDayBirth = Support.fcDayi17ToS(LunarDay.daySuni);
    const getMoonBirth = await SetUpDownMThaiMoon(dataInput, LunarDay.dayMooni, LunarDay.daySuni);
    const birthTimeInfo = await adjustBirthTime(dataInput, Hour, min, CutTimeLocalYN, sProv);
    const yearAgeInfo = await helpers.formatTimeDifference(dataInput, Hour, min);

    let yourBirthday = birthTimeInfo.formattedDate;
    let yourBirthdayDateUse = birthTimeInfo.dateUse;
    let birthDateMoonInfo = getMoonBirth.MoonInfo;
    let surisBirth = lblDayBirth.replace("(กลางวัน)", "").replace("(กลางคืน)", "");
    let lblDaySBirthSuriyaKati = "สุริยคติ: " + surisBirth;
    let iStarAll = 12; // 'กำหนดจำนวนสมาชิกอาเรย์

    let StarStayData = require('../json/StarStay.json');
    let resultStarStayData;
    let Rad = [
            [],
            []
        ],
        varBornPutdate_StarStayR = [
            [],
            []
        ],
        varBornPutdate_StarO = [
            [],
            []
        ],
        varBornPutdate_StarL = [
            [],
            []
        ],
        varBornPutdate_LerkPass = [
            [],
            []
        ],
        varBornPutdate_MLerkPass = [
            [],
            []
        ],
        varBornPutdate_SecLerkPass = [
            [],
            []
        ],
        varBornPutdate_LerkNow = [
            [],
            []
        ],
        varBornPutdate_NLerkNow = [
            [],
            []
        ],
        varBornPutdate_No1To9LerkNow = [
            [],
            []
        ],
        varBornPutdate_FixedStarLerkNow = [
            [],
            []
        ],
        varBornPutdate_TriStarAsRasee = [
            [],
            []
        ],
        varBornPutdate_Nasss = [
            [],
            []
        ],
        varBornPutdate_NavangStarAsRasee = [
            [],
            []
        ],
        varBornPutdate_Tri = [
            [],
            []
        ],
        varBornPutdate_Trisss = [
            [],
            []
        ],
        varBornPutdate_TriyangHarmi = [
            [],
            []
        ];

    const RadSpeed = Array.from({
        length: 10
    }, () => Array.from({
        length: 5
    }, () => Array(2).fill(0)));

    // 'เริ่มคำนวณตามสูตรคัมภีร์สุริยยาตร์ หาสมผุสของดาวทุกดวง
    const AllStar = await CastHoroscope_AllStar_Suriyata_SUM_Main(dataInput, Hour, min, CutTimeLocalYN, sProv);
    Rad = AllStar.Rad;

    // สำหรับ หาค่า speed star born
    const AllStarBorn = await CastHoroscope_AllStar_Suriyata_SUM_Main(dataInput, Hour, min, CutTimeLocalYN, sProv);
    const RadAllStarBorn = AllStarBorn.Rad;

    //' รับค่าสมผุสปัจจุบัน เอาค่าสมผุส Rad(iStar, 0-1) ที่ได้มา (จากคำบรรทัดบน) ใส่ในตัวแปร RadSpeed(iStar, 0, iE10)
    for (let iStar = 0; iStar <= 9; iStar++) {
        RadSpeed[iStar][0][0] = RadAllStarBorn[iStar][0]; // Assign yesterday's position
    }

    // หาตำแหน่ง (สมผุส) ดาวของเมื่อวานนี้
    // คำนวณตามสูตรคัมภีร์สุริยยาตร์ หาสมผุสของดาวทุกดวง "เมื่อวาน" เพื่อเก็บเอาค่า "สมผุส" ไปหา พักร มนท์ เสริด 
    const TodayDate = dataInput;
    const oneDayInMillis = 24 * 60 * 60 * 1000;
    const YesterdayBorn = new Date(TodayDate.getTime() - oneDayInMillis);
    const AllStartYesterday = await CastHoroscope_AllStar_Suriyata_SUM_Main(YesterdayBorn, Hour, min, CutTimeLocalYN, sProv);
    const YesterdayRed = AllStartYesterday.Rad;

    //' รับค่าสมผุสปัจจุบัน เอาค่าสมผุส Rad(iStar, 0-1) ที่ได้มา (จากคำบรรทัดบน) ใส่ในตัวแปร RadSpeed(iStar, 0, iE10)
    for (let iStar = 0; iStar <= 9; iStar++) {
        RadSpeed[iStar][1][0] = YesterdayRed[iStar][0]; // Assign yesterday's position
    }

    // 'ให้ /1800 เป็นราศี. เศษทศนิยม *1800  แล้ว / 60 เป็นองศา. ทศนิยมที่เหลือ * 60 เป็นลิปดา.
    let SumSompod = await CastHoroscope_SumSompodStarCalendarAstronomy_Born_Today(dataInput, Hour, min, CutTimeLocalYN, sProv);
    Rad[11][0] = SumSompod.A1_Neptune; // Neptune's value stored at Rad[10][0]  //15604.402798323506 // 15604.402783235
    Rad[12][0] = SumSompod.A1_Pluto; // Pluto's value stored at Rad[11][0] //12184.7757067649 //  12184.7757067649

    const starSpeeds = await CastHoroscope_SpeedAndDirect_AllStar(RadSpeed);

    let SpeedChar_Born = [];
    for (let iStar = 0; iStar <= 12; iStar++) {
        let speedSource = (iStar === 11 || iStar === 12) ? SumSompod.RadSpeed : starSpeeds;
        let speedValue = speedSource[iStar] && speedSource[iStar][4] ? speedSource[iStar][4][0] : undefined;
        if (speedValue !== undefined) {
            if (iStar === 8 || iStar === 9) {
                SpeedChar_Born[iStar] = "";
            } else {
                SpeedChar_Born[iStar] = await Support.SpeedChar_Born(speedValue);
            }
            // console.log(SpeedChar_Born);
        } else {
            SpeedChar_Born[iStar] = "";
            // console.error(`Speed value not found for iStar ${iStar}`);
        }
    }

    async function getStarStayData(id, B1) {
        const specificRange = StarStayData.find(range => range.id === id);
        if (!specificRange) {
            return null;
        }
        const detail = specificRange.ranges.find(rangeDetail => B1 >= rangeDetail.min && B1 <= rangeDetail.max);
        return detail || null; // Return the found detail or null if not found
    }

    // 'ลัคนา
    Rad[10][0] = Rad[1][1];
    // console.log('ลัคนา = ' + Rad[10][0]);
    for (let e10 = 0; e10 <= 1; e10++) {
        for (let ii = 0; ii <= 12; ii++) {
            if ((ii === 11 || ii === 12) && e10 === 1) {
                break;
            }
            // 'A1 = Rad(ii, 0) ระบบดวงอีแปะ A1 = Rad(ii, 1) ระบบดวง 10 ลัคนา  2 ขึ้นไปไม่มี
            let A1 = Rad[ii][e10];
            // console.log(ii , e10 , A1);

            if (A1 == null) {
                A1 = 0;
            }

            // 'รับค่า  ดาวนี้ (ii) อยู่ราศี....... เช่น ดาว 1 อยู่ราศี 7   varBornPutdate_StarStayR(e10, 1)=7

            varBornPutdate_StarStayR[e10][ii] = Math.floor(A1 / 1800);

            let B1 = A1 - (varBornPutdate_StarStayR[e10][ii] * 1800);
            if (B1 === 0) B1 = 1;
            //console.log(e10,ii,B1);
            varBornPutdate_StarO[e10][ii] = Math.floor(B1 / 60) // 'รับค่า ดาวนี้ (ii)  อยู่องศา..... 
            varBornPutdate_StarL[e10][ii] = Math.floor(B1 - (varBornPutdate_StarO[e10][ii]) * 60) // 'รับค่า ดาวนี้ (ii)  อยู่ลิปดา..... 

            // 'ฤกษ์ ที่ผ่านมาแล้ว (ได้ผ่านฤกษ์นี้แล้ว)
            varBornPutdate_LerkPass[e10][ii] = Math.floor(A1 * 0.00125); // 'ฤกษ์ที่..n...ได้ผ่านไปแล้ว
            // 'ฤกษ์ที่..n...ได้ผ่านไปแล้ว..n..นาที
            let minutes = Math.floor(((A1 * 0.00125) - Number(varBornPutdate_LerkPass[e10][ii])) * 60);
            varBornPutdate_MLerkPass[e10][ii] = minutes.toString().padStart(2, '0');

            let SecLerk = Math.floor(((((A1 * 0.00125) - Number(varBornPutdate_LerkPass[e10][ii])) * 60) % 1) * 60);
            let SecLerkString = SecLerk.toFixed(2);
            let formattedSecLerk = ("00" + parseInt(SecLerkString.split('.')[0])).slice(-2);
            varBornPutdate_SecLerkPass[e10][ii] = formattedSecLerk;

            // 'ฤกษ์ปัจจุบัน (ขณะนี้อยู่ฤกษ์ที่...)
            let NoTimei1To9;
            let fcTimeNoiToS;

            let Timei = Math.floor(A1 * 0.00125) + 1;
            if (Timei > 27) Timei = 1;
            fcTimeNoiToS = await Support.fcTimeNoiToS(Timei, NoTimei1To9)
            varBornPutdate_LerkNow[e10][ii] = Timei;
            varBornPutdate_NLerkNow[e10][ii] = await Support.fcTime27To9(Timei) + ". " + fcTimeNoiToS.name;
            varBornPutdate_No1To9LerkNow[e10][ii] = await Support.fcTime27To9(Timei);
            varBornPutdate_FixedStarLerkNow[e10][ii] = await Support.fcTimeFixedStar(Timei);
            fcTimeNoiToS = "";
            // 'แก้การ Error เมื่อดาวอยู่ราศี 12 คือ จำนวน Rad(n,n)  / 1800 ได้ 12
            if (varBornPutdate_StarStayR[e10][ii] >= 12 || varBornPutdate_StarStayR[e10][ii] == null || varBornPutdate_StarStayR[e10][ii] == NaN) varBornPutdate_StarStayR[e10][ii] = 0;

            // ''ขณะกำลังทำ ช่องราศีแสดงราศี ซึ่งในช่องนี้มีดาว..i (0-10)..อยู่
            resultStarStayData = await getStarStayData(varBornPutdate_StarStayR[e10][ii], B1);

            if (resultStarStayData) {
                varBornPutdate_Nasss[e10][ii] = resultStarStayData.Nasss;
                varBornPutdate_NavangStarAsRasee[e10][ii] = resultStarStayData.NavangStarAsRasee;
                varBornPutdate_Tri[e10][ii] = resultStarStayData.Tri;
                varBornPutdate_Trisss[e10][ii] = resultStarStayData.Trisss;
                varBornPutdate_TriyangHarmi[e10][ii] = resultStarStayData.TriyangHarmi;

                // 'ดึง เอาตัวเลข ตั้งแต่ตัวที่ 3 ไป (เช่น  "6:11"  ก็จะได้  11 [เก็บตำแหน่งราศีของตรียางค์]
                varBornPutdate_TriStarAsRasee[e10][ii] = parseFloat(varBornPutdate_Trisss[e10][ii].substring(2))
            }

        } // ' For ii = 0 To 10 'ทำดาว 0-10
    } // 'For E10 = 0 To 1  'รอบที่ 1 (0) คำนวณ ดาว 0-10 ระบบดวงอีแปะ   รอบที่ 2 (1)  คำนวณ ดาว 0-10 ระบบดวง 10 ลัคนา

    // '======= 0 พิษนาค   1 พิษครุฑ   2 พิษสุนัข =======================================================
    let varBornPutdate_TriyangHarms = [];
    for (let iStarii = 0; iStarii <= iStarAll; iStarii++) {
        let found = false;
        for (let iiPis = 0; iiPis <= 2; iiPis++) {
            if (!varBornPutdate_TriyangHarms[iStarii]) varBornPutdate_TriyangHarms[iStarii] = [];
            if (varBornPutdate_TriyangHarmi[0][iStarii] === iiPis + 1) {
                varBornPutdate_TriyangHarms[0][iStarii] = await Support.fciToSHarm(iiPis);
                found = true;
                break;
            }
        }
        if (!found) {
            varBornPutdate_TriyangHarms[0][iStarii] = "-";
        }
    }

    // ' ใส่ค่าลัคนาอาทิตย์ ในดวงอีแปะ
    // ' ค่าของลัคนาในจุดนี้ ปกติคิดว่า "ไม่จำเป็นต้องใส่ก็ได้ เพราะข้างบนก็ได้วนลูปเก็บค่าไปแล้ว ดังบรรทัดที่ว่า .... Rad(10, 0) = Rad(1, 1) 'ลัคนา......"
    // ' ดาวดวงที่ 10=ลัคนา      0,10  0=ดวงอีแปะ  10=ลัคนา      1,1 1=ดวง10ลัคน์  1=ดาวอาทิตย์ (ลัคนาอาทิตย์)
    varBornPutdate_StarStayR[0][10] = varBornPutdate_StarStayR[1][1];
    varBornPutdate_StarO[0][10] = varBornPutdate_StarO[1][1];
    varBornPutdate_StarL[0][10] = varBornPutdate_StarL[1][1];
    varBornPutdate_Tri[0][10] = varBornPutdate_Tri[1][1]; // 'เช่น 6
    varBornPutdate_TriStarAsRasee[0][10] = varBornPutdate_TriStarAsRasee[1][1]; // 'เช่น 11
    varBornPutdate_Trisss[0][10] = varBornPutdate_Trisss[1][1]; // 'เช่น "6:11"
    varBornPutdate_Nasss[0][10] = varBornPutdate_Nasss[1][1]; // 'เช่น "8:7:10"
    varBornPutdate_NavangStarAsRasee[0][10] = varBornPutdate_NavangStarAsRasee[1][1]; // 'เช่น 10
    varBornPutdate_LerkPass[0][10] = varBornPutdate_LerkPass[1][1];
    varBornPutdate_MLerkPass[0][10] = varBornPutdate_MLerkPass[1][1];
    varBornPutdate_SecLerkPass[0][10] = varBornPutdate_SecLerkPass[1][1];
    varBornPutdate_LerkNow[0][10] = varBornPutdate_LerkNow[1][1];
    varBornPutdate_No1To9LerkNow[0][10] = varBornPutdate_No1To9LerkNow[1][1];
    varBornPutdate_FixedStarLerkNow[0][10] = varBornPutdate_FixedStarLerkNow[1][1];
    varBornPutdate_NLerkNow[0][10] = varBornPutdate_NLerkNow[1][1];
    // '-------------------------------------------------------------------------------------------------------------------------------

    // ' ใส่ค่าภพ ให้กับดวงราศีจักร (ดวงอีแปะ) varBornPop(0, nn)
    let RaseeAsPopLuks = []; // 'เช่น ราศี 0 = "สหัชชะ"
    let varBornPutdate_PopLuksRasee = [
        [],
        []
    ];

    let varBornPutdate_PopLuksStar = [
        [],
        []
    ];
    let iCountR = varBornPutdate_StarStayR[0][10]; // Position of Rasee, assumed to be 10
    for (let iPop = 0; iPop <= 11; iPop++) { // 'ภพที่่ 0-11
        RaseeAsPopLuks[iCountR] = await Support.fcPopiToS(iPop);
        varBornPutdate_PopLuksRasee[0][iCountR] = await Support.fcPopiToS(iPop);
        iCountR++;
        if (iCountR > 11) iCountR = 0;
    }

    for (let Starii = 0; Starii <= iStarAll; Starii++) {
        varBornPutdate_PopLuksStar[0][Starii] = varBornPutdate_PopLuksRasee[0][varBornPutdate_StarStayR[0][Starii]];
    }

    iCountR = varBornPutdate_StarStayR[0][10]; // Reset iCountR to the position of Rasee
    // ' ใส่ค่าภพ ให้กับดวงกำเนิด เช่น  ดาว 0 = "สหัชชะ"  ดวงอีแปะ
    for (let iPop = 0; iPop <= 11; iPop++) {
        RaseeAsPopLuks[iCountR] = await Support.fcPopiToS(iPop);
        varBornPutdate_PopLuksRasee[1][iCountR] = await Support.fcPopiToS(iPop);
        iCountR++;
        if (iCountR > 11) iCountR = 0;
    }

    for (let Starii = 0; Starii <= 10; Starii++) {
        varBornPutdate_PopLuksStar[1][Starii] = varBornPutdate_PopLuksRasee[1][varBornPutdate_StarStayR[1][Starii]];
    }

    let varBornPutdate_RaSTD = [
        [],
        []
    ];
    let varBornPutdate_NaRaSTD = [
        [],
        []
    ];

    for (let j = 0; j <= iStarAll; j++) {
        let S = "";
        if (await Support.fcRaseeToStarKased(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", เกษตร";
        }
        if (await Support.fcRaseeToStarPra(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", ประ";
        }
        if (await Support.fcRaseeToStarMahauj(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", มหาอุจจ์";
        }
        if (await Support.fcRaseeToStarNij(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", นิจ";
        }
        if (await Support.fcRaseeToStarMahajak(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", มหาจักร";
        }
        if (await Support.fcRaseeToStarRachachock(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", ราชาโชค";
        }

        S = S.trim();
        if (!S) {
            S = "-";
        } else {
            S = S.substring(2);
        }

        varBornPutdate_RaSTD[0][j] = S;

        // ''ดวงมาตรฐาน เกษตร ประ มหาอุจจ์ นิจ มหาจักร ราชาโชค ของดวงนวางค์จักร ของราศีจักร
        S = "";
        if (await Support.fcRaseeToStarKased(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", เกษตร";
        }
        if (await Support.fcRaseeToStarPra(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", ประ";
        }
        if (await Support.fcRaseeToStarMahauj(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", มหาอุจจ์";
        }
        if (await Support.fcRaseeToStarNij(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", นิจ";
        }
        if (await Support.fcRaseeToStarMahajak(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", มหาจักร";
        }
        if (await Support.fcRaseeToStarRachachock(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", ราชาโชค";
        }

        S = S.trim();
        if (!S) {
            S = "-";
        } else {
            S = S.substring(2);
        }

        varBornPutdate_NaRaSTD[0][j] = S; // 'เก็บค่าลงตัวแปร Public
        // ''จบ ระบบดวงอีแปะ 

        if (j !== 10) {
            let S = "";
            if (await Support.fcRaseeToStarKased(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", เกษตร";
            }
            if (await Support.fcRaseeToStarPra(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", ประ";
            }
            if (await Support.fcRaseeToStarMahauj(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", มหาอุจจ์";
            }
            if (await Support.fcRaseeToStarNij(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", นิจ";
            }
            if (await Support.fcRaseeToStarMahajak(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", มหาจักร";
            }
            if (await Support.fcRaseeToStarRachachock(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", ราชาโชค";
            }

            S = S.trim();
            if (!S) {
                S = "-";
            } else {
                S = S.substring(2);
            }

            varBornPutdate_RaSTD[1][j] = S;
            //console.log(varBornPutdate_StarStayR[1][j] + ' '+ S);

            // ''ดวงมาตรฐาน เกษตร ประ มหาอุจจ์ นิจ มหาจักร ราชาโชค ของดวงนวางค์จักร ของราศีจักร
            S = "";
            if (await Support.fcRaseeToStarKased(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", เกษตร";
            }
            if (await Support.fcRaseeToStarPra(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", ประ";
            }
            if (await Support.fcRaseeToStarMahauj(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", มหาอุจจ์";
            }
            if (await Support.fcRaseeToStarNij(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", นิจ";
            }
            if (await Support.fcRaseeToStarMahajak(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", มหาจักร";
            }
            if (await Support.fcRaseeToStarRachachock(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", ราชาโชค";
            }

            S = S.trim();
            if (!S) {
                S = "-";
            } else {
                S = S.substring(2);
            }
            varBornPutdate_NaRaSTD[1][j] = S; // 'เก็บค่าลงตัวแปร Public
            // ''จบ ระบบดวง 10 ลัคนา ดาว 0-9
        }

    }

    let varBornPutdate_PopTanusedRasee = [
        [],
        []
    ];
    let varBornPutdate_PopTanusedStar = [
        [],
        []
    ];

    // ''หาตนุเศษ ในดวงราศีจักร
    let iStarRa = varBornPutdate_StarStayR;
    let iLukStayRasee = iStarRa[0][10]; // '1. ลัคนาอยู่ราศีที่ 0-11 
    let iStarAsHomeLuk = await Support.fcRaseeToStarKased(iLukStayRasee); // '2. ดาวเจ้าเรือนของลัคนา เช่น 5
    let iStarKasedOfLukAsRasee = iStarRa[0][iStarAsHomeLuk]; // '3. ดาวเกษตรของลัคนา อยู่ราศี... เช่น 0
    let iStarAsHouse = await Support.fcRaseeToStarKased(iStarKasedOfLukAsRasee); // 'รับค่าดาวเจ้าบ้าน
    let iStarAsHouseOfLukAsRasee = iStarRa[0][iStarAsHouse]; // '4. ดาวเจ้าเรือนลัคนาอยู่ในตำแหน่งราศีที่..... คือค่าจาก iStarRa10(0, iStarAsHouse) นั่นเอง

    let istarAsTanuSED = await fcGetTanused_CastHoroscope(iLukStayRasee, iStarAsHomeLuk, iStarKasedOfLukAsRasee, iStarAsHouseOfLukAsRasee);
    let varBornPutdate_starAsTanuSED = [];
    varBornPutdate_starAsTanuSED[0] = istarAsTanuSED;

    //  'ใส่ข้อความว่า "ตนุเศษ" ใน STD (คุณภาพดาว)
    S = varBornPutdate_RaSTD[0][istarAsTanuSED];
    if (S === "-" || S === "") {
        if (S === "-") {
            S = S.replace("-", ""); // Replace '-' with an empty string.
        }
        varBornPutdate_RaSTD[0][istarAsTanuSED] = "ตนุเศษ";
    } else {
        varBornPutdate_RaSTD[0][istarAsTanuSED] = "ตนุเศษ, " + S;
    }

    // 'ใส่ค่าภพตนุเศษ  ให้กับดวงราศีจักร (ดวงอีแปะ) กำเนิด
    iCountR = varBornPutdate_StarStayR[0][istarAsTanuSED];
    for (let iPop = 0; iPop <= 11; iPop++) {
        // 'ใส่ค่าภพตนุเศษ ให้กับดวงราศีจักร (ดวงอีแปะ) 
        varBornPutdate_PopTanusedRasee[0][iCountR] = await Support.fcPopiToS(iPop); // Assuming fcPopiToS(iPop) is defined and returns a string.
        iCountR += 1;
        if (iCountR > 11) iCountR = 0;
    }
    // ใส่ค่าภพตนุเศษ เช่น  ดาว 0 = "สหัชชะ"  กำเนิด
    for (let Starii = 0; Starii <= iStarAll; Starii++) {
        varBornPutdate_PopTanusedStar[0][Starii] = varBornPutdate_PopTanusedRasee[0][varBornPutdate_StarStayR[0][Starii]];
    }

    // ''หาตนุเศษ ในดวงราศีจักร // ' หาตนุเศษ 
    let iStarRa10 = varBornPutdate_StarStayR; // 'ถ่ายทอดค่าจากตัวแปรอาร์เรย์ สมาชิกทุกตัวในอาร์เรย์นี้จะถูกถ่ายทอดไปยังตัวไปซ้ายมือ
    let iLukStayRasee10 = iStarRa10[0][10]; // '1. ลัคนาอยู่ราศีที่ 0-11 
    let iStarAsHomeLuk10 = await Support.fcRaseeToStarKased(iLukStayRasee10); // '2. ดาวเจ้าเรือนของลัคนา เช่น 5
    let iStarKasedOfLukAsRasee10 = iStarRa10[1][iStarAsHomeLuk10]; // '3. ดาวเกษตรของลัคนา อยู่ราศี... เช่น 0
    let iStarAsHouse10 = await Support.fcRaseeToStarKased(iStarKasedOfLukAsRasee10); // 'รับค่าดาวเจ้าบ้าน
    let iStarAsHouse10OfLukAsRasee = iStarRa10[1][iStarAsHouse10]; // '4. ดาวเจ้าเรือนลัคนาอยู่ในตำแหน่งราศีที่..... คือค่าจาก iStarRa10(0, iStarAsHouse) นั่นเอง

    istarAsTanuSED = await fcGetTanused_CastHoroscope(iLukStayRasee10, iStarAsHomeLuk10, iStarKasedOfLukAsRasee10, iStarAsHouse10OfLukAsRasee);
    varBornPutdate_starAsTanuSED[1] = istarAsTanuSED;

    // ''ใส่ข้อความว่า "ตนุเศษ" ใน STD (คุณภาพดาว)
    S = varBornPutdate_RaSTD[1][istarAsTanuSED];
    if (S === "-" || S === "") {
        if (S === "-") {
            S = S.replace("-", ""); // Replace '-' with an empty string.
        }
        varBornPutdate_RaSTD[1][istarAsTanuSED] = "ตนุเศษ";
    } else {
        varBornPutdate_RaSTD[1][istarAsTanuSED] = "ตนุเศษ, " + S;
    }

    // ''ใส่ค่าภพตนุเศษ  ให้กับดวง10ลัคน์
    iCountR = varBornPutdate_StarStayR[1][istarAsTanuSED]; // 'ตนุเศษ10ลัคน์ อยู่ที่ ราศี.....
    for (let iPop = 0; iPop <= 11; iPop++) {
        // ' ใส่ค่าภพตนุเศษ ให้กับดวง10ลัคน์ 
        varBornPutdate_PopTanusedRasee[1][iCountR] = await Support.fcPopiToS(iPop); // Assuming fcPopiToS(iPop) is defined and returns a string.
        iCountR += 1;
        if (iCountR > 11) iCountR = 0;
    }
    // ' ใส่ค่าภพตนุเศษ 10ลัคน์ เช่น  ดาว 0 = "สหัชชะ" 
    for (let Starii = 0; Starii <= 10; Starii++) { // 'ดาว 0-ลัคนา
        varBornPutdate_PopTanusedStar[1][Starii] = varBornPutdate_PopTanusedRasee[1][varBornPutdate_StarStayR[1][Starii]];
    }

    return {
        dayMooni: LunarDay.dayMooni,
        daySuni: LunarDay.daySuni,
        yearAgeInfo: yearAgeInfo,
        yourBirthday: yourBirthday,
        yourBirthdayDateUse: yourBirthdayDateUse,
        birthDateMoonInfo: birthDateMoonInfo,
        surisBirth: surisBirth,
        lblDaySBirthSuriyaKati: lblDaySBirthSuriyaKati,
        Rad: Rad,
        SpeedChar_Born,
        varBornPutdate_PopTanusedRasee,
        varBornPutdate_PopTanusedStar,
        varBornPutdate_PopLuksStar,
        varBornPutdate_StarStayR,
        varBornPutdate_StarO,
        varBornPutdate_StarL,
        varBornPutdate_LerkPass,
        varBornPutdate_MLerkPass,
        varBornPutdate_SecLerkPass,
        varBornPutdate_LerkNow,
        varBornPutdate_NLerkNow,
        varBornPutdate_No1To9LerkNow,
        varBornPutdate_FixedStarLerkNow,
        varBornPutdate_TriStarAsRasee,
        varBornPutdate_Nasss,
        varBornPutdate_NavangStarAsRasee,
        varBornPutdate_Tri,
        varBornPutdate_Trisss,
        varBornPutdate_TriyangHarmi,
        varBornPutdate_TriyangHarms,
        varBornPutdate_RaSTD,
        varBornPutdate_NaRaSTD,
        varBornPutdate_starAsTanuSED,
    };

}

// 'รับค่าสมผุส จร (สมผุสดาววันนี้)
async function CastHoroscope_SumSuriyatMain_Today(dateInput, Hour, min) {

    const LunarToday = await calculateLunarDay(dateInput, Hour, min, null, null);

    const lblDayToday = Support.fcDayi17ToS(LunarToday.daySuni);

    // ต้องแก้ไขเพราะทำให้ dateInput - 1 วัน 
    // const getMoonToday = await SetUpDownMThaiMoon(dateInput, LunarToday.dayMooni, LunarToday.daySuni);

    let SurisToday = lblDayToday.replace("(กลางวัน)", "").replace("(กลางคืน)", "");
    let lblDaySTodaySuriyaKati = "สุริยคติ: " + SurisToday;
    let iStarAll = 12; // 'กำหนดจำนวนสมาชิกอาเรย์
    const StarStayData = require('../json/StarStay.json');
    // 'เปรียบเทียบหาเวลาประสงค์
    let SystemYearThai = false;
    let day = dateInput.getDate();
    let month = dateInput.getMonth() + 1; // Adjust for zero-based index
    let year = dateInput.getFullYear();
    let yearTH = dateInput.getFullYear() + 543;
    let adjustedHour = Hour;
    let adjustedMinute = min;

    // เก็บค่าดาว
    let Rad = Array.from({
        length: 13
    }, () => new Array(21));

    // 'ดาวย้ายราศี
    let NumThisM, iNumMove, iMonthMove, iYearMove;
    let NowActionStari, Hh24, Hh24i, Hh24f, HStarMove, NumStarMove;

    // 'เริ่มคำนวณตามสูตรคัมภีร์สุริยยาตร์
    let Pi = parameter.pi;
    let JS = yearTH - 1181; // ' JS = จุลศักราช

    // 'H = หรคุณ
    let H = JS * 365.25875 + 1.46625;
    // 'H = (JS * 292207 + 373) / 800 + 1  ' คิดคำนวนอีกวิธีหนึ่ง
    let H1 = H - Math.floor(H);
    let X1 = H;

    // 'K = กัมมัชพล
    let K = (1 - (H - Math.floor(H))) * 800;
    let X2 = K;

    // 'M = มาสเกณฑ์
    let M = ((H * 703) + 650) / 20760;
    let M1 = (Math.floor(H) * 11 + 650) / 692;
    M1 = (Math.floor(H) + Math.floor(M1)) / 30;
    let X3 = M1;

    // 'D = ดิถี
    // 'D = (M - (Int(M))) * 30
    let d = (M1 - Math.floor(M1)) * 30;
    let X4 = d;

    // 'คำนวณหา อธิมาศ
    let ATD = (d - Math.floor(d) > 0.8) ? Math.floor(d) + 1 : Math.floor(d);

    let Mass = 0;
    let Pokatimas = true;
    let Rtikamas = false;

    if ([0, 1, 2, 3, 4, 5, 25, 26, 27, 28, 29].includes(ATD)) {
        Mass = 1;
        Pokatimas = false;
        Rtikamas = true;
    }

    let PRMass = Pokatimas ? "ปกติมาส" : "อธิกมาส";

    // 'W = อวมาน
    // 'W = (D - (Int(D))) * 692
    let W = (Math.floor(H) * 11 + 650) / 692;
    W = (W - Math.floor(W)) * 692;
    let X5 = W;

    // 'U = อุจพล
    let U = H - 621;
    U = U - (Math.floor(U / 3232)) * 3232;
    let X6 = U;

    // 'V = วาร
    let V = H - (Math.floor(H / 7)) * 7;
    let X7 = V;

    // 'หาวาลาเถลิกศก
    let VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;

    // 'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
    // 'dd = DateDiff("d", DateValue(vt), #6/24/2475#)
    let BeginNewYearNum = Math.floor(VT);
    let vtm = VT - BeginNewYearNum; // 'เถลิงศก วันที่
    let vtM1 = vtm;
    vtm *= 24;
    let BeginNewYearH = Math.floor(vtm); // 'เถลิงศก ชม.
    let vtmm = vtm - BeginNewYearH;
    vtmm *= 60;
    let BeginNewYearM = Math.floor(vtmm); // 'เถลิงศก นาที
    let BeginNewYearSec = (vtmm - BeginNewYearM); // * 60 
    BeginNewYearSec = BeginNewYearSec * 60;
    BeginNewYearSec = Math.floor(BeginNewYearSec);
    let BeginNewYearYearB = JS + 1181 // 'เถลิงศก ปี พ.ศ.
    let YJS = JS;

    let UsedBornBeginDMY = `เถลิงศกวันที่ ${BeginNewYearNum} เดือนเมษายน พ.ศ. ${BeginNewYearYearB} จ.ศ. ${JS} ค.ศ. ${BeginNewYearYearB - 543}` + ` เวลา ${BeginNewYearH} นาฬิกา ${BeginNewYearM} นาที ${BeginNewYearSec.toFixed(2)} วินาที ${PRMass}`;
    let BeginDMY_Talengsok = UsedBornBeginDMY;

    let DateSerialYMDdNewYear;
    if (SystemYearThai) {
        DateSerialYMDdNewYear = new Date(BeginNewYearYearB, 3, BeginNewYearNum); // Month is 0-indexed in JS: 3 = April
    } else {
        DateSerialYMDdNewYear = new Date(BeginNewYearYearB - 543, 3, BeginNewYearNum + 1);
    }

    let Def = Math.floor((dateInput - DateSerialYMDdNewYear) / (1000 * 60 * 60 * 24));

    let JSBornShow = JS;

    //'defV = DateDiff("d", DateSerialYMDdNewYear, Text18.Text) - 1
    //'คำนวนหาสุรทินประสงค์กับวันเถลิกศก หากน้อยกว่าต้องคำนวนใหม่
    if (Def < 0) {

        JS = yearTH - 1182; // ' JS = จุลศักราช

        H = JS * 365.25875 + 1.46625;

        H1 = H - (Math.floor(H));
        X1 = H;

        K = (1 - (H - (Math.floor(H)))) * 800;
        X2 = K;

        M = ((H * 703) + 650) / 20760;
        M1 = (Math.floor(H) * 11 + 650) / 692;
        M1 = (Math.floor(H) + Math.floor(M1)) / 30;
        X3 = M1;

        d = (M1 - Math.floor(M1)) * 30;
        X4 = d;

        W = (Math.floor(H) * 11 + 650) / 692;
        W = (W - Math.floor(W)) * 692;
        X5 = W;

        U = H - 621;
        U = U - (Math.floor(U / 3232)) * 3232;
        X6 = U;

        V = H - (Math.floor(H / 7)) * 7;
        X7 = V;

        VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;

        if (SystemYearThai) {
            DateSerialYMDdNewYear = new Date(BeginNewYearYearB, 3, BeginNewYearNum);
        } else {
            DateSerialYMDdNewYear = new Date(BeginNewYearYearB - 543 - 1, 3, BeginNewYearNum + 1);
        }

        JSBornShow = JS;
        Def = Math.floor((dateInput - DateSerialYMDdNewYear) / (1000 * 60 * 60 * 24));
    }

    // '****************คำนวณอธิวาร*************
    // 'x4 คือ ดิถี เถลิกศก
    let PD = parseFloat(X4);
    if (PD - Math.floor(PD) > 0.8) {
        PD = Math.floor(PD) + 1;
    } else {
        PD = Math.floor(PD);
    }

    let JPd;
    if (Mass === 1) {
        JPd = 29 - PD + 105;
    } else if (Mass === 0) {
        JPd = 29 - PD + 75;
    }

    let Md2;
    let mDate;

    if (SystemYearThai) {
        Md2 = new Date(BeginNewYearYearB, 3, BeginNewYearNum); // Month is 0-indexed in JavaScript (0 is January)
    } else {
        Md2 = new Date(BeginNewYearYearB - 543, 3, BeginNewYearNum + 1);
    }

    mDate = new Date(Md2);
    mDate.setDate(mDate.getDate() + JPd);
    let x18 = mDate;

    // 'DefM = เวลา 24.00 น. ถึง วันประสงค์
    let DefM = (parseInt(adjustedHour) * 60 + parseInt(adjustedMinute)) / 1440;

    // 'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน
    let DefH = 1 - vtM1;
    let DefV = (mDate - DateSerialYMDdNewYear) / (1000 * 60 * 60 * 24) - 1;

    // 'เวลาประสงค์
    let DefTime = (parseInt(adjustedMinute) / 60) + parseInt(adjustedHour);
    // DefTime = parseFloat(DefTime.toFixed(2));

    let T1 = (parseInt(adjustedHour) * 60 + parseInt(adjustedMinute));

    let TQ;
    if (T1 < (6 * 60)) {
        TQ = 1440 + T1 - (6 * 60);
    } else {
        TQ = T1 - (6 * 60);
    }

    let Deff1 = Def + DefM + DefH;
    let Deff2 = DefV + DefH + 0.25;

    // '********   วิธีคำนวนหาอัตตาประสงค์  *********
    // 'HT = หรคุณอัตตรา
    let HT = Deff1 + H;
    let VHT = Deff2 + H;
    let x11 = HT;
    let Fm = Def + Math.floor(H) + 233142;

    // 'KT = กัมมัชพลอัตตา
    let kt = (Deff1 * 800 + K);
    let x12 = Math.floor(kt);

    // 'MT = มาสเกณท์อัตตา
    let MT = (HT * 703 + 650) / 20760;
    let x13 = MT;

    // 'DT = ดิถีอัตตา
    let DT = (MT - Math.floor(MT)) * 30;
    let x14 = DT;

    // 'WT = อวมานอัตตา
    let WT = ((DT - Math.floor(DT)) * 692);
    let x15 = WT;

    // 'UT = อุจจพลอัตตา
    let UT = HT - 621;;
    UT = UT - (Math.floor(UT / 3232)) * 3232;
    let x16 = UT;

    // 'VT = วารอัตตา
    VT = HT - (Math.floor(HT / 7)) * 7;
    let x17 = VT;

    // ' สมผุสดาว
    // '==========================================================================================
    // '*****สมผุสอาทิตย์******
    // 'สุรทินประสงค์ deF1
    // 'กัมมัชพลประสงค์  KTP
    let AA = 0,
        Ps = 0,
        Vs = 0,
        VS2 = 0;
    let Sun = await CastHoroscope_Sun(Deff1, AA, Ps, Vs, JS);
    Rad[1][0] = Sun.AA; // 'สมผุสอาทิตย์ คือ AA สามารถเอาไปหาค่า ราศี องศา ลิปดา ได้เลย เช่น Ra = AA / 1800 หาสมผุสดาวนี้ว่าอยู่ราศีใด aRa คือ ราศี 1 ราศีมี 1800 ลิปดา
    let TemPS = Sun.Ps;
    let TemVS = Sun.Vs;

    // 'คำนวนหาวันที่ดาวย้ายราศี
    let TemAA = Math.floor(Sun.AA / 1800);
    let TemTime = DefTime; // 'เวลาประสงค์
    let MN;
    let DefMN;
    let Deff3;

    let iMinute35Day_Star1 = 50400; // 'ตอนแรกนับ 31 วัน (44640 นาที) แต่เจอ bug จึงนับเผื่อไว้ 35 วันไปเลย (50400 นาที)  31*24*60=50400  ดาวอาทิตย์เดิน 1 เดือน/1 ราศี
    for (let K = 0; K <= iMinute35Day_Star1; K++) {
        DefTime = TemTime + (K / 60); // TemTime should be defined elsewhere
        DefMN = (DefTime * 60) / 1440;
        Deff3 = Def + DefMN + DefH; // ' Defh = เวลาเถลิงศกถึงเวลา 24 น. ของอีกวันหนึ่ง
        AA = 0;
        Ps = 0;
        VS2 = 0;
        Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
        if (Sun.AA / 1800 === Math.floor(Sun.AA / 1800) || TemAA < Math.floor(Sun.AA / 1800) || TemAA > Math.floor(Sun.AA / 1800)) {
            MN = DefTime;
            TemAA = Math.floor(Sun.AA / 1800);
            K = iMinute35Day_Star1
            break; // Exit the loop when condition is met
        }
    }

    DefTime = TemTime;
    Vs = TemVS;
    Ps = TemPS;

    let Hmove = Math.floor(MN) // 'ชัวโมงที่ดาวย้ายราศี
    let Mmove = Math.floor((MN - Math.floor(MN)) * 60) // 'นาที่ที่ดาวย้ายราศี
    let dDMYforTodayMove = dateInput;

    Rad[1][8] = dDMYforTodayMove; //' วดป ที่ดาวย้ายมา
    Rad[1][6] = Hmove; //'ชม. ที่ดาวย้ายมา
    Rad[1][7] = Mmove; //'นาที ที่ดาวย้ายมา

    Sun = await CastHoroscope_Sun(Deff2, 0, 0, 0, JS);
    Rad[1][5] = Sun.AA;
    let VPs = Sun.Ps;
    let VVs = Sun.Vs;

    // CS = YearBTodayi - 543 'หา ค.ศ.
    let CS = year; //1991

    // '******************************** 1 สมผุสจันทร์ ******************************
    let AM = 0,
        HM = 0,
        DM = 0;
    Vs = TemVS;
    let Moon = await CastHoroscope_Moon(Fm, Vs, Pi, AM, DefTime, HM, DM, Zm = null, Mum = null);
    Rad[2][0] = Moon.AM; // 'สมผุสจันทร์ คือ AM
    // Rad[2][18] = Moon.Zm; // 'มัธยมจันทร์
    // '====================='คำนวณหาดาวจันทร์ย้ายราศี (ดาวจันทร์ยก)===============================================
    NowActionStari = 2;
    let TemAM = Math.floor(Moon.AM / 1800);
    TemTime = DefTime;

    //'อยากรู้ว่าจะย้ายไปเมื่อไหร่ (เหลือเวลาเท่าไหร่จึงจะย้าย)
    let StarWillMoveH = [];
    let StarWillMoveM = [];

    // 15.87 15.88333
    // For K = 0 To 4320 '3 วัน (นาที)
    for (K = 0; K <= 4320; K++) {
        DefTime = TemTime + (K / 60);
        DefMN = (DefTime * 60) / 1440;
        Deff3 = Def + DefMN + DefH;
        AA = 0;
        Ps = 0;
        Vs = 0;
        Sun = await CastHoroscope_Sun(Deff3, AA, Ps, Vs, JS);
        Moon = await CastHoroscope_Moon(Fm, Sun.Vs, Pi, AM, DefTime, HM, DM, Zm = null, Mum = null);
        if (Moon.AM / 1800 === Math.floor(Moon.AM / 1800) || TemAM < Math.floor(Moon.AM / 1800) || TemAM > Math.floor(Moon.AM / 1800)) {
            MN = Moon.DefTime;
            TemAM = Math.floor(Moon.AM / 1800);
            K = 4320;
        }
    }

    DefTime = TemTime;

    Hmove = Math.floor(MN); //'ชั่วโมงที่ดาวย้ายราศี
    Mmove = Math.floor((MN - Math.floor(MN)) * 60); //'นาทีที่ดาวย้ายราศี
    dDMYforTodayMove = dateInput;

    StarWillMoveH[NowActionStari] = Math.floor(MN) // 'รับค่า ชม.  (อีก...ชม. ดาวจันทร์จะย้าย)
    StarWillMoveM[NowActionStari] = Math.floor((MN - Math.floor(MN)) * 60) // ''รับค่า นาที.  (อีก...นาที. ดาวจันทร์จะย้าย)

    // 'ดาว n ย้ายราศี เมื่อเวลา
    // 'ค่าที่ได้มา เช่น StarWillMoveH(stari)=50  StarWillMoveH(stari)=45  คือ มาถึงวันที่นี้ อีก 50 ชม. กับ 45 นาที ดาวn จะย้าย
    Hh24 = Math.round(StarWillMoveH[NowActionStari] / 24); // 'เอา ชม. / 24
    Hh24i = Math.floor(Hh24); // 'ดึงเอาเฉพาะผลลัพธ์ (จำนวนเต็ม) ไม่เอาเศษ (ทศนิยม)
    Hh24f = Hh24 - Hh24i; // 'ดึงเอาเฉพาะเศษที่ / 24 (จุดทศนิยม)
    HStarMove = Hh24f * 24; // 'เอาเศษมา * 24 จะได้เป็น ชม. ที่ดาวย้าย
    NumStarMove = Hh24i + day; // 'เอาผลลัพธ์ + วันที่นี้ = วันที่ที่ดาวนี้จะย้าย

    NumThisM = await fcGetDayInMonth(month, yearTH) // 'ฟังก์ชันหา จำนวนวัน ในเดือน ว่ามี 28 29 30 หรือ 31 วันกันแน่

    // 'เก็บค่าไว้ใช้ประโยชน์ (เก็บไว้ในตัวแปรแทน DB)
    let varTodayPutdate_StarMoveGoDay = [];
    let varTodayPutdate_StarMoveGoMonth = [];
    let varTodayPutdate_StarMoveGoYearB = [];
    let varTodayPutdate_StarMoveGoH = [];
    let varTodayPutdate_StarMoveGoM = [];

    if (NumStarMove <= NumThisM) {
        varTodayPutdate_StarMoveGoDay[NowActionStari] = NumStarMove; // 'ดาว...NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป วันที่....n.....
        varTodayPutdate_StarMoveGoMonth[NowActionStari] = iMonthMove; // 'ดาว..NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป เดือน....n....
        varTodayPutdate_StarMoveGoYearB[NowActionStari] = iYearMove; // 'ดาว...NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป ปี....n.....
        varTodayPutdate_StarMoveGoH[NowActionStari] = HStarMove.toString().padStart(2, '0'); // 'ดาว...NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป ชม.....ss.....
        varTodayPutdate_StarMoveGoM[NowActionStari] = StarWillMoveM[NowActionStari].toString().padStart(2, '0'); // 'ดาว...NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป นาที.....ss.....
    } else { // 'ถ้า การย้ายของดาวนี้ จะย้ายในวันที่ที่ > จำนวนเดือนนี้ เช่น เดือนนี้คือ ม.ค. ดาวจะย้ายวันที่ 32 แสดงว่า ดาวจะย้ายในวันที่ 1 ก.พ. คือเดือนหน้า (32-31=1)
        iNumMove = NumStarMove - NumThisM;
        iMonthMove = month + 1; //'เพิ่มเดือน เพราะวันที่เกิน
        iYearMove = year;
        if (iMonthMove > 12) {
            iMonthMove = 1;
            iYearMove = year + 1;
        }
        // 'เก็บค่าไว้ใช้ประโยชน์ (เก็บไว้ในตัวแปรแทน DB)
        varTodayPutdate_StarMoveGoDay[NowActionStari] = NumStarMove; // 'ดาว...NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป วันที่....n.....
        varTodayPutdate_StarMoveGoMonth[NowActionStari] = iMonthMove; // 'ดาว..NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป เดือน....n.....
        varTodayPutdate_StarMoveGoYearB[NowActionStari] = iYearMove; // 'ดาว...NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป ปี....n.....
        varTodayPutdate_StarMoveGoH[NowActionStari] = HStarMove.toString().padStart(2, '0'); // 'ดาว...NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป ชม.....ss.....
        varTodayPutdate_StarMoveGoM[NowActionStari] = StarWillMoveM[NowActionStari].toString().padStart(2, '0'); // 'ดาว...NowActionStari.... จะย้ายออกจากราศีนี้ไปสู่ราศีต่อไป นาที.....ss.....
    }
    // console.log(varTodayPutdate_StarMoveGoDay ,varTodayPutdate_StarMoveGoMonth , varTodayPutdate_StarMoveGoYearB , varTodayPutdate_StarMoveGoH , varTodayPutdate_StarMoveGoM);

    // '========================จบคำนวณหาดาวจันทร์ย้ายราศี (ดาวจันทร์ยก)============================================
    let HHM = Moon.HM;
    // '*****************************  สมผุสจันทร์ วันแรม 1 ค่ำ เดือน 8  ************
    let MyDay = mDate.getUTCDate();
    let MyMonth = mDate.getUTCMonth() + 1;
    Fm = 365 * CS + MyDay + Math.floor(275 * MyMonth / 9) + 2 * Math.floor(0.5 + 1 / MyMonth) + Math.floor(CS / 4) - Math.floor(CS / 100) + Math.floor(CS / 400) + 2;
    AM = 0;
    Vs = VVs;
    HM = 0;
    DM = 0;
    let Moon2 = await CastHoroscope_Moon(Fm, Vs, Pi, AM, DefTime, HM, DM, Moon.Zm, Moon.Mum);
    Rad[2][5] = Moon2.AM; //16544 //16545
    let GoodM = Rad[2][5] * 0.00125;
    let GoodM1 = GoodM;

    // 'ตรวจสอบฤกษ์ของวันแรม 1 ค่ำ เดือน 8
    let VGm1 = Math.floor(Rad[2][5] * 0.00125);

    // 'คืนค่า Vs และ Ps
    Vs = TemVS;
    Ps = TemPS;
    HM = HHM;

    Rad[2][8] = dDMYforTodayMove; //' วดป ที่ดาวย้ายมา
    Rad[2][6] = Hmove; //'ชม. ที่ดาวย้ายมา
    Rad[2][7] = Mmove; //'นาที ที่ดาวย้ายมา
    //' จบสมผุสดาวจันทร์   จบสมผุสดาวจันทร์  จบสมผุสดาวจันทร์  จบสมผุสดาวจันทร์  จบสมผุสดาวจันทร์  จบสมผุสดาวจันทร์  จบสมผุสดาวจันทร์

    // '******************************3 สมผุสอังคาร***************************
    let mnk = 0;
    let A0 = 1,
        A1 = 2,
        A2 = 16,
        A3 = 505,
        b = 5420,
        c = 127,
        e = 4 / 15;
    d = 45, AA = 0;
    const Mars = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[3][0] = Mars.AA; // 'สมผุสอังคาร คือ AA
    Z = Mars.Z
    // Rad[3][18] = Mars.Z; // 'มัธยมอังคาร

    // 'คำนวนหาวันที่ดาวย้ายราศี
    TemAA = Mars.AA;
    let TemJs = JS
    let TemDefh = DefH;
    TemAM = Math.floor(Mars.AA / 1800);
    let JK = 0;
    let VS = 0;

    for (K = 0; K <= 360; K++) {

        DefMN = (DefTime * 60) / 1440;
        Deff3 = Def + DefMN + DefH + K;
        AA = 0, Ps = 0, VS2 = 0;
        Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS)
        A0 = 1, A1 = 2, A2 = 16, A3 = 505, b = 5420, c = 127, d = 45, e = 4 / 15, AA = 0, Vs = Sun.Vs;
        Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);
        if (Star.AA / 1800 === Math.floor(Star.AA / 1800) || TemAM < Math.floor(Star.AA / 1800) || TemAM > Math.floor(Star.AA / 1800)) {

            MN = DefTime;
            mnk = K;

            if (TemAM < Math.floor(Star.AA / 1800)) {
                Deff3 -= 1;
            }

            let dDMYforToday = new Date(dateInput.getTime()); // โคลนวัตถุ Date ด้วยการใช้ getTime()
            dDMYforToday = dDMYforToday.setDate(dDMYforToday.getDate() + K - 1);
            let ddmk1 = new Date(dDMYforToday);

            let Yearddmk1 = yearTH;
            let FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1);
            let findVt = Math.floor(FindTaleanSuk.findVt);

            let SystemYearThai = false;
            let Dnewyear1;

            if (SystemYearThai) {
                Dnewyear1 = new Date(Yearddmk1, 3, findVt); // Month is 0-indexed in JS: 3 = April
            } else {
                Dnewyear1 = new Date(Yearddmk1 - 543, 3, findVt + 1);
            }

            let Mkdef = (ddmk1 - Dnewyear1) / (1000 * 60 * 60 * 24);
            Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

            let vtd;

            // if (Mkdef < 0) {
            //     JS = (Yearddmk1) - 1182;
            //     VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
            //     vtd = Math.floor(VT);
            //     vtm = VT - vtd
            //     vtM1 = vtm
            // } else {
            //     JS = (Yearddmk1) - 1181;
            //     VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
            //     vtd = Math.floor(VT);
            //     vtm = VT - vtd;
            //     vtM1 = vtm;
            // }

            JS = Yearddmk1 - (Mkdef < 0 ? 1182 : 1181);

            VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
            // 'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
            vtd = Math.floor(VT);
            vtm = VT - vtd;
            vtM1 = vtm;

            //''เปรียบเทียบหาเวลาประสงค์
            DefM = (Math.floor(adjustedHour) * 60 + Math.floor(adjustedMinute)) / 1440; //'DefM = เวลา 24.00 น. ถึง วันประสงค์
            DefH = 1 - vtM1; //'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน

            // 'เวลาประสงค์
            DefTime = (Math.floor(adjustedMinute) / 60) + Math.floor(adjustedHour);
            T1 = (Math.floor(adjustedHour) * 60 + Math.floor(adjustedMinute));

            if (T1 < (6 * 60)) {
                TQ = 1440 + T1 - (6 * 60);
            } else {
                TQ = T1 - (6 * 60); //'สมมุติว่ารุ่งอรุ่ณเวลา 6.00 น.
            }

            // 19828 0.6819444444444445 0.9062500000000036
            //console.log(Mkdef , DefM , DefH);
            Deff1 = Mkdef + DefM + DefH;
            Deff2 = DefV + DefH + 0.25;

            K = 360;

            for (JK = 0; JK <= 1440; JK++) {

                DefTime = TemTime + (JK / 60);
                DefMN = (DefTime * 60) / 1440;
                Deff3 = Mkdef + DefMN + DefH;
                AA = 0, Ps = 0, VS2 = 0;
                Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
                A0 = 1, A1 = 2, A2 = 16, A3 = 505, b = 5420, c = 127, d = 45, e = 4 / 15, AA = 0, Vs = Sun.Vs;
                Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z = null);
                if (Star.AA / 1800 === Math.floor(Star.AA / 1800) || TemAM < Math.floor(Star.AA / 1800)) {
                    MN = DefTime;
                    TemAM = Math.floor(Star.AA / 1800);
                    JK = 1440;
                }
            }
        }
    }

    DefTime = TemTime;
    Hmove = Math.floor(MN) // 'ชัวโมงที่ดาวย้ายราศี
    Mmove = Math.floor((MN - Math.floor(MN)) * 60) // 'นาที่ที่ดาวย้ายราศี
    let MNKMove = mnk - 1;

    //'คืนค่าเดิม
    let MNO = 0;
    Vs = TemVS;
    Ps = TemPS;
    HM = HHM;
    JS = TemJs;
    AA = TemAA;
    DefH = TemDefh;
    const TimeStarMoveMars = await CastHoroscope_TimeStarMove(A0, A1, A2, A3, b, c, d, e, AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO, JS, adjustedHour, adjustedMinute);
    Rad[3][8] = TimeStarMoveMars.dDMYforTodayMove; //' วดป ที่ดาวย้ายมา
    Rad[3][6] = TimeStarMoveMars.Hmove; //'ชม. ที่ดาวย้ายมา
    Rad[3][7] = TimeStarMoveMars.Mmove; //'นาที ที่ดาวย้ายมา

    Vs = TemVS;
    Ps = TemPS;
    HM = HHM;
    MNO = 0;
    JS = TemJs;
    AA = TemAA;
    DefH = TemDefh;
    // ' จบสมผุสดาวอังคาร   จบสมผุสดาวอังคาร  จบสมผุสดาวอังคาร  จบสมผุสดาวอังคาร  จบสมผุสดาวอังคาร  จบสมผุสดาวอังคาร  จบสมผุสดาวอังคาร

    // ' เริ่มสมผุสดาวพุธ   เริ่มสมผุสดาวพุธ  เริ่มสมผุสดาวพุธ  เริ่มสมผุสดาวพุธ  เริ่มสมผุสดาวพุธ  เริ่มสมผุสดาวพุธ  เริ่มสมผุสดาวพุธ
    // '*******************************4 สมผุสพุธ*******************************
    A0 = 7, A1 = 46, A2 = 4, A3 = 1, b = 10642, c = 220, d = 100, e = 21, AA = 0;
    const Mercury = await CastHoroscope_StarM(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[4][0] = Mercury.AA;
    //'คำนวนหาวันที่ดาวย้ายราศี
    TemJs = JS;
    TemAA = Mercury.AA;
    TemDefh = DefH;
    // 7 46 4 1 10642 220 100 21 20689      2.75 9 0.9229166666666667 0.906250000000004  2024-04-26               2.75 0
    // 7 46 4 1 10642 220 100 21 0          2.75 9 1.1145833333333333 0.9062500000000036 2024-04-26T00:00:00.000Z 2.75 0
    // console.log(A0, A1, A2, A3, b, c, d, e, Mercury.AA.AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO);
    const TimeStarMoveMercury = await CastHoroscope_TimeStarMoveM(A0, A1, A2, A3, b, c, d, e, Mercury.AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO, JS, adjustedHour, adjustedMinute);
    JS = TemJs;
    AA = TemAA;
    DefH = TemDefh;
    Vs = TemVS;
    Ps = TemPS;
    Rad[4][8] = TimeStarMoveMercury.dDMYforTodayMove; //' วดป ที่ดาวย้ายมา
    Rad[4][6] = TimeStarMoveMercury.Hmove; // 'ชม. ที่ดาวย้ายมา
    Rad[4][7] = TimeStarMoveMercury.Mmove; // 'นาที ที่ดาวย้ายมา
    // ' จบสมผุสดาวพุธ   จบสมผุสดาวพุธ  จบสมผุสดาวพุธ  จบสมผุสดาวพุธ  จบสมผุสดาวพุธ  จบสมผุสดาวพุธ  จบสมผุสดาวพุธ

    //  ' เริ่มสมผุสดาวพฤหัส   เริ่มสมผุสดาวพฤหัส  เริ่มสมผุสดาวพฤหัส  เริ่มสมผุสดาวพฤหัส  เริ่มสมผุสดาวพฤหัส  เริ่มสมผุสดาวพฤหัส  เริ่มสมผุสดาวพฤหัส
    //  '********************************5 สมผุสพฤหัสบดี****************************
    A0 = 1, A1 = 12, A2 = 1, A3 = 1032, b = 14297, c = 172, d = 92, e = 3 / 7, AA = 0;
    const Jupiter = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[5][0] = Jupiter.AA;
    // 'คำนวนหาวันที่ดาวย้ายราศี
    TemJs = JS;
    TemAA = AA;
    TemDefh = DefH;
    const TimeStarMoveJupiter = await CastHoroscope_TimeStarMove(A0, A1, A2, A3, b, c, d, e, Jupiter.AA, DefTime, Def, TimeStarMoveMercury.DefMN, DefH, dateInput, TemTime, MNO, JS, adjustedHour, adjustedMinute);
    JS = TemJs;
    AA = TemAA;
    DefH = TemDefh;
    Vs = TemVS;
    Ps = TemPS;
    Rad[5][8] = TimeStarMoveJupiter.dDMYforTodayMove; // ' วดป ที่ดาวย้ายมา
    Rad[5][6] = TimeStarMoveJupiter.Hmove; // 'ชม. ที่ดาวย้ายมา
    Rad[5][7] = TimeStarMoveJupiter.Mmove; // 'นาที ที่ดาวย้ายมา
    //' จบสมผุสดาวพฤหัส   จบสมผุสดาวพฤหัส  จบสมผุสดาวพฤหัส  จบสมผุสดาวพฤหัส  จบสมผุสดาวพฤหัส  จบสมผุสดาวพฤหัส  จบสมผุสดาวพฤหัส

    // ' เริ่มสมผุสดาวศุกร์   เริ่มสมผุสดาวศุกร์  เริ่มสมผุสดาวศุกร์  เริ่มสมผุสดาวศุกร์  เริ่มสมผุสดาวศุกร์  เริ่มสมผุสดาวศุกร์  เริ่มสมผุสดาวศุกร์
    // '*********************************สมผุสศุกร์**********************************
    A0 = 5, A1 = 3, A2 = -10, A3 = 243, b = 10944, c = 80, d = 320, e = 11, AA = 0;
    const Venus = await CastHoroscope_StarM(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[6][0] = Venus.AA;
    // 'คำนวนหาวันที่ดาวย้ายราศี
    TemJs = JS;
    TemAA = AA;
    TemDefh = DefH;
    const TimeStarMoveVenus = await CastHoroscope_TimeStarMoveM(A0, A1, A2, A3, b, c, d, e, Venus.AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO, JS, adjustedHour, adjustedMinute);
    JS = TemJs;
    AA = TemAA;
    DefH = TemDefh;
    Vs = TemVS;
    Ps = TemPS;
    Rad[6][8] = TimeStarMoveVenus.dDMYforTodayMove; //' วดป ที่ดาวย้ายมา
    Rad[6][6] = TimeStarMoveVenus.Hmove; //'ชม. ที่ดาวย้ายมา
    Rad[6][7] = TimeStarMoveVenus.Mmove; //'นาที ที่ดาวย้ายมา
    // ' จบสมผุสดาวศุกร์   จบสมผุสดาวศุกร์  จบสมผุสดาวศุกร์  จบสมผุสดาวศุกร์  จบสมผุสดาวศุกร์  จบสมผุสดาวศุกร์  จบสมผุสดาวศุกร์

    // '***********************************สมผุสเสาร์*********************************
    A0 = 1, A1 = 30, A2 = 6, A3 = 10000, b = 11944, c = 247, d = 63, e = 7 / 6, AA = 0;
    const Saturn = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[7][0] = Saturn.AA;

    let TemDefMn, Birthday = null;
    TemJs = JS;
    TemAA = AA;
    TemDefh = DefH;
    TemDefMn = DefMN;
    const TimeStarMove72Saturn = await CastHoroscope_TimeStarMove72(A0, A1, A2, A3, b, c, d, e, Saturn.AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO, JS, adjustedHour, adjustedMinute);
    // console.log(TimeStarMove72Saturn);
    JS = TemJs;
    AA = TemAA;
    DefH = TemDefh;
    DefMN = TemDefMn;
    Vs = TemVS;
    Ps = TemPS;
    Rad[7][8] = TimeStarMove72Saturn.dDMYforTodayMove; // 'วันที่ดาวย้าย
    Rad[7][6] = TimeStarMove72Saturn.Hmove; // 'ชม ที่ดาวย้าย
    Rad[7][7] = TimeStarMove72Saturn.Mmove; // 'นาที ที่ดาวย้าย
    // ' จบสมผุสเสาร์   จบสมผุสเสาร์  จบสมผุสเสาร์  จบสมผุสเสาร์  จบสมผุสเสาร์  จบสมผุสเสาร์  จบสมผุสเสาร์

    //'*************************************สมผุสมฤตยู*******************************
    A0 = 1, A1 = 84, A2 = 1, A3 = 7224, b = 16277, c = 124, d = 644, e = 3 / 7, AA = 0;
    const Deadly = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[0][0] = Deadly.AA;
    TemJs = JS;
    TemAA = AA;
    TemDefh = DefH;
    const TimeStarMove72Deadly = await CastHoroscope_TimeStarMove72(A0, A1, A2, A3, b, c, d, e, Deadly.AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO, JS, adjustedHour, adjustedMinute);
    JS = TemJs;
    AA = TemAA;
    DefH = TemDefh;
    Vs = TemVS;
    Ps = TemPS;

    Rad[0][8] = TimeStarMove72Deadly.dDMYforTodayMove; //'วันที่ดาวย้าย
    Rad[0][6] = TimeStarMove72Deadly.Hmove; //'ชม ที่ดาวย้าย
    Rad[0][7] = TimeStarMove72Deadly.Mmove; //'นาที ที่ดาวย้าย
    // ' จบสมผุสมฤตยู   จบสมผุสมฤตยู  จบสมผุสมฤตยู  จบสมผุสมฤตยู  จบสมผุสมฤตยู  จบสมผุสมฤตยู  จบสมผุสมฤตยู

    //'*************************************สมผุสราหู********************************
    Z = Math.floor(Ps / 20) + Math.floor(Ps / 265);
    Z = Z - Math.floor(Z / 21600) * 21600;
    AA = 15150 - Z;
    if (AA < 0) {
        AA += 21600;
    }
    if (AA > 21600) {
        AA %= 21600;
    }
    Rad[8][0] = AA;
    TemJs = JS;
    TemAA = AA;
    TemDefh = DefH;
    DefTime = TimeStarMove72Deadly.DefTime;
    TemTime = TimeStarMove72Deadly.TemTime;
    // 20987 6 9 0.7625             0.906250000000004  4/26/2024                6                  46.15 
    // 20987 6 9 1.9777777777777779 0.9062500000000036 2024-04-26T00:00:00.000Z 23.466666666666665 23.466666666666665 1386 23 28
    // console.log(AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MN, JS, adjustedHour, adjustedMinute);
    const TimeStarMoveRahu = await CastHoroscope_TimeStarMove82(AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MN, JS, adjustedHour, adjustedMinute);
    Rad[8][8] = TimeStarMoveRahu.dDMYforTodayMove //'วันที่ดาวย้าย
    Rad[8][6] = TimeStarMoveRahu.Hmove //'ชม ที่ดาวย้าย
    Rad[8][7] = TimeStarMoveRahu.Mmove //'นาที ที่ดาวย้าย
    // ' จบสมผุสราหู   จบสมผุสราหู  จบสมผุสราหู  จบสมผุสราหู  จบสมผุสราหู  จบสมผุสราหู  จบสมผุสราหู

    // '*************************************สมผุสเกตุ 9********************************
    //Z = (Math.floor((min) / 60) + Math.floor(Hour)) / 24;
    Z = ((min / 60) + Hour) / 24;
    K = HM - 344; //' HM=หรคุณประสงค์ - 344
    K = K - Math.floor(K / 679) * 679 //' เมื่อเอา HM หรคุณประสงค์ - 344  ได้เท่าใดเอา 679 หาร เศษเป็น พลพระเกตุ  K คือ พลพระเกตุ
    let ZZ = Math.floor((K + Z) * 21600 / 679);
    AA = 21600 - ZZ;
    if (AA < 0) {
        AA += 21600;
    }
    if (AA > 21600) {
        AA -= (Math.floor(AA / 21600) * 21600);
    }

    Rad[9][0] = AA;
    TemAA = AA;
    // 506260 19659 4/27/2027 12
    // 506260 19659 2024-04-27T00:00:00.000Z 12
    // console.log(HM, TemAA, dateInput, TemAM);
    const TimeStarMove9 = await CastHoroscope_TimeStarMove9(HM, TemAA, dateInput);
    Rad[9][8] = TimeStarMove9.dDMYforTodayMove; //'วันที่ดาวย้าย
    Rad[9][6] = TimeStarMove9.Hmove; //'ชม ที่ดาวย้าย
    Rad[9][7] = TimeStarMove9.Mmove; //'นาที ที่ดาวย้าย

    let ii;
    c = 0;
    // 'ดาวเดินหน้า 0 1 2 3 4 5 6 7
    for (let i = 0; i <= 7; i++) {
        const AutoMinit = await CastHoroscope_AutoMinit(Rad[i][0], c, TQ, b);
        Rad[i][1] = AutoMinit.b;
        b = AutoMinit.b;
        // testbox = await fcTest_SompudStar_RadToResultRaOngLib(Rad[i][1]);
        // console.log('ลัคนา ' + i + ' สมผุส ' + testbox + '  ' + b);
    }
    // 'ดาวเดินถอยหลัง  8 9
    for (let i = 8; i <= 9; i++) {
        const Antiautominit = await CastHoroscope_Antiautominit(Rad[i][0], c, TQ, b);
        Rad[i][1] = Antiautominit.b;
        b = Antiautominit.b;
        // testbox = await fcTest_SompudStar_RadToResultRaOngLib(Rad[i][1]);
        // console.log('ลัคนา ' + i + ' สมผุส ' + testbox + '  ' + b);
    }

    // ลัคนา 0 สมผุส 11.12.08  20528.399999999998    20528.4
    // ลัคนา 1 สมผุส 10.17.55  19075                 19075 
    // ลัคนา 2 สมผุส 06.07.46  11266.285714285714    11266.28571 
    // ลัคนา 3 สมผุส 08.22.03  15723                 15723     
    // ลัคนา 4 สมผุส 09.09.13  16753.333333333336    16753.3333333         
    // ลัคนา 5 สมผุส 11.06.39  20199                 20199     
    // ลัคนา 6 สมผุส 10.01.32  18092.5               18092.5 
    // ลัคนา 7 สมผุส 08.09.11  14951.6               14951.6     
    // ลัคนา 8 สมผุส 01.14.40  2680.0000000000014    2680.00     
    // ลัคนา 9 สมผุส 00.09.24  564.3999999999983     564.399  

    // '===================================================

    // Assuming these variables will store values like in a kind of database as per your description
    let strNoteMove = ''; // Initialize the note string

    for (let i = 0; i <= 9; i++) {
        let DMYTestMove = Rad[i][8];
        let HTestMove = Rad[i][6];
        let MTestMove = Rad[i][7];

        if (HTestMove >= 24) {
            let bb = new Date(DMYTestMove.getTime());
            DMYTestMove = new Date(bb.getTime() + Math.floor(HTestMove / 24) * 24 * 60 * 60 * 1000);
            HTestMove -= Math.floor(HTestMove / 24) * 24;
        }

        let dDMYStarMove = new Date(DMYTestMove.getTime()); // Preserving the new date
        // Formatting dates and times
        //strNoteMove += `\nดาว ${i} จะย้าย ${dDMYStarMove.getDate().toString().padStart(2, '0')}/${(dDMYStarMove.getMonth() + 1).toString().padStart(2, '0')}/${(dDMYStarMove.getFullYear() + 543).toString()} เวลา ${HTestMove.toString().padStart(2, '0')}:${MTestMove.toString().padStart(2, '0')} น.`;
        strNoteMove += `\nดาว ${i} จะย้าย ${dDMYStarMove.getUTCDate().toString().padStart(2, '0')}/${(dDMYStarMove.getUTCMonth() + 1).toString().padStart(2, '0')}/${(dDMYStarMove.getUTCFullYear() + 543).toString()} เวลา ${HTestMove.toString().padStart(2, '0')}:${MTestMove.toString().padStart(2, '0')} น.`;
        // Storing dates for each star
        varTodayPutdate_StarMoveGoDay[i] = dDMYStarMove.getUTCDate();
        varTodayPutdate_StarMoveGoMonth[i] = dDMYStarMove.getUTCMonth() + 1; // JavaScript months are 0-indexed
        varTodayPutdate_StarMoveGoYearB[i] = dDMYStarMove.getUTCFullYear() + 543;
        varTodayPutdate_StarMoveGoH[i] = HTestMove.toString().padStart(2, '0');
        varTodayPutdate_StarMoveGoM[i] = MTestMove.toString().padStart(2, '0');
        // ดาว 0 จะย้าย 18/07/2572 เวลา 18:18 น.
        // ดาว 9 จะย้าย 18/06/2567 เวลา 04:46 น.
    }
    // console.log(strNoteMove);
    // '===================================================
    let SumSompod = await CastHoroscope_SumSompodStarCalendarAstronomy_Born_Today(dateInput, Hour, min, CutTimeLocalYN = false, sProv = null);
    Rad[11][0] = SumSompod.A1_Neptune; // Neptune's value stored at Rad[10][0]  //15604.402798323506 // 15604.402783235
    Rad[12][0] = SumSompod.A1_Pluto; // Pluto's value stored at Rad[11][0] //12184.7757067649 //  12184.7757067649

    async function getStarStayData(id, B1) {
        const specificRange = StarStayData.find(range => range.id === id);
        if (!specificRange) {
            return null;
        }
        const detail = specificRange.ranges.find(rangeDetail => B1 >= rangeDetail.min && B1 <= rangeDetail.max);
        return detail || null; // Return the found detail or null if not found
    }
    // '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    let varTodayPutdate_StarStayR = [
            [],
            []
        ],
        varTodayPutdate_StarO = [
            [],
            []
        ],
        varTodayPutdate_StarL = [
            [],
            []
        ],
        varTodayPutdate_LerkPass = [
            [],
            []
        ],
        varTodayPutdate_MLerkPass = [
            [],
            []
        ],
        varTodayPutdate_SecLerkPass = [
            [],
            []
        ],
        varTodayPutdate_LerkNow = [
            [],
            []
        ],
        varTodayPutdate_NLerkNow = [
            [],
            []
        ],
        varTodayPutdate_No1To9LerkNow = [
            [],
            []
        ],
        varTodayPutdate_FixedStarLerkNow = [
            [],
            []
        ],
        varTodayPutdate_Nasss = [
            [],
            []
        ],
        varTodayPutdate_NavangStarAsRasee = [
            [],
            []
        ],
        varTodayPutdate_Tri = [
            [],
            []
        ],
        varTodayPutdate_Trisss = [
            [],
            []
        ],
        varTodayPutdate_TriyangHarmi = [
            [],
            []
        ],
        varTodayPutdate_TriyangHarms = [
            [],
            []
        ],
        varTodayPutdate_TriStarAsRasee = [
            [],
            []
        ];

    //15879 // 15879    
    Rad[10][0] = Rad[1][1];

    let resultStarStayData;
    for (let e10 = 0; e10 <= 1; e10++) {
        for (let ii = 0; ii <= 12; ii++) {
            if ((ii === 11 || ii === 12) && e10 === 1) {
                break;
            }
            // 'A1 = Rad(ii, 0) ระบบดวงอีแปะ A1 = Rad(ii, 1) ระบบดวง 10 ลัคนา  2 ขึ้นไปไม่มี
            let A1 = Rad[ii][e10];
            if (A1 == null) {
                A1 = 0;
            }

            // 'รับค่า  ดาวนี้ (ii) อยู่ราศี....... เช่น ดาว 1 อยู่ราศี 7   varTodayPutdate_StarStayR(e10, 1)=7
            varTodayPutdate_StarStayR[e10][ii] = Math.floor(A1 / 1800);
            let B1 = A1 - (varTodayPutdate_StarStayR[e10][ii] * 1800);
            if (B1 === 0) B1 = 1;

            varTodayPutdate_StarO[e10][ii] = Math.floor(B1 / 60) // 'รับค่า ดาวนี้ (ii)  อยู่องศา..... 
            varTodayPutdate_StarL[e10][ii] = Math.floor(B1 - (varTodayPutdate_StarO[e10][ii]) * 60) // 'รับค่า ดาวนี้ (ii)  อยู่ลิปดา..... 

            // 'ฤกษ์ ที่ผ่านมาแล้ว (ได้ผ่านฤกษ์นี้แล้ว)
            varTodayPutdate_LerkPass[e10][ii] = Math.floor(A1 * 0.00125); //'ฤกษ์ที่..n...ได้ผ่านไปแล้ว
            let minutes = Math.floor(((A1 * 0.00125) - Number(varTodayPutdate_LerkPass[e10][ii])) * 60);
            varTodayPutdate_MLerkPass[e10][ii] = minutes.toString().padStart(2, '0');

            let SecLerk = Math.floor(((((A1 * 0.00125) - Number(varTodayPutdate_LerkPass[e10][ii])) * 60) % 1) * 60);
            let SecLerkString = SecLerk.toFixed(2);
            let formattedSecLerk = ("00" + parseInt(SecLerkString.split('.')[0])).slice(-2);
            varTodayPutdate_SecLerkPass[e10][ii] = formattedSecLerk;

            // 'ฤกษ์ปัจจุบัน (ขณะนี้อยู่ฤกษ์ที่...)
            let NoTimei1To9;
            let fcTimeNoiToS;
            let Timei = Math.floor(A1 * 0.00125) + 1; //'ขณะนี้อยู่ในฤกษ์ที่......
            if (Timei > 27) Timei = 1;
            fcTimeNoiToS = await Support.fcTimeNoiToS(Timei, NoTimei1To9)
            varTodayPutdate_LerkNow[e10][ii] = Timei;
            varTodayPutdate_NLerkNow[e10][ii] = await Support.fcTime27To9(Timei) + ". " + fcTimeNoiToS.name;
            varTodayPutdate_No1To9LerkNow[e10][ii] = await Support.fcTime27To9(Timei);
            varTodayPutdate_FixedStarLerkNow[e10][ii] = await Support.fcTimeFixedStar(Timei);

            fcTimeNoiToS = "";
            // 'แก้การ Error เมื่อดาวอยู่ราศี 12 คือ จำนวน Rad(n,n)  / 1800 ได้ 12
            if (varTodayPutdate_StarStayR[e10][ii] >= 12 || varTodayPutdate_StarStayR[e10][ii] == null || varTodayPutdate_StarStayR[e10][ii] == NaN) varTodayPutdate_StarStayR[e10][ii] = 0;
            // ''ขณะกำลังทำ ช่องราศีแสดงราศี ซึ่งในช่องนี้มีดาว..i (0-10)..อยู่
            resultStarStayData = await getStarStayData(varTodayPutdate_StarStayR[e10][ii], B1);
            if (resultStarStayData) {
                varTodayPutdate_Nasss[e10][ii] = resultStarStayData.Nasss;
                varTodayPutdate_NavangStarAsRasee[e10][ii] = resultStarStayData.NavangStarAsRasee;
                varTodayPutdate_Tri[e10][ii] = resultStarStayData.Tri;
                varTodayPutdate_Trisss[e10][ii] = resultStarStayData.Trisss;
                varTodayPutdate_TriyangHarmi[e10][ii] = resultStarStayData.TriyangHarmi;
                // 'ดึง เอาตัวเลข ตั้งแต่ตัวที่ 3 ไป (เช่น  "6:11"  ก็จะได้  11 [เก็บตำแหน่งราศีของตรียางค์]
                varTodayPutdate_TriStarAsRasee[e10][ii] = parseFloat(varTodayPutdate_Trisss[e10][ii].substring(2))
            }
        } // ' For ii = 0 To 10 'ทำดาว 0-10
    } // 'For E10 = 0 To 1  'รอบที่ 1 (0) คำนวณ ดาว 0-10 ระบบดวงอีแปะ   รอบที่ 2 (1)  คำนวณ ดาว 0-10 ระบบดวง 10 ลัคนา

    // '======= 0 พิษนาค   1 พิษครุฑ   2 พิษสุนัข =======================================================
    for (let iStarii = 0; iStarii <= iStarAll; iStarii++) {
        let found = false;
        for (let iiPis = 0; iiPis <= 2; iiPis++) {
            if (!varTodayPutdate_TriyangHarmi[iStarii]) varTodayPutdate_TriyangHarmi[iStarii] = [];

            if (varTodayPutdate_TriyangHarmi[0][iStarii] === iiPis + 1) {
                varTodayPutdate_TriyangHarms[0][iStarii] = await Support.fciToSHarm(iiPis);
                found = true;
                break;
            }
        }
        if (!found) {
            varTodayPutdate_TriyangHarms[0][iStarii] = "-";
        }
    }

    // ' ใส่ค่าลัคนาอาทิตย์ ในดวงอีแปะ
    // ' ค่าของลัคนาในจุดนี้ ปกติคิดว่า "ไม่จำเป็นต้องใส่ก็ได้ เพราะข้างบนก็ได้วนลูปเก็บค่าไปแล้ว ดังบรรทัดที่ว่า .... Rad(10, 0) = Rad(1, 1) 'ลัคนา......"
    // ' ดาวดวงที่ 10=ลัคนา      0,10  0=ดวงอีแปะ  10=ลัคนา      1,1 1=ดวง10ลัคน์  1=ดาวอาทิตย์ (ลัคนาอาทิตย์)
    varTodayPutdate_StarStayR[0][10] = varTodayPutdate_StarStayR[1][1];
    varTodayPutdate_StarO[0][10] = varTodayPutdate_StarO[1][1];
    varTodayPutdate_StarL[0][10] = varTodayPutdate_StarL[1][1];
    varTodayPutdate_Tri[0][10] = varTodayPutdate_Tri[1][1]; // 'เช่น 6
    varTodayPutdate_TriStarAsRasee[0][10] = varTodayPutdate_TriStarAsRasee[1][1]; // 'เช่น 11
    varTodayPutdate_Trisss[0][10] = varTodayPutdate_Trisss[1][1]; // 'เช่น "6:11"
    varTodayPutdate_Nasss[0][10] = varTodayPutdate_Nasss[1][1]; // 'เช่น "8:7:10"
    varTodayPutdate_NavangStarAsRasee[0][10] = varTodayPutdate_NavangStarAsRasee[1][1]; // 'เช่น 10
    varTodayPutdate_LerkPass[0][10] = varTodayPutdate_LerkPass[1][1];
    varTodayPutdate_MLerkPass[0][10] = varTodayPutdate_MLerkPass[1][1];
    varTodayPutdate_SecLerkPass[0][10] = varTodayPutdate_SecLerkPass[1][1];
    varTodayPutdate_LerkNow[0][10] = varTodayPutdate_LerkNow[1][1];
    varTodayPutdate_No1To9LerkNow[0][10] = varTodayPutdate_No1To9LerkNow[1][1];
    varTodayPutdate_FixedStarLerkNow[0][10] = varTodayPutdate_FixedStarLerkNow[1][1];
    varTodayPutdate_NLerkNow[0][10] = varTodayPutdate_NLerkNow[1][1];
    // '-------------------------------------------------------------------------------------------------------------------------------

    // ' ใส่ค่าภพ ให้กับดวงราศีจักร (ดวงอีแปะ) varTodayPop(0, nn)
    let RaseeAsPopLuks = []; // 'เช่น ราศี 0 = "สหัชชะ"
    let varTodayPutdate_PopLuksRasee = [
        [],
        []
    ];

    let varTodayPutdate_PopLuksStar = [
        [],
        []
    ];
    let iCountR = varTodayPutdate_StarStayR[0][10]; // Position of Rasee, assumed to be 10
    for (let iPop = 0; iPop <= 11; iPop++) { // 'ภพที่่ 0-11
        RaseeAsPopLuks[iCountR] = await Support.fcPopiToS(iPop);
        varTodayPutdate_PopLuksRasee[0][iCountR] = await Support.fcPopiToS(iPop);
        iCountR++;
        if (iCountR > 11) iCountR = 0;
    }

    for (let Starii = 0; Starii <= iStarAll; Starii++) {
        varTodayPutdate_PopLuksStar[0][Starii] = varTodayPutdate_PopLuksRasee[0][varTodayPutdate_StarStayR[0][Starii]];
    }

    iCountR = varTodayPutdate_StarStayR[0][10]; // Reset iCountR to the position of Rasee
    // ' ใส่ค่าภพ ให้กับดวงกำเนิด เช่น  ดาว 0 = "สหัชชะ"  ดวงอีแปะ
    for (let iPop = 0; iPop <= 11; iPop++) {
        RaseeAsPopLuks[iCountR] = await Support.fcPopiToS(iPop);
        varTodayPutdate_PopLuksRasee[1][iCountR] = await Support.fcPopiToS(iPop);
        iCountR++;
        if (iCountR > 11) iCountR = 0;
    }

    for (let Starii = 0; Starii <= 10; Starii++) {
        varTodayPutdate_PopLuksStar[1][Starii] = varTodayPutdate_PopLuksRasee[1][varTodayPutdate_StarStayR[1][Starii]];
    }

    let varTodayPutdate_RaSTD = [
        [],
        []
    ];
    let varTodayPutdate_NaRaSTD = [
        [],
        []
    ];

    for (let j = 0; j <= iStarAll; j++) {
        let S = "";
        if (await Support.fcRaseeToStarKased(varTodayPutdate_StarStayR[0][j]) == j) {
            S += ", เกษตร";
        }
        if (await Support.fcRaseeToStarPra(varTodayPutdate_StarStayR[0][j]) == j) {
            S += ", ประ";
        }
        if (await Support.fcRaseeToStarMahauj(varTodayPutdate_StarStayR[0][j]) == j) {
            S += ", มหาอุจจ์";
        }
        if (await Support.fcRaseeToStarNij(varTodayPutdate_StarStayR[0][j]) == j) {
            S += ", นิจ";
        }
        if (await Support.fcRaseeToStarMahajak(varTodayPutdate_StarStayR[0][j]) == j) {
            S += ", มหาจักร";
        }
        if (await Support.fcRaseeToStarRachachock(varTodayPutdate_StarStayR[0][j]) == j) {
            S += ", ราชาโชค";
        }

        S = S.trim();
        if (!S) {
            S = "-";
        } else {
            S = S.substring(2);
        }

        varTodayPutdate_RaSTD[0][j] = S;

        // ''ดวงมาตรฐาน เกษตร ประ มหาอุจจ์ นิจ มหาจักร ราชาโชค ของดวงนวางค์จักร ของราศีจักร
        S = "";
        if (await Support.fcRaseeToStarKased(varTodayPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", เกษตร";
        }
        if (await Support.fcRaseeToStarPra(varTodayPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", ประ";
        }
        if (await Support.fcRaseeToStarMahauj(varTodayPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", มหาอุจจ์";
        }
        if (await Support.fcRaseeToStarNij(varTodayPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", นิจ";
        }
        if (await Support.fcRaseeToStarMahajak(varTodayPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", มหาจักร";
        }
        if (await Support.fcRaseeToStarRachachock(varTodayPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", ราชาโชค";
        }

        S = S.trim();
        if (!S) {
            S = "-";
        } else {
            S = S.substring(2);
        }

        varTodayPutdate_NaRaSTD[0][j] = S; // 'เก็บค่าลงตัวแปร Public

        // ''จบ ระบบดวงอีแปะ 
        if (j !== 10) {
            let S = "";
            if (await Support.fcRaseeToStarKased(varTodayPutdate_StarStayR[1][j]) == j) {
                S += ", เกษตร";
            }
            if (await Support.fcRaseeToStarPra(varTodayPutdate_StarStayR[1][j]) == j) {
                S += ", ประ";
            }
            if (await Support.fcRaseeToStarMahauj(varTodayPutdate_StarStayR[1][j]) == j) {
                S += ", มหาอุจจ์";
            }
            if (await Support.fcRaseeToStarNij(varTodayPutdate_StarStayR[1][j]) == j) {
                S += ", นิจ";
            }
            if (await Support.fcRaseeToStarMahajak(varTodayPutdate_StarStayR[1][j]) == j) {
                S += ", มหาจักร";
            }
            if (await Support.fcRaseeToStarRachachock(varTodayPutdate_StarStayR[1][j]) == j) {
                S += ", ราชาโชค";
            }

            S = S.trim();
            if (!S) {
                S = "-";
            } else {
                S = S.substring(2);
            }

            varTodayPutdate_RaSTD[1][j] = S;

            // ''ดวงมาตรฐาน เกษตร ประ มหาอุจจ์ นิจ มหาจักร ราชาโชค ของดวงนวางค์จักร ของราศีจักร
            S = "";
            if (await Support.fcRaseeToStarKased(varTodayPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", เกษตร";
            }
            if (await Support.fcRaseeToStarPra(varTodayPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", ประ";
            }
            if (await Support.fcRaseeToStarMahauj(varTodayPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", มหาอุจจ์";
            }
            if (await Support.fcRaseeToStarNij(varTodayPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", นิจ";
            }
            if (await Support.fcRaseeToStarMahajak(varTodayPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", มหาจักร";
            }
            if (await Support.fcRaseeToStarRachachock(varTodayPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", ราชาโชค";
            }

            S = S.trim();
            if (!S) {
                S = "-";
            } else {
                S = S.substring(2);
            }
            varTodayPutdate_NaRaSTD[1][j] = S; // 'เก็บค่าลงตัวแปร Public
            // ''จบ ระบบดวง 10 ลัคนา ดาว 0-9
        }

    }

    let varTodayPutdate_PopTanusedRasee = [
        [],
        []
    ];
    let varTodayPutdate_PopTanusedStar = [
        [],
        []
    ];

    // เด๋วมาทำต่อ

    // ''หาตนุเศษ ในดวงราศีจักร
    let iStarRa = varTodayPutdate_StarStayR; // 'ถ่ายทอดค่าจากตัวแปรอาร์เรย์ สมาชิกทุกตัวในอาร์เรย์นี้จะถูกถ่ายทอดไปยังตัวไปซ้ายมือ
    let iLukStayRasee = iStarRa[0][10]; // '1. ลัคนาอยู่ราศีที่ 0-11 
    let iStarAsHomeLuk = await Support.fcRaseeToStarKased(iLukStayRasee); //'2. ดาวเจ้าเรือนของลัคนา เช่น 5
    let iStarKasedOfLukAsRasee = iStarRa[0][iStarAsHomeLuk]; // '3. ดาวเกษตรของลัคนา อยู่ราศี... เช่น 0
    let iStarAsHouse = await Support.fcRaseeToStarKased(iStarKasedOfLukAsRasee); //'รับค่าดาวเจ้าบ้าน
    let iStarAsHouseOfLukAsRasee = iStarRa[0][iStarAsHouse]; // '4. ดาวเจ้าเรือนลัคนาอยู่ในตำแหน่งราศีที่..... คือค่าจาก iStarRa(0, iStarAsHouse) นั่นเอง


    let istarAsTanuSED = await fcGetTanused_CastHoroscope(iLukStayRasee, iStarAsHomeLuk, iStarKasedOfLukAsRasee, iStarAsHouseOfLukAsRasee)
    let varTodayPutdate_starAsTanuSED = [];
    varTodayPutdate_starAsTanuSED[0] = istarAsTanuSED;

    // console.log(istarAsTanuSED);

    //  'ใส่ข้อความว่า "ตนุเศษ" ใน STD (คุณภาพดาว)
    S = varTodayPutdate_RaSTD[0][istarAsTanuSED];
    if (S === "-" || S === "") {
        if (S === "-") {
            S = S.replace("-", ""); // Replace '-' with an empty string.
        }
        varTodayPutdate_RaSTD[0][istarAsTanuSED] = "ตนุเศษ";
    } else {
        varTodayPutdate_RaSTD[0][istarAsTanuSED] = "ตนุเศษ, " + S;
    }

    // 'ใส่ค่าภพตนุเศษ  ให้กับดวงราศีจักร (ดวงอีแปะ) กำเนิด
    iCountR = varTodayPutdate_StarStayR[0][istarAsTanuSED];
    for (let iPop = 0; iPop <= 11; iPop++) {
        // 'ใส่ค่าภพตนุเศษ ให้กับดวงราศีจักร (ดวงอีแปะ) 
        varTodayPutdate_PopTanusedRasee[0][iCountR] = await Support.fcPopiToS(iPop); // Assuming fcPopiToS(iPop) is defined and returns a string.
        iCountR += 1;
        if (iCountR > 11) iCountR = 0;
    }
    // ใส่ค่าภพตนุเศษ เช่น  ดาว 0 = "สหัชชะ"  กำเนิด
    for (let Starii = 0; Starii <= iStarAll; Starii++) {
        varTodayPutdate_PopTanusedStar[0][Starii] = varTodayPutdate_PopTanusedRasee[0][varTodayPutdate_StarStayR[0][Starii]];
    }
    // ''หาตนุเศษ ในดวงราศีจักร // ' หาตนุเศษ 
    let iStarRa10 = varTodayPutdate_StarStayR; // 'ถ่ายทอดค่าจากตัวแปรอาร์เรย์ สมาชิกทุกตัวในอาร์เรย์นี้จะถูกถ่ายทอดไปยังตัวไปซ้ายมือ
    let iLukStayRasee10 = iStarRa10[0][10]; // '1. ลัคนาอยู่ราศีที่ 0-11 
    let iStarAsHomeLuk10 = await Support.fcRaseeToStarKased(iLukStayRasee10); // '2. ดาวเจ้าเรือนของลัคนา เช่น 5
    let iStarKasedOfLukAsRasee10 = iStarRa10[1][iStarAsHomeLuk10]; // '3. ดาวเกษตรของลัคนา อยู่ราศี... เช่น 0
    let iStarAsHouse10 = await Support.fcRaseeToStarKased(iStarKasedOfLukAsRasee10); // 'รับค่าดาวเจ้าบ้าน
    let iStarAsHouse10OfLukAsRasee = iStarRa10[1][iStarAsHouse10]; // '4. ดาวเจ้าเรือนลัคนาอยู่ในตำแหน่งราศีที่..... คือค่าจาก iStarRa10(0, iStarAsHouse) นั่นเอง

    istarAsTanuSED = await fcGetTanused_CastHoroscope(iLukStayRasee10, iStarAsHomeLuk10, iStarKasedOfLukAsRasee10, iStarAsHouse10OfLukAsRasee)
    varTodayPutdate_starAsTanuSED = [];
    varTodayPutdate_starAsTanuSED[1] = istarAsTanuSED;
    S = varTodayPutdate_RaSTD[1][istarAsTanuSED];
    if (S === "-" || S === "") {
        if (S === "-") {
            S = S.replace("-", ""); // Replace '-' with an empty string.
        }
        varTodayPutdate_RaSTD[1][istarAsTanuSED] = "ตนุเศษ";
    } else {
        varTodayPutdate_RaSTD[1][istarAsTanuSED] = "ตนุเศษ, " + S;
    }

    // ''ใส่ค่าภพตนุเศษ  ให้กับดวง10ลัคน์
    iCountR = varTodayPutdate_StarStayR[1][istarAsTanuSED]; // 'ตนุเศษ10ลัคน์ อยู่ที่ ราศี.....
    for (let iPop = 0; iPop <= 11; iPop++) {
        // ' ใส่ค่าภพตนุเศษ ให้กับดวง10ลัคน์ 
        varTodayPutdate_PopTanusedRasee[1][iCountR] = await Support.fcPopiToS(iPop); // Assuming fcPopiToS(iPop) is defined and returns a string.
        iCountR += 1;
        if (iCountR > 11) iCountR = 0;
    }
    // ' ใส่ค่าภพตนุเศษ 10ลัคน์ เช่น  ดาว 0 = "สหัชชะ" 
    for (let Starii = 0; Starii <= 10; Starii++) { // 'ดาว 0-ลัคนา
        varTodayPutdate_PopTanusedStar[1][Starii] = varTodayPutdate_PopTanusedRasee[1][varTodayPutdate_StarStayR[1][Starii]];
    }

    return {
        Rad: Rad,
        varTodayPutdate_PopTanusedRasee: varTodayPutdate_PopTanusedRasee,
        varTodayPutdate_PopTanusedStar: varTodayPutdate_PopTanusedStar,
        varTodayPutdate_PopLuksStar,
        varTodayPutdate_StarStayR,
        varTodayPutdate_StarO,
        varTodayPutdate_StarL,
        varTodayPutdate_LerkPass,
        varTodayPutdate_MLerkPass,
        varTodayPutdate_SecLerkPass,
        varTodayPutdate_LerkNow,
        varTodayPutdate_NLerkNow,
        varTodayPutdate_No1To9LerkNow,
        varTodayPutdate_FixedStarLerkNow,
        varTodayPutdate_TriStarAsRasee,
        varTodayPutdate_Nasss,
        varTodayPutdate_NavangStarAsRasee,
        varTodayPutdate_Tri,
        varTodayPutdate_Trisss,
        varTodayPutdate_TriyangHarmi,
        varTodayPutdate_TriyangHarms,
        varTodayPutdate_RaSTD,
        varTodayPutdate_NaRaSTD,
        varTodayPutdate_StarMoveGoDay,
        varTodayPutdate_StarMoveGoMonth,
        varTodayPutdate_StarMoveGoYearB,
        varTodayPutdate_StarMoveGoH,
        varTodayPutdate_StarMoveGoM,
    };
}

async function CastHoroscope_AllStar_Suriyata_SUM_Main(birthDate, birthHour, birthMinute, cutTimeLocalYN, sProv) {

    const newDate = await cutTimeLocal(birthDate, birthHour, birthMinute, cutTimeLocalYN, sProv);

    let day = newDate.date.getDate();
    let month = newDate.date.getMonth() + 1; // Adjust for zero-based index
    let year = newDate.date.getFullYear();
    let yearTH = newDate.date.getFullYear() + 543;

    let adjustedHour = newDate.adjustedHour;
    let adjustedMinute = newDate.adjustedMinute;

    // ให้เป็นค่านาทีทั้งหมด เช่นเกิด 10:30 น. 10*60+30=630  เป็นค่า ช.ม.+นาที=รวมนาที  ที่จะนำไปหาเวลาหาลัคนาใน CastHoroscope_AutoMinit 
    // let adjustedTimeTotal = (newDate.adjustedHour * 60) + newDate.adjustedMinute;

    let Pi = parameter.pi;
    let JS = yearTH - 1181; // ' JS = จุลศักราช

    // 'H = หรคุณ
    let H = JS * 365.25875 + 1.46625;
    // 'H = (JS * 292207 + 373) / 800 + 1  ' คิดคำนวนอีกวิธีหนึ่ง
    let H1 = H - Math.floor(H);
    let X1 = H;

    // 'K = กัมมัชพล
    let K = (1 - (H - Math.floor(H))) * 800;
    let X2 = K;

    // 'M = มาสเกณฑ์
    let M = ((H * 703) + 650) / 20760;
    let M1 = (Math.floor(H) * 11 + 650) / 692;
    M1 = (Math.floor(H) + Math.floor(M1)) / 30;
    let X3 = M1;

    // 'D = ดิถี
    // 'D = (M - (Int(M))) * 30
    let d = (M1 - Math.floor(M1)) * 30;
    let X4 = d;

    // 'คำนวณหา อธิมาศ
    let ATD = (d - Math.floor(d) > 0.8) ? Math.floor(d) + 1 : Math.floor(d);

    let Mass = 0;
    let Pokatimas = true;
    let Rtikamas = false;

    if ([0, 1, 2, 3, 4, 5, 25, 26, 27, 28, 29].includes(ATD)) {
        Mass = 1;
        Pokatimas = false;
        Rtikamas = true;
    }

    let PRMass = Pokatimas ? "ปกติมาส" : "อธิกมาส";

    // 'W = อวมาน
    // 'W = (D - (Int(D))) * 692
    let W = (Math.floor(H) * 11 + 650) / 692;
    W = (W - Math.floor(W)) * 692;
    let X5 = W;

    // 'U = อุจพล
    let U = H - 621;
    U = U - (Math.floor(U / 3232)) * 3232;
    let X6 = U;

    // 'V = วาร
    let V = H - (Math.floor(H / 7)) * 7;
    let X7 = V;

    // 'หาวาลาเถลิกศก
    let VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
    // 'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลาdd = DateDiff("d", DateValue(vt), #6/24/2475#)
    let BeginNewYearNum = Math.floor(VT);
    let vtm = VT - BeginNewYearNum; // 'เถลิงศก วันที่
    let vtM1 = vtm;
    vtm *= 24;
    let BeginNewYearH = Math.floor(vtm); // 'เถลิงศก ชม.
    let vtmm = vtm - BeginNewYearH;
    vtmm *= 60;
    let BeginNewYearM = Math.floor(vtmm); // 'เถลิงศก นาที
    let BeginNewYearSec = (vtmm - BeginNewYearM); // * 60 
    BeginNewYearSec = BeginNewYearSec * 60;
    BeginNewYearSec = Math.floor(BeginNewYearSec);
    let BeginNewYearYearB = JS + 1181 // 'เถลิงศก ปี พ.ศ.
    let YJS = JS;

    let UsedBornBeginDMY = `เถลิงศกวันที่ ${BeginNewYearNum} เดือนเมษายน พ.ศ. ${BeginNewYearYearB} จ.ศ. ${JS} ค.ศ. ${BeginNewYearYearB - 543}` + ` เวลา ${BeginNewYearH} นาฬิกา ${BeginNewYearM} นาที ${BeginNewYearSec.toFixed(2)} วินาที ${PRMass}`;
    let BeginDMY_Talengsok = UsedBornBeginDMY;

    // 'เปรียบเทียบหาเวลาประสงค์
    let SystemYearThai = false;
    let DateSerialYMDdNewYear;
    if (SystemYearThai) {
        DateSerialYMDdNewYear = new Date(BeginNewYearYearB, 3, BeginNewYearNum); // Month is 0-indexed in JS: 3 = April
    } else {
        DateSerialYMDdNewYear = new Date(BeginNewYearYearB - 543, 3, BeginNewYearNum + 1);
    }

    // Assuming JSBornShow and JS are defined and related
    let JSBornShow = JS;

    let Def = Math.floor((birthDate - DateSerialYMDdNewYear) / (1000 * 60 * 60 * 24));

    if (Def < 0) {

        JS = yearTH - 1182; // ' JS = จุลศักราช

        H = JS * 365.25875 + 1.46625;

        H1 = H - (Math.floor(H));
        X1 = H;

        K = (1 - (H - (Math.floor(H)))) * 800;
        X2 = K;

        M = ((H * 703) + 650) / 20760;
        M1 = (Math.floor(H) * 11 + 650) / 692;
        M1 = (Math.floor(H) + Math.floor(M1)) / 30;
        X3 = M1;

        d = (M1 - Math.floor(M1)) * 30;
        X4 = d;

        W = (Math.floor(H) * 11 + 650) / 692;
        W = (W - Math.floor(W)) * 692;
        X5 = W;

        U = H - 621;
        U = U - (Math.floor(U / 3232)) * 3232;
        X6 = U;

        V = H - (Math.floor(H / 7)) * 7;
        X7 = V;

        VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;

        BeginNewYearNum = Math.floor(VT);
        vtm = VT - BeginNewYearNum;
        vtM1 = vtm;

        vtm = vtm * 24;
        BeginNewYearH = Math.floor(vtm);
        vtmm = vtm - BeginNewYearH;
        vtmm = vtmm * 60;
        BeginNewYearM = Math.floor(vtmm);
        BeginNewYearSec = vtmm - BeginNewYearM;

        if (SystemYearThai) {
            DateSerialYMDdNewYear = new Date(BeginNewYearYearB, 3, BeginNewYearNum);
        } else {
            DateSerialYMDdNewYear = new Date(BeginNewYearYearB - 543 - 1, 3, BeginNewYearNum + 1);
        }

        JSBornShow = JS;
        Def = Math.floor((birthDate - DateSerialYMDdNewYear) / (1000 * 60 * 60 * 24));

        // UsedBornBeginDMY = "เถลิงศกวันที่ " & BeginNewYearNum & " เดือนเมษายน พ.ศ. " & BeginNewYearYearB & " จ.ศ. " & JS & " ค.ศ. " & BeginNewYearYearB - 543 _
        // & " เวลา " & BeginNewYearH & " นาฬิกา  " & BeginNewYearM & " นาที  " & BeginNewYearSec & " วินาที " & PRMass
        // BeginDMY_Talengsok = UsedBornBeginDMY
    }

    let PD = parseFloat(X4);
    if (PD - Math.floor(PD) > 0.8) {
        PD = Math.floor(PD) + 1;
    } else {
        PD = Math.floor(PD);
    }

    let JPd;
    if (Mass === 1) {
        JPd = 29 - PD + 105;
    } else if (Mass === 0) {
        JPd = 29 - PD + 75;
    }

    let Md2;
    let mDate;

    if (SystemYearThai) {
        Md2 = new Date(BeginNewYearYearB, 3, BeginNewYearNum); // Month is 0-indexed in JavaScript (0 is January)
    } else {

        Md2 = new Date(BeginNewYearYearB - 543, 3, BeginNewYearNum + 1);
    }

    mDate = new Date(Md2);
    mDate.setDate(mDate.getDate() + JPd);

    let x18 = mDate;

    // 'DefM = เวลา 24.00 น. ถึง วันประสงค์
    let DefM = (parseInt(adjustedHour) * 60 + parseInt(adjustedMinute)) / 1440;

    // 'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน
    //console.log("vtM1 ="+ vtM1);
    // vtM1 = =0.2962499999999828  0.2962499999999828
    let DefH = 1 - vtM1;
    let DefV = (mDate - DateSerialYMDdNewYear) / (1000 * 60 * 60 * 24) - 1;

    // 'เวลาประสงค์
    let DefTime = (parseInt(adjustedMinute) / 60) + parseInt(adjustedHour);
    DefTime = parseFloat(DefTime.toFixed(2));

    let T1 = (parseInt(adjustedHour) * 60 + parseInt(adjustedMinute));

    let TQ;
    if (T1 < (6 * 60)) {
        TQ = 1440 + T1 - (6 * 60);
    } else {
        TQ = T1 - (6 * 60);
    }

    let Deff1 = Def + DefM + DefH;

    let Deff2 = DefV + DefH + 0.25;

    let HT = Deff1 + H;
    let VHT = Deff2 + H;
    let x11 = HT;
    let Fm = Def + Math.floor(H) + 233142;

    // 'KT = กัมมัชพลอัตตา
    let kt = (Deff1 * 800 + K);
    let x12 = Math.floor(kt);

    // 'MT = มาสเกณท์อัตตา
    let MT = (HT * 703 + 650) / 20760;
    let x13 = MT;

    // 'DT = ดิถีอัตตา
    let DT = (MT - Math.floor(MT)) * 30;
    let x14 = DT;

    // 'WT = อวมานอัตตา
    let WT = ((DT - Math.floor(DT)) * 692);
    let x15 = WT;

    // 'UT = อุจจพลอัตตา
    let UT = HT - 621;;
    UT = UT - (Math.floor(UT / 3232)) * 3232;
    let x16 = UT;

    // 'VT = วารอัตตา
    VT = HT - (Math.floor(HT / 7)) * 7;
    let x17 = VT;

    // ' สมผุสดาว
    // '==========================================================================================
    // '*****สมผุสอาทิตย์******
    // 'สุรทินประสงค์ deF1
    // 'กัมมัชพลประสงค์  KTP
    let AA = 0,
        Ps = 0,
        Vs = 0;

    const Sun = await CastHoroscope_Sun(Deff1, AA, Ps, Vs, JS);

    let Rad = Array.from({
        length: 13
    }, () => new Array(21));

    Rad[1][0] = Sun.AA; // 'สมผุสอาทิตย์ คือ AA   สามารถเอาไปหาค่า ราศี องศา ลิปดา ได้เลย เช่น Ra = AA / 1800 หาสมผุสดาวนี้ว่าอยู่ราศีใด aRa คือ ราศี 1 ราศีมี 1800 ลิปดา
    Rad[1][16] = Sun.S1; // 'ผลอาทิตย์
    Rad[1][17] = Sun.Vs; // 'มัธยมรวิ
    Rad[1][18] = Sun.ZP; // 'มัธยมอาทิตย์
    Rad[1][11] = Sun.Ps; // 'กำลังพระเคราะห์
    let TemPS = Sun.Ps;
    let TemVS = Sun.Vs;

    const Sun2 = await CastHoroscope_Sun(Deff2, 0, 0, 0, JS);
    Rad[1][5] = Sun2.AA;
    let VPs = Sun2.Ps;
    let VVs = Sun2.Vs;

    let CS = year; //1991
    let AM = 0,
        HM = 0,
        DM = 0;

    Vs = TemVS;

    // '******************************** 1 สมผุสจันทร์ ******************************
    // console.log(Fm); 727450 272732
    const Moon = await CastHoroscope_Moon(Fm, Vs, Pi, AM, DefTime, HM, DM, Zm = null, Mum = null);

    Rad[2][0] = Moon.AM; // 'สมผุสจันทร์ คือ AM
    Rad[2][18] = Moon.Zm; // 'มัธยมจันทร์

    // '****** หาเพียร 'Rad(2, 11) = Rad(2, 18)
    Rad[2][11] = Rad[2][0];

    // 'เพียร
    if (Rad[2][0] < Rad[1][0]) Rad[2][11] = Rad[2][11] + 21600;
    Rad[2][11] = Rad[2][11] - Rad[1][0];
    Rad[2][12] = Rad[2][11] / 720;

    // ' มัธยมอุจ
    Rad[2][13] = Moon.Mum;

    // 'ถ้านี่เป็นการเข้ามารับค่าสมผุสดาวเพื่อใช้แสดง "ปฏิทินโหราศาสตร์"
    // let tfUse_for_CalendarHora = false;
    // if (tfUse_for_CalendarHora) {
    //     // 'คำนวณหาดาวจันทร์ย้ายราศี (ดาวจันทร์ยก)
    //     let StarWillMoveH2 = 0,
    //         StarWillMoveM2 = 0;
    //     let TemAM, TemTime, DefMN, Deff3, VS2, MN, j, DefAM;
    //     TemAM = Math.floor(Moon.AM / 1800)
    //     TemTime = DefTime;
    //     // For K = 0 To 4320 '3 วัน (นาที)
    //     for (let K = 0; K <= 4320; K++) {
    //         DefTime = TemTime + (K / 60);
    //         DefMN = (DefTime * 60) / 1440;
    //         Deff3 = Def + DefMN + DefH;
    //         let AA = 0,
    //             Ps = 0,
    //             Vs = 0;
    //         const Sun = await CastHoroscope_Sun(Deff3, AA, Ps, Vs, JS);
    //         const Moon = await CastHoroscope_Moon(Fm, Sun.Vs, Pi, AM, DefTime, HM, DM, Zm = null, Mum = null);

    //         if (AM / 1800 === Math.floor(Sun.AM / 1800) || TemAM < Math.floor(AM / 1800) || TemAM > Math.floor(AM / 1800)) {
    //             MN = DefTime;
    //             TemAM = Math.floor(AM / 1800);
    //             K = 4320;
    //         }
    //         DefTime = TemTime
    //         StarWillMoveH2 = Math.floor(MN) // 'รับค่า ชม.  (อีก...ชม. ดาวจันทร์จะย้าย)
    //         StarWillMoveM2 = Math.floor((MN - Math.floor(MN)) * 60) // ''รับค่า นาที.  (อีก...นาที. ดาวจันทร์จะย้าย)
    //     }
    // }

    let HHM = Moon.HM;

    // '***************************** 2 สมผุสจันทร์ วันแรม 1 ค่ำ เดือน 8  ************
    let MyDay = mDate.getDate();
    let MyMonth = mDate.getMonth() + 1;
    Fm = 365 * CS + MyDay + Math.floor(275 * MyMonth / 9) + 2 * Math.floor(0.5 + 1 / MyMonth) + Math.floor(CS / 4) - Math.floor(CS / 100) + Math.floor(CS / 400) + 2;
    AM = 0;
    Vs = VVs;
    HM = 0;
    DM = 0;

    // 727056
    // 727450
    // console.log(Fm);

    let Moon2 = await CastHoroscope_Moon(Fm, Vs, Pi, AM, DefTime, HM, DM, Moon.Zm, Moon.Mum);
    Rad[2][5] = Moon2.AM; //19851 //19154
    let GoodM = Rad[2][5] * 0.00125;
    let GoodM1 = GoodM;

    // 'ตรวจสอบฤกษ์ของวันแรม 1 ค่ำ เดือน 8
    let VGm1 = Math.floor(Rad[2][5] * 0.00125);

    // 'คืนค่า Vs และ Ps
    Vs = TemVS
    Ps = TemPS
    HM = HHM

    // '****************************** 3 สมผุสอังคาร***************************
    let A0 = 1,
        A1 = 2,
        A2 = 16,
        A3 = 505,
        b = 5420,
        c = 127,
        e = 4 / 15;
    d = 45, AA = 0;
    const Mars = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[3][0] = Mars.AA; // 'สมผุสอังคาร คือ AA
    Rad[3][18] = Mars.Z; // 'มัธยมอังคาร

    // '******************************* 4 สมผุส พุธ*******************************
    A0 = 7, A1 = 46, A2 = 4, A3 = 1, b = 10642, c = 220, d = 100, e = 21, AA = 0;
    const Mercury = await CastHoroscope_StarM(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[4][0] = Mercury.AA; // 'สมผุสพุธ คือ AA
    Rad[4][18] = Mercury.Z; // 'มัธยมพุธ

    // '******************************** 5 สมผุสพ ฤหัสบดี****************************
    A0 = 1, A1 = 12, A2 = 1, A3 = 1032, b = 14297, c = 172, d = 92, e = 3 / 7, AA = 0;
    const Jupiter = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[5][0] = Jupiter.AA // 'สมผุสพฤหัส คือ AA 
    Rad[5][18] = Jupiter.Z // 'มัธยมพฤหัสบดี
    // const fctest = await fcTest_SompudStar_RadToResultRaOngLib(Rad[5][0]);

    // '********************************* 6 สมผุสศุกร์**********************************
    A0 = 5, A1 = 3, A2 = -10, A3 = 243, b = 10944, c = 80, d = 320, e = 11, AA = 0;
    const Venus = await CastHoroscope_StarM(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[6][0] = Venus.AA; // 'สมผุสศุกร์ คือ AA
    Rad[6][18] = Venus.Z; // 'มัธยมศุกร์

    // '*********************************** 7 สมผุสเสาร์*********************************
    A0 = 1, A1 = 30, A2 = 6, A3 = 10000, b = 11944, c = 247, d = 63, e = 7 / 6, AA = 0;
    const Saturn = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[7][0] = Saturn.AA // 'สมผุสเสาร์ คือ AA
    Rad[7][18] = Saturn.Z // 'มัธยมเสาร์

    // '************************************* 8 สมผุสมฤตยู*******************************
    A0 = 1, A1 = 84, A2 = 1, A3 = 7224, b = 16277, c = 124, d = 644, e = 3 / 7, AA = 0;
    const Deadly = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null)
    Rad[0][0] = Deadly.AA // 'c
    Rad[0][18] = Deadly.Z // 'มัธยมมฤตยู

    // '************************************* 9 สมผุสราหู********************************
    // Rahu
    Z = Math.floor(Ps / 20) + Math.floor(Ps / 265);
    Z = Z - Math.floor(Z / 21600) * 21600;
    AA = 15150 - Z;
    // console.log(Z); 20961 20961
    // console.log(AA); -5811 -5811
    if (AA < 0) {
        AA = AA + 21600;
    }
    if (AA > 21600) {
        AA = AA - (Math.floor(AA / 21600) * 21600)
    }
    Rad[8][0] = AA; // 'สมผุสราหู คือ AA
    Rad[8][18] = Z; // 'มัธยมราหู

    // '************************************* 10 สมผุสเกตุ********************************
    // Z = (Math.floor((adjustedMinute) / 60) + Math.floor(adjustedHour)) / 24;
    //494089
    //494090
    Z = ((adjustedMinute / 60) + adjustedHour) / 24;
    K = HM - 344;
    K = K - Math.floor(K / 679) * 679;
    let ZZ = Math.floor((K + Z) * 21600 / 679);

    AA = 21600 - ZZ;

    if (AA < 0) {
        AA = AA + 21600;
    }

    if (AA > 21600) {
        AA = AA - (Math.floor(AA / 21600) * 21600);
    }

    Rad[9][0] = AA // 'สมผุสเกตุ คือ AA
    Rad[9][18] = ZZ // 'มัธยมเกตุ

    // console.log(AA);
    // 18024
    // 17992

    // for (let i = 0; i <= 9; i++) {
    //     testbox = await fcTest_SompudStar_RadToResultRaOngLib(Rad[i][0]);
    //     console.log('ดาว ' + i + ' : ' + testbox + ' Rad = ' + Rad[i][0] + " มัธยม = " + Rad[i][18] );
    // }

    // '************* เริ่ม ดูสมผุสดาวทุกดวงที่รับค่ามาแล้ว *************
    // ดาว 0 : 08.12.17 Rad = 15137  มัธยม = 15236    // ดาว 0 : 08.12.17 Rad = 15137  มัธยม = 15236
    // ดาว 1 : 03.21.01 Rad = 6661   มัธยม = 6731     // ดาว 1 : 03.21.01 Rad = 6661   มัธยม = 6731
    // ดาว 2 : 02.25.43 Rad = 5143   มัธยม = 26763    // ดาว 2 : 02.25.43 Rad = 5143   มัธยม = 26763  
    // ดาว 3 : 04.21.18 Rad = 8478   มัธยม = 9863     // ดาว 3 : 04.21.18 Rad = 8479   มัธยม = 9863
    // ดาว 4 : 03.21.08 Rad = 6668   มัธยม = 18303    // ดาว 4 : 08.21.08 Rad = 6668   มัธยม = 18303
    // ดาว 5 : 03.29.32 Rad = 7172   มัธยม = 7013     // ดาว 5 : 03.29.32 Rad = 7172   มัธยม = 7013
    // ดาว 6 : 04.20.10 Rad = 8410   มัธยม = 16604    // ดาว 6 : 04.20.10 Rad = 8410   มัธยม = 16604
    // ดาว 7 : 09.03.35 Rad = 16415  มัธยม = 16760    // ดาว 7 : 09.03.35 Rad = 16415  มัธยม = 16760
    // ดาว 8 : 08.23.09 Rad = 15789  มัธยม = 20961    // ดาว 8 : 08.23.09 Rad = 15789  มัธยม = 20961
    // ดาว 9 : 06.03.46 Rad = 11026  มัธยม = 10574    // ดาว 9 : 06.03.46 Rad = 11026  มัธยม = 10574   
    // '************* จบ ดูสมผุสดาวทุกดวงที่รับค่ามาแล้ว *************


    // ****************end ******************//
    c = 0;
    // 'ดาวเดินหน้า 0 1 2 3 4 5 6 7
    for (let i = 0; i <= 7; i++) {
        const AutoMinit = await CastHoroscope_AutoMinit(Rad[i][0], c, TQ, b);
        Rad[i][1] = AutoMinit.b;
        b = AutoMinit.b;
        // testbox = await fcTest_SompudStar_RadToResultRaOngLib(Rad[i][1]);
        // console.log('ลัคนา ' + i + ' สมผุส ' + testbox + '  ' + b);

    }
    // 'ดาวเดินถอยหลัง  8 9
    for (let i = 8; i <= 9; i++) {
        const Antiautominit = await CastHoroscope_Antiautominit(Rad[i][0], c, TQ, b);
        Rad[i][1] = Antiautominit.b;
        b = Antiautominit.b;
        // testbox = await fcTest_SompudStar_RadToResultRaOngLib(Rad[i][1]);
        // console.log('ลัคนา ' + i + ' สมผุส ' + testbox + '  ' + b);
    }

    // 'ลัคนา 0 สมผุส 11.01.47  19907                 //  ลัคนา 0 สมผุส 11.01.47  19907
    // 'ลัคนา 1 สมผุส 05.11.47  9707.85741285714      //  ลัคนา 1 สมผุส 05.11.47  9707.857142857143
    // 'ลัคนา 2 สมผุส 04.24.06  8646.5                //  ลัคนา 2 สมผุส 04.24.06  8646.5
    // 'ลัคนา 3 สมผุส 06.06.28  11188.2857142857      //  ลัคนา 3 สมผุส 06.06.28  11188.285714285714
    // 'ลัคนา 4 สมผุส 05.11.52  9712.85714285714      //  ลัคนา 4 สมผุส 05.11.52  9712.857142857143
    // 'ลัคนา 5 สมผุส 05.17.52  10072.8571428571      //  ลัคนา 5 สมผุส 05.17.52  10072.857142857143
    // 'ลัคนา 6 สมผุส 06.05.30  11130                 //  ลัคนา 6 สมผุส 06.05.30  11130
    // 'ลัคนา 7 สมผุส 11.21.39  21099                 //  ลัคนา 7 สมผุส 11.21.39  21099
    // 'ลัคนา 8 สมผุส 06.01.40  10900.7142857143      //  ลัคนา 8 สมผุส 06.01.40  10900.714285714286
    // 'ลัคนา 9 สมผุส 04.11.51  7911.33333333333      //  ลัคนา 9 สมผุส 04.11.51  7911.333333333333

    // 'หาลัคนาดวงอีแปะ (ราศีจักร) โดยเฉพาะ 
    let iOptionType_Foreign_StarLuk1To3 = false;
    if (iOptionType_Foreign_StarLuk1To3) {
        if (cutTimeLocalYN) {}
    }

    c = 0;

    const Rasijak = await CastHoroscope_AutoMinit_Rasijak(Rad[1][0], c, TQ, b, TLocalCut = 0)

    let SompudLuk = Rasijak.b;

    return {
        Rad,
        SompudLuk,
    }

}

// 'ในโค้ดนี้เราต้องการเฉพาะสมผุสของดาว เนปจูน พูลโต เท่านั้น  จุดประสงค์ต้องการแค่สมผุสของดาว เนปจูน พูลโต เท่านั้น
async function CastHoroscope_SumSompodStarCalendarAstronomy_Born_Today(dataInput, Hour, Min, cutTimeLocalYN, sProv) {
    let newDate;
    let day, month, year, hour, min;
    // Date-related calculations
    if (cutTimeLocalYN) {
        newDate = await cutTimeLocal(dataInput, Hour, Min, cutTimeLocalYN, sProv);
        day = newDate.date.getUTCDate();
        month = newDate.date.getUTCMonth() + 1; // Months are zero-indexed
        year = newDate.date.getUTCFullYear();
        hour = newDate.adjustedHour;
        min = newDate.adjustedMinute;
    } else {
        day = dataInput.getUTCDate();
        month = dataInput.getUTCMonth() + 1;
        year = dataInput.getUTCFullYear();
        hour = Hour;
        min = Min;
    }

    // Geographical coordinates from parameters
    let Longitude_Degree = Math.floor(parseInt(parameter.LongitudeFix));
    let Longitude_Min = Math.round((parseFloat(parameter.LongitudeFix) - Longitude_Degree) * 60); // Longitude minutes
    let Latitude_Degree = Math.floor(parseInt(parameter.LatitudeFix));
    let Latitude_Min = Math.round((parseFloat(parameter.LatitudeFix) - Latitude_Degree) * 60);
    let RealtimeZone = (parameter.TimeZoneH / 24) + (parameter.TimeZoneM / 24 / 60);
    let Realtime1 = (parseInt(hour, 10) / 24) + (parseInt(min, 10) / 60 / 24);

    // Time calculations
    let c12 = calendar.astroFcCalenAsHourDec1(parameter.TimeZoneH, parameter.TimeZoneM);
    let i = calendar.astroFcCalenAsTimeAdj(parameter.SaveTimeYN, parameter.East_West);
    let C46 = c12 + i;
    let DegTimeZone = calendar.astroSubCalenAsHourDec(); //c12
    let UniversalTime = calendar.astroFcCalenAsUniversalTime1(parameter.East_West, Realtime1, c12); //C47
    let DayAdj = calendar.astroFcCalenAsDayAdj1(day, UniversalTime, Realtime1); //C7

    let UniHour = Math.floor(UniversalTime * 24);
    let Unimin = Math.round((UniversalTime * 24 - UniHour) * 60);


    // Julian day calculation
    let julinday = calendar.jday(year, month, DayAdj, UniHour, Unimin, 0, 1) // ' c50

    // Astrological calculations
    let Rahu = calculateRahu(julinday);
    let Aya = parameter.East_West.trim() === "Lahiri" ? 80861.27 : 84038.27;

    // Additional astrological data points
    let SuriyaData = {
        DayAdj,
        month,
        year,
        hour,
        min,
        TimeZoneH: parameter.TimeZoneH,
        TimeZoneM: parameter.TimeZoneM,
        SaveTimeYN: parameter.SaveTimeYN,
        Longitude_Degree,
        Longitude_Min,
        East_West: parameter.East_West,
        Latitude_Degree,
        Latitude_Min,
        North_South: parameter.North_South
    };

    let ThaiRa = calculateThaiDataPoint(SuriyaData, 4);
    let ThaiAscendant = calculateThaiDataPoint(SuriyaData, 1);
    let ThaiMidHeaven = calculateThaiDataPoint(SuriyaData, 2);
    let ThaiObliquti = calculateThaiDataPoint(SuriyaData, 3);
    let ThaiT = calculateThaiDataPoint(SuriyaData, 5);
    let ThaiJulian = calculateThaiDataPoint(SuriyaData, 6);

    let ProfesAya = calendar.ayanamsa(ThaiT, Aya) // 'F27
    let DegreeAya = parameter.Ayanangsa === " N" ? 0 : ProfesAya;
    let Thaidgr = calculateThaidgr(Rahu, DegreeAya, Aya);
    let KeyEclip = ((julinday + 1009.724) - Math.floor((julinday + 1009.724) / 679) * 679) * 360 / 679;
    let ThaidgrEclip = (360 - KeyEclip) - Math.floor((360 - KeyEclip) / 360) * 360;

    let Today_Renamed = calendar.day2000(year, month, DayAdj, Math.floor(Number(UniHour)), Math.floor(Number(Unimin)), 0);
    Yesterday = Today_Renamed - 1;
    Tomorrow = Today_Renamed + 1;

    const todayValue = Number(Today_Renamed);
    const yesterdayValue = Number(Yesterday);
    const tomorrowValue = Number(Tomorrow);

    let MoonR = Array.from({
        length: 4
    }, () => new Array(6));
    let SunR = Array.from({
        length: 4
    }, () => new Array(6));
    let Mars = Array.from({
        length: 4
    }, () => new Array(6));
    let Mercury = Array.from({
        length: 4
    }, () => new Array(6));
    let Jupiter = Array.from({
        length: 4
    }, () => new Array(6));
    let Venus = Array.from({
        length: 4
    }, () => new Array(6));
    let Saturn = Array.from({
        length: 4
    }, () => new Array(6));
    let Uranus = Array.from({
        length: 4
    }, () => new Array(6));
    let Neptune = Array.from({
        length: 4
    }, () => new Array(6));
    let Pluto = Array.from({
        length: 4
    }, () => new Array(6));

    //จันทร์
    MoonR[1][1] = calendar.moon(todayValue, 1);
    MoonR[1][2] = calendar.moon(todayValue, 2);
    MoonR[1][3] = calendar.moon(todayValue, 3);
    MoonR[1][4] = calendar.secliptic(MoonR[1][1], MoonR[1][2], MoonR[1][3], todayValue, 3);
    MoonR[1][5] = (MoonR[1][4] + DegreeAya) - (Math.floor((MoonR[1][4] + DegreeAya) / 360) * 360);
    MoonR[1][0] = degreesToArcMinutes(MoonR[1][5]);
    MoonR[2][1] = calendar.moon(yesterdayValue, 1);
    MoonR[2][2] = calendar.moon(yesterdayValue, 2);
    MoonR[2][3] = calendar.moon(yesterdayValue, 3);
    MoonR[2][4] = calendar.secliptic(MoonR[2][1], MoonR[2][2], MoonR[2][3], yesterdayValue, 3);
    MoonR[2][5] = (MoonR[2][4] + DegreeAya) - (Math.floor((MoonR[2][4] + DegreeAya) / 360) * 360);
    MoonR[2][0] = degreesToArcMinutes(MoonR[2][5]);
    MoonR[3][1] = calendar.moon(tomorrowValue, 1);
    MoonR[3][2] = calendar.moon(tomorrowValue, 2);
    MoonR[3][3] = calendar.moon(tomorrowValue, 3);
    MoonR[3][4] = calendar.secliptic(MoonR[3][1], MoonR[3][2], MoonR[3][3], tomorrowValue, 3);
    MoonR[3][5] = (MoonR[3][4] + DegreeAya) - (Math.floor((MoonR[3][4] + DegreeAya) / 360) * 360);
    MoonR[3][0] = degreesToArcMinutes(MoonR[3][5]);

    //อาทิตย์
    SunR[1][1] = calendar.sun(todayValue, 1);
    SunR[1][2] = calendar.sun(todayValue, 2);
    SunR[1][3] = calendar.sun(todayValue, 3);
    SunR[1][4] = calendar.secliptic(SunR[1][1], SunR[1][2], SunR[1][3], todayValue, 3);
    SunR[1][5] = (SunR[1][4] + DegreeAya) - (Math.floor((SunR[1][4] + DegreeAya) / 360) * 360);
    SunR[1][0] = degreesToArcMinutes(SunR[1][5]);
    SunR[2][1] = calendar.sun(yesterdayValue, 1);
    SunR[2][2] = calendar.sun(yesterdayValue, 2);
    SunR[2][3] = calendar.sun(yesterdayValue, 3);
    SunR[2][4] = calendar.secliptic(SunR[2][1], SunR[2][2], SunR[2][3], yesterdayValue, 3);
    SunR[2][5] = (SunR[2][4] + DegreeAya) - (Math.floor((SunR[2][4] + DegreeAya) / 360) * 360);
    SunR[2][0] = degreesToArcMinutes(SunR[2][5]);
    SunR[3][1] = calendar.sun(tomorrowValue, 1);
    SunR[3][2] = calendar.sun(tomorrowValue, 2);
    SunR[3][3] = calendar.sun(tomorrowValue, 3);
    SunR[3][4] = calendar.secliptic(SunR[3][1], SunR[3][2], SunR[3][3], tomorrowValue, 3);
    SunR[3][5] = (SunR[3][4] + DegreeAya) - (Math.floor((SunR[3][4] + DegreeAya) / 360) * 360);
    SunR[3][0] = degreesToArcMinutes(SunR[3][5]);

    //อังคาร
    Mars[1][1] = calendar.planet(todayValue, 4, 1);
    Mars[1][2] = calendar.planet(todayValue, 4, 2);
    Mars[1][3] = calendar.planet(todayValue, 4, 3);
    Mars[1][4] = calendar.secliptic(Mars[1][1], Mars[1][2], Mars[1][3], todayValue, 3);
    Mars[1][5] = (Mars[1][4] + DegreeAya) - (Math.floor((Mars[1][4] + DegreeAya) / 360) * 360);
    Mars[1][0] = degreesToArcMinutes(Mars[1][5]);
    Mars[2][1] = calendar.planet(yesterdayValue, 4, 1);
    Mars[2][2] = calendar.planet(yesterdayValue, 4, 2);
    Mars[2][3] = calendar.planet(yesterdayValue, 4, 3);
    Mars[2][4] = calendar.secliptic(Mars[2][1], Mars[2][2], Mars[2][3], yesterdayValue, 3);
    Mars[2][5] = (Mars[2][4] + DegreeAya) - (Math.floor((Mars[2][4] + DegreeAya) / 360) * 360);
    Mars[2][0] = degreesToArcMinutes(Mars[2][5]);
    Mars[3][1] = calendar.planet(tomorrowValue, 4, 1);
    Mars[3][2] = calendar.planet(tomorrowValue, 4, 2);
    Mars[3][3] = calendar.planet(tomorrowValue, 4, 3);
    Mars[3][4] = calendar.secliptic(Mars[3][1], Mars[3][2], Mars[3][3], tomorrowValue, 3);
    Mars[3][5] = (Mars[3][4] + DegreeAya) - (Math.floor((Mars[3][4] + DegreeAya) / 360) * 360);
    Mars[3][0] = degreesToArcMinutes(Mars[3][5]);

    // พุธ
    Mercury[1][1] = calendar.planet(todayValue, 1, 1);
    Mercury[1][2] = calendar.planet(todayValue, 1, 2);
    Mercury[1][3] = calendar.planet(todayValue, 1, 3);
    Mercury[1][4] = calendar.secliptic(Mercury[1][1], Mercury[1][2], Mercury[1][3], todayValue, 3);
    Mercury[1][5] = (Mercury[1][4] + DegreeAya) - (Math.floor((Mercury[1][4] + DegreeAya) / 360) * 360);
    Mercury[1][0] = degreesToArcMinutes(Mercury[1][5]);
    Mercury[2][1] = calendar.planet(yesterdayValue, 1, 1);
    Mercury[2][2] = calendar.planet(yesterdayValue, 1, 2);
    Mercury[2][3] = calendar.planet(yesterdayValue, 1, 3);
    Mercury[2][4] = calendar.secliptic(Mercury[2][1], Mercury[2][2], Mercury[2][3], yesterdayValue, 3);
    Mercury[2][5] = (Mercury[2][4] + DegreeAya) - (Math.floor((Mercury[2][4] + DegreeAya) / 360) * 360);
    Mercury[2][0] = degreesToArcMinutes(Mercury[2][5]);
    Mercury[3][1] = calendar.planet(tomorrowValue, 1, 1);
    Mercury[3][2] = calendar.planet(tomorrowValue, 1, 2);
    Mercury[3][3] = calendar.planet(tomorrowValue, 1, 3);
    Mercury[3][4] = calendar.secliptic(Mercury[3][1], Mercury[3][2], Mercury[3][3], tomorrowValue, 3);
    Mercury[3][5] = (Mercury[3][4] + DegreeAya) - (Math.floor((Mercury[3][4] + DegreeAya) / 360) * 360);
    Mercury[3][0] = degreesToArcMinutes(Mercury[3][5]);

    // พฤหัส
    Jupiter[1][1] = calendar.planet(todayValue, 5, 1);
    Jupiter[1][2] = calendar.planet(todayValue, 5, 2);
    Jupiter[1][3] = calendar.planet(todayValue, 5, 3);
    Jupiter[1][4] = calendar.secliptic(Jupiter[1][1], Jupiter[1][2], Jupiter[1][3], todayValue, 3);
    Jupiter[1][5] = (Jupiter[1][4] + DegreeAya) - (Math.floor((Jupiter[1][4] + DegreeAya) / 360) * 360);
    Jupiter[1][0] = degreesToArcMinutes(Jupiter[1][5]);
    Jupiter[2][1] = calendar.planet(yesterdayValue, 5, 1);
    Jupiter[2][2] = calendar.planet(yesterdayValue, 5, 2);
    Jupiter[2][3] = calendar.planet(yesterdayValue, 5, 3);
    Jupiter[2][4] = calendar.secliptic(Jupiter[2][1], Jupiter[2][2], Jupiter[2][3], yesterdayValue, 3);
    Jupiter[2][5] = (Jupiter[2][4] + DegreeAya) - (Math.floor((Jupiter[2][4] + DegreeAya) / 360) * 360);
    Jupiter[2][0] = degreesToArcMinutes(Jupiter[2][5]);
    Jupiter[3][1] = calendar.planet(tomorrowValue, 5, 1);
    Jupiter[3][2] = calendar.planet(tomorrowValue, 5, 2);
    Jupiter[3][3] = calendar.planet(tomorrowValue, 5, 3);
    Jupiter[3][4] = calendar.secliptic(Jupiter[3][1], Jupiter[3][2], Jupiter[3][3], tomorrowValue, 3);
    Jupiter[3][5] = (Jupiter[3][4] + DegreeAya) - (Math.floor((Jupiter[3][4] + DegreeAya) / 360) * 360);
    Jupiter[3][0] = degreesToArcMinutes(Jupiter[3][5]);

    // ศุกร์
    Venus[1][1] = calendar.planet(todayValue, 2, 1);
    Venus[1][2] = calendar.planet(todayValue, 2, 2);
    Venus[1][3] = calendar.planet(todayValue, 2, 3);
    Venus[1][4] = calendar.secliptic(Venus[1][1], Venus[1][2], Venus[1][3], todayValue, 3);
    Venus[1][5] = (Venus[1][4] + DegreeAya) - (Math.floor((Venus[1][4] + DegreeAya) / 360) * 360);
    Venus[1][0] = degreesToArcMinutes(Venus[1][5]);
    Venus[2][1] = calendar.planet(yesterdayValue, 2, 1);
    Venus[2][2] = calendar.planet(yesterdayValue, 2, 2);
    Venus[2][3] = calendar.planet(yesterdayValue, 2, 3);
    Venus[2][4] = calendar.secliptic(Venus[2][1], Venus[2][2], Venus[2][3], yesterdayValue, 3);
    Venus[2][5] = (Venus[2][4] + DegreeAya) - (Math.floor((Venus[2][4] + DegreeAya) / 360) * 360);
    Venus[2][0] = degreesToArcMinutes(Venus[2][5]);
    Venus[3][1] = calendar.planet(tomorrowValue, 2, 1);
    Venus[3][2] = calendar.planet(tomorrowValue, 2, 2);
    Venus[3][3] = calendar.planet(tomorrowValue, 2, 3);
    Venus[3][4] = calendar.secliptic(Venus[3][1], Venus[3][2], Venus[3][3], tomorrowValue, 3);
    Venus[3][5] = (Venus[3][4] + DegreeAya) - (Math.floor((Venus[3][4] + DegreeAya) / 360) * 360);
    Venus[3][0] = degreesToArcMinutes(Venus[3][5]);

    //เสาร์
    Saturn[1][1] = calendar.planet(todayValue, 6, 1);
    Saturn[1][2] = calendar.planet(todayValue, 6, 2);
    Saturn[1][3] = calendar.planet(todayValue, 6, 3);
    Saturn[1][4] = calendar.secliptic(Saturn[1][1], Saturn[1][2], Saturn[1][3], todayValue, 3);
    Saturn[1][5] = (Saturn[1][4] + DegreeAya) - (Math.floor((Saturn[1][4] + DegreeAya) / 360) * 360);
    Saturn[1][0] = degreesToArcMinutes(Saturn[1][5]);
    Saturn[2][1] = calendar.planet(yesterdayValue, 6, 1);
    Saturn[2][2] = calendar.planet(yesterdayValue, 6, 2);
    Saturn[2][3] = calendar.planet(yesterdayValue, 6, 3);
    Saturn[2][4] = calendar.secliptic(Saturn[2][1], Saturn[2][2], Saturn[2][3], yesterdayValue, 3);
    Saturn[2][5] = (Saturn[2][4] + DegreeAya) - (Math.floor((Saturn[2][4] + DegreeAya) / 360) * 360);
    Saturn[2][0] = degreesToArcMinutes(Saturn[2][5]);
    Saturn[3][1] = calendar.planet(tomorrowValue, 6, 1);
    Saturn[3][2] = calendar.planet(tomorrowValue, 6, 2);
    Saturn[3][3] = calendar.planet(tomorrowValue, 6, 3);
    Saturn[3][4] = calendar.secliptic(Saturn[3][1], Saturn[3][2], Saturn[3][3], tomorrowValue, 3);
    Saturn[3][5] = (Saturn[3][4] + DegreeAya) - (Math.floor((Saturn[3][4] + DegreeAya) / 360) * 360);
    Saturn[3][0] = degreesToArcMinutes(Saturn[3][5]);

    // ยูเรนัส
    Uranus[1][1] = calendar.planet(todayValue, 7, 1);
    Uranus[1][2] = calendar.planet(todayValue, 7, 2);
    Uranus[1][3] = calendar.planet(todayValue, 7, 3);
    Uranus[1][4] = calendar.secliptic(Uranus[1][1], Uranus[1][2], Uranus[1][3], todayValue, 3);
    Uranus[1][5] = (Uranus[1][4] + DegreeAya) - (Math.floor((Uranus[1][4] + DegreeAya) / 360) * 360);
    Uranus[1][0] = degreesToArcMinutes(Uranus[1][5]);
    Uranus[2][1] = calendar.planet(yesterdayValue, 7, 1);
    Uranus[2][2] = calendar.planet(yesterdayValue, 7, 2);
    Uranus[2][3] = calendar.planet(yesterdayValue, 7, 3);
    Uranus[2][4] = calendar.secliptic(Uranus[2][1], Uranus[2][2], Uranus[2][3], yesterdayValue, 3);
    Uranus[2][5] = (Uranus[2][4] + DegreeAya) - (Math.floor((Uranus[2][4] + DegreeAya) / 360) * 360);
    Uranus[2][0] = degreesToArcMinutes(Uranus[2][5]);
    Uranus[3][1] = calendar.planet(tomorrowValue, 7, 1);
    Uranus[3][2] = calendar.planet(tomorrowValue, 7, 2);
    Uranus[3][3] = calendar.planet(tomorrowValue, 7, 3);
    Uranus[3][4] = calendar.secliptic(Uranus[3][1], Uranus[3][2], Uranus[3][3], tomorrowValue, 3);
    Uranus[3][5] = (Uranus[3][4] + DegreeAya) - (Math.floor((Uranus[3][4] + DegreeAya) / 360) * 360);
    Uranus[3][0] = degreesToArcMinutes(Uranus[3][5]);

    // เนปจูน
    Neptune[1][1] = calendar.planet(todayValue, 8, 1);
    Neptune[1][2] = calendar.planet(todayValue, 8, 2);
    Neptune[1][3] = calendar.planet(todayValue, 8, 3);
    Neptune[1][4] = calendar.secliptic(Neptune[1][1], Neptune[1][2], Neptune[1][3], todayValue, 3);
    Neptune[1][5] = (Neptune[1][4] + DegreeAya) - (Math.floor((Neptune[1][4] + DegreeAya) / 360) * 360);
    Neptune[1][0] = degreesToArcMinutes(Neptune[1][5]);
    Neptune[2][1] = calendar.planet(yesterdayValue, 8, 1);
    Neptune[2][2] = calendar.planet(yesterdayValue, 8, 2);
    Neptune[2][3] = calendar.planet(yesterdayValue, 8, 3);
    Neptune[2][4] = calendar.secliptic(Neptune[2][1], Neptune[2][2], Neptune[2][3], yesterdayValue, 3);
    Neptune[2][5] = (Neptune[2][4] + DegreeAya) - (Math.floor((Neptune[2][4] + DegreeAya) / 360) * 360);
    Neptune[2][0] = degreesToArcMinutes(Neptune[2][5]);
    Neptune[3][1] = calendar.planet(tomorrowValue, 8, 1);
    Neptune[3][2] = calendar.planet(tomorrowValue, 8, 2);
    Neptune[3][3] = calendar.planet(tomorrowValue, 8, 3);
    Neptune[3][4] = calendar.secliptic(Neptune[3][1], Neptune[3][2], Neptune[3][3], tomorrowValue, 3);
    Neptune[3][5] = (Neptune[3][4] + DegreeAya) - (Math.floor((Neptune[3][4] + DegreeAya) / 360) * 360);
    Neptune[3][0] = degreesToArcMinutes(Neptune[3][5]);

    // พลูโต
    Pluto[1][1] = calendar.planet(todayValue, 9, 1);
    Pluto[1][2] = calendar.planet(todayValue, 9, 2);
    Pluto[1][3] = calendar.planet(todayValue, 9, 3);
    Pluto[1][4] = calendar.secliptic(Pluto[1][1], Pluto[1][2], Pluto[1][3], todayValue, 3);
    Pluto[1][5] = (Pluto[1][4] + DegreeAya) - (Math.floor((Pluto[1][4] + DegreeAya) / 360) * 360);
    Pluto[1][0] = degreesToArcMinutes(Pluto[1][5]);
    Pluto[2][1] = calendar.planet(yesterdayValue, 9, 1);
    Pluto[2][2] = calendar.planet(yesterdayValue, 9, 2);
    Pluto[2][3] = calendar.planet(yesterdayValue, 9, 3);
    Pluto[2][4] = calendar.secliptic(Pluto[2][1], Pluto[2][2], Pluto[2][3], yesterdayValue, 3);
    Pluto[2][5] = (Pluto[2][4] + DegreeAya) - (Math.floor((Pluto[2][4] + DegreeAya) / 360) * 360);
    Pluto[2][0] = degreesToArcMinutes(Pluto[2][5]);
    Pluto[3][1] = calendar.planet(tomorrowValue, 9, 1);
    Pluto[3][2] = calendar.planet(tomorrowValue, 9, 2);
    Pluto[3][3] = calendar.planet(tomorrowValue, 9, 3);
    Pluto[3][4] = calendar.secliptic(Pluto[3][1], Pluto[3][2], Pluto[3][3], tomorrowValue, 3);
    Pluto[3][5] = (Pluto[3][4] + DegreeAya) - (Math.floor((Pluto[3][4] + DegreeAya) / 360) * 360);
    Pluto[3][0] = degreesToArcMinutes(Pluto[3][5]);

    let ElicYesterday = [];
    let ElicTomorrow = [];
    let Direction = [];
    let Speed = [];
    const RadSpeed = Array.from({
        length: 13
    }, () => Array.from({
        length: 5
    }, () => Array(2).fill(0)));

    // Function to calculate ElicYesterday and ElicTomorrow
    function calculateElic(solarSystem, index) {
        if (Math.abs(solarSystem[1][4] - solarSystem[2][4]) > 180) {
            ElicYesterday[index] = 360 - Math.abs(solarSystem[1][4] - solarSystem[2][4]);
        } else {
            ElicYesterday[index] = Math.abs(solarSystem[1][4] - solarSystem[2][4]);
        }

        if (Math.abs(solarSystem[1][4] - solarSystem[3][4]) > 180) {
            ElicTomorrow[index] = 360 - Math.abs(solarSystem[1][4] - solarSystem[3][4]);
        } else {
            ElicTomorrow[index] = Math.abs(solarSystem[1][4] - solarSystem[3][4]);
        }
    }

    // Function to calculate Direction and RadSpeed
    function calculateDirectionAndSpeed(solarSystem, index) {
        if (Math.abs(solarSystem[1][4] - solarSystem[2][4]) > 180) {
            Direction[index] = "";
        } else {
            if (solarSystem[1][4] < solarSystem[2][4]) {
                Direction[index] = "พักร";
            } else {
                Direction[index] = "";
            }
        }
    }

    // Calculate for each planet
    calculateElic(SunR, 1);
    calculateDirectionAndSpeed(SunR, 1);

    calculateElic(MoonR, 2);
    calculateDirectionAndSpeed(MoonR, 2);

    calculateElic(Mars, 3);
    calculateDirectionAndSpeed(Mars, 3);

    calculateElic(Mercury, 4);
    calculateDirectionAndSpeed(Mercury, 4);

    calculateElic(Jupiter, 5);
    calculateDirectionAndSpeed(Jupiter, 5);

    calculateElic(Venus, 6);
    calculateDirectionAndSpeed(Venus, 6);

    calculateElic(Saturn, 7);
    calculateDirectionAndSpeed(Saturn, 7);

    calculateElic(Uranus, 11);
    calculateDirectionAndSpeed(Uranus, 11);


    // Calculate ElicYesterday and ElicTomorrow for Neptune
    if (Math.abs(Neptune[1][4] - Neptune[2][4]) > 180) {
        ElicYesterday[12] = 360 - Math.abs(Neptune[1][4] - Neptune[2][4]);
    } else {
        ElicYesterday[12] = Math.abs(Neptune[1][4] - Neptune[2][4]);
    }

    if (Math.abs(Neptune[1][4] - Neptune[3][4]) > 180) {
        ElicTomorrow[12] = 360 - Math.abs(Neptune[1][4] - Neptune[3][4]);
    } else {
        ElicTomorrow[12] = Math.abs(Neptune[1][4] - Neptune[3][4]);
    }

    // Determine the direction and RadSpeed for Neptune
    if (Math.abs(Neptune[1][4] - Neptune[2][4]) > 180) {
        Direction[1] = "";
        RadSpeed[11][4][0] = 3; // Normal
    } else {
        if (Neptune[1][4] < Neptune[2][4]) {
            Direction[1] = "พักร"; // Retrograde
            RadSpeed[11][4][0] = 1; // Retrograde
        } else {
            Direction[1] = "";
            RadSpeed[11][4][0] = 3; // Normal
        }
    }

    // Calculate ElicYesterday and ElicTomorrow for Pluto
    if (Math.abs(Pluto[1][4] - Pluto[2][4]) > 180) {
        ElicYesterday[13] = 360 - Math.abs(Pluto[1][4] - Pluto[2][4]);
    } else {
        ElicYesterday[13] = Math.abs(Pluto[1][4] - Pluto[2][4]);
    }

    if (Math.abs(Pluto[1][4] - Pluto[3][4]) > 180) {
        ElicTomorrow[13] = 360 - Math.abs(Pluto[1][4] - Pluto[3][4]);
    } else {
        ElicTomorrow[13] = Math.abs(Pluto[1][4] - Pluto[3][4]);
    }

    // Determine the direction and RadSpeed for Pluto
    if (Math.abs(Pluto[1][4] - Pluto[2][4]) > 180) {
        Direction[1] = "";
        RadSpeed[12][4][0] = 3; // Normal
    } else {
        if (Pluto[1][4] < Pluto[2][4]) {
            Direction[1] = "พักร"; // Retrograde
            RadSpeed[12][4][0] = 1; // Retrograde
        } else {
            Direction[1] = "";
            RadSpeed[12][4][0] = 3; // Normal
        }
    }

    // Calculate Speed for planets 1 to 13 (excluding 8, treating 11 as Neptune and 12 as Pluto)
    for (let i = 1; i <= 13; i++) {
        if (i === 8) i = 11;
        if (ElicTomorrow[i] > ElicYesterday[i]) {
            Speed[i] = "เสริด";
        } else if (ElicTomorrow[i] < ElicYesterday[i]) {
            Speed[i] = "";
        } else {
            Speed[i] = "มนท์";
        }
    }

    // Update RadSpeed based on Speed for Neptune and Pluto
    if (Speed[12] === "เสริด") {
        RadSpeed[11][4][0] = 4; // Fast
    } else if (Speed[12] === "มนท์") {
        RadSpeed[11][4][0] = 2; // Slow or stationary
    }

    if (Speed[13] === "เสริด") {
        RadSpeed[12][4][0] = 4; // Fast
    } else if (Speed[13] === "มนท์") {
        RadSpeed[12][4][0] = 2; // Slow or stationary
    }

    // Usage example for Neptune and Pluto, adapt as necessary
    let A1_Neptune = Neptune[1][0];
    let A1_Pluto = Pluto[1][0];

    return {
        A1_Neptune,
        A1_Pluto,
        Direction,
        RadSpeed: RadSpeed
    }
}

// ทำนายผูกดวง
async function PakakornSompod(SuriyatDate, TodaySuriyatDate) {
    let iStarAll = 12;
    let YourDayBornMooniLuk = SuriyatDate.dayMooni;

    // '........ ส่วนของข้อมูลเกี่ยวกับดาวและภพ (กำเนิด)
    let CharGroupStar = {
        1: "สระทั้งหมด",
        2: "ก ข ค ฆ ง",
        3: "จ ฉ ช ซ ฌ ญ",
        4: "ฎ ฏ ฐ ฑ ฒ ณ",
        5: "บ ป ผ ฝ พ ฟ ภ ม",
        6: "ศ ษ ส ห ฬ ฮ",
        7: "ด ต ถ ท ธ น",
        8: "ย ร ล ว",
    }

    // 'ดาวใดอยู่ทักษาใด เช่น strTaksaStringStar(6) ="บริวาร"  หมายถึง ดาว 6 อยู่ทักษาบริวาร  "ศ ษ ส ห ฬ ฮ" เป็นต้น
    let strTaksaStringCount = {
        "": "",
        1: "บริวาร",
        2: "อายุ",
        3: "เดช",
        4: "ศรี",
        5: "มูละ",
        6: "อุตสาหะ",
        7: "มนตรี",
        8: "กาลกิณี"
    };

    // 'รับค่า เกี่ยวกับทักษา ไม่ว่าจะเกิดวันพุธกลางวัน (๔) หรือวันพุธกลางคืน (๘) ให้พุธ (๔) เป็นบริวารเสมอ (เกิดพุธกลางคืน ราหูไม่เป็นบริวารและพฤหัสไม่เป็นกาลี)
    let ichkTaksaBorn4or8As4 = 1;
    let TextTaksaBorn8, iCountTaksa;

    // 'ถ้าตั้งค่า เกิดวันพุธกลางคืน ให้ถือว่าพุธกลางวัน
    if (ichkTaksaBorn4or8As4 == 1) {
        if (YourDayBornMooniLuk == 8) {
            TextTaksaBorn8 = "* เกี่ยวกับทักษา-ตรีวัย ผู้ใช้ได้ตั้งค่าในโปรแกรมว่า ไม่ว่าจะเกิดวันพุธกลางวัน (๔) หรือวันพุธกลางคืน (๘) ให้พุธ (๔) เป็นบริวารเสมอ ฉะนั้น เจ้าชะตาเกิดพุธกลางคืน ราหูจึงไม่เป็นบริวารและพฤหัสไม่เป็นกาลกิณี";
            iCountTaksa = 4;
        } else {
            iCountTaksa = YourDayBornMooniLuk;
        }
    } else {
        iCountTaksa = YourDayBornMooniLuk;
    }
    let strTaksaStringStar = new Array(9);

    let sequence = {
        1: 2,
        2: 3,
        3: 4,
        4: 7,
        7: 5,
        5: 8,
        8: 6,
        6: 1,
    };

    for (let iTaksa = 1; iTaksa <= 8; iTaksa++) {
        strTaksaStringStar[iCountTaksa] = strTaksaStringCount[iTaksa];
        // console.log(`Current iCountTaksa: ${iCountTaksa}`);
        iCountTaksa = sequence[iCountTaksa]; // Correct access to sequence using bracket notation
        // console.log(`Next iCountTaksa: ${iCountTaksa} : ${strTaksaStringCount[iTaksa]}`);
    } //' For iTaksa = 1 To 8 'นับ 8 รอบ คือให้ครบ 8 ทักษา คือ 1.บริวาร 2.อายุ 3.เดช 4.ศรี ...... 8.กาลกิณี

    let strTotalCharDot_SUM; //'สรุปอักษรที่ห้ามนำมาตั้งชื่อ (ห้ามมีอยู่ในชื่อ) สำหรับดวงชะตาคุณคือ "s"
    let strFontEnd, strFontStart;
    let strBornPopsChars, strAboutStarAndPop, strNameStarString, strDontCharVIP, strCommentDontCharVIP, strCommentDontCharKala, Vangs;
    strDontCharVIP = "";
    Vangs = "   ";

    let varBornLuk_PopsChars = [
        [],
        []
    ];

    let sTextFocus1 = [];
    let iTextFocus1 = 0;
    for (let Starii = 0; Starii <= iStarAll; Starii++) {

        strNameStarString = Starii;

        if (Starii == 0 || Starii == 9 || Starii == 11 || Starii == 12) {
            if (Starii == 11) {
                strNameStarString = "เนปจูน";
            }
            if (Starii == 12) {
                strNameStarString = "เนปจูน";
            }
            // Space(10) & "ดาว " & strNameStarString & " อยู่ภพ " & varBornLuk_PopLuksStar(0, Starii)
            varBornLuk_PopsChars[0][Starii] = "ดาว " + strNameStarString + " อยู่ภพ " + SuriyatDate.varBornPutdate_PopLuksStar[0][Starii];
        }

        if (Starii == 1 || Starii == 2 || Starii == 3 || Starii == 4 || Starii == 5 || Starii == 6 || Starii == 7 || Starii == 8) {
            if (SuriyatDate.varBornPutdate_PopLuksStar == "อริ" || SuriyatDate.varBornPutdate_PopLuksStar == "มรณะ" || SuriyatDate.varBornPutdate_PopLuksStar == "วินาศ") {
                // varBornLuk_PopsChars[0][Starii] = "ดาว " + strNameStarString + " อยู่ภพ " + SuriyatDate.varBornPutdate_PopLuksStar[0][Starii] + Vangs + "อักขระประจำดาวนี้คือ : " + charGroupStar[Starii] + "  (ทักษา " + strTaksaStringStar[Starii] + ")";
                varBornLuk_PopsChars[0][Starii] = `ดาว ${strNameStarString} อยู่ภพ ${SuriyatDate.varBornPutdate_PopLuksStar[0][Starii]} ${Vangs}อักขระประจำดาวนี้คือ : ${CharGroupStar[Starii]} (ทักษา ${strTaksaStringStar[Starii]})`;
                iTextFocus1 += 1;
                sTextFocus1[iTextFocus1] = varBornLuk_PopsChars[0][Starii];
            } else {
                // varBornLuk_PopsChars[0][Starii] = "ดาว " + strNameStarString + " อยู่ภพ " & SuriyatDate.varBornPutdate_PopLuksStar[0][Starii] + Vangs + "อักขระประจำดาวนี้คือ : " + CharGroupStar[Starii] + "  (ทักษา " + strTaksaStringStar[Starii] + ")";
                varBornLuk_PopsChars[0][Starii] = `ดาว ${strNameStarString} อยู่ภพ ${SuriyatDate.varBornPutdate_PopLuksStar[0][Starii]} ${Vangs}อักขระประจำดาวนี้คือ : ${CharGroupStar[Starii]} (ทักษา ${strTaksaStringStar[Starii]})`;
            }
        }
    }

    //ข้อมูลเกี่ยวกับดาวและภพ (ดวงกำเนิดของเจ้าชะตา)
    // let sTextTopicSmall;
    // iTextTopicSmall += 1;
    // sTextTopicSmall[iTextTopicSmall] = "ดาว เจ้าเรือน ภพ และมาตรฐานดาวกำเนิด";
    // ' หาดาวเจ้าเรือน แล้วรับค่า เช่น "ดาว 2 เป็นเจ้าเรือน ตนุ ตกอยู่ในภพ กัมมะ"  เพื่อแสดง
    let StarHousei, StarHouseRi, iCountR;
    let strBornStarAsHouseInPop, Pop2;
    iCountR = SuriyatDate.varBornPutdate_StarStayR[0][10];
    let varBornLuk_OwnerHousePopS = [];
    let varBornLuk_OwnerHousePopSS = [];
    let varBornLuk_KasediInPopistr = [];

    for (let iPop = 0; iPop <= 11; iPop++) { // 'นับภพ  0-11 (ตนุ-วินาศ)
        StarHousei = fcRaseeiToHouse(iCountR); // 'หาว่า ราศีนี้มีดาวใดเป็นเจ้าเรือน
        StarHouseRi = SuriyatDate.varBornPutdate_StarStayR[0][StarHousei]; // 'หาว่า ดาวเจ้าเรือนอยู่ราศีใด
        Pop2 = SuriyatDate.varBornPutdate_PopLuksStar[0][StarHousei]; // 'รับค่าภพที่ดาวนี้อยู่  เช่น "กัมมะ"    ' Dim varBornLuk_PopLuksStar(1, iStarAll) As String ' ดาว n อยู่ภพ เช่น ดาว 0 = "สหัชชะ"
        varBornLuk_OwnerHousePopS[iPop] = "เจ้าเรือน  " + await Support.fcPopiToS(iPop) + "  ตกอยู่ในภพ  " + Pop2;
        // ' ต่อท้ายด้วยมาตรฐานดาว
        let strSS = "";
        if (SuriyatDate.varBornPutdate_RaSTD[0][StarHousei] === "-") {
            strSS = "";
        } else {
            strSS += " ";
        }
        let strSTDStar = (strSS + SuriyatDate.varBornPutdate_RaSTD[0][StarHousei].replace(/-/g, "")).trim(); // มาตรฐานดาวราศีจักร

        if (strSTDStar.length === 0) {
            strSTDStar = "";
        } else {
            strSTDStar = "   (เป็น " + strSTDStar + ")";
        }

        varBornLuk_OwnerHousePopSS[iPop] = "ดาว " + StarHousei + " เป็นเจ้าเรือน " + await Support.fcPopiToS(iPop) + " ตกภพ " + Pop2 + " " + strSTDStar;
        varBornLuk_KasediInPopistr[iPop] = iPop + "-" + await Support.fcPopSToi(Pop2); //' varBornLuk_KasediInPopistr(1)="10-11"

        iCountR = (iCountR + 1) % 12;
        //  ดาว เจ้าเรือน ภพ และมาตรฐานดาวกำเนิด
    }

    // คำทำนายลัคนาสถิตราศี
    // ลัคนาสถิตราศีกันย์ กันย์ (5)
    // ลัคนาสถิตราศีกันย์ พยากรณ์ตามลักษณะราศีเจ้าชะตามักเป็นคนมีรูปร่างอรชอ้อนแอ้น มีผิวขาวปนเหลือง สงบเสงี่ยมเจียมตัว<br>รักสวยรักงาม ชอบความสะอาด พิถีพิถันในการแต่งตัว ชอบความเป็นระเบียบเรียบร้อย พูดจาไพเราะ มักมีตำหนิเป็นไฝปานที่แขน<br>มือ หรือไหล่แห่งใดแห่งหนึ่ง งานที่เหมาะสำหรับคุณควรเป็นงานนักประพันธ์ นักเขียน และเป็นหัวหน้าในหน่วยงานอื่นๆ โรคที่มักเกิดขึ้น<br>ถ้ามีคือโรคโลหิตจาง หลอดลมเอกเสบ หืด หอบ<br>
    // สีและอัญมณีที่ถูกโฉลกประจำราศี
    // สีและอัญมณีที่ถูกโฉลก เสริมดวงชะตาและทำให้เกิดโชคลาภ คือสีเขียว อัญมณีคือมรกต,หยก,เขียวส่อง สีและอัญมณีที่ห้ามใช้<br>คือสีม่วงคราม,แสดและส้ม อัญมณีคือโกเมน,พลอยสีส้ม, พลอยสีม่วงคราม<br>
    // varBornLuk_StarStayR == SuriyatDate.varBornPutdate_StarStayR[0][10] คำทำนายลัคนาสถิตราศี
    let Sql_StarStayR = "SELECT * FROM luktamnailukliverasee WHERE  Raseei= " + SuriyatDate.varBornPutdate_StarStayR[0][10];
    let Query_StarStayR10 = await db.dbQuery(Sql_StarStayR);
    let ascendantPrediction_Title = "คำทำนายลัคนาสถิตราศี";
    let ascendantPredictionGem_Title = "สีและอัญมณีที่ถูกโฉลกประจำราศี";
    let ascendantPrediction_Sub = "",
        ascendantPrediction_Desc = "",
        ascendantPredictionGem_Desc = "";
    // Prediction of ascendant and zodiac sign
    if (Query_StarStayR10.length === 1) {
        ascendantPrediction_Sub = Query_StarStayR10[0].LukLiveRasees + " " + Query_StarStayR10[0].Rasees + " (" + Query_StarStayR10[0].Raseei + ")";
        ascendantPrediction_Desc = Query_StarStayR10[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
        ascendantPredictionGem_Desc = Query_StarStayR10[0].PayakornColorGem.replace(/<br>/g, "").replace(/<b>/g, "");
    }
    // 'เริ่ม คำทำนายกุมลัคน์ 17408 
    let iRasee = SuriyatDate.varBornPutdate_StarStayR[0][10];
    let starStayGumLuk = [];
    for (let iStar = 0; iStar <= 9; iStar++) {
        if (iRasee == SuriyatDate.varBornPutdate_StarStayR[0][iStar]) {
            const sqlQuery = "SELECT * FROM luktamnaiholdluk WHERE Stari= " + iStar;
            const queryResult = await db.dbQuery(sqlQuery);
            if (queryResult.length > 0) {
                const description = queryResult[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                starStayGumLuk[iStar] = "ดาว " + await Support.fcStariToS(iStar) + " กุมลัคน์ (" + queryResult[0].Stari + ")ลั " + description;
            }
        } else {
            starStayGumLuk[0] = " ไม่มีคำทำนายนี้ ";
        }
    }
    // 'จบ คำทำนายกุมลัคน์

    // 'เริ่ม เล็งลัคนา // varBornLuk_PopLuksStar == varBornPutdate_PopLuksStar
    let starStayPatani = [];
    for (let Starii = 0; Starii <= iStarAll; Starii++) {
        if (SuriyatDate.varBornPutdate_PopLuksStar[0][Starii] == "ปัตนิ") {
            const sqlQuery = "SELECT * FROM luktamnaioppositeluk WHERE Stari= " + Starii;
            const queryResult = await db.dbQuery(sqlQuery);
            if (queryResult && queryResult.length > 0) {
                const description = queryResult[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                starStayPatani[Starii] = "ดาว " + await Support.fcStariToS(Starii) + " เล็งลัคนา (" + queryResult[0].Stari + ") <--> ลั)" + description;
            } else {
                starStayPatani[Starii] = " - ";
            }
        } else {
            starStayPatani[0] = " ไม่มีคำทำนายนี้ ";
        }
    }
    // 'จบ เล็งลัคนา

    // ดาว sTextTopicSmall(iTextTopicSmall) = "ดาว" & fcStariToS(varBornLuk_starAsTanuSED(0)) & "เป็นตนุเศษ"
    // varBornLuk_starAsTanuSED[0] = varBornPutdate_starAsTanuSED[0]
    let starAsTanuSED_Title = "คำทำนายตนุเศษ ทายเรื่องจิตใจของเจ้าชะตา";
    let starAsTanuSED_Sub = "ดาว " + await Support.fcStariToS(SuriyatDate.varBornPutdate_starAsTanuSED[0]) + " เป็นตนุเศษ";
    let starAsTanuSED_Desc = await fcGetTanuPayakon(SuriyatDate.varBornPutdate_starAsTanuSED[0]);

    // คำทำนายดาวที่อยู่ในราศีเดียวกัน (ดาวคู่หรือดาวกุมกัน)
    // SuriyatDate.varBornPutdate_StarStayR[0][10]
    let iStarMate2; //ดาวที่นำมาเทียบ
    let Star_Same_Title = "คำทำนายดาวที่อยู่ในราศีเดียวกัน (ดาวคู่หรือดาวกุมกัน)";
    let Star_Same_Sub = [];
    let Star_Same_Desc = [];
    for (let iRaseeLoop = 0; iRaseeLoop <= 11; iRaseeLoop++) {
        for (let iStarLoop = 1; iStarLoop <= 9; iStarLoop++) {
            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarLoop]) { // 'ถ้าในราศีนี้ มีดาวนี้อยู่
                switch (iStarLoop) {
                    case 1: // ' iStarLoop = 1 'ดาว 1
                        for (let iStarLoopMate2 = 2; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            // '1-n (2-9)     คือเทียบ 1-2  1-3  1-4  1-5......1-9 7 
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        //'For iStarLoopMate2 = 2 To 9 ' วนดาวเทียบ (ดาวตัวที่ 2)
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 2:
                        for (let iStarLoopMate2 = 3; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 3:
                        for (let iStarLoopMate2 = 4; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 4:
                        for (let iStarLoopMate2 = 5; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 5:
                        for (let iStarLoopMate2 = 6; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 6:
                        for (let iStarLoopMate2 = 7; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }

                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 7:
                        iStarMate2 = 8;
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 8:
                        iStarMate2 = 9;
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 9:
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }
    // ดาวคู่หรือดาวกุมกัน 

    // 'คุณภาพดาว ราศีจักร
    let iCountSTD_Ra = 0;
    let iLoopi;
    let sSTD$;
    let txtSTDArray = [];
    let SS; //'ss ต้องเป็น Variant เท่านั้น
    let sTamnaiSTD_Ra = "";
    iLoopi = 0
    let S = "";
    let rSTD = SuriyatDate.varBornPutdate_RaSTD[0];

    // ไม่รู้มีไว้ทำไม
    // let Result_LukSompodStarBorn = await db.dbQuery("SELECT * FROM luksompodstarborn WHERE rSTD<>'-' ORDER BY Stari ASC");
    // if (Result_LukSompodStarBorn && Result_LukSompodStarBorn.length > 0) {
    //     Result_LukSompodStarBorn.forEach(async (row) => {
    //     });
    // }

    let standardStarsDuangRasee_Title = "ดาวที่เป็น ดาวมาตรฐาน ในดวงราศีจักร";
    let standardStarsDuangRasee_Sub = [];
    let standardStarsDuangRasee_Desc = [];
    const QueryDuangRasee = rSTD.map((entry, index) => {
        if (entry !== '-') {
            const splitEntries = entry.split(",").filter(e => e.trim() !== "ตนุเศษ");
            if (splitEntries.length > 0) {
                return {
                    entry: splitEntries.join(", "), // Cleaned entries
                    index
                };
            }
        }
    }).filter(item => item !== undefined);

    if (QueryDuangRasee && QueryDuangRasee.length > 0) {
        for (let index = 0; index < QueryDuangRasee.length; index++) {
            const row = QueryDuangRasee[index];
            const parts = row.entry.split(",").map(part => part.trim());
            if (parts.length > 1) {
                for (let i = 0; i < parts.length; i++) {
                    const sqlQuery = "SELECT * FROM luktamnaistarasstd WHERE Stari = ? AND AsSTDs = ?";
                    const queryParams = [row.index, parts[i]];
                    const tamnaiResults = await db.db_Query(sqlQuery, queryParams);
                    if (tamnaiResults && tamnaiResults.length > 0) {
                        const Sub = `${tamnaiResults[0].StarsAsSTDs} [อยู่ราศี${await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[0][tamnaiResults[0].Stari])} ดวงราศีจักร]`;
                        const description = tamnaiResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                        standardStarsDuangRasee_Sub.push(Sub);
                        standardStarsDuangRasee_Desc.push(description);
                    }
                }
            } else {
                const sqlQuery = "SELECT * FROM luktamnaistarasstd WHERE Stari = ? AND AsSTDs = ?";
                const queryParams = [row.index, row.entry];
                const tamnaiResults = await db.db_Query(sqlQuery, queryParams);
                if (tamnaiResults && tamnaiResults.length > 0) {

                    const Sub = `${tamnaiResults[0].StarsAsSTDs} [อยู่ราศี${await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[0][tamnaiResults[0].Stari])} ดวงราศีจักร]`;
                    const description = tamnaiResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                    standardStarsDuangRasee_Sub.push(Sub);
                    standardStarsDuangRasee_Desc.push(description);
                }
            }
        }
    }
    // จบ ดาวมาตรฐาน ในดวงราศีจักร 

    // ดาวมาตรฐาน ในดวงราศีนวางค์จักร 'หาคำทำนายคุณภาพดาว เกษตร ประ.....
    let standardStarsDuangNavang_Title = "ดาวที่เป็น ดาวมาตรฐาน ในดวงนวางค์จักร";
    let standardStarsDuangNavang_Sub = [];
    let standardStarsDuangNavang_Desc = [];
    let sSTDNa = SuriyatDate.varBornPutdate_NaRaSTD[0];
    // เกษตร มหาจักร นิจ  มหาจักร เกษตร
    const QueryDuangNavang = sSTDNa.map((entry, index) => {
        if (entry !== '-') {
            const splitEntries = entry.split(",").filter(e => e.trim() !== "ตนุเศษ");
            if (splitEntries.length > 0) {
                return {
                    entry: splitEntries.join(", "), // Cleaned entries
                    index
                };
            }
        }
    }).filter(item => item !== undefined);

    if (QueryDuangNavang && QueryDuangNavang.length > 0) {
        for (let index = 0; index < QueryDuangNavang.length; index++) {
            const row = QueryDuangNavang[index];
            const sqlQuery = "SELECT * FROM luktamnaistarasstd WHERE Stari = ? AND AsSTDs = ?";
            const queryParams = [row.index, row.entry];
            const tamnaiResults = await db.db_Query(sqlQuery, queryParams);
            if (tamnaiResults && tamnaiResults.length > 0) {
                const title = `${tamnaiResults[0].StarsAsSTDs} [อยู่ราศี${await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_NavangStarAsRasee[0][tamnaiResults[0].Stari])} ดวงนวางค์จักร]`;
                const description = tamnaiResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                standardStarsDuangNavang_Sub.push(title);
                standardStarsDuangNavang_Desc.push(description);
            }
        }
    }

    // 'ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   
    // 'กาลกิณี ตามหลักทักษา
    let DayBornMooniX, StarAsKalakini;
    let PopsKalakini;
    let starKalakini_Sub, starKalakini_Title, starKalakini_Desc;

    if (ichkTaksaBorn4or8As4 == 1) {
        if (SuriyatDate.dayMooni == 8) {
            DayBornMooniX = 4;
        } else {
            DayBornMooniX = SuriyatDate.dayMooni;
        }
    } else {
        DayBornMooniX = SuriyatDate.dayMooni;
    }

    const starAsKalakiniMap = {
        1: 6,
        2: 1,
        3: 2,
        4: 3,
        5: 7,
        6: 8,
        7: 4,
        8: 5
    };

    StarAsKalakini = starAsKalakiniMap[DayBornMooniX] || null; // Default to null if no match

    if (StarAsKalakini != null) {
        let Find_Pop = await db.dbQuery(`SELECT * FROM luksompodstarborn WHERE Stari='${StarAsKalakini}'`); // 'เปิดดาวนี้ เพื่อหาภพ
        if (Find_Pop && Find_Pop.length == 1) {
            PopsKalakini = Find_Pop[0].rPopLuks;
        }

        let Open_Pop = await db.dbQuery(`SELECT * FROM luktamnaikalakiniinpop WHERE KalakiniLivePops='${PopsKalakini}'`); // 'เปิดภพ
        if (Open_Pop && Open_Pop.length == 1) {
            starKalakini_Title = "ดาวที่เป็นกาลกิณี (กาลี) กับวันเกิด (วัน" + await Support.fcDayi17ToS(SuriyatDate.dayMooni) + ")"; // 'หัวข้อหลัก
            starKalakini_Sub = "มีดาว" + await Support.fcStariToS(StarAsKalakini) + "(" + StarAsKalakini + ") เป็นกาลกิณี ราศี" + await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[0][StarAsKalakini]) + " ตกภพ" + PopsKalakini;
            starKalakini_Desc = Open_Pop[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
        }
    }
    // 'ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   

    // 'คำทำนายความสัมพันธ์ของดาวพระเคราะห์กับภพของเจ้าชะตา (คำทำนายพื้นดวงกำเนิด ตามดาวที่อยู่ในภพต่างๆ)
    let starBornTamPop_Title = "คำทำนายพื้นดวงกำเนิด ตามดาวที่อยู่ในภพต่างๆ";
    let starBornTamPop_Sub = [];
    let starBornTamPop_Desc = [];
    for (let j = 1; j <= 8; j++) {
        const tamnaiResults = await db.dbQuery(`SELECT * FROM luksompodstarborn WHERE Stari='${j}'`);
        if (tamnaiResults && tamnaiResults.length == 1) {
            const rPopLuks = SuriyatDate.varBornPutdate_PopLuksStar[0][j]
            const Popi = await Support.fcPopSToi(rPopLuks);
            const rLiveRasees = await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[0][j])
            const Rasees = " (" + await Support.fcStariToS(j) + "เป็น" + rPopLuks + ")   (ราศี" + rLiveRasees + ")"
            const LukTamnaiPopResults = await db.dbQuery(`SELECT * FROM luktamnaipop WHERE StariLiveinPopi='${j}-${Popi}' `);
            if (LukTamnaiPopResults && LukTamnaiPopResults.length == 1) {
                const Sub = LukTamnaiPopResults[0].StarLiveinPops + " " + Rasees;
                const Description = LukTamnaiPopResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                starBornTamPop_Sub.push(Sub); //เช่น "ดาวอาทิตย์ อยู่ในภพอริ (ราศีกุมภ์)"
                starBornTamPop_Desc.push(Description);
            }
        }
    }
    // ' จบ

    // คำทำนายพื้นดวงกำเนิด ตามดาวเจ้าเรือนอยู่ในภพต่างๆ (ภพผสมภพ)
    let housesStarPops_Title = "คำทำนายพื้นดวงกำเนิด ตามดาวเจ้าเรือนอยู่ในภพต่างๆ (ภพผสมภพ)";
    let housesStarPops_Sub = [];
    let housesStarPops_Desc = [];

    housesStarPops_Sub[0] = "1. ภพตนุ  ทำนายเกี่ยวกับร่างกายตัวตนเจ้าชะตา จิตใจ ความต้องการ ความรู้สึกนึกคิดทางด้านอารมณ์";
    housesStarPops_Sub[1] = "2. ภพกดุมภะ  ทำนายเกี่ยวกับการเงิน ทรัพย์สินต่าง ๆ  รายรับ รายจ่าย สังหาริมทรัพย์ และอสังหาริมทรัพย์";
    housesStarPops_Sub[2] = "3. ภพสหัชชะ  เพื่อนฝูง การสังคม การสมาคม บริษัทการเดินทางใกล้ๆ หุ้นส่วน";
    housesStarPops_Sub[3] = "4. ภพพันธุ  ทำนายถึงเกี่ยวเนื่องกัน หมายถึง ญาติพี่น้อง หรือสิ่งที่อยู่ใกล้ชิดผูกพันกัน บิดา มารดา คนใกล้ชิด เพื่อนบ้าน ยานพาหนะ";
    housesStarPops_Sub[4] = "5. ภพปุตตะ  ด็ก บริวาร ผู้มีอายุน้อยกว่า  ลูกน้อง  ผู้ใต้บังคับบัญชา ภริยาน้อย  ชายชู้";
    housesStarPops_Sub[5] = "6. ภพอริ  ทำนายเกี่ยวกับศัตรู โรคภัยไข้เจ็บ อุปสรรคต่าง ๆ  หนี้สิน  และ สัตว์เลี้ยง";
    housesStarPops_Sub[6] = "7. ภพปัตนิ  ทำนายเกี่ยวกับคู่รักคู่ครอง หุ้นส่วน คู่สัญญากรณี  คู่ความในคดีแพ่ง คู่แข่งขัน หรือห้างร้านที่เป็นคู่แข่งขัน   เพศตรงข้าม หรือ ศัตรูคู่แค้น";
    housesStarPops_Sub[7] = "8. ภพปัตนิ  ทำนายเกี่ยวกับความตาย การทิ้งถิ่นฐาน การพลัดพรากจากกัน การไปต่างถิ่นต่างประเทศ  การเลิกร้างกัน ความโศกเศร้าเสียใจ";
    housesStarPops_Sub[8] = "9. ภพศุภะ  ทำนายเกี่ยวกับบิดา ผู้อุปการะที่เป็นผู้ชาย เจ้านาย  อสังหาริมทรัพย์ทุกชนิด ความเจริญรุ่งเรือง  ความเจริญทางอำนาจ วาสนา ความเจริญทางจิตใจ";
    housesStarPops_Sub[9] = "10. ภพกัมมะ  ทำนายเกี่ยวกับอาชีพ  การงาน การทำงาน  การดำเนินกิจการ คนงาน กรรมกร ลูกจ้าง   ลูกน้อง";
    housesStarPops_Sub[10] = "11. ภพลาภะ ทำนายเกี่ยวกับรายได้ เช่นทรัพย์สินเงินทอง  วัตถุสิ่งของหรือจะเป็นบุคคลก็ได้";
    housesStarPops_Sub[11] = "12. ภพวินาศ ทำนายเกี่ยวกับความพินาศล่มจมเสียหายอย่างหนัก  การพลัดพรากจากกัน การโยกย้าย ถ้าหนักก็หมายถึง ความตาย  การติดคุกตาราง การถูกกักขัง  และการล้มละลาย";

    for (let iPop = 0; iPop <= 11; iPop++) {
        const LukTamnaiKasedInPopResults = await db.dbQuery(`SELECT * FROM luktamnaikasedinpop WHERE KasediInPopi='${varBornLuk_KasediInPopistr[iPop]}' `);
        if (LukTamnaiKasedInPopResults && LukTamnaiKasedInPopResults.length == 1) {
            const Description = LukTamnaiKasedInPopResults[0].PayakonText.replace(/<br>/g, "").replace(/<b>/g, "");
            housesStarPops_Desc.push(`${LukTamnaiKasedInPopResults[0].KasedsInPops}  ${Description}`);
        }
    }

    // 'คำทำนายดาวจร
    let StringLongBornToday = "";
    let iStarTodayPowerInOngsa1To20 = 20;
    let array1 = SuriyatDate.varBornPutdate_StarStayR[0];
    let array2 = TodaySuriyatDate.varTodayPutdate_StarStayR[0];
    let wanderingStarNowTitle = "คำทำนายเหตุการณ์ปัจจุบัน (ดาวจร)";
    let wanderingStarNowSub = "* แสดงคำทำนายดาวจรส่งอิทธิพลในเกณฑ์ " + iStarTodayPowerInOngsa1To20 + " องศา คือแสดงคำทำนายดาวจรเฉพาะที่องศาดาวกำเนิดกับองศาดาวจรห่างกันในระยะ " + iStarTodayPowerInOngsa1To20 + " องศาเท่านั้น"
    let starAsInRaseeiAsStarSub = "ดาวจรเดินมา ทับ/กุม ดาวกำเนิด (อยู่ในราศีเดียวกัน) ในเกณฑ์ " + iStarTodayPowerInOngsa1To20 + " องศา"; //'หัวข้อหลัก"
    let StarAsInRaseeiAsStar_Desc = [];
    let StarAsInRaseeiAsStar_Move = [];
    let StarAsInRaseeiAsStar_Percent = [];
    let varBornLuk_StarLipdaAll = [
        [],
        []
    ];
    let varTodayLuk_StarLipdaAll = [
        [],
        []
    ];

    const columnIindex = [10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

    let dayNameLuk = {
        10: "ลั. ลัคนา",
        1: "1. อาทิตย์",
        2: "2. จันทร์",
        3: "3. อังคาร",
        4: "4. พุธ",
        5: "5. พฤหัส",
        6: "6. ศุกร์",
        7: "7. เสาร์",
        8: "8. ราหู",
        9: "9. เกตุ",
        0: "0. มฤตยู",
    };

    let dayNameLukText = {
        10: "ลัคนา",
        1: "อาทิตย์",
        2: "จันทร์",
        3: "อังคาร",
        4: "พุธ",
        5: "พฤหัส",
        6: "ศุกร์",
        7: "เสาร์",
        8: "ราหู",
        9: "เกตุ",
        0: "มฤตยู",
    };

    // let matchingpredictionsGroup = Array(11).fill(null).map(() => []);
    let starAsInRaseeiAsStarGroup = columnIindex.map(index => ({
        starBornIndex: index,
        starBornText: dayNameLukText[index],
        predictions: []
    }));

    for (let index1 = 0; index1 <= 10; index1++) {
        for (let index2 = 0; index2 <= 10; index2++) {
            if (array1[index1] === array2[index2]) {
                const lblStarO_1 = SuriyatDate.varBornPutdate_StarO[0][index1];
                const lblStarL_1 = SuriyatDate.varBornPutdate_StarL[0][index1];
                const lblStarO_2 = TodaySuriyatDate.varTodayPutdate_StarO[0][index2];
                const lblStarL_2 = TodaySuriyatDate.varTodayPutdate_StarL[0][index2];

                varBornLuk_StarLipdaAll[0][index1] = lblStarO_1 * 60 + lblStarL_1; // Convert birth star's angle to minutes
                varTodayLuk_StarLipdaAll[0][index2] = lblStarO_2 * 60 + lblStarL_2; // Convert today's star's angle to minutes

                let LipdaLongBornToday = 0;
                let aOng = 0,
                    aLib = 0,
                    StringLongBornToday = "";

                if (varTodayLuk_StarLipdaAll[0][index2] < varBornLuk_StarLipdaAll[0][index1]) {
                    LipdaLongBornToday = varBornLuk_StarLipdaAll[0][index1] - varTodayLuk_StarLipdaAll[0][index2];
                    aOng = Math.floor(LipdaLongBornToday / 60); // Degrees
                    aLib = LipdaLongBornToday % 60; // Minutes

                    if (aOng === 0 && aLib > 0) {
                        StringLongBornToday = `* ห่างกันในระยะ ${aLib} ลิปดา (ยังไม่ถึง)`;
                    } else if (aLib === 0 && aOng > 0) {
                        StringLongBornToday = `* ห่างกันในระยะ ${aOng} องศา (ยังไม่ถึง)`;
                    } else {
                        StringLongBornToday = `* ห่างกันในระยะ ${aOng}.${aLib} องศา (ยังไม่ถึง)`;
                    }
                } else if (varTodayLuk_StarLipdaAll[0][index2] > varBornLuk_StarLipdaAll[0][index1]) {
                    LipdaLongBornToday = varTodayLuk_StarLipdaAll[0][index2] - varBornLuk_StarLipdaAll[0][index1];
                    aOng = Math.floor(LipdaLongBornToday / 60); // Degrees
                    aLib = LipdaLongBornToday % 60; // Minutes

                    if (aOng === 0 && aLib > 0) {
                        StringLongBornToday = `* ห่างกันในระยะ ${aLib} ลิปดา (ผ่านหรือเลยมาแล้ว)`;
                    } else if (aLib === 0 && aOng > 0) {
                        StringLongBornToday = `* ห่างกันในระยะ ${aOng} องศา (ผ่านหรือเลยมาแล้ว)`;
                    } else {
                        StringLongBornToday = `* ห่างกันในระยะ ${aOng}.${aLib} องศา (ผ่านหรือเลยมาแล้ว)`;
                    }
                } else {
                    StringLongBornToday = `* เป็นระยะที่ทับกันแบบสนิท 100%`;
                }

                if (aOng <= iStarTodayPowerInOngsa1To20) {
                    const MoveDay = TodaySuriyatDate.varTodayPutdate_StarMoveGoDay[index2];
                    const MoveMonth = TodaySuriyatDate.varTodayPutdate_StarMoveGoMonth[index2];
                    const MoveYearB = TodaySuriyatDate.varTodayPutdate_StarMoveGoYearB[index2];
                    const MoveH = TodaySuriyatDate.varTodayPutdate_StarMoveGoH[index2];
                    const MoveM = TodaySuriyatDate.varTodayPutdate_StarMoveGoM[index2];
                    const strSMove = `จนถึงวันที่ ${MoveDay} ${await Support.fcMonthiToSSht(MoveMonth)} ${MoveYearB} เวลา  ${MoveH}:${MoveM} น.`;

                    const LukTamnaiStarTodayToStarBornResults = await db.dbQuery(`SELECT * FROM luktamnaistartodaytostarborn WHERE StarTodayi='${index2}' AND StarBorni='${index1}'`);
                    if (LukTamnaiStarTodayToStarBornResults.length > 0) {
                        const sTextPayakornToday = "คำพยากรณ์ " + LukTamnaiStarTodayToStarBornResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                        const StarTodayToStarBorns = LukTamnaiStarTodayToStarBornResults[0].StarTodayToStarBorns;
                        StarAsInRaseeiAsStar_Desc.push(sTextPayakornToday);

                        const sTextFocus3 = `${StarTodayToStarBorns} [ดวงกำเนิด ${lblStarO_1}.${lblStarL_1} องศา ดวงจร ${lblStarO_2}.${lblStarL_2}] ${StringLongBornToday}`;
                        const sTextStarStayLongTimeTMDs = `เหตุการณ์ต่อไปนี้มีผลต่อเจ้าชะตา ${strSMove}`;
                        StarAsInRaseeiAsStar_Move.push(`${sTextFocus3} ${sTextStarStayLongTimeTMDs}`);

                        const Percent_PakakornStar = await getPercent_PakakornStarTodayKumBorn(varBornLuk_StarLipdaAll[0][index1], varTodayLuk_StarLipdaAll[0][index2]);
                        let probabilityText = `โอกาสและผลที่จะเกิดประมาณ ${Percent_PakakornStar.toFixed(2)}% ${getPercentEventText(Percent_PakakornStar)}`;
                        StarAsInRaseeiAsStar_Percent.push(probabilityText);

                        const matchingPrediction = {
                            starBornIndex: index1,
                            starBorn: dayNameLuk[index1],
                            startToday: dayNameLuk[index2],
                            starBorn_O: lblStarO_1,
                            starBorn_L: lblStarL_1,
                            todayBorn_O: lblStarO_2,
                            todayBorn_L: lblStarL_2,
                            prediction: sTextPayakornToday,
                            details: `${StarTodayToStarBorns} [ดวงกำเนิด ${lblStarO_1}.${lblStarL_1} องศา ดวงจร ${lblStarO_2}.${lblStarL_2}] ${StringLongBornToday}`,
                            moveDate: `${MoveDay} ${await Support.fcMonthiToSSht(MoveMonth)} ${MoveYearB}`,
                            moveTime: `${MoveH}:${MoveM}`,
                            probability: Percent_PakakornStar.toFixed(2),
                            probabilityText: probabilityText
                        };

                        starAsInRaseeiAsStarGroup[index1].predictions.push(matchingPrediction);
                    }
                }
            }
        }
    }

    return {
        varBornLuk_PopsChars, // ข้อมูลเกี่ยวกับดาวและภพ (ดวงกำเนิดของเจ้าชะตา)
        strBornStarAsHouseInPop,
        varBornLuk_OwnerHousePopSS, //ดาว เจ้าเรือน ภพ และมาตรฐานดาวกำเนิด
        varBornLuk_KasediInPopistr,
        ascendantPrediction_Title, // คำทำนายลัคนาสถิตราศี
        ascendantPredictionGem_Title, // สีและอัญมณีที่ถูกโฉลกประจำราศี
        ascendantPrediction_Sub,
        ascendantPrediction_Desc,
        ascendantPredictionGem_Desc,
        Query_StarStayR10, // คำทำนายลัคนาสถิตราศี
        starStayGumLuk, // กุมลัคน์
        starStayPatani, // เล็งลัคนา
        starAsTanuSED_Title, //คำทำนายตนุเศษ ทายเรื่องจิตใจของเจ้าชะตา
        starAsTanuSED_Sub,
        starAsTanuSED_Desc,
        Star_Same_Title, //ดาวคู่หรือดาวกุมกัน
        Star_Same_Sub,
        Star_Same_Desc,
        standardStarsDuangRasee_Title, //ดาวมาตรฐาน ในดวงราศีจักร
        standardStarsDuangRasee_Sub,
        standardStarsDuangRasee_Desc,
        standardStarsDuangNavang_Title, // ดาวมาตรฐาน ในดวงราศีนวางค์จักร 
        standardStarsDuangNavang_Sub,
        standardStarsDuangNavang_Desc,
        starKalakini_Title, //ดาวที่เป็นกาลกิณี (กาลี)
        starKalakini_Sub,
        starKalakini_Desc,
        starBornTamPop_Title, //คำทำนายพื้นดวงกำเนิด ตามดาวที่อยู่ในภพต่างๆ
        starBornTamPop_Sub,
        starBornTamPop_Desc,
        housesStarPops_Title, //คำทำนายพื้นดวงกำเนิด ตามดาวเจ้าเรือนอยู่ในภพต่างๆ (ภพผสมภพ)
        housesStarPops_Sub,
        housesStarPops_Desc,
        wanderingStarNowTitle, //คำทำนายเหตุการณ์ปัจจุบัน (ดาวจร)
        wanderingStarNowSub,
        starAsInRaseeiAsStarSub,
        StarAsInRaseeiAsStar_Desc,
        StarAsInRaseeiAsStar_Move,
        StarAsInRaseeiAsStar_Percent,
        starAsInRaseeiAsStarGroup,
    }
}

async function PayakornBorn(SuriyatDate) {
    let iStarAll = 12;
    let YourDayBornMooniLuk = SuriyatDate.dayMooni;

    // '........ ส่วนของข้อมูลเกี่ยวกับดาวและภพ (กำเนิด)
    let CharGroupStar = {
        1: "สระทั้งหมด",
        2: "ก ข ค ฆ ง",
        3: "จ ฉ ช ซ ฌ ญ",
        4: "ฎ ฏ ฐ ฑ ฒ ณ",
        5: "บ ป ผ ฝ พ ฟ ภ ม",
        6: "ศ ษ ส ห ฬ ฮ",
        7: "ด ต ถ ท ธ น",
        8: "ย ร ล ว",
    }

    // 'ดาวใดอยู่ทักษาใด เช่น strTaksaStringStar(6) ="บริวาร"  หมายถึง ดาว 6 อยู่ทักษาบริวาร  "ศ ษ ส ห ฬ ฮ" เป็นต้น
    let strTaksaStringCount = {
        "": "",
        1: "บริวาร",
        2: "อายุ",
        3: "เดช",
        4: "ศรี",
        5: "มูละ",
        6: "อุตสาหะ",
        7: "มนตรี",
        8: "กาลกิณี"
    };

    // 'รับค่า เกี่ยวกับทักษา ไม่ว่าจะเกิดวันพุธกลางวัน (๔) หรือวันพุธกลางคืน (๘) ให้พุธ (๔) เป็นบริวารเสมอ (เกิดพุธกลางคืน ราหูไม่เป็นบริวารและพฤหัสไม่เป็นกาลี)
    let ichkTaksaBorn4or8As4 = 1;
    let TextTaksaBorn8, iCountTaksa;

    // 'ถ้าตั้งค่า เกิดวันพุธกลางคืน ให้ถือว่าพุธกลางวัน
    if (ichkTaksaBorn4or8As4 == 1) {
        if (YourDayBornMooniLuk == 8) {
            TextTaksaBorn8 = "* เกี่ยวกับทักษา-ตรีวัย ผู้ใช้ได้ตั้งค่าในโปรแกรมว่า ไม่ว่าจะเกิดวันพุธกลางวัน (๔) หรือวันพุธกลางคืน (๘) ให้พุธ (๔) เป็นบริวารเสมอ ฉะนั้น เจ้าชะตาเกิดพุธกลางคืน ราหูจึงไม่เป็นบริวารและพฤหัสไม่เป็นกาลกิณี";
            iCountTaksa = 4;
        } else {
            iCountTaksa = YourDayBornMooniLuk;
        }
    } else {
        iCountTaksa = YourDayBornMooniLuk;
    }

    let strTaksaStringStar = new Array(9);

    let sequence = {
        1: 2,
        2: 3,
        3: 4,
        4: 7,
        7: 5,
        5: 8,
        8: 6,
        6: 1,
    };

    for (let iTaksa = 1; iTaksa <= 8; iTaksa++) {
        strTaksaStringStar[iCountTaksa] = strTaksaStringCount[iTaksa];
        // console.log(`Current iCountTaksa: ${iCountTaksa}`);
        iCountTaksa = sequence[iCountTaksa]; // Correct access to sequence using bracket notation
        // console.log(`Next iCountTaksa: ${iCountTaksa} : ${strTaksaStringCount[iTaksa]}`);
    } //' For iTaksa = 1 To 8 'นับ 8 รอบ คือให้ครบ 8 ทักษา คือ 1.บริวาร 2.อายุ 3.เดช 4.ศรี ...... 8.กาลกิณี

    let strTotalCharDot_SUM; //'สรุปอักษรที่ห้ามนำมาตั้งชื่อ (ห้ามมีอยู่ในชื่อ) สำหรับดวงชะตาคุณคือ "s"
    let strFontEnd, strFontStart;
    let strBornPopsChars, strAboutStarAndPop, strNameStarString, strDontCharVIP, strCommentDontCharVIP, strCommentDontCharKala, Vangs;
    strDontCharVIP = "";
    Vangs = "   ";

    let varBornLuk_PopsChars = [
        [],
        []
    ];
    let sTextFocus1 = [];
    let iTextFocus1 = 0;
    for (let Starii = 0; Starii <= iStarAll; Starii++) {

        strNameStarString = Starii;

        if (Starii == 0 || Starii == 9 || Starii == 11 || Starii == 12) {
            if (Starii == 11) {
                strNameStarString = "เนปจูน";
            }
            if (Starii == 12) {
                strNameStarString = "เนปจูน";
            }
            // Space(10) & "ดาว " & strNameStarString & " อยู่ภพ " & varBornLuk_PopLuksStar(0, Starii)
            varBornLuk_PopsChars[0][Starii] = "ดาว " + strNameStarString + " อยู่ภพ " + SuriyatDate.varBornPutdate_PopLuksStar[0][Starii];
        }

        if (Starii == 1 || Starii == 2 || Starii == 3 || Starii == 4 || Starii == 5 || Starii == 6 || Starii == 7 || Starii == 8) {
            if (SuriyatDate.varBornPutdate_PopLuksStar == "อริ" || SuriyatDate.varBornPutdate_PopLuksStar == "มรณะ" || SuriyatDate.varBornPutdate_PopLuksStar == "วินาศ") {
                // varBornLuk_PopsChars[0][Starii] = "ดาว " + strNameStarString + " อยู่ภพ " + SuriyatDate.varBornPutdate_PopLuksStar[0][Starii] + Vangs + "อักขระประจำดาวนี้คือ : " + charGroupStar[Starii] + "  (ทักษา " + strTaksaStringStar[Starii] + ")";
                varBornLuk_PopsChars[0][Starii] = `ดาว ${strNameStarString} อยู่ภพ ${SuriyatDate.varBornPutdate_PopLuksStar[0][Starii]} ${Vangs}อักขระประจำดาวนี้คือ : ${CharGroupStar[Starii]} (ทักษา ${strTaksaStringStar[Starii]})`;
                iTextFocus1 += 1;
                sTextFocus1[iTextFocus1] = varBornLuk_PopsChars[0][Starii];
            } else {
                // varBornLuk_PopsChars[0][Starii] = "ดาว " + strNameStarString + " อยู่ภพ " & SuriyatDate.varBornPutdate_PopLuksStar[0][Starii] + Vangs + "อักขระประจำดาวนี้คือ : " + CharGroupStar[Starii] + "  (ทักษา " + strTaksaStringStar[Starii] + ")";
                varBornLuk_PopsChars[0][Starii] = `ดาว ${strNameStarString} อยู่ภพ ${SuriyatDate.varBornPutdate_PopLuksStar[0][Starii]} ${Vangs}อักขระประจำดาวนี้คือ : ${CharGroupStar[Starii]} (ทักษา ${strTaksaStringStar[Starii]})`;
            }
        }
    }

    let bornLukPopsChars = {
        "title": "ข้อมูลเกี่ยวกับดาวและภพ (ดวงกำเนิดของเจ้าชะตา)",
        "sub_title": "ดาวกำเนิดอยู่ในภพต่างๆ และอักขระประจำดาว (ทักษา)",
        "payakorn": varBornLuk_PopsChars,
    };

    // let sTextTopicSmall;
    // iTextTopicSmall += 1;
    // sTextTopicSmall[iTextTopicSmall] = "ดาว เจ้าเรือน ภพ และมาตรฐานดาวกำเนิด";

    // ' หาดาวเจ้าเรือน แล้วรับค่า เช่น "ดาว 2 เป็นเจ้าเรือน ตนุ ตกอยู่ในภพ กัมมะ"  เพื่อแสดง
    let StarHousei, StarHouseRi, iCountR;
    let strBornStarAsHouseInPop, Pop2;
    iCountR = SuriyatDate.varBornPutdate_StarStayR[0][10];
    let varBornLuk_OwnerHousePopS = [];
    let varBornLuk_OwnerHousePopSS = [];
    let varBornLuk_KasediInPopistr = [];

    for (let iPop = 0; iPop <= 11; iPop++) { // 'นับภพ  0-11 (ตนุ-วินาศ)
        StarHousei = fcRaseeiToHouse(iCountR); // 'หาว่า ราศีนี้มีดาวใดเป็นเจ้าเรือน
        StarHouseRi = SuriyatDate.varBornPutdate_StarStayR[0][StarHousei]; // 'หาว่า ดาวเจ้าเรือนอยู่ราศีใด
        Pop2 = SuriyatDate.varBornPutdate_PopLuksStar[0][StarHousei]; // 'รับค่าภพที่ดาวนี้อยู่  เช่น "กัมมะ"    ' Dim varBornLuk_PopLuksStar(1, iStarAll) As String ' ดาว n อยู่ภพ เช่น ดาว 0 = "สหัชชะ"
        varBornLuk_OwnerHousePopS[iPop] = "เจ้าเรือน  " + await Support.fcPopiToS(iPop) + "  ตกอยู่ในภพ  " + Pop2;
        // ' ต่อท้ายด้วยมาตรฐานดาว
        let strSS = "";
        if (SuriyatDate.varBornPutdate_RaSTD[0][StarHousei] === "-") {
            strSS = "";
        } else {
            strSS += " ";
        }
        let strSTDStar = (strSS + SuriyatDate.varBornPutdate_RaSTD[0][StarHousei].replace(/-/g, "")).trim(); // มาตรฐานดาวราศีจักร

        if (strSTDStar.length === 0) {
            strSTDStar = "";
        } else {
            strSTDStar = "   (เป็น " + strSTDStar + ")";
        }

        varBornLuk_OwnerHousePopSS[iPop] = "ดาว " + StarHousei + " เป็นเจ้าเรือน " + await Support.fcPopiToS(iPop) + " ตกภพ " + Pop2 + " " + strSTDStar;
        varBornLuk_KasediInPopistr[iPop] = iPop + "-" + await Support.fcPopSToi(Pop2); //' varBornLuk_KasediInPopistr(1)="10-11"

        iCountR = (iCountR + 1) % 12;
        //  ดาว เจ้าเรือน ภพ และมาตรฐานดาวกำเนิด
    }

    let bornLukOwnerHousePop = {
        "title": "ดาว เจ้าเรือน ภพ และมาตรฐานดาวกำเนิด",
        "sub_title": "ดาวกำเนิดอยู่ในภพต่างๆ และอักขระประจำดาว (ทักษา)",
        "payakorn": varBornLuk_OwnerHousePopSS,
    }

    // คำทำนายลัคนาสถิตราศี
    // ลัคนาสถิตราศีกันย์ กันย์ (5)
    // ลัคนาสถิตราศีกันย์ พยากรณ์ตามลักษณะราศีเจ้าชะตามักเป็นคนมีรูปร่างอรชอ้อนแอ้น มีผิวขาวปนเหลือง สงบเสงี่ยมเจียมตัว<br>รักสวยรักงาม ชอบความสะอาด พิถีพิถันในการแต่งตัว ชอบความเป็นระเบียบเรียบร้อย พูดจาไพเราะ มักมีตำหนิเป็นไฝปานที่แขน<br>มือ หรือไหล่แห่งใดแห่งหนึ่ง งานที่เหมาะสำหรับคุณควรเป็นงานนักประพันธ์ นักเขียน และเป็นหัวหน้าในหน่วยงานอื่นๆ โรคที่มักเกิดขึ้น<br>ถ้ามีคือโรคโลหิตจาง หลอดลมเอกเสบ หืด หอบ<br>
    // สีและอัญมณีที่ถูกโฉลกประจำราศี
    // สีและอัญมณีที่ถูกโฉลก เสริมดวงชะตาและทำให้เกิดโชคลาภ คือสีเขียว อัญมณีคือมรกต,หยก,เขียวส่อง สีและอัญมณีที่ห้ามใช้<br>คือสีม่วงคราม,แสดและส้ม อัญมณีคือโกเมน,พลอยสีส้ม, พลอยสีม่วงคราม<br>
    // varBornLuk_StarStayR == SuriyatDate.varBornPutdate_StarStayR[0][10] คำทำนายลัคนาสถิตราศี
    let Sql_StarStayR = "SELECT * FROM luktamnailukliverasee WHERE  Raseei= " + SuriyatDate.varBornPutdate_StarStayR[0][10];
    let Query_StarStayR10 = await db.dbQuery(Sql_StarStayR);

    let ascendantPrediction_Title = "คำทำนายลัคนาสถิตราศี";
    let ascendantPredictionGem_Title = "สีและอัญมณีที่ถูกโฉลกประจำราศี";
    let lukBornRasees = "",
        ascendantPrediction_Sub = "",
        ascendantPrediction_Desc = "",
        ascendantPredictionGem_Desc = "";
    let ascendantPrediction = "";
    let ascendantPredictionGem = "";

    // Prediction of ascendant and zodiac sign
    if (Query_StarStayR10.length === 1) {
         
        lukBornRasees = {
            calendar: Support.fcLukBornRaseesCalendar(Query_StarStayR10[0].Rasees),
            title : Query_StarStayR10[0].Rasees
        };

        ascendantPrediction_Sub = Query_StarStayR10[0].LukLiveRasees + " " + Query_StarStayR10[0].Rasees + " (" + Query_StarStayR10[0].Raseei + ")";
        ascendantPrediction_Desc = Query_StarStayR10[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
        ascendantPredictionGem_Desc = Query_StarStayR10[0].PayakornColorGem.replace(/<br>/g, "").replace(/<b>/g, "");
    }

    if (Query_StarStayR10.length === 1) {
        ascendantPrediction = {
            "title": ascendantPrediction_Title,
            "sub_title": ascendantPrediction_Sub,
            "payakorn": ascendantPrediction_Desc
        }

        ascendantPredictionGem = {
            "title": ascendantPrediction_Title,
            "sub_title": "",
            "payakorn": ascendantPredictionGem_Desc
        }
    }


    // 'เริ่ม คำทำนายกุมลัคน์ 17408 
    let iRasee = SuriyatDate.varBornPutdate_StarStayR[0][10];
    let starStayGumLukArray = [];
    for (let iStar = 0; iStar <= 9; iStar++) {
        if (iRasee == SuriyatDate.varBornPutdate_StarStayR[0][iStar]) {
            const sqlQuery = "SELECT * FROM luktamnaiholdluk WHERE Stari= " + iStar;
            const queryResult = await db.dbQuery(sqlQuery);
            if (queryResult.length > 0) {
                const description = queryResult[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                const payakorn = "ดาว " + await Support.fcStariToS(iStar) + " กุมลัคน์ (" + queryResult[0].Stari + ")ลั " + description;
                // starStayGumLukArray[iStar] = payakorn;
                starStayGumLukArray.push(payakorn);
            }
        }
    }
    const starStayGumLuk = {
        "title": "คำทำนายกุมลัคน์",
        "sub_stitle": "",
        "payakon": starStayGumLukArray,
    }
    // 'จบ คำทำนายกุมลัคน์


    // 'เริ่ม  คำทำนายเล็งลัคนา // varBornLuk_PopLuksStar == varBornPutdate_PopLuksStar
    let starStayPataniArray = [];
    for (let Starii = 0; Starii <= iStarAll; Starii++) {
        if (SuriyatDate.varBornPutdate_PopLuksStar[0][Starii] == "ปัตนิ") {
            const sqlQuery = "SELECT * FROM luktamnaioppositeluk WHERE Stari= " + Starii;
            const queryResult = await db.dbQuery(sqlQuery);
            if (queryResult && queryResult.length > 0) {
                const description = queryResult[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                const payakorn = "ดาว " + await Support.fcStariToS(Starii) + " เล็งลัคนา (" + queryResult[0].Stari + ") <--> ลั)" + description;
                starStayPataniArray.push(payakorn);
            }
        }
    }
    const starStayPatani = {
        "title": "คำทำนายเล็งลัคนา",
        "sub_stitle": "",
        "payakon": starStayPataniArray,
    }
    // 'จบ คำทำนายเล็งลัคนา

    // ดาว sTextTopicSmall(iTextTopicSmall) = "ดาว" & fcStariToS(varBornLuk_starAsTanuSED(0)) & "เป็นตนุเศษ"
    // varBornLuk_starAsTanuSED[0] = varBornPutdate_starAsTanuSED[0]
    let starAsTanuSED_Title = "คำทำนายตนุเศษ ทายเรื่องจิตใจของเจ้าชะตา";
    let starAsTanuSED_Sub = "ดาว " + await Support.fcStariToS(SuriyatDate.varBornPutdate_starAsTanuSED[0]) + " เป็นตนุเศษ";
    let starAsTanuSED_Desc = await fcGetTanuPayakon(SuriyatDate.varBornPutdate_starAsTanuSED[0]);
    const starAsTanuSED = {
        "title": "คำทำนายตนุเศษ ทายเรื่องจิตใจของเจ้าชะตา",
        "sub_title": starAsTanuSED_Sub,
        "payakorn": starAsTanuSED_Desc,
    };

    // คำทำนายดาวที่อยู่ในราศีเดียวกัน (ดาวคู่หรือดาวกุมกัน)
    let iStarMate2; //ดาวที่นำมาเทียบ
    let Star_Same_Title = "คำทำนายดาวที่อยู่ในราศีเดียวกัน (ดาวคู่หรือดาวกุมกัน)";
    let Star_Same_Sub = [];
    let Star_Same_Desc = [];
    for (let iRaseeLoop = 0; iRaseeLoop <= 11; iRaseeLoop++) {
        for (let iStarLoop = 1; iStarLoop <= 9; iStarLoop++) {
            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarLoop]) { // 'ถ้าในราศีนี้ มีดาวนี้อยู่
                switch (iStarLoop) {
                    case 1: // ' iStarLoop = 1 'ดาว 1
                        for (let iStarLoopMate2 = 2; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            // '1-n (2-9)     คือเทียบ 1-2  1-3  1-4  1-5......1-9 7 
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        //'For iStarLoopMate2 = 2 To 9 ' วนดาวเทียบ (ดาวตัวที่ 2)
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 2:
                        for (let iStarLoopMate2 = 3; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 3:
                        for (let iStarLoopMate2 = 4; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 4:
                        for (let iStarLoopMate2 = 5; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 5:
                        for (let iStarLoopMate2 = 6; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 6:
                        for (let iStarLoopMate2 = 7; iStarLoopMate2 <= 9; iStarLoopMate2++) { // 'วนดาวเทียบ (ดาวตัวที่ 2)
                            iStarMate2 = iStarLoopMate2; //'ดาวที่นำมาเทียบ
                            if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                                const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                                const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                                Star_Same_Sub.push(Title);
                                Star_Same_Desc.push(description);
                            }
                        }

                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 7:
                        iStarMate2 = 8;
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 8:
                        iStarMate2 = 9;
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    case 9:
                        iStarMate2 = 0; //'ดาวที่นำมาเทียบ
                        if (iRaseeLoop == SuriyatDate.varBornPutdate_StarStayR[0][iStarMate2]) {
                            const Title = "ดาว " + iStarLoop + " กับ ดาว " + iStarMate2 + " อยู่ร่วมกัน (กุมกัน)"; //'หัวข้อย่อย;
                            const description = await getStarSamePayakornDescription(iRaseeLoop, iStarLoop, iStarMate2);
                            Star_Same_Sub.push(Title);
                            Star_Same_Desc.push(description);
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }
    const starSame = {
        "title": Star_Same_Title,
        "sub_title": Star_Same_Sub,
        "payakorn": Star_Same_Desc,
    }
    // ดาวคู่หรือดาวกุมกัน 

    // 'คุณภาพดาว ราศีจักร
    let iCountSTD_Ra = 0;
    let iLoopi;
    let sSTD$;
    let txtSTDArray = [];
    let SS; //'ss ต้องเป็น Variant เท่านั้น
    let sTamnaiSTD_Ra = "";
    iLoopi = 0
    let S = "";
    let rSTD = SuriyatDate.varBornPutdate_RaSTD[0];

    // ไม่รู้มีไว้ทำไม
    // let Result_LukSompodStarBorn = await db.dbQuery("SELECT * FROM luksompodstarborn WHERE rSTD<>'-' ORDER BY Stari ASC");
    // if (Result_LukSompodStarBorn && Result_LukSompodStarBorn.length > 0) {
    //     Result_LukSompodStarBorn.forEach(async (row) => {
    //     });
    // }
    let standardStarsDuangRasee_Title = "ดาวที่เป็น ดาวมาตรฐาน ในดวงราศีจักร";
    let standardStarsDuangRasee_Sub = [];
    let standardStarsDuangRasee_Desc = [];
    const QueryDuangRasee = rSTD.map((entry, index) => {
        if (entry !== '-') {
            const splitEntries = entry.split(",").filter(e => e.trim() !== "ตนุเศษ");
            if (splitEntries.length > 0) {
                return {
                    entry: splitEntries.join(", "), // Cleaned entries
                    index
                };
            }
        }
    }).filter(item => item !== undefined);

    if (QueryDuangRasee && QueryDuangRasee.length > 0) {
        for (let index = 0; index < QueryDuangRasee.length; index++) {
            const row = QueryDuangRasee[index];
            const parts = row.entry.split(",").map(part => part.trim());
            if (parts.length > 1) {
                for (let i = 0; i < parts.length; i++) {
                    const sqlQuery = "SELECT * FROM luktamnaistarasstd WHERE Stari = ? AND AsSTDs = ?";
                    const queryParams = [row.index, parts[i]];
                    const tamnaiResults = await db.db_Query(sqlQuery, queryParams);
                    if (tamnaiResults && tamnaiResults.length > 0) {
                        const Sub = `${tamnaiResults[0].StarsAsSTDs} [อยู่ราศี${await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[0][tamnaiResults[0].Stari])} ดวงราศีจักร]`;
                        const description = tamnaiResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                        standardStarsDuangRasee_Sub.push(Sub);
                        standardStarsDuangRasee_Desc.push(description);
                    }
                }
            } else {
                const sqlQuery = "SELECT * FROM luktamnaistarasstd WHERE Stari = ? AND AsSTDs = ?";
                const queryParams = [row.index, row.entry];
                const tamnaiResults = await db.db_Query(sqlQuery, queryParams);
                if (tamnaiResults && tamnaiResults.length > 0) {

                    const Sub = `${tamnaiResults[0].StarsAsSTDs} [อยู่ราศี${await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[0][tamnaiResults[0].Stari])} ดวงราศีจักร]`;
                    const description = tamnaiResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                    standardStarsDuangRasee_Sub.push(Sub);
                    standardStarsDuangRasee_Desc.push(description);
                }
            }
        }
    }

    const standardStarsDuangRasee = {
        "title": standardStarsDuangRasee_Title,
        "sub_title": standardStarsDuangRasee_Sub,
        "payakorn": standardStarsDuangRasee_Desc,
    }
    // จบ ดาวมาตรฐาน ในดวงราศีจักร 

    // ดาวมาตรฐาน ในดวงราศีนวางค์จักร 'หาคำทำนายคุณภาพดาว เกษตร ประ.....
    let standardStarsDuangNavang_Title = "ดาวที่เป็น ดาวมาตรฐาน ในดวงนวางค์จักร";
    let standardStarsDuangNavang_Sub = [];
    let standardStarsDuangNavang_Desc = [];
    let sSTDNa = SuriyatDate.varBornPutdate_NaRaSTD[0];
    // RaSTD
    // varBornPutdate_RaSTD
    // เกษตร มหาจักร นิจ  มหาจักร เกษตร
    const QueryDuangNavang = sSTDNa.map((entry, index) => {
        if (entry !== '-') {
            const splitEntries = entry.split(",").filter(e => e.trim() !== "ตนุเศษ");
            if (splitEntries.length > 0) {
                return {
                    entry: splitEntries.join(", "), // Cleaned entries
                    index
                };
            }
        }
    }).filter(item => item !== undefined);

    if (QueryDuangNavang && QueryDuangNavang.length > 0) {
        for (let index = 0; index < QueryDuangNavang.length; index++) {
            const row = QueryDuangNavang[index];
            const sqlQuery = "SELECT * FROM luktamnaistarasstd WHERE Stari = ? AND AsSTDs = ?";
            const queryParams = [row.index, row.entry];
            const tamnaiResults = await db.db_Query(sqlQuery, queryParams);
            if (tamnaiResults && tamnaiResults.length > 0) {
                const title = `${tamnaiResults[0].StarsAsSTDs} [อยู่ราศี${await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_NavangStarAsRasee[0][tamnaiResults[0].Stari])} ดวงนวางค์จักร]`;
                const description = tamnaiResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                standardStarsDuangNavang_Sub.push(title);
                standardStarsDuangNavang_Desc.push(description);
            }
        }
    }

    const standardStarsDuangNavang = {
        "title": standardStarsDuangNavang_Title,
        "sub_title": standardStarsDuangNavang_Sub,
        "payakorn": standardStarsDuangNavang_Desc,
    }
    // จบ ดาวมาตรฐาน ในดวงราศีนวางค์จักร 'หาคำทำนายคุณภาพดาว เกษตร ประ.....

    // 'ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   
    // 'กาลกิณี ตามหลักทักษา
    let DayBornMooniX, StarAsKalakini;
    let PopsKalakini;
    let starKalakini_Title = "ดาวกาลกิณี (กาลี)";
    let starKalakini_Sub = "",
        starKalakini_Desc = "";

    if (ichkTaksaBorn4or8As4 == 1) {
        if (SuriyatDate.dayMooni == 8) {
            DayBornMooniX = 4;
        } else {
            DayBornMooniX = SuriyatDate.dayMooni;
        }
    } else {
        DayBornMooniX = SuriyatDate.dayMooni;
    }

    const starAsKalakiniMap = {
        1: 6,
        2: 1,
        3: 2,
        4: 3,
        5: 7,
        6: 8,
        7: 4,
        8: 5
    };

    StarAsKalakini = starAsKalakiniMap[DayBornMooniX] || null; // Default to null if no match

    if (StarAsKalakini != null) {
        let Find_Pop = await db.dbQuery(`SELECT * FROM luksompodstarborn WHERE Stari='${StarAsKalakini}'`); // 'เปิดดาวนี้ เพื่อหาภพ
        if (Find_Pop && Find_Pop.length == 1) {
            PopsKalakini = Find_Pop[0].rPopLuks;
        }

        let Open_Pop = await db.dbQuery(`SELECT * FROM luktamnaikalakiniinpop WHERE KalakiniLivePops='${PopsKalakini}'`); // 'เปิดภพ
        if (Open_Pop && Open_Pop.length == 1) {
            starKalakini_Title = "ดาวที่เป็นกาลกิณี (กาลี) กับวันเกิด (วัน" + await Support.fcDayi17ToS(SuriyatDate.dayMooni) + ")"; // 'หัวข้อหลัก
            starKalakini_Sub = "มีดาว" + await Support.fcStariToS(StarAsKalakini) + "(" + StarAsKalakini + ") เป็นกาลกิณี ราศี" + await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[0][StarAsKalakini]) + " ตกภพ" + PopsKalakini;
            starKalakini_Desc = Open_Pop[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
        }
    }

    const starKalakini = {
        "title": starKalakini_Title,
        "sub_title": starKalakini_Sub,
        "payakorn": starKalakini_Desc,
    }
    // 'ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   ดาวกาลกิณี (กาลี)   

    // 'คำทำนายความสัมพันธ์ของดาวพระเคราะห์กับภพของเจ้าชะตา (คำทำนายพื้นดวงกำเนิด ตามดาวที่อยู่ในภพต่างๆ)
    let starBornTamPop_Title = "คำทำนายพื้นดวงกำเนิด ตามดาวที่อยู่ในภพต่างๆ";
    let starBornTamPop_Sub = [];
    let starBornTamPop_Desc = [];
    for (let j = 1; j <= 8; j++) {
        const tamnaiResults = await db.dbQuery(`SELECT * FROM luksompodstarborn WHERE Stari='${j}'`);
        if (tamnaiResults && tamnaiResults.length == 1) {
            const rPopLuks = SuriyatDate.varBornPutdate_PopLuksStar[0][j]
            const Popi = await Support.fcPopSToi(rPopLuks);
            const rLiveRasees = await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[0][j])
            const Rasees = " (" + await Support.fcStariToS(j) + "เป็น" + rPopLuks + ")   (ราศี" + rLiveRasees + ")"
            const LukTamnaiPopResults = await db.dbQuery(`SELECT * FROM luktamnaipop WHERE StariLiveinPopi='${j}-${Popi}' `);
            if (LukTamnaiPopResults && LukTamnaiPopResults.length == 1) {
                const Sub = LukTamnaiPopResults[0].StarLiveinPops + " " + Rasees;
                const Description = LukTamnaiPopResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                starBornTamPop_Sub.push(Sub); //เช่น "ดาวอาทิตย์ อยู่ในภพอริ (ราศีกุมภ์)"
                starBornTamPop_Desc.push(Description);
            }
        }
    }
    const starBornTamPop = {
        "title": starBornTamPop_Title,
        "sub_title": starBornTamPop_Sub,
        "payakorn": starBornTamPop_Desc,
    }
    // ' จบ

    // คำทำนายพื้นดวงกำเนิด ตามดาวเจ้าเรือนอยู่ในภพต่างๆ (ภพผสมภพ)
    let strItems, sNameTable;
    let housesStarPops_Title = "คำทำนายพื้นดวงกำเนิด ตามดาวเจ้าเรือนอยู่ในภพต่างๆ (ภพผสมภพ)";
    let housesStarPops_Sub = [];
    let housesStarPops_Desc = [];

    housesStarPops_Sub[0] = "1. ภพตนุ  ทำนายเกี่ยวกับร่างกายตัวตนเจ้าชะตา จิตใจ ความต้องการ ความรู้สึกนึกคิดทางด้านอารมณ์";
    housesStarPops_Sub[1] = "2. ภพกดุมภะ  ทำนายเกี่ยวกับการเงิน ทรัพย์สินต่าง ๆ  รายรับ รายจ่าย สังหาริมทรัพย์ และอสังหาริมทรัพย์";
    housesStarPops_Sub[2] = "3. ภพสหัชชะ  เพื่อนฝูง การสังคม การสมาคม บริษัทการเดินทางใกล้ๆ หุ้นส่วน";
    housesStarPops_Sub[3] = "4. ภพพันธุ  ทำนายถึงเกี่ยวเนื่องกัน หมายถึง ญาติพี่น้อง หรือสิ่งที่อยู่ใกล้ชิดผูกพันกัน บิดา มารดา คนใกล้ชิด เพื่อนบ้าน ยานพาหนะ";
    housesStarPops_Sub[4] = "5. ภพปุตตะ  ด็ก บริวาร ผู้มีอายุน้อยกว่า  ลูกน้อง  ผู้ใต้บังคับบัญชา ภริยาน้อย  ชายชู้";
    housesStarPops_Sub[5] = "6. ภพอริ  ทำนายเกี่ยวกับศัตรู โรคภัยไข้เจ็บ อุปสรรคต่าง ๆ  หนี้สิน  และ สัตว์เลี้ยง";
    housesStarPops_Sub[6] = "7. ภพปัตนิ  ทำนายเกี่ยวกับคู่รักคู่ครอง หุ้นส่วน คู่สัญญากรณี  คู่ความในคดีแพ่ง คู่แข่งขัน หรือห้างร้านที่เป็นคู่แข่งขัน   เพศตรงข้าม หรือ ศัตรูคู่แค้น";
    housesStarPops_Sub[7] = "8. ภพปัตนิ  ทำนายเกี่ยวกับความตาย การทิ้งถิ่นฐาน การพลัดพรากจากกัน การไปต่างถิ่นต่างประเทศ  การเลิกร้างกัน ความโศกเศร้าเสียใจ";
    housesStarPops_Sub[8] = "9. ภพศุภะ  ทำนายเกี่ยวกับบิดา ผู้อุปการะที่เป็นผู้ชาย เจ้านาย  อสังหาริมทรัพย์ทุกชนิด ความเจริญรุ่งเรือง  ความเจริญทางอำนาจ วาสนา ความเจริญทางจิตใจ";
    housesStarPops_Sub[9] = "10. ภพกัมมะ  ทำนายเกี่ยวกับอาชีพ  การงาน การทำงาน  การดำเนินกิจการ คนงาน กรรมกร ลูกจ้าง   ลูกน้อง";
    housesStarPops_Sub[10] = "11. ภพลาภะ ทำนายเกี่ยวกับรายได้ เช่นทรัพย์สินเงินทอง  วัตถุสิ่งของหรือจะเป็นบุคคลก็ได้";
    housesStarPops_Sub[11] = "12. ภพวินาศ ทำนายเกี่ยวกับความพินาศล่มจมเสียหายอย่างหนัก  การพลัดพรากจากกัน การโยกย้าย ถ้าหนักก็หมายถึง ความตาย  การติดคุกตาราง การถูกกักขัง  และการล้มละลาย";

    for (let iPop = 0; iPop <= 11; iPop++) {
        const LukTamnaiKasedInPopResults = await db.dbQuery(`SELECT * FROM luktamnaikasedinpop WHERE KasediInPopi='${varBornLuk_KasediInPopistr[iPop]}' `);
        if (LukTamnaiKasedInPopResults && LukTamnaiKasedInPopResults.length == 1) {
            const Description = LukTamnaiKasedInPopResults[0].PayakonText.replace(/<br>/g, "").replace(/<b>/g, "");
            // housesStarPops_Desc.push();
            housesStarPops_Desc[iPop] = `${LukTamnaiKasedInPopResults[0].KasedsInPops}  ${Description}`;
        } else {
            housesStarPops_Desc[iPop] = "-";
        }
    }

    const housesStarPops = {
        "title": housesStarPops_Title,
        "sub_title": housesStarPops_Sub,
        "payakorn": housesStarPops_Desc,
    }

    return {
        bornLukPopsChars, // ข้อมูลเกี่ยวกับดาวและภพ (ดวงกำเนิดของเจ้าชะตา)
        bornLukOwnerHousePop, //ดาว เจ้าเรือน ภพ และมาตรฐานดาวกำเนิด
        varBornLuk_KasediInPopistr,
        lukBornRasees,
        ascendantPrediction, // คำทำนายลัคนาสถิตราศี
        ascendantPredictionGem, //สีและอัญมณีที่ถูกโฉลกประจำราศี
        starStayGumLuk, // กุมลัคน์
        starStayPatani, // เล็งลัคนา
        starAsTanuSED, //คำทำนายตนุเศษ ทายเรื่องจิตใจของเจ้าชะตา
        starSame, //ดาวคู่หรือดาวกุมกัน
        standardStarsDuangRasee, //ดาวมาตรฐาน ในดวงราศีจักร
        standardStarsDuangNavang, // ดาวมาตรฐาน ในดวงราศีนวางค์จักร
        starKalakini, //ดาวที่เป็นกาลกิณี (กาลี)
        starBornTamPop, //คำทำนายพื้นดวงกำเนิด ตามดาวที่อยู่ในภพต่างๆ
        housesStarPops, //คำทำนายพื้นดวงกำเนิด ตามดาวเจ้าเรือนอยู่ในภพต่างๆ (ภพผสมภพ)
    }
}

async function PayakornToday(SuriyatDate, TodaySuriyatDate) {
    // 'คำทำนายดาวจร
    let StringLongBornToday = "";
    let iStarTodayPowerInOngsa1To20 = 20;
    let array1 = SuriyatDate.varBornPutdate_StarStayR[0];
    let array2 = TodaySuriyatDate.varTodayPutdate_StarStayR[0];
    let wanderingStarNowTitle = "คำทำนายเหตุการณ์ปัจจุบัน (ดาวจร)";
    let wanderingStarNowSub = "* แสดงคำทำนายดาวจรส่งอิทธิพลในเกณฑ์ " + iStarTodayPowerInOngsa1To20 + " องศา คือแสดงคำทำนายดาวจรเฉพาะที่องศาดาวกำเนิดกับองศาดาวจรห่างกันในระยะ " + iStarTodayPowerInOngsa1To20 + " องศาเท่านั้น"
    let starAsInRaseeiAsStarSub = "ดาวจรเดินมา ทับ/กุม ดาวกำเนิด (อยู่ในราศีเดียวกัน) ในเกณฑ์ " + iStarTodayPowerInOngsa1To20 + " องศา"; //'หัวข้อหลัก"
    let StarAsInRaseeiAsStar_Desc = [];
    let StarAsInRaseeiAsStar_Move = [];
    let StarAsInRaseeiAsStar_Percent = [];
    let varBornLuk_StarLipdaAll = [
        [],
        []
    ];
    let varTodayLuk_StarLipdaAll = [
        [],
        []
    ];

    const columnIindex = [10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

    let dayNameLuk = {
        10: "ลั. ลัคนา",
        1: "1. อาทิตย์",
        2: "2. จันทร์",
        3: "3. อังคาร",
        4: "4. พุธ",
        5: "5. พฤหัส",
        6: "6. ศุกร์",
        7: "7. เสาร์",
        8: "8. ราหู",
        9: "9. เกตุ",
        0: "0. มฤตยู",
    };

    let dayNameLukText = {
        10: "ลัคนา",
        1: "อาทิตย์",
        2: "จันทร์",
        3: "อังคาร",
        4: "พุธ",
        5: "พฤหัส",
        6: "ศุกร์",
        7: "เสาร์",
        8: "ราหู",
        9: "เกตุ",
        0: "มฤตยู",
    };

    // let matchingpredictionsGroup = Array(11).fill(null).map(() => []);
    let starAsInRaseeiAsStarGroup = columnIindex.map(index => ({
        starBornIndex: index,
        starBornText: dayNameLukText[index],
        predictions: []
    }));

    for (let index1 = 0; index1 <= 10; index1++) {
        for (let index2 = 0; index2 <= 10; index2++) {
            if (array1[index1] === array2[index2]) {
                const lblStarO_1 = SuriyatDate.varBornPutdate_StarO[0][index1];
                const lblStarL_1 = SuriyatDate.varBornPutdate_StarL[0][index1];
                const lblStarO_2 = TodaySuriyatDate.varTodayPutdate_StarO[0][index2];
                const lblStarL_2 = TodaySuriyatDate.varTodayPutdate_StarL[0][index2];

                varBornLuk_StarLipdaAll[0][index1] = lblStarO_1 * 60 + lblStarL_1; // Convert birth star's angle to minutes
                varTodayLuk_StarLipdaAll[0][index2] = lblStarO_2 * 60 + lblStarL_2; // Convert today's star's angle to minutes

                let LipdaLongBornToday = 0;
                let aOng = 0,
                    aLib = 0,
                    StringLongBornToday = "";

                if (varTodayLuk_StarLipdaAll[0][index2] < varBornLuk_StarLipdaAll[0][index1]) {
                    LipdaLongBornToday = varBornLuk_StarLipdaAll[0][index1] - varTodayLuk_StarLipdaAll[0][index2];
                    aOng = Math.floor(LipdaLongBornToday / 60); // Degrees
                    aLib = LipdaLongBornToday % 60; // Minutes

                    if (aOng === 0 && aLib > 0) {
                        StringLongBornToday = `* ห่างกันในระยะ ${aLib} ลิปดา (ยังไม่ถึง)`;
                    } else if (aLib === 0 && aOng > 0) {
                        StringLongBornToday = `* ห่างกันในระยะ ${aOng} องศา (ยังไม่ถึง)`;
                    } else {
                        StringLongBornToday = `* ห่างกันในระยะ ${aOng}.${aLib} องศา (ยังไม่ถึง)`;
                    }
                } else if (varTodayLuk_StarLipdaAll[0][index2] > varBornLuk_StarLipdaAll[0][index1]) {
                    LipdaLongBornToday = varTodayLuk_StarLipdaAll[0][index2] - varBornLuk_StarLipdaAll[0][index1];
                    aOng = Math.floor(LipdaLongBornToday / 60); // Degrees
                    aLib = LipdaLongBornToday % 60; // Minutes

                    if (aOng === 0 && aLib > 0) {
                        StringLongBornToday = `* ห่างกันในระยะ ${aLib} ลิปดา (ผ่านหรือเลยมาแล้ว)`;
                    } else if (aLib === 0 && aOng > 0) {
                        StringLongBornToday = `* ห่างกันในระยะ ${aOng} องศา (ผ่านหรือเลยมาแล้ว)`;
                    } else {
                        StringLongBornToday = `* ห่างกันในระยะ ${aOng}.${aLib} องศา (ผ่านหรือเลยมาแล้ว)`;
                    }
                } else {
                    StringLongBornToday = `* เป็นระยะที่ทับกันแบบสนิท 100%`;
                }

                if (aOng <= iStarTodayPowerInOngsa1To20) {
                    const MoveDay = TodaySuriyatDate.varTodayPutdate_StarMoveGoDay[index2];
                    const MoveMonth = TodaySuriyatDate.varTodayPutdate_StarMoveGoMonth[index2];
                    const MoveYearB = TodaySuriyatDate.varTodayPutdate_StarMoveGoYearB[index2];
                    const MoveH = TodaySuriyatDate.varTodayPutdate_StarMoveGoH[index2];
                    const MoveM = TodaySuriyatDate.varTodayPutdate_StarMoveGoM[index2];
                    const strSMove = `จนถึงวันที่ ${MoveDay} ${await Support.fcMonthiToSSht(MoveMonth)} ${MoveYearB} เวลา  ${MoveH}:${MoveM} น.`;

                    const LukTamnaiStarTodayToStarBornResults = await db.dbQuery(`SELECT * FROM luktamnaistartodaytostarborn WHERE StarTodayi='${index2}' AND StarBorni='${index1}'`);
                    if (LukTamnaiStarTodayToStarBornResults.length > 0) {
                        const sTextPayakornToday = "คำพยากรณ์ " + LukTamnaiStarTodayToStarBornResults[0].PayakornText.replace(/<br>/g, "").replace(/<b>/g, "");
                        const StarTodayToStarBorns = LukTamnaiStarTodayToStarBornResults[0].StarTodayToStarBorns;
                        StarAsInRaseeiAsStar_Desc.push(sTextPayakornToday);

                        const sTextFocus3 = `${StarTodayToStarBorns} [ดวงกำเนิด ${lblStarO_1}.${lblStarL_1} องศา ดวงจร ${lblStarO_2}.${lblStarL_2}] ${StringLongBornToday}`;
                        const sTextStarStayLongTimeTMDs = `เหตุการณ์ต่อไปนี้มีผลต่อเจ้าชะตา ${strSMove}`;
                        StarAsInRaseeiAsStar_Move.push(`${sTextFocus3} ${sTextStarStayLongTimeTMDs}`);

                        const Percent_PakakornStar = await getPercent_PakakornStarTodayKumBorn(varBornLuk_StarLipdaAll[0][index1], varTodayLuk_StarLipdaAll[0][index2]);
                        let probabilityText = `โอกาสและผลที่จะเกิดประมาณ ${Percent_PakakornStar.toFixed(2)}% ${getPercentEventText(Percent_PakakornStar)}`;
                        StarAsInRaseeiAsStar_Percent.push(probabilityText);

                        const matchingPrediction = {
                            starBornIndex: index1,
                            starBorn: dayNameLukText[index1],
                            startTodayIndex: index2, 
                            startToday: dayNameLukText[index2],
                            starBorn_O: lblStarO_1,
                            starBorn_L: lblStarL_1,
                            todayBorn_O: lblStarO_2,
                            todayBorn_L: lblStarL_2,
                            prediction: sTextPayakornToday,
                            details: `${StarTodayToStarBorns} [ดวงกำเนิด ${lblStarO_1}.${lblStarL_1} องศา ดวงจร ${lblStarO_2}.${lblStarL_2}] ${StringLongBornToday}`,
                            moveDate: `${MoveDay} ${await Support.fcMonthiToSSht(MoveMonth)} ${MoveYearB}`,
                            moveTime: `${MoveH}:${MoveM}`,
                            probability: Percent_PakakornStar.toFixed(2),
                            probabilityText: probabilityText
                        };

                        // matchingpredictionsGroup[index1].push(matchingPrediction);
                        starAsInRaseeiAsStarGroup[index1].predictions.push(matchingPrediction);
                    }
                }
            }
        }
    }

    return {
        wanderingStarNowTitle, //คำทำนายเหตุการณ์ปัจจุบัน (ดาวจร)
        wanderingStarNowSub,
        starAsInRaseeiAsStarSub,
        // StarAsInRaseeiAsStar_Desc,
        // StarAsInRaseeiAsStar_Move,
        // StarAsInRaseeiAsStar_Percent,
        starAsInRaseeiAsStarGroup,
    }
}

async function getPercent_PakakornStarTodayKumBorn(nBornLipda, nTodayLipda) {
    let nPercent = 0;
    let iEndCount = nBornLipda - 1800;
    if (iEndCount === 0) iEndCount = 1;

    let iAllLipda1800 = 1800;

    // Counting backwards from the conjunction point to the starting point
    for (let iL = nBornLipda; iL >= iEndCount; iL--) {
        nPercent = (iAllLipda1800 * 100) / 1800;

        if (iL === nTodayLipda) {
            // If today's lipda matches the born lipda exactly
            return nPercent;
        }

        iAllLipda1800 -= 1;
    }

    // Counting forwards from the conjunction point to the end point
    iEndCount = nBornLipda + 1800;
    iAllLipda1800 = 1800;

    for (let iL = nBornLipda; iL <= iEndCount; iL++) {
        nPercent = (iAllLipda1800 * 100) / 1800;

        if (iL === nTodayLipda) {
            // If today's lipda matches the born lipda exactly
            return nPercent;
        }

        iAllLipda1800 -= 1;
    }

    return nPercent;
}

async function getStarSamePayakornDescription(raseeIndex, star1, star2) {
    const sqlQuery = "SELECT MateShort, PayakornText FROM luktamnaistarmateborn_original WHERE Stari1 = ? AND Stari2 = ?";
    const queryParams = [star1, star2];
    const queryResult = await db.db_Query(sqlQuery, queryParams);
    if (queryResult && queryResult.length > 0) {
        const zodiac = await Support.fcRaseeiToS(raseeIndex);
        return `ดาว ${star1} กับ ดาว ${star2} อยู่ร่วมราศีเดียวกัน [อยู่ราศี ${zodiac}]. เป็นดาว ${queryResult[0].MateShort} ทำนายว่า ${queryResult[0].PayakornText}`;
    }
    return " - ";
}


async function analyzeStarConjunctions(SuriyatDate) {
    let starTitles = [];
    let starDescriptions = [];
    let conjunctionCount = 0;
    try {
        for (let iRaseeLoop = 0; iRaseeLoop <= 11; iRaseeLoop++) {
            for (let iStarLoop = 1; iStarLoop <= 9; iStarLoop++) {
                if (iRaseeLoop === SuriyatDate.varBornPutdate_StarStayR[0][iStarLoop]) {
                    await analyzeConjunction(iRaseeLoop, iStarLoop);
                }
            }
        }
    } catch (error) {
        console.error("Failed to analyze star conjunctions:", error);
    }

    async function analyzeConjunction(raseeIndex, starIndex) {
        for (let mateIndex = starIndex + 1; mateIndex <= 9; mateIndex++) {
            if (raseeIndex === SuriyatDate.varBornPutdate_StarStayR[0][mateIndex]) {
                const title = `Star ${starIndex} and Star ${mateIndex} in conjunction`;
                const description = await getStarDescription(raseeIndex, starIndex, mateIndex);
                starTitles.push(title);
                starDescriptions.push(description);
                conjunctionCount++;
            }
        }
    }

    async function getStarDescription(raseeIndex, star1, star2) {
        const sqlQuery = "SELECT MateShort, PayakornText FROM luktamnaistarmateborn_original WHERE Stari1 = ? AND Stari2 = ?";
        const queryParams = [star1, star2];
        const queryResult = await db.db_Query(sqlQuery, queryParams);
        if (queryResult && queryResult.length > 0) {
            const zodiac = await Support.fcRaseeiToS(raseeIndex);
            return `Star ${star1} and Star ${star2} are in the same zodiac sign [${zodiac}]. Relationship: ${queryResult[0].MateShort}, Prediction: ${queryResult[0].PayakornText}`;
        }
        return " - ";
    }
}

function calculateRahu(julinday) {
    let TemJ = 318.510107 - 0.0529539 * (julinday - parameter.JulindayAt1990);
    return adjustDegrees(TemJ);
}

function calculateThaidgr(Rahu, DegreeAya) {
    let Thaidgr = Rahu + DegreeAya;
    return adjustDegrees(Thaidgr);
}

function calculateThaiT(DayAdj, month, year) {
    return calendar.thaiSuriya(DayAdj, month, year, parameter.Hour, parameter.min, parameter.TimeZoneH, parameter.TimeZoneM, parameter.SaveTimeYN, parameter.Longitude_Degree, parameter.Longitude_Min, parameter.East_West, parameter.Latitude_Degree, parameter.Latitude_Min, parameter.North_South, 5);
}

function calculateThaiDataPoint(SuriyaData, dataPointIndex) {

    return calendar.thaiSuriya(SuriyaData.DayAdj, SuriyaData.month, SuriyaData.year, SuriyaData.hour, SuriyaData.min, SuriyaData.TimeZoneH, SuriyaData.TimeZoneM, SuriyaData.SaveTimeYN, SuriyaData.Longitude_Degree, SuriyaData.Longitude_Min, SuriyaData.East_West, SuriyaData.Latitude_Degree, SuriyaData.Latitude_Min, SuriyaData.North_South, dataPointIndex);
}

function adjustDegrees(value, DegreeAya = null) {

    if (DegreeAya == null) {
        if (value < 0) {
            return 360 + value;
        } else {
            return value - Math.floor(value / 360) * 360;
        }

    } else {
        return (value + DegreeAya) - (((value + DegreeAya) / 360) * 360);
    }

}

function degreesToArcMinutes(value) {
    return value * 60;
}

async function fcTest_SompudStar_RadToResultRaOngLib(RadSompodStarX) {
    // Calculate zodiac sign
    const aRa = Math.floor(RadSompodStarX / 1800);
    let BB1 = RadSompodStarX - aRa * 1800;

    if (BB1 === 0) BB1 = 1;

    // Calculate degrees
    const aOng = Math.floor(BB1 / 60);

    // Calculate minutes
    // const aLib = Math.floor(BB1 - aOng * 60);
    const aLib = Math.floor(BB1 - (aOng * 60));

    // Format the result as a string with leading zeros, e.g., "05.11.50"
    const result = [
        aRa.toString().padStart(2, '0'),
        aOng.toString().padStart(2, '0'),
        aLib.toString().padStart(2, '0'),
    ].join('.');

    return result;
}

async function CastHoroscope_Sun(def1, AA, Ps, Vs, JS, S1 = null, ZP = null) {

    let KTP = def1 * 800;

    // 'ราศี อาทิตย์
    let Xsun = Math.floor(KTP / 24350);

    // 'กัมมัชพลเหลือจากราศี RKTP
    let RKTP = KTP - Xsun * 24350;

    // 'องศา DP
    let DP = Math.floor(RKTP / 811);

    // 'กัมมัชพลเหลือจากองศา RKDP
    let RKDP = RKTP - DP * 811;

    // 'ลิปดา MP
    let MP = Math.floor(RKDP / 14) - 3;

    // 'มัธยมอาทิตย์ ZP
    ZP = Xsun * 1800 + DP * 60 + MP;

    // 'ภุช BUP
    let BUP = ZP - 4800;
    let Pi = parameter.pi;
    let SI = (BUP / 60);
    SI = Math.sin(SI * Pi / 180);

    // 'ขัน Xsun
    if (BUP > 21600) {
        BUP = BUP - 21600;
    }
    if (BUP > 5400) {
        BUP = 10800 - BUP;
    }
    if (BUP < -5400) {
        BUP = 10800 - (BUP + 21600);
    }
    if (BUP > 5400) {
        BUP = 10800 - BUP;
    }

    // 'Ksx = Math.Abs(BUP / 60 / 15)
    let Ksx = BUP / 60 / 15;
    if (Ksx < 0) {
        Ksx = Ksx * (-1);
    }

    let Msun = Math.floor(Ksx);
    let Ysun, Ysun1;
    if (Msun === 0) {
        Ysun = 0;
        Ysun1 = 35;
    } else if (Msun === 1) {
        Ysun = 35;
        Ysun1 = 67;
    } else if (Msun === 2) {
        Ysun = 67;
        Ysun1 = 94;
    } else if (Msun === 3) {
        Ysun = 94;
        Ysun1 = 116;
    } else if (Msun === 4) {
        Ysun = 116;
        Ysun1 = 129;
    } else if (Msun === 5) {
        Ysun = 129;
        Ysun1 = 134;
    } else if (Msun === 6) {
        Ysun = 134;
        Ysun1 = 0;
    }

    S1 = Math.floor((Ksx - Msun) * (Ysun1 - Ysun) + Ysun);
    let k1 = 1;
    if (SI < 0) {
        k1 = -1;
    }

    // 'สมผุสอาทิตย์ AA
    AA = ZP - S1 * k1;
    if (AA < 0) {
        AA = AA + 21600;
    }

    if (AA > 21600) {
        AA = AA - Math.floor(AA / 21600) * 21600;
    }

    Vs = ZP - 23;

    Ps = (JS - 610);
    Ps = Ps * 21600;
    Ps = Ps + Vs;

    return {
        Xsun,
        MP,
        BUP,
        SI,
        Ksx,
        Msun,
        Ysun,
        Ysun1,
        def1,
        AA,
        Ps,
        Vs,
        JS,
        S1,
        ZP
    }
}

async function CastHoroscope_Moon(Fm, Vs, Pi, AM, DefTime, HM, DM, Zm, Mum) {
    HM = Fm - 233142;
    let Um = HM - 621;
    // DefTime = 10.1;

    // 'อุจพลจันทร์   Um
    Um = Um - Math.floor(Um / 3232) * 3232;

    // 'มัธยมอุจ  Mum
    Mum = Math.floor((Um + DefTime / 24) * 21600 / 3232) + 2;

    // 'อวมาน Wm
    let Wm = HM * 703 + 650 + Math.floor(DefTime * 703 / 24);

    // 'มาสเกณฑ์ Mm
    let MM = Math.floor(Wm / 20760);

    // 'อวมานเหลือจากมาส Km
    let Km = Wm - MM * 20760;

    // 'ดิถี  Dm
    DM = Math.floor(Km / 692);

    // 'อวมาน Wm1
    let Wm1 = Km - DM * 692;

    // 'มัธยมจันทร์(ลิปดา) Zm
    Zm = DM * 720 + Math.floor(1.04 * Wm1) - 17 + Vs;

    // 'อุจวิเศษ  UVm
    let UVm = Zm - Mum;
    let Im = Math.sin((UVm / 60) * Pi / 180);
    // Im = 0.06946629077719282 // 0.700446500083193

    if (UVm > 21600) UVm -= 21600;
    UVm = UVm > 5400 ? 10800 - UVm : UVm;
    UVm = UVm < -5400 ? 10800 + UVm : UVm;

    // 'Xm = Math.Abs(UVm / 60 / 15)
    let Xm = UVm / 60 / 15; // 'แทน abs ' Xm = Abs(UVm / 60 / 15)
    if (Xm < 0) Xm = Xm * (-1);

    let Mxm = Math.floor(Xm);
    let ranges = [
        [0, 77],
        [77, 148],
        [148, 209],
        [209, 256],
        [256, 286],
        [286, 296],
        [296, 0]
    ];
    let [Ym, Ym1] = ranges[Mxm] || [0, 0]; // Default to [0, 0] if Mxm is out of range
    let Rm = Math.floor((Xm - Mxm) * (Ym1 - Ym) + Ym);

    // 'สมผุสจันทร์   Am
    let k1 = Im < 0 ? -1 : 1;
    AM = Zm - Rm * k1;
    AM = AM < 0 ? AM + 21600 : AM;
    AM = AM > 21600 ? AM % 21600 : AM;

    return {
        DefTime,
        Fm,
        HM,
        Um,
        Mum,
        Wm,
        MM,
        Xm,
        Mxm,
        Ym,
        Ym1,
        Rm,
        AM,
        Zm
    };

}

async function CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z) {

    // 16055508 1 2 16 505 5420 127 45 0.26666666666666666 6708 0 null
    // 16055508 1 2 16 505 5420 127 45 0.2666666666666667  6708 0 null 
    // console.log(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z);

    Pi = parameter.pi;
    let W = 1;
    if (A2 < 0) W = -1;

    let absxx = Ps * A2 / A3;
    if (absxx < 0) absxx = absxx * (-1);
    Z = Math.floor(Ps * A0 / A1) + W * Math.floor(absxx) + b;
    Z = Z - Math.floor(Z / 21600) * 21600;
    let K = Z - c * 60 - 5400;
    let KH = K;
    let j = Math.sin(K / 60 / 180 * Pi);
    let k1 = j < 0 ? -1 : 1;

    let K00 = K;

    K = K > 21600 ? K - 21600 : (K > 5400 ? 10800 - K : (K < -5400 ? 10800 - (K + 21600) : K));
    let XX = K / 1800;
    // XX = XX < 0 ? -XX : XX;
    if (XX < 0) {
        XX = XX * (-1);
    }

    let MM = Math.floor(XX);
    let YY = 0,
        Y1 = 0;

    const Adjust = await CastHoroscope_Adjust(MM, YY, Y1);
    let MK = Math.floor(((XX - MM) * (Adjust.Y1 - Adjust.YY) + Adjust.YY + 0.5))
    let Ms = d * 60 - k1 * Math.floor(MK / 2)
    let BU = KH + 5400;
    let ii = Math.sin(BU / 60 * Pi / 180);

    let K3 = 1;
    if (ii < 0) {
        K3 = -1;
    }

    if (BU > 21600) {
        BU -= 21600;
    }
    if (BU > 5400) {
        BU = 10800 - BU;
    }
    if (BU < -5400) {
        BU = 10800 + BU;
    }
    if (BU > 5400) {
        BU = 10800 - BU;
    }

    let Xs = BU / 1800;
    if (Xs < 0) {
        Xs = Xs * (-1);
    }
    MM = Math.floor(Xs);
    let YS = 0,
        Ys1 = 0;
    // 1 244 427 //1 244 427 
    const Adjust2 = await CastHoroscope_Adjust(MM, Adjust.YY, Adjust.Y1);
    let MB = Math.floor(((Xs - MM) * (Adjust2.Y1 - Adjust2.YY) + Adjust2.YY) * 60);
    let R = Math.floor(MB * 60 / Ms);
    let MP = Z - R * K3;
    K = MP - Vs - 5400;
    let KJ = K;
    let Q = Math.sin(K / 60 / 180 * Pi);
    // -0.6870875108762852 -0.687087510876285
    // console.log(Q);
    let K4 = 1;

    if (Q < 0) {
        K4 = -1;
    }
    if (K > 21600) {
        K = K - 21600;
    }
    if (K > 5400) {
        K = 10800 - K;
    }
    if (K < -5400) {
        K = 10800 - (K + 21600);
    }
    if (K > 5400) {
        K = 10800 - K;
    }

    let Xss = K / 1800;
    if (Xss < 0) {
        Xss = Xss * (-1);
    }

    MM = Math.floor(Xss);
    const Adjust3 = await CastHoroscope_Adjust(MM, Adjust2.YY, Adjust2.Y1)
    let SK = Math.floor((Xss - MM) * (Adjust3.Y1 - Adjust3.YY) + Adjust3.YY + 0.5);
    BU = KJ + 5400;
    let O = Math.sin(BU / 60 / 180 * Pi);
    // 0.7265746710439432 //0.726574671043943
    // console.log(O);

    let K2 = 1;
    if (O < 0) {
        K2 = -1;
    }

    if (BU > 21600) {
        BU = BU - 21600;
    }
    if (BU > 5400) {
        BU = 10800 - BU;
    }
    if (BU < -5400) {
        BU = 10800 - (BU + 21600);
    }
    if (BU > 5400) {
        BU = 10800 - BU;
    }

    XX = BU / 1800;
    if (XX < 0) {
        XX = XX * (-1);
    }
    MM = Math.floor(XX);
    const Adjust4 = await CastHoroscope_Adjust(MM, Adjust3.YY, Adjust3.Y1);
    let SB = Math.floor(((XX - MM) * (Adjust4.Y1 - Adjust4.YY) + Adjust4.YY) * 60);
    let H = Math.floor(Math.floor(SB / 60 + 0.5) / 3) - SK * K4 + Math.floor(Ms * e);
    // 20715 1211  //20715 1211

    R = Math.floor(SB * 60 / H);
    AA = MP - R * K2;
    if (AA < 0) {
        AA += 21600;
    }

    if (AA > 21600) {
        AA -= Math.floor(AA / 21600) * 21600;
    }

    const MsgBox = {
        W,
        A2,
        Z,
        K,
        KH,
        j,
        MM,
        YY: Adjust4.YY,
        Y1: Adjust4.Y1,
        MK,
        d,
        Ms,
        BU,
        ii,
        Xs,
        MB,
        R,
        MP,
        Q,
        SK,
        O,
        SB,
        H,
        R,
        AA
    };
    // console.log(MsgBox);
    // W = 1 A2 = 16 Z = 9863 K = -2604 KH = -3157 j = -0.7945912654656592
    // MM = 1 Y = 244 Y1 = 427 MK = 382 d = 45 Ms = 2891 BU = 2796
    // ii = 0.6071447282514929 Xs = 1.2461111111111112 
    // MB = 17342 R = 1026 MP = 9504 Q = -0.6870875108762852 
    // SK = 326 O = 0.7265746710439432 SB = 20715 H = 1211 R = 1026  AA = 8478

    // W = 1 A2 = 16 Z = 9863 K = 2604 KH = 3157 j = -0.794591265465659
    // MM = 1 Y = 244 Y1 = 427 MK = 382 d = 45 Ms = 2891 BU = 2796
    // ii = 0.607144728251493 Xs = 1.24611111111111
    // MB = 17342 R = 1026 MP = 9504 Q = -0.687087510876285
    // SK = 326 O = 0.726574671043943 SB = 20715 H = 1211 R = 1026 AA = 8478

    return MsgBox;
}

async function CastHoroscope_StarM(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z) {

    Pi = parameter.pi;
    let W = 1;

    if (A2 < 0) W = -1;
    // PS = 16055508 A2 = 4 A3 = 1
    // 16055508 4 1

    //64222032 // 
    let absxx = Ps * A2 / A3;


    if (absxx < 0) absxx = absxx * (-1);

    Z = Math.floor(Ps * A0 / A1) + W * Math.floor(absxx) + b;
    Z = Z - Math.floor(Z / 21600) * 21600;
    let K = Vs - c * 60 - 5400;
    let KH = K;
    let j = Math.sin(K / 60 / 180 * Pi);
    // K = -11892 //-11892
    let k1 = j < 0 ? -1 : 1;

    if (K > 21600) {
        K = K - 21600;
    }
    if (K > 5400) {
        K = 10800 - K;
    }
    if (K < -5400) {
        K = 10800 - (K + 21600)
    }
    if (K > 5400) {
        K = 10800 - K
    }

    let XX = K / 1800;
    if (XX < 0) {
        XX = XX * (-1);
    }

    let MM = Math.floor(XX);
    let YY = 0;
    let Y1 = 0;
    const Adjust = await CastHoroscope_Adjust(MM, YY, Y1)
    let MK = Math.floor(((XX - MM) * (Adjust.Y1 - Adjust.YY) + Adjust.YY + 0.5))
    let Ms = d * 60 - k1 * Math.floor(MK / 2);
    let BU = KH + 5400;
    // -6492 -6492
    // console.log(BU);
    let ii = Math.sin(BU / 60 * Pi / 180);
    let K3 = 1;
    if (ii < 0) {
        K3 = -1;
    }

    if (BU > 21600) {
        BU = BU - 21600;
    }
    if (BU > 5400) {
        BU = 10800 - BU;
    }
    if (BU < -5400) {
        BU = 10800 - (BU + 21600);
    }
    if (BU > 5400) {
        BU = 10800 - BU;
    }
    // -4308 -4308

    let Xs = BU / 1800;
    if (Xs < 0) {
        Xs = Xs * (-1);
    }

    MM = Math.floor(Xs);
    let YS = 0;
    let Ys1 = 0;
    const Adjust2 = await CastHoroscope_Adjust(MM, Adjust.YY, Adjust.Y1);
    let MB = Math.floor(((Xs - MM) * (Adjust2.Y1 - Adjust2.YY) + Adjust2.YY) * 60);
    let R = Math.floor(MB * 60 / Ms);
    let MP = Vs - R * K3;
    K = MP - Z - 5400;
    let KJ = K;
    let Q = Math.sin(K / 60 / 180 * Pi);

    let K4 = 1;
    if (Q < 0) {
        K4 = -1;
    }
    if (K > 21600) {
        K -= 21600;
    }
    if (K > 5400) {
        K = 10800 - K;
    } else if (K < -5400) {
        K = 10800 - (K + 21600);
    }
    if (K > 5400) {
        K = 10800 - K;
    }

    let Xss = K / 1800;
    if (Xss < 0) {
        Xss = Xss * (-1);
    }

    MM = Math.floor(Xss);
    const Adjust3 = await CastHoroscope_Adjust(MM, Adjust2.YY, Adjust2.Y1)
    let SK = Math.floor((Xss - MM) * (Adjust3.Y1 - Adjust3.YY) + Adjust3.YY + 0.5);
    BU = KJ + 5400;
    let O = Math.sin(BU / 60 / 180 * Pi);

    let K2 = 1;

    if (O < 0) {
        K2 = -1;
    }

    if (BU > 21600) {
        BU = BU - 21600;
    }
    if (BU > 5400) {
        BU = 10800 - BU;
    }
    if (BU < -5400) {
        BU = 10800 - (BU + 21600);
    }
    if (BU > 5400) {
        BU = 10800 - BU;
    }

    XX = BU / 1800;
    if (XX < 0) {
        XX = XX * (-1);
    }

    MM = Math.floor(XX);

    const Adjust4 = await CastHoroscope_Adjust(MM, Adjust3.YY, Adjust3.Y1);
    let SB = Math.floor(((XX - MM) * (Adjust4.Y1 - Adjust4.YY) + Adjust4.YY) * 60);
    let H = Math.floor(Math.floor(SB / 60 + 0.5) / 3) - SK * K4 + 60 * e;

    R = Math.floor(SB * 60 / H);
    AA = MP - R * K2;

    if (AA < 0) {
        AA = AA + 21600;
    }

    if (AA > 21600) {
        AA = AA - (Math.floor(AA / 21600) * 21600);
    }

    const MsgBox = {
        W,
        A2,
        Z,
        K,
        KH,
        j,
        MM,
        YY: Adjust4.YY,
        Y1: Adjust4.Y1,
        MK,
        d,
        Ms,
        BU,
        ii,
        Xs,
        MB,
        R,
        MP,
        Q,
        SK,
        O,
        SB,
        H,
        R,
        AA
    };
    //W = 1 A2 = 4 Z = 18303 K = 4605 KH = -11892 j = 0.3123349189413194 MM = 0 YY = 0 Y1 = 244 MK: 148  d = 100 Ms = 5926 BU = 522 ii = -0.9499720514476371 Xs =2.3933333333333335 MB = 27059 R = 313 MP = 6981 Q = 0.9884938867126121 SK = 470  O = 0.15126082067230473 SB = 4245 H = 813 AA = 6668
    //W = 1 A2 = 4 Z = 18303 K = 4787 KH = -11892 j = 0.312334918941319  MM = 0 YY = 0 Y1 = 244 MK = 148 d = 100 Ms = 5929 BU = 522 ii = -0.949972051447637  Xs = 2.393333333333333 MB = 27059 R = 313 MP = 6981 Q = 0.988493886712612  SK = 470  O = 0.151260820672305   SB = 4245 H = 813 AA = 6668 
    return MsgBox;
}

async function CastHoroscope_Adjust(MM, YY, Y1) {
    if (MM === 0) {
        YY = 0;
        Y1 = 244;
    } else if (MM === 1) {
        YY = 244;
        Y1 = 427;
    } else if (MM === 2) {
        YY = 427;
        Y1 = 488;
    } else if (MM === 3) {
        YY = 488;
        Y1 = 0;
    }

    return {
        YY,
        Y1
    }
}

async function CastHoroscope_AutoMinit(A, c, TQ, b) {

    let A1 = Math.floor(A / 1800);
    let A2 = A - A1 * 1800;
    let A3 = Math.floor(A2 / 60);
    let A4 = A2 - A3 * 60;
    let P = Math.floor(A1);

    if (P === 12) {
        P = 0;
    }

    let AdjAuto = await CastHoroscope_AdjAuto(P);
    let TL = AdjAuto.TL;
    let P1 = A2 * TL / 1800; // Time past
    let P2 = TL - P1; // Time future
    let Tz = TQ;
    let P3;

    if (Tz === 0) {
        P3 = P1;
    } else {
        if (Tz < P2) {
            P3 = TL - (P2 - Tz);
        } else {
            Tz -= P2;
            P += 1;
            if (P === 12) P = 0;
            AdjAuto = await CastHoroscope_AdjAuto(P);
            TL = AdjAuto.TL;

            while (Tz > TL) {
                Tz -= TL;
                P += 1;
                if (P === 12) P = 0;
                AdjAuto = await CastHoroscope_AdjAuto(P);
                TL = AdjAuto.TL;
            }
            P3 = Tz;
        }
    }

    let Pz = P3 * 1800 / TL;
    b = P * 1800 + Pz;

    return {
        Pz,
        b
    };
}

async function CastHoroscope_Antiautominit(A, c, TQ, b) {
    let A1 = Math.floor(A / 1800);
    let A2 = A - A1 * 1800;
    let A3 = Math.floor(A2 / 60);
    let A4 = A2 - A3 * 60;
    let P = Math.floor(A1);
    if (P === 12) {
        P = 0;
    }

    let AdjAuto = await CastHoroscope_AdjAuto(P);
    let TL = AdjAuto.TL;
    let P2 = A2 * TL / 1800; // 'เวลาที่เป็นอนาคต
    let Tz = TQ;
    let P3;
    if (Tz == 0) {
        P3 = P2;
    } else {

        if (Tz < P2) {
            P3 = P2 - Tz;
        } else {
            Tz = Tz - P2;
            P = P - 1;
            if (P === -1) {
                P = 11;
            }

            AdjAuto = await CastHoroscope_AdjAuto(P, TL);
            TL = AdjAuto.TL;
            while (Tz > TL) {
                Tz = Tz - TL;
                P = P - 1;
                if (P === -1) {
                    P = 11;
                }
                AdjAuto = await CastHoroscope_AdjAuto(P, TL);
                TL = AdjAuto.TL;
            }
            P3 = Tz;
        }
    }

    let Pz = P3 * 1800 / TL;
    b = P * 1800 + Pz;
    return {
        Pz,
        b
    };
}

async function CastHoroscope_AdjAuto(p, TL = null) {
    let tl;

    const adjAutoJson = {
        "0": 120,
        "1": 96,
        "2": 72,
        "3": 120,
        "4": 144,
        "5": 168,
        "6": 168,
        "7": 144,
        "8": 120,
        "9": 72,
        "10": 96,
        "11": 120
    };

    return {
        p,
        TL: adjAutoJson[p.toString()] || null
    }
}

async function CastHoroscope_AutoMinit_Rasijak(A, c, TQ, b, TLocalCut) {
    // Decompose the initial angle A into zodiac sign (P), degree (A3), and minute (A4) components
    let A1 = Math.floor(A / 1800);
    let A2 = A - A1 * 1800;
    let A3 = Math.floor(A2 / 60);
    let A4 = A2 - A3 * 60;
    let P = Math.floor(A1);

    // Ensure zodiac sign wraps around after the 12th sign
    if (P === 12) {
        P = 0;
    }

    // Retrieve adjustment for the zodiac sign P
    let AdjAuto = await CastHoroscope_AdjAuto(P);
    let TL = AdjAuto.TL;

    // Calculate the time past (P1) and future (P2) relative to the sign's temporal length (TL)
    let P1 = A2 * TL / 1800;
    let P2 = TL - P1;
    let Tz = TQ;

    // Determine the exact position within the temporal cycle
    if (Tz === 0) {
        P3 = P1;
    } else {
        if (Tz < P2) {
            P3 = TL - (P2 - Tz);
        } else {
            Tz -= P2;
            P += 1;
            if (P === 12) P = 0;

            // Adjust the time within the new sign's temporal length
            AdjAuto = await CastHoroscope_AdjAuto(P);
            TL = AdjAuto.TL;

            while (Tz > TL) {
                Tz -= TL;
                P += 1;
                if (P === 12) P = 0;
                AdjAuto = await CastHoroscope_AdjAuto(P);
                TL = AdjAuto.TL;
            }
            P3 = Tz;
        }
    }

    // Convert the temporal position back into an angle
    let Pz = P3 * 1800 / TL;
    b = P * 1800 + Pz;

    return {
        Pz,
        b
    };

}

async function castHoroscope_Star81(AA, Ps, VS2) {
    // 'โค้ดนี้เพิ่มมาใน v.8.0  02/06/2550 เวลา 22.23 น.
    let Vs, Z;
    AA = 0;
    Vs = VS2; // VS2 is undefined, and Vs is assigned to it, so Vs will also be undefined.
    Z = Math.floor(Ps / 20) + Math.floor(Ps / 265);
    Z %= 21600; // Simplified modulus operation to keep Z in the range of 0 to 21599

    AA = 15150 - Z;
    if (AA < 0) {
        AA += 21600;
    }
    if (AA > 21600) {
        AA %= 21600;
    }

    return {
        AA,
        Z
    }

}

function fcRaseeiToHouse(iRasee) {
    // Determine which star is the "lord of the house" based on the given Rasee (zodiac sign)
    switch (iRasee) {
        case 0:
        case 7:
            return 3;
        case 1:
        case 6:
            return 6;
        case 2:
        case 5:
            return 4;
        case 3:
            return 2;
        case 4:
            return 1;
        case 8:
        case 11:
            return 5;
        case 9:
            return 7;
        case 10:
            return 8;
        default:
            // It's generally good practice to handle unexpected values
            return 0; // Assuming 0 is a neutral or non-valid value for house
    }
}

async function fcGetTanused_CastHoroscope(iLukStayRasee, iStarAsHomeLuk, iStarKasedOfLukAsRasee, iStarAsHouseOfLukAsRasee) {
    let iCountFromLukToStarAsHomeLuk, iCountFromStarHomeLukToStarHouse;

    if (iStarKasedOfLukAsRasee >= iLukStayRasee) {
        iCountFromLukToStarAsHomeLuk = (iStarKasedOfLukAsRasee - iLukStayRasee) + 1;
    } else if (iStarKasedOfLukAsRasee < iLukStayRasee) {
        const difference = iLukStayRasee - iStarKasedOfLukAsRasee;
        switch (difference) {
            case 1:
                iCountFromLukToStarAsHomeLuk = 12;
                break;
            case 2:
                iCountFromLukToStarAsHomeLuk = 11;
                break;
            case 3:
                iCountFromLukToStarAsHomeLuk = 10;
                break;
            case 4:
                iCountFromLukToStarAsHomeLuk = 9;
                break;
            case 5:
                iCountFromLukToStarAsHomeLuk = 8;
                break;
            case 6:
                iCountFromLukToStarAsHomeLuk = 7;
                break;
            case 7:
                iCountFromLukToStarAsHomeLuk = 6;
                break;
            case 8:
                iCountFromLukToStarAsHomeLuk = 5;
                break;
            case 9:
                iCountFromLukToStarAsHomeLuk = 4;
                break;
            case 10:
                iCountFromLukToStarAsHomeLuk = 3;
                break;
            case 11:
                iCountFromLukToStarAsHomeLuk = 2;
                break;
            default:
                iCountFromLukToStarAsHomeLuk = null;
        }
    }

    let iStarAsHouse = await Support.fcRaseeToStarKased(iStarKasedOfLukAsRasee); // 'รับค่าดาวเจ้าบ้าน

    if (iStarAsHouseOfLukAsRasee >= iStarKasedOfLukAsRasee) {
        iCountFromStarHomeLukToStarHouse = (iStarAsHouseOfLukAsRasee - iStarKasedOfLukAsRasee) + 1;
    } else {
        const difference = iStarKasedOfLukAsRasee - iStarAsHouseOfLukAsRasee;
        switch (difference) {
            case 1:
                iCountFromStarHomeLukToStarHouse = 12;
                break;
            case 2:
                iCountFromStarHomeLukToStarHouse = 11;
                break;
            case 3:
                iCountFromStarHomeLukToStarHouse = 10;
                break;
            case 4:
                iCountFromStarHomeLukToStarHouse = 9;
                break;
            case 5:
                iCountFromStarHomeLukToStarHouse = 8;
                break;
            case 6:
                iCountFromStarHomeLukToStarHouse = 7;
                break;
            case 7:
                iCountFromStarHomeLukToStarHouse = 6;
                break;
            case 8:
                iCountFromStarHomeLukToStarHouse = 5;
                break;
            case 9:
                iCountFromStarHomeLukToStarHouse = 4;
                break;
            case 10:
                iCountFromStarHomeLukToStarHouse = 3;
                break;
            case 11:
                iCountFromStarHomeLukToStarHouse = 2;
                break;
            default:
                iCountFromStarHomeLukToStarHouse = null;
        }

    }

    let istarAsTanuSED = (iCountFromLukToStarAsHomeLuk * iCountFromStarHomeLukToStarHouse) % 7;

    if (istarAsTanuSED == 0) {
        istarAsTanuSED = 7;
    }

    return istarAsTanuSED;
}

async function GetValueControl_SompodStar() {
    // Definitions for label groups
    let lblStarStayRNo = new Array(13);
    let lblStarStayR = new Array(13);
    let lblStarO = new Array(13);
    let lblStarL = new Array(13);
    let lblPop = new Array(13);
    let lblPopT = new Array(13);
    let lblTri = new Array(13);
    let lblHarm = new Array(13);
    let lblNa = new Array(13);
    let lblLerk = new Array(13);
    let lblMLerk = new Array(13);
    let lblSecLerk = new Array(13);
    let lblFixedStar = new Array(13);
    let lblNLerk = new Array(13);
    let lblSTD = new Array(13);
    let lblStdNa = new Array(13);

    const labelGroups = [lblStarStayRNo, lblStarStayR, lblStarO, lblStarL, lblPop, lblPopT, lblTri, lblHarm, lblNa, lblLerk, lblMLerk, lblSecLerk, lblFixedStar, lblNLerk, lblSTD, lblStdNa];

    // Assuming you have proper values in labelValues
    const labelValues = new Array(labelGroups.length).fill(0).map(() => new Array(13).fill('DefaultValue'));

    // Populate each label group
    labelGroups.forEach((group, index) => {
        for (let i = 0; i < group.length; i++) {
            group[i] = labelValues[index][i];
        }
    });

    return labelGroups;
}

async function CastHoroscope_SompodStarOnLabel_Born_Today(option, SuriyatDate) {
    // const ResultData = await GetValueControl_SompodStar();

    let labelsVisibility = {
        lblStarT10: true, // corresponds to 'ลัคนา
        lblStarT11: true, // corresponds to 'เนปจูน
        lblStarT12: true, // corresponds to 'พูลโต
    };

    let strSS, TitleTable, columnIindex;

    let iStarAll = 12;
    let e10 = 0

    let lblSpeedCharBorn = new Array(13);
    let lblStarStayRNo = new Array(13);
    let lblStarStayR = new Array(13);
    let lblStarO = new Array(13);
    let lblStarL = new Array(13);
    let lblPop = new Array(13);
    let lblPopT = new Array(13);
    let lblTri = new Array(13);
    let lblHarm = new Array(13);
    let lblNa = new Array(13);
    let lblLerk = new Array(13);
    let lblMLerk = new Array(13);
    let lblSecLerk = new Array(13);
    let lblFixedStar = new Array(13);
    let lblNLerk = new Array(13);
    let lblSTD = new Array(13);
    let lblStdNa = new Array(13);

    if (option == 1) {
        // 0 -- 0 มฤตยู -> เรียง 1-9 แล้ว ลักนาแถวแรก -> แล้ว เนปจูน -> พูลโต
        TitleTable = ["ลั. ลัคนา", "1. อาทิตย์", "2. จันทร์", "3. อังคาร", "4. พุธ", "5. พฤหัส", "6. ศุกร์", "7. เสาร์", "8. ราหู", "9. เกตุ", "0. มฤตยู", "น. เนปจูน", "พ. พูลโต"];
        columnIindex = [10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 11, 12];

        for (let i = 0; i <= iStarAll; i++) {
            lblSpeedCharBorn[columnIindex[i]] = SuriyatDate.SpeedChar_Born[i];
            lblStarStayRNo[columnIindex[i]] = SuriyatDate.varBornPutdate_StarStayR[e10][i];
            lblStarStayR[columnIindex[i]] = await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[e10][i]); // ' กรกฎ
            lblStarO[columnIindex[i]] = SuriyatDate.varBornPutdate_StarO[e10][i]; // ' 6
            lblStarL[columnIindex[i]] = SuriyatDate.varBornPutdate_StarL[e10][i]; // ' 52
            lblPop[columnIindex[i]] = SuriyatDate.varBornPutdate_PopLuksStar[e10][i];
            lblPopT[columnIindex[i]] = SuriyatDate.varBornPutdate_PopTanusedStar[e10][i]; // 'กัมมะ
            lblTri[columnIindex[i]] = SuriyatDate.varBornPutdate_Trisss[e10][i];
            lblHarm[columnIindex[i]] = SuriyatDate.varBornPutdate_TriyangHarms[e10][i].replace(/พิษ/g, "");
            lblNa[columnIindex[i]] = SuriyatDate.varBornPutdate_Nasss[e10][i];
            lblLerk[columnIindex[i]] = SuriyatDate.varBornPutdate_LerkNow[e10][i];
            lblMLerk[columnIindex[i]] = SuriyatDate.varBornPutdate_MLerkPass[e10][i];
            lblSecLerk[columnIindex[i]] = SuriyatDate.varBornPutdate_SecLerkPass[e10][i];
            lblNLerk[columnIindex[i]] = SuriyatDate.varBornPutdate_NLerkNow[e10][i];
            lblFixedStar[columnIindex[i]] = SuriyatDate.varBornPutdate_FixedStarLerkNow[e10][i];

            if (SuriyatDate.varBornPutdate_RaSTD[e10][i] === "-") {
                strSS = "";
            } else {
                strSS += " ";
            }

            lblSTD[i] = (strSS + SuriyatDate.varBornPutdate_RaSTD[e10][i]).trim();

            strSS = "";
            if (SuriyatDate.varBornPutdate_NaRaSTD[e10][i] === "-") {
                strSS = "";
            } else {
                strSS += " ";
            }

            lblStdNa[i] = (strSS + SuriyatDate.varBornPutdate_NaRaSTD[e10][i]).trim();

        }
    } else if (option == 2) {

        TitleTable = ["1. อาทิตย์", "2. จันทร์", "3. อังคาร", "4. พุธ", "5. พฤหัส", "6. ศุกร์", "7. เสาร์", "8. ราหู", "9. เกตุ", "0. มฤตยู", ];
        columnIindex = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8];
        // columnIindex2 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        e10 = 1;
        lblSTD = [];
        lblStdNa = [];

        for (let i = 0; i <= 9; i++) {
            // lblSpeedCharBorn[columnIindex[i]] = SuriyatDate.SpeedChar_Born[i];
            lblStarStayRNo[columnIindex[i]] = SuriyatDate.varBornPutdate_StarStayR[e10][i];
            lblStarStayR[columnIindex[i]] = await Support.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[e10][i]); // ' กรกฎ
            lblStarO[columnIindex[i]] = SuriyatDate.varBornPutdate_StarO[e10][i]; // ' 6
            lblStarL[columnIindex[i]] = SuriyatDate.varBornPutdate_StarL[e10][i]; // ' 52
            lblPop[columnIindex[i]] = SuriyatDate.varBornPutdate_PopLuksStar[e10][i];
            lblPopT[columnIindex[i]] = SuriyatDate.varBornPutdate_PopTanusedStar[e10][i]; // 'กัมมะ
            lblTri[columnIindex[i]] = SuriyatDate.varBornPutdate_Trisss[e10][i];
            lblHarm[columnIindex[i]] = SuriyatDate.varBornPutdate_TriyangHarms[e10][i]; // SuriyatDate.varBornPutdate_TriyangHarms[e10][i].replace(/พิษ/g, "");
            lblNa[columnIindex[i]] = SuriyatDate.varBornPutdate_Nasss[e10][i];
            lblLerk[columnIindex[i]] = SuriyatDate.varBornPutdate_LerkNow[e10][i];
            lblMLerk[columnIindex[i]] = SuriyatDate.varBornPutdate_MLerkPass[e10][i];
            lblSecLerk[columnIindex[i]] = SuriyatDate.varBornPutdate_SecLerkPass[e10][i];
            lblNLerk[columnIindex[i]] = SuriyatDate.varBornPutdate_NLerkNow[e10][i];
            lblFixedStar[columnIindex[i]] = SuriyatDate.varBornPutdate_FixedStarLerkNow[e10][i];

            if (SuriyatDate.varBornPutdate_RaSTD[e10][i] === "-") {
                strSS = "";
            } else {
                strSS += " ";
            }

            lblSTD[columnIindex[i]] = (strSS + SuriyatDate.varBornPutdate_RaSTD[e10][i]).trim();

            strSS = "";
            if (SuriyatDate.varBornPutdate_NaRaSTD[e10][i] === "-") {
                strSS = "";
            } else {
                strSS += " ";
            }

            lblStdNa[columnIindex[i]] = (strSS + SuriyatDate.varBornPutdate_NaRaSTD[e10][i]).trim();
        }
    } else if (option == 3) {
        TitleTable = ["ลั. ลัคนา", "1. อาทิตย์", "2. จันทร์", "3. อังคาร", "4. พุธ", "5. พฤหัส", "6. ศุกร์", "7. เสาร์", "8. ราหู", "9. เกตุ", "0. มฤตยู", "น. เนปจูน", "พ. พูลโต"];
        columnIindex = [10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 11, 12];

        for (let i = 0; i <= iStarAll; i++) {
            // lblSpeedCharBorn[columnIindex[i]] = SuriyatDate.SpeedChar_Born[i];
            lblStarStayRNo[columnIindex[i]] = SuriyatDate.varTodayPutdate_StarStayR[e10][i];
            lblStarStayR[columnIindex[i]] = await Support.fcRaseeiToS(SuriyatDate.varTodayPutdate_StarStayR[e10][i]); // ' กรกฎ
            lblStarO[columnIindex[i]] = SuriyatDate.varTodayPutdate_StarO[e10][i]; // ' 6
            lblStarL[columnIindex[i]] = SuriyatDate.varTodayPutdate_StarL[e10][i]; // ' 52
            lblPop[columnIindex[i]] = SuriyatDate.varTodayPutdate_PopLuksStar[e10][i];
            lblPopT[columnIindex[i]] = SuriyatDate.varTodayPutdate_PopTanusedStar[e10][i]; // 'กัมมะ
            lblTri[columnIindex[i]] = SuriyatDate.varTodayPutdate_Trisss[e10][i];
            lblHarm[columnIindex[i]] = SuriyatDate.varTodayPutdate_TriyangHarms[e10][i].replace(/พิษ/g, "");
            lblNa[columnIindex[i]] = SuriyatDate.varTodayPutdate_Nasss[e10][i];
            lblLerk[columnIindex[i]] = SuriyatDate.varTodayPutdate_LerkNow[e10][i];
            lblMLerk[columnIindex[i]] = SuriyatDate.varTodayPutdate_MLerkPass[e10][i];
            lblSecLerk[columnIindex[i]] = SuriyatDate.varTodayPutdate_SecLerkPass[e10][i];
            lblNLerk[columnIindex[i]] = SuriyatDate.varTodayPutdate_NLerkNow[e10][i];
            lblFixedStar[columnIindex[i]] = SuriyatDate.varTodayPutdate_FixedStarLerkNow[e10][i];

            if (SuriyatDate.varTodayPutdate_RaSTD[e10][i] === "-") {
                strSS = "";
            } else {
                strSS += " ";
            }

            lblSTD[i] = (strSS + SuriyatDate.varTodayPutdate_RaSTD[e10][i]).trim();

            strSS = "";
            if (SuriyatDate.varTodayPutdate_NaRaSTD[e10][i] === "-") {
                strSS = "";
            } else {
                strSS += " ";
            }

            lblStdNa[i] = (strSS + SuriyatDate.varTodayPutdate_NaRaSTD[e10][i]).trim();

        }


    } else if (option == 4) {
        TitleTable = ["1. อาทิตย์", "2. จันทร์", "3. อังคาร", "4. พุธ", "5. พฤหัส", "6. ศุกร์", "7. เสาร์", "8. ราหู", "9. เกตุ", "0. มฤตยู", ];
        columnIindex = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8];
        // columnIindex2 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        e10 = 1;
        lblSTD = [];
        lblStdNa = [];

        for (let i = 0; i <= 9; i++) {
            // lblSpeedCharBorn[columnIindex[i]] = SuriyatDate.SpeedChar_Born[i];
            lblStarStayRNo[columnIindex[i]] = SuriyatDate.varTodayPutdate_StarStayR[e10][i];
            lblStarStayR[columnIindex[i]] = await Support.fcRaseeiToS(SuriyatDate.varTodayPutdate_StarStayR[e10][i]); // ' กรกฎ
            lblStarO[columnIindex[i]] = SuriyatDate.varTodayPutdate_StarO[e10][i]; // ' 6
            lblStarL[columnIindex[i]] = SuriyatDate.varTodayPutdate_StarL[e10][i]; // ' 52
            lblPop[columnIindex[i]] = SuriyatDate.varTodayPutdate_PopLuksStar[e10][i];
            lblPopT[columnIindex[i]] = SuriyatDate.varTodayPutdate_PopTanusedStar[e10][i]; // 'กัมมะ
            lblTri[columnIindex[i]] = SuriyatDate.varTodayPutdate_Trisss[e10][i];
            lblHarm[columnIindex[i]] = SuriyatDate.varTodayPutdate_TriyangHarms[e10][i]; // SuriyatDate.varTodayPutdate_TriyangHarms[e10][i].replace(/พิษ/g, "");
            lblNa[columnIindex[i]] = SuriyatDate.varTodayPutdate_Nasss[e10][i];
            lblLerk[columnIindex[i]] = SuriyatDate.varTodayPutdate_LerkNow[e10][i];
            lblMLerk[columnIindex[i]] = SuriyatDate.varTodayPutdate_MLerkPass[e10][i];
            lblSecLerk[columnIindex[i]] = SuriyatDate.varTodayPutdate_SecLerkPass[e10][i];
            lblNLerk[columnIindex[i]] = SuriyatDate.varTodayPutdate_NLerkNow[e10][i];
            lblFixedStar[columnIindex[i]] = SuriyatDate.varTodayPutdate_FixedStarLerkNow[e10][i];

            if (SuriyatDate.varTodayPutdate_RaSTD[e10][i] === "-") {
                strSS = "";
            } else {
                strSS += " ";
            }

            lblSTD[columnIindex[i]] = (strSS + SuriyatDate.varTodayPutdate_RaSTD[e10][i]).trim();

            strSS = "";
            if (SuriyatDate.varTodayPutdate_NaRaSTD[e10][i] === "-") {
                strSS = "";
            } else {
                strSS += " ";
            }

            lblStdNa[columnIindex[i]] = (strSS + SuriyatDate.varTodayPutdate_NaRaSTD[e10][i]).trim();
        }
    }

    return {
        TitleTable,
        lblStarStayRNo,
        lblSpeedCharBorn,
        lblStarStayR,
        lblStarO,
        lblStarL,
        lblPop,
        lblPopT,
        lblTri,
        lblHarm,
        lblNa,
        lblLerk,
        lblMLerk,
        lblSecLerk,
        lblNLerk,
        lblFixedStar,
        lblSTD,
        lblStdNa
    }

}

async function addDays(date, days) {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * @returns {number} findVt 
 */
async function CastHoroscope_FindTaleanSuk(jsa) {
    let JS = jsa - 1181;
    // 'หาเวลาเถลิกศก
    let findVt = JS * 0.25875 - Math.trunc(JS / 4 + 0.5) + Math.trunc(JS / 100 + 0.38) - Math.trunc(JS / 400 + 0.595) - 5.53375;
    // 'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
    return {
        findVt
    };
}

/** 
 * @returns {number}  Hmove, Mmove, MNKMove, dDMYforTodayMove,
 * 
 */
async function CastHoroscope_TimeStarMove(A0, A1, A2, A3, b, c, d, e, AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MN = null, JS, Hour, Min) {

    let Dnewyear1, Dnewyear2, ddmk1; // date
    let Ps, Vs, VS2, Sun, Star, mnk, Yearddmk2, Yearddmk1, FindTaleanSuk, findVt, VT, vtd, vtm, TodaydayDef, Mkdef, vtM1, T1, TQ, HM, DefM;
    let Deff1, Deff2, Deff3, Hmove, Mmove, MNKMove, dDMYforTodayMove, dDMYforToday, TemDefh, HHM, Z;
    let DefV = 0;

    // 'คำนวนหาวันที่ดาวย้ายราศี
    let TemJs = JS;
    let TemAM = Math.floor(AA / 1800);
    let SystemYearThai = false;
    let yearTH = dateInput.getFullYear() + 543;

    for (let K = 0; K <= 3600; K++) {
        DefMN = (DefTime * 60) / 1440;
        Deff3 = Def + DefMN + DefH + K;
        AA = 0, Ps = 0, VS2 = 0;
        Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
        Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);
        if (Star.AA / 1800 === Math.floor(Star.AA / 1800) || TemAM < Math.floor(Star.AA / 1800) || TemAM > Math.floor(Star.AA / 1800)) {
            MN = DefTime;
            mnk = K;

            dDMYforToday = new Date(dateInput.getTime()); // โคลนวัตถุ Date ด้วยการใช้ getTime()
            dDMYforToday = dDMYforToday.setDate(dDMYforToday.getDate() + K - 1);
            ddmk1 = new Date(dDMYforToday);

            Yearddmk1 = yearTH;
            Yearddmk2 = ddmk1.getFullYear() + 543; //' ปี ค.ศ. ที่ดาวย้าย

            FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1);
            findVt = Math.floor(FindTaleanSuk.findVt);

            if (SystemYearThai) {
                Dnewyear1 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
            } else {
                Dnewyear1 = new Date(Yearddmk2 - 543, 3, findVt + 1);
            }

            Mkdef = (ddmk1 - Dnewyear1) / (1000 * 60 * 60 * 24);
            Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

            if (Mkdef < 0) {

                JS = (Yearddmk2) - 1182;
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                vtM1 = vtm;

                FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk2 - 1);
                findVt = Math.floor(FindTaleanSuk.findVt);

                if (SystemYearThai) {
                    Dnewyear2 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                } else {
                    Dnewyear2 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                }

                Mkdef = (ddmk1 - Dnewyear2) / (1000 * 60 * 60 * 24);
                Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

            } else {
                JS = (Yearddmk2) - 1181;
                //'หาเวลาเถลิกศก
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                vtM1 = vtm;
            }

            //''เปรียบเทียบหาเวลาประสงค์
            DefM = (Math.floor(Hour) * 60 + Math.floor(Min)) / 1440; //'DefM = เวลา 24.00 น. ถึง วันประสงค์
            DefH = 1 - vtM1; //'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน

            // 'เวลาประสงค์
            DefTime = (Math.floor(Min) / 60) + Math.floor(Hour);
            T1 = (Math.floor(Hour) * 60 + Math.floor(Min));

            if (T1 < (6 * 60)) {
                TQ = 1440 + T1 - (6 * 60);
            } else {
                TQ = T1 - (6 * 60); //'สมมุติว่ารุ่งอรุ่ณเวลา 6.00 น.
            }

            Deff1 = Mkdef + DefM + DefH //'deF1 = สุรทินประสงค์
            Deff2 = DefV + DefH + 0.25;

            K = 3600;

            // console.log(Mkdef);  // 26 391  

            for (let JK = 0; JK <= 1440; JK++) {
                DefTime = TemTime + (JK / 60);
                DefMN = (DefTime * 60) / 1440;
                Deff3 = Mkdef + DefMN + DefH;
                AA = 0, Ps = 0, VS2 = 0;
                Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
                Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);
                if (Star.AA / 1800 == Math.floor(Star.AA / 1800) || TemAM < Math.floor(Star.AA / 1800)) {
                    MN = DefTime
                    TemAM = Math.floor(Star.AA / 1800);
                    JK = 1440;
                }
            }
        }
    }

    DefTime = TemTime;

    Hmove = Math.floor(MN); // 'ชัวโมงที่ดาวย้ายราศี
    Mmove = Math.floor((MN - Math.floor(MN)) * 60); // 'นาที่ที่ดาวย้ายราศี
    MNKMove = mnk - 1;
    dDMYforTodayMove = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate() + mnk);
    
    return {
        Hmove,
        Mmove,
        MNKMove,
        dDMYforTodayMove,
    }
}

/** 
 * @returns {number} Hmove, Mmove, MNKMove, dDMYforTodayMove,
 * 
 */
async function CastHoroscope_TimeStarMoveM(A0, A1, A2, A3, b, c, d, e, AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO = null, JS, Hour, Min) {
    // เด๋วมาทำต่อ
    let Dnewyear1; //date
    let ddmk1, Yearddmk1, dDMYforTodayMove, dDMYforToday, FindTaleanSuk, Mkdef, findVt, Deff3, mnk, VS2, Vs, VT, Sun, StarM;
    let vtd, vtm, vtM1, DefM, T1, TQ, Deff1, Deff2, JK, TemVS, TemPS, HM, HHM, TemDefh, S1, ZP, Z, MN;
    let TemJs = JS;
    let TemAM = Math.floor(AA / 1800);
    let SystemYearThai = false;
    let DefV = 0;

    let yearTH = dateInput.getFullYear() + 543;

    for (let K = 0; K <= 3600; K++) {
        DefMN = (DefTime * 60) / 1440;
        Deff3 = Def + DefMN + DefH + K;

        AA = 0, Ps = 0, VS2 = 0;
        Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
        AA = 0, Vs = Sun.Vs;
        StarM = await CastHoroscope_StarM(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);
        if (StarM.AA / 1800 === Math.floor(StarM.AA / 1800) || TemAM < Math.floor(StarM.AA / 1800) || TemAM > Math.floor(StarM.AA / 1800)) {
            MN = DefTime;
            mnk = K;

            dDMYforToday = new Date(dateInput.getTime()); // โคลนวัตถุ Date ด้วยการใช้ getTime()
            dDMYforToday = dDMYforToday.setDate(dDMYforToday.getDate() + K - 1);
            ddmk1 = new Date(dDMYforToday);

            // Yearddmk1 = yearTH;
            Yearddmk1 = ddmk1.getFullYear() + 543; //' ปี ค.ศ. ที่ดาวย้าย

            FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1);
            findVt = Math.floor(FindTaleanSuk.findVt);

            if (SystemYearThai) {
                Dnewyear1 = new Date(Yearddmk1, 3, findVt); // Month is 0-indexed in JS: 3 = April
            } else {
                Dnewyear1 = new Date(Yearddmk1 - 543, 3, findVt + 1);
            }

            Mkdef = (ddmk1 - Dnewyear1) / (1000 * 60 * 60 * 24);
            Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

            if (Mkdef < 0) {
                JS = (Yearddmk1) - 1182;
                //'หาเวลาเถลิกศก
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                // 'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                vtM1 = vtm;

                FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1 - 1);
                findVt = Math.floor(FindTaleanSuk.findVt);

                if (SystemYearThai) {
                    Dnewyear1 = new Date(Yearddmk1, 3, findVt); // Month is 0-indexed in JS: 3 = April
                } else {
                    Dnewyear1 = new Date(Yearddmk1 - 543, 3, findVt + 1);
                }

                Mkdef = (ddmk1 - Dnewyear1) / (1000 * 60 * 60 * 24);
                Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

            } else {
                JS = (Yearddmk1) - 1181;
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                vtM1 = vtm;
            }

            // ''เปรียบเทียบหาเวลาประสงค์
            // 'คำนวนหาสุรทินประสงค์กับวันเถลิกศก หากน้อยกว่าต้องคำนวนใหม่
            // 'DefM = เวลา 24.00 น. ถึง วันประสงค์
            DefM = (Math.floor(Hour) * 60 + Math.floor(Min)) / 1440; //'DefM = เวลา 24.00 น. ถึง วันประสงค์
            DefH = 1 - vtM1; //'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน

            // 'เวลาประสงค์
            DefTime = (Math.floor(Min) / 60) + Math.floor(Hour);
            T1 = (Math.floor(Hour) * 60 + Math.floor(Min));

            if (T1 < (6 * 60)) {
                TQ = 1440 + T1 - (6 * 60);
            } else {
                TQ = T1 - (6 * 60); //'สมมุติว่ารุ่งอรุ่ณเวลา 6.00 น.
            }

            Deff1 = Mkdef + DefM + DefH //'deF1 = สุรทินประสงค์
            Deff2 = DefV + DefH + 0.25;

            K = 3600;

            for (let JK = 0; JK <= 1440; JK++) {
                DefTime = TemTime + (JK / 60);
                DefMN = (DefTime * 60) / 1440;
                Deff3 = Mkdef + DefMN + DefH;

                AA = 0, Ps = 0, VS2 = 0;
                Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
                Vs = Sun.Vs;
                StarM = await CastHoroscope_StarM(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);

                if (StarM.AA / 1800 == Math.floor(StarM.AA / 1800) || TemAM < Math.floor(StarM.AA / 1800)) {
                    MN = DefTime
                    TemAM = Math.floor(StarM.AA / 1800);
                    JK = 1440;
                }
            }
        }
    }

    DefTime = TemTime;
    Hmove = Math.floor(MN); //'ชัวโมงที่ดาวย้ายราศี
    Mmove = Math.floor((MN - Math.floor(MN)) * 60); //'นาที่ที่ดาวย้ายราศ๊
    MNKMove = mnk - 1;
    dDMYforTodayMove = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate() + mnk);

    return {
        Hmove,
        Mmove,
        MNKMove,
        dDMYforTodayMove,
        DefMN
    }

}

/** 
 * @returns {number} Hmove, Mmove, MNKMove, dDMYforTodayMove, DefTime ,TemTime
 * 
 */
async function CastHoroscope_TimeStarMove72(A0, A1, A2, A3, b, c, d, e, AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO = null, JS, Hour, Min) {
    //'คำนวนหาวันที่ดาวย้ายราศี
    let Dnewyear1, Dnewyear2, ddmk1, temdate; //date
    let Deff3, VS2, S1, ZP, Vs, Z, mnk, Yearddmk1, Yearddmk2, FindTaleanSuk, findVt, Mkdef, VT, vtd, vtm, vtM1, DefM, T1, TQ, Deff1, JK, MN, Sun, Star;
    let TemVS, TemPS, HHM, HM, TemDefh;

    let TemJs = JS;
    let TemAM = Math.floor(AA / 1800);
    let SystemYearThai = false;
    let DefV = 0;
    let yearTH = dateInput.getFullYear() + 543;

    for (let K = 0; K <= 3600; K++) {
        // console.log(DefTime, DefH);
        DefMN = (DefTime * 60) / 1440;
        Deff3 = Def + DefMN + DefH + K;
        AA = 0, Ps = 0, VS2 = 0;
        Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
        AA = 0, Vs = Sun.Vs;
        Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);

        if (Star.AA / 1800 === Math.floor(Star.AA / 1800) || TemAM < Math.floor(Star.AA / 1800) || TemAM > Math.floor(Star.AA / 1800)) {

            MN = DefTime;
            mnk = K;

            //ddmk1 = dDMYforToday.AddDays(K - 1) ' ddmk1 = dDMYforToday + K - 1 'วันที่ ดาวย้ายราศี
            dDMYforToday = new Date(dateInput.getTime()); // โคลนวัตถุ Date ด้วยการใช้ getTime()
            dDMYforToday = dDMYforToday.setDate(dDMYforToday.getDate() + K - 1);
            ddmk1 = new Date(dDMYforToday);

            Yearddmk1 = yearTH;
            Yearddmk2 = ddmk1.getFullYear() + 543; //' ปี ค.ศ. ที่ดาวย้าย

            FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1);
            findVt = Math.floor(FindTaleanSuk.findVt);

            if (SystemYearThai) {
                Dnewyear1 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
            } else {
                Dnewyear1 = new Date(Yearddmk2 - 543, 3, findVt + 1);
            }

            Mkdef = (ddmk1 - Dnewyear1) / (1000 * 60 * 60 * 24);
            Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

            if (Mkdef < 0) {
                JS = (Yearddmk2) - 1182;
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                //'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                vtM1 = vtm;
                FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk2 - 1);
                findVt = Math.floor(FindTaleanSuk.findVt);

                if (SystemYearThai) {
                    Dnewyear2 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                } else {
                    Dnewyear2 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                }

                Mkdef = (ddmk1 - Dnewyear2) / (1000 * 60 * 60 * 24);
                Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

            } else {
                JS = (Yearddmk2) - 1181;
                //'หาเวลาเถลิกศก
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                //'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                vtM1 = vtm;
            }

            // ''เปรียบเทียบหาเวลาประสงค์
            DefM = (Math.floor(Hour) * 60 + Math.floor(Min)) / 1440; //'DefM = เวลา 24.00 น. ถึง วันประสงค์
            DefH = 1 - vtM1; //'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน

            // 'เวลาประสงค์
            DefTime = (Math.floor(Min) / 60) + Math.floor(Hour);
            T1 = (Math.floor(Hour) * 60 + Math.floor(Min));

            if (T1 < (6 * 60)) {
                TQ = 1440 + T1 - (6 * 60);
            } else {
                TQ = T1 - (6 * 60); //'สมมุติว่ารุ่งอรุ่ณเวลา 6.00 น.
            }

            Deff1 = Mkdef + DefM + DefH //'deF1 = สุรทินประสงค์
            //Deff2 = DefV + DefH + 0.25;
            // 388 1 30 6 10000 11944 247 63 1.1666666666666667 19801   12.166666666666666  31   0.5069444444444444 0.647500000000004  5/18/2025                12.166666666666667 10 388 
            // 388 1 30 6 10000 11944 247 63 1.1666666666666667 19801    12.483333333333333 31   0.5201388888888889 0.6475000000000399 2025-05-18T00:00:00.000Z 12.483333333333333 10 388
            // console.log(K, A0, A1, A2, A3, b, c, d, e, Star.AA, DefTime, Mkdef, DefMN, DefH, ddmk1, TemTime, TemAM, mnk);

            // no test case CastHoroscope_CheckMove
            //let CheckMove = await CastHoroscope_CheckMove(A0, A1, A2, A3, b, c, d, e, Star.AA, DefTime, Mkdef, DefMN, DefH, ddmk1, TemTime, TemAM, mnk, JS, dateInput, Hour, Min);

            TemTime = 6;
            K = 3600;

            for (JK = 1; JK <= 1440; JK++) {

                DefTime = TemTime + (JK / 60);

                if (DefTime > 24) {
                    Mkdef += 1;
                    DefTime -= 24;
                    JK = 1;
                    mnk += 1;
                }

                DefMN = (DefTime * 60) / 1440;
                Deff3 = Mkdef + DefMN + DefH;

                AA = 0, Ps = 0, VS2 = 0;
                Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
                AA = 0, Vs = Sun.Vs;
                Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);

                if (TemAM < Math.floor(Star.AA / 1800) || TemAM > Math.floor(Star.AA / 1800)) {
                    MN = DefTime; //' If mn > 24 Then mnk = mnk + 1: mn = mn - 24 + Temtime
                    TemAM = Math.floor(Star.AA / 1800)
                    JK = 1440;
                }
            }
        }
    }


    DefTime = TemTime;
    Hmove = Math.floor(MN); //'ชัวโมงที่ดาวย้ายราศี
    Mmove = Math.floor((MN - Math.floor(MN)) * 60); //'นาที่ที่ดาวย้ายราศ๊
    MNKMove = mnk - 1; // เป็นตัวแปรไม่ได้ใช้ ผมเอามา ทดสอบโปรแกรม
    dDMYforTodayMove = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate() + mnk);

    return {
        Hmove,
        Mmove,
        MNKMove,
        dDMYforTodayMove,
        DefTime,
        TemTime,
    }

}

/** 
 * @returns {number} Hmove, Mmove, MNKMove, dDMYforTodayMove,
 * 
 */
async function CastHoroscope_TimeStarMove82(AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MN = null, JS, Hour, Min) {

    let Dnewyear1, Dnewyear2, dDMYforTodayMove; // date
    let TemJs, TemAM, K, Deff3, VS2, S1, ZP, Vs, Z, mnk, Yearddmk1, Yearddmk2, dDMYforToday, findVt, FindTaleanSuk, Mkdef, VT, vtd, vtm, vtM1, DefM, T1, TQ, Deff1, Sun, Star81;
    let TemVS, TemPS, HHM, HM, TemDefh;
    let ddmk1, temdate;

    TemJs = JS;
    TemAM = Math.floor(AA / 1800);

    let SystemYearThai = false;
    let DefV = 0;
    let yearTH = dateInput.getFullYear() + 543;

    for (let K = 0; K <= 3600; K++) {
        DefMN = (DefTime * 60) / 1440;
        Deff3 = Def + DefMN + DefH + K;
        AA = 0, Ps = 0, VS2 = 0;
        Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS, S1, ZP);
        Star81 = await castHoroscope_Star81(Sun.AA, Sun.Ps, Sun.Vs);
        if (Star81.AA / 1800 === Math.floor(Star81.AA / 1800) || TemAM < Math.floor(Star81.AA / 1800) || TemAM > Math.floor(Star81.AA / 1800)) {

            MN = DefTime;
            mnk = K; //373

            dDMYforToday = new Date(dateInput.getTime()); // โคลนวัตถุ Date ด้วยการใช้ getTime()
            dDMYforToday = dDMYforToday.setDate(dDMYforToday.getDate() + K - 1);
            ddmk1 = new Date(dDMYforToday);

            Yearddmk1 = ddmk1.getFullYear() + 543; //' ปี ค.ศ. ที่ดาวย้าย
            Yearddmk2 = ddmk1.getFullYear() + 543; //' ปี ค.ศ. ที่ดาวย้าย

            FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1);
            findVt = Math.floor(FindTaleanSuk.findVt);

            if (SystemYearThai) {
                Dnewyear1 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
            } else {
                Dnewyear1 = new Date(Yearddmk2 - 543, 3, findVt + 1);
            }

            Mkdef = (ddmk1 - Dnewyear1) / (1000 * 60 * 60 * 24);
            Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

            if (Mkdef < 0) {
                JS = (Yearddmk2) - 1182;
                //'หาเวลาเถลิกศก
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                vtM1 = vtm;

                FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk2 - 1);
                findVt = Math.floor(FindTaleanSuk.findVt);


                if (SystemYearThai) {
                    Dnewyear2 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                } else {
                    Dnewyear2 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                }

                Mkdef = (ddmk1 - Dnewyear2) / (1000 * 60 * 60 * 24);
                Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net
            } else {
                JS = (Yearddmk2) - 1181;
                //'หาเวลาเถลิกศก
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                //'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                vtM1 = vtm;
            }

            // ''เปรียบเทียบหาเวลาประสงค์
            DefM = (Math.floor(Hour) * 60 + Math.floor(Min)) / 1440; //'DefM = เวลา 24.00 น. ถึง วันประสงค์
            DefH = 1 - vtM1; //'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน

            // 'เวลาประสงค์
            DefTime = (Math.floor(Min) / 60) + Math.floor(Hour);
            T1 = (Math.floor(Hour) * 60 + Math.floor(Min));

            if (T1 < (6 * 60)) {
                TQ = 1440 + T1 - (6 * 60);
            } else {
                TQ = T1 - (6 * 60); //'สมมุติว่ารุ่งอรุ่ณเวลา 6.00 น.
            }

            Deff1 = Mkdef + DefM + DefH;
            // 19800 15.533333333333333 17 0.25 0.6475000000000    2025-05-04 15.533333333333333 11 374    
            // 19800 15.533333333333333 17 0.25 0.6475000000000399 2025-05-04 15.533333333333333 11 374
            // console.log(Star81.AA, DefTime, Mkdef, DefMN, DefH, ddmk1, TemTime, TemAM, mnk, JS, dateInput, Hour, Min);
            // ยังไม่ได้ test case
            // const CheckMove8 = await CastHoroscope_CheckMove8(Star81.AA, DefTime, Mkdef, DefMN, DefH, ddmk1, TemTime, TemAM, mnk, JS, dateInput, Hour, Min)
            K = 3600;
            for (let JK = 0; JK <= 1440; JK++) {

                DefTime = TemTime + (JK / 60);

                if (DefTime > 24) {
                    Mkdef += 1;
                    DefTime -= 24;
                    JK = 0;
                    mnk += 1;
                }

                DefMN = (DefTime * 60) / 1440;
                Deff3 = Mkdef + DefMN + DefH;

                AA = 0, Ps = 0, VS2 = 0;
                Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS, S1, ZP);
                Star81 = await castHoroscope_Star81(Sun.AA, Sun.Ps, Sun.Vs);

                if (TemAM < Math.floor(Star81.AA / 1800) || TemAM > Math.floor(Star81.AA / 1800)) {
                    MN = DefTime;
                    TemAM = Math.floor(AA / 1800);
                    JK = 1440
                }
            }
        }
    }

    DefTime = TemTime;

    Hmove = Math.floor(MN); //'ชัวโมงที่ดาวย้ายราศี
    Mmove = Math.floor((MN - Math.floor(MN)) * 60); //'นาที่ที่ดาวย้ายราศ๊
    MNKMove = mnk - 1; // เป็นตัวแปรไม่ได้ใช้ ผมเอามา ทดสอบโปรแกรม
    dDMYforTodayMove = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate() + mnk);

    return {
        Hmove,
        Mmove,
        MNKMove,
        dDMYforTodayMove,
        DefTime,
    }

}

async function CastHoroscope_TimeStarMove9(HM, TemAM, dateInput) {
    let Rad = [
        [],
        []
    ];

    if (!Rad[9]) {
        Rad[9] = [];
    }

    let RaMoveToday = [];
    let Gx, z, K, ZZ, AA, Gy, dDMYforToday, dDMYforTodayMove;

    for (let Gi = 1; Gi <= 3600; Gi++) {
        z = 0;
        K = HM - 344 + Gi; //' HM=หรคุณประสงค์ - 344
        K = K - Math.floor(K / 679) * 679; //' เมื่อเอา HM หรคุณประสงค์ - 344  ได้เท่าใดเอา 679 หาร เศษเป็น พลพระเกตุ  K คือ พลพระเกตุ
        ZZ = Math.floor((K + z) * 21600 / 679);
        AA = 21600 - ZZ;

        if (AA < 0) {
            AA += 21600;
        }

        if (AA > 21600) {
            AA -= (Math.floor(AA / 21600) * 21600);
        }

        if (Math.floor(AA / 1800) < Math.floor(TemAM / 1800) || Math.floor(AA / 1800) > Math.floor(TemAM / 1800)) {
            Gx = Gi;
            Gi = 3600;
        }
    }

    // Rad(9, 8) = dDMYforToday.AddDays(Gx - 1);
    dDMYforToday = new Date(dateInput.getTime()); // โคลนวัตถุ Date ด้วยการใช้ getTime()
    dDMYforToday = dDMYforToday.setDate(dDMYforToday.getDate() + Gx - 1); //'เป็นค่า Date ดาวย้าย   เป็นการเก็บค่าใส่ไว้ในตัวแปร Rad(n, n) อะไรก็ได้ที่เราจะนำไปใช้
    // Rad[9][8] = new Date(dDMYforToday);
    Rad[9][8] = new Date(dDMYforToday);

    for (let Gm = 0; Gm <= 1800; Gm++) {
        z = Gm / 60 / 24;
        K = HM - 344 + Gx - 1;
        K = K - Math.floor(K / 679) * 679;
        ZZ = Math.floor((K + z) * 21600 / 679);
        AA = 21600 - ZZ;

        if (AA < 0) {
            AA += 21600;
        }

        if (AA > 21600) {
            AA -= (Math.floor(AA / 21600) * 21600);
        }

        if (Math.floor(AA / 1800) < Math.floor(TemAM / 1800) || Math.floor(AA / 1800) > Math.floor(TemAM / 1800)) {
            Gy = Gm;
            Gm = 1800;
            Rad[9][6] = Math.floor(Gy / 60); //'ชม ที่ดาวย้าย
            Rad[9][7] = Math.floor(((Gy / 60) - Math.floor(Gy / 60)) * 60); //'นาที ที่ดาวย้าย
        }
    }

    RaMoveToday[9] = Math.floor(AA / 1800); //'หาสมผุสค่า AA ดาวนี้ว่าอยู่ราศีใด  ค่าที่ได้คือราศี   1 ราศีมี 1800 ลิปดา  จะได้ค่าคือ "ดาว n จะย้ายไปราศีอะไร?"

    if (RaMoveToday[9] === 12) {
        RaMoveToday[9] = 0;
    }

    // 'วันที่ดาวย้าย   วดป ที่ดาวย้ายมา
    // dDMYforTodayMove = CType(Rad(9, 8), Date);
    dDMYforTodayMove = new Date(Rad[9][8]);
    Hmove = Math.floor(Rad[9][6]); //'ชั่วโมงที่ดาวย้ายราศี  ชม. ที่ดาวย้ายมา
    Mmove = Math.floor(Rad[9][7]); //'นาทีที่ดาวย้ายราศี นาที ที่ดาวย้ายมา

    return {
        Hmove,
        Mmove,
        dDMYforTodayMove,
    }
}

/** 
 * @returns {number} // no test case
 * 
 */
async function CastHoroscope_CheckMove(A0, A1, A2, A3, b, c, d, e, AA, DefTime, Mkdef, DefMN, DefH, ddmk1, TemTime, TemAM, mnk, JS, dateInput, Hour, Min) {
    // 'โค้ดนี้เพิ่มมาใน v.8.0  01/06/2550 เวลา 00.10 น.
    let Dnewyear1, Dnewyear2;
    let Deff3, VS2, S1, ZP, Vs, Z, AA1, AA2, AA3, K, MN, Yearddmk2, Yearddmk1, findVt, Birthday, Sun, Star, FindTaleanSuk;
    let VT, vtd, vtm, vtM1, DefM, T1, TQ;

    let SystemYearThai = false;
    let DefV = 0;
    let yearTH = dateInput.getFullYear() + 543;

    DefTime = TemTime;
    DefMN = (DefTime * 60) / 1440;

    // 'ครั้งที่ 1
    Deff3 = Mkdef + DefMN + DefH;
    AA = 0, Ps = 0, VS2 = 0;
    Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
    AA = 0, Vs = Sun.Vs;
    Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);
    AA1 = Star.AA;

    //'ครั้งที่ 2
    Deff3 = Mkdef + DefMN + DefH - 1;
    AA = 0, Ps = 0, VS2 = 0;
    Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
    AA = 0, Vs = Sun.Vs;
    Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);
    AA2 = Star.AA;

    // 'ครั้งที่ 3
    Deff3 = Mkdef + DefMN + DefH + 1;
    AA = 0, Ps = 0, VS2 = 0;
    Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
    AA = 0, Vs = Sun.Vs;
    Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);
    AA3 = Star.AA;

    if (TemAM < Math.floor(AA2 / 1800) || TemAM < Math.floor(AA1 / 1800)) {
        for (let K = 0; K >= -3600; K--) {
            DefMN = (DefTime * 60) / 1440;
            Deff3 = Mkdef + DefMN + DefH + K;
            AA = 0, Ps = 0, VS2 = 0;
            Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
            AA = 0, Vs = Sun.Vs;
            Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);
            if (Star.AA / 1800 === Math.floor(Star.AA / 1800) || TemAM === Math.floor(Star.AA / 1800)) {
                MN = DefTime;
                mnk = K;

                // 'เก็บค่า K ไว้ก่อนเปลี่ยนแปลง
                K = -3600;

                dDMYforToday = new Date(dateInput.getTime()); // โคลนวัตถุ Date ด้วยการใช้ getTime()
                dDMYforToday = dDMYforToday.setDate(dDMYforToday.getDate() + K - 1);
                ddmk1 = new Date(dDMYforToday);

                Yearddmk1 = yearTH;
                Yearddmk2 = ddmk1.getFullYear() + 543; //' ปี ค.ศ. ที่ดาวย้าย

                FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1);
                findVt = Math.floor(FindTaleanSuk.findVt);

                if (SystemYearThai) {
                    Dnewyear1 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                } else {
                    Dnewyear1 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                }

                Mkdef = (ddmk1 - Dnewyear1) / (1000 * 60 * 60 * 24);
                Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net
                //mnk = DateDiff("d", dDMYforTodayFixed, dDMYforToday) + 1 ; ไม่ได้ใช้

                if (Mkdef < 0) {
                    JS = (Yearddmk2) - 1182;
                    VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                    //'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
                    vtd = Math.floor(VT);
                    vtm = VT - vtd;
                    vtM1 = vtm;

                    FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk2 - 1);
                    findVt = Math.floor(FindTaleanSuk.findVt);

                    if (SystemYearThai) {
                        Dnewyear2 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                    } else {
                        Dnewyear2 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                    }

                    Mkdef = (ddmk1 - Dnewyear2) / (1000 * 60 * 60 * 24);
                    Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net
                } else {
                    JS = (Yearddmk2) - 1181;
                    //' หาเวลาเถลิกศก
                    VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                    vtd = Math.floor(VT);
                    vtm = VT - vtd;
                    vtM1 = vtm;
                }

                // ''เปรียบเทียบหาเวลาประสงค์
                DefM = (Math.floor(Hour) * 60 + Math.floor(Min)) / 1440; //'DefM = เวลา 24.00 น. ถึง วันประสงค์
                DefH = 1 - vtM1; //'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน

                // 'เวลาประสงค์
                DefTime = (Math.floor(Min) / 60) + Math.floor(Hour);
                T1 = (Math.floor(Hour) * 60 + Math.floor(Min));

                if (T1 < (6 * 60)) {
                    TQ = 1440 + T1 - (6 * 60);
                } else {
                    TQ = T1 - (6 * 60); //'สมมุติว่ารุ่งอรุ่ณเวลา 6.00 น.
                }
            }
        }
    }
}

async function CastHoroscope_CheckMove8(AA, DefTime, Mkdef, DefMN, DefH, ddmk1, TemTime, TemAM, mnk, JS, dateInput, Hour, Min) {

    let Dnewyear1, Dnewyear2;
    let TemJs, K, Deff3, VS2, Ps, S1, ZP, Vs, Z, Yearddmk1, Yearddmk2, findVt, VT, vtd, vtm, vtM1, DefM, T1, TQ, Deff1, JK, Sun;
    let TemVS, TemPS, HHM, HM, TemDefh, AA1, AA2, AA3, MN, Birthday;

    let SystemYearThai = false;
    let yearTH = dateInput.getFullYear() + 543;

    // 'ครั้งที่ 1
    Deff3 = Mkdef + DefMN + DefH;
    AA = 0, Ps = 0, VS2 = 0;
    Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
    AA = 0, Vs = Sun.Vs;
    Star81 = await castHoroscope_Star81(Sun.AA, Sun.Ps, Sun.Vs);
    AA1 = Star81.AA;

    //'ครั้งที่ 2
    Deff3 = Mkdef + DefMN + DefH - 1;
    AA = 0, Ps = 0, VS2 = 0;
    Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
    AA = 0, Vs = Sun.Vs;
    Star81 = await castHoroscope_Star81(Sun.AA, Sun.Ps, Sun.Vs);
    AA2 = Star81.AA;

    //'ครั้งที่ 3
    Deff3 = Mkdef + DefMN + DefH + 1;
    AA = 0, Ps = 0, VS2 = 0;
    Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
    AA = 0, Vs = Sun.Vs;
    Star81 = await castHoroscope_Star81(Sun.AA, Sun.Ps, Sun.Vs);
    AA3 = Star81.AA;

    if (TemAM > Math.floor(AA2 / 1800) || TemAM > Math.floor(AA3 / 1800) || TemAM > Math.floor(AA1 / 1800)) {
        for (let K = 0; K >= -3600; K--) {
            DefMN = (DefTime * 60) / 1440;
            Deff3 = Mkdef + DefMN + DefH + K;
            AA = 0, Ps = 0, VS2 = 0;
            Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
            AA = 0, Vs = Sun.Vs;
            Star81 = await castHoroscope_Star81(Sun.AA, Sun.Ps, Sun.Vs);
            if (Star81.AA / 1800 === Int(Star81.AA / 1800) || TemAM === Int(Star81.AA / 1800)) {
                MN = DefTime;
                mnk = K;
                // 'เก็บค่า K ไว้ก่อนเปลี่ยนแปลง
                K = -3600;

                dDMYforToday = new Date(dateInput.getTime()); // โคลนวัตถุ Date ด้วยการใช้ getTime()
                dDMYforToday = dDMYforToday.setDate(dDMYforToday.getDate() + K - 1);
                ddmk1 = new Date(dDMYforToday);

                Yearddmk1 = yearTH;
                Yearddmk2 = ddmk1.getFullYear() + 543; //' ปี ค.ศ. ที่ดาวย้าย

                FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1);
                findVt = Math.floor(FindTaleanSuk.findVt);

                if (SystemYearThai) {
                    Dnewyear1 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                } else {
                    Dnewyear1 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                }

                Mkdef = (ddmk1 - Dnewyear1) / (1000 * 60 * 60 * 24);
                Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

                if (Mkdef < 0) {
                    JS = (Yearddmk2) - 1182;
                    VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                    vtd = Math.floor(VT);
                    vtm = VT - vtd;
                    vtM1 = vtm;

                    FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk2 - 1);
                    findVt = Math.floor(FindTaleanSuk.findVt);

                    if (SystemYearThai) {
                        Dnewyear2 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                    } else {
                        Dnewyear2 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                    }

                    Mkdef = (ddmk1 - Dnewyear2) / (1000 * 60 * 60 * 24);
                    Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

                } else {
                    JS = (Yearddmk2) - 1181;
                    //' หาเวลาเถลิกศก
                    VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                    //' เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
                    vtd = Math.floor(VT);
                    vtm = VT - vtd;
                    vtM1 = vtm;
                }

                // ''เปรียบเทียบหาเวลาประสงค์
                DefM = (Math.floor(Hour) * 60 + Math.floor(Min)) / 1440; //'DefM = เวลา 24.00 น. ถึง วันประสงค์
                DefH = 1 - vtM1; //'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน

                // 'เวลาประสงค์
                DefTime = (Math.floor(Min) / 60) + Math.floor(Hour);
                T1 = (Math.floor(Hour) * 60 + Math.floor(Min));

                if (T1 < (6 * 60)) {
                    TQ = 1440 + T1 - (6 * 60);
                } else {
                    TQ = T1 - (6 * 60); //'สมมุติว่ารุ่งอรุ่ณเวลา 6.00 น.
                }
            }
        }
    }

    if (TemAM = Math.floor(AA3 / 1800)) {
        for (let K = 0; K <= 3600; K++) {
            DefMN = (DefTime * 60) / 1440;
            Deff3 = Mkdef + DefMN + DefH + K;
            AA = 0, Ps = 0, VS2 = 0;
            Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
            AA = 0, Vs = Sun.Vs;
            Star81 = await castHoroscope_Star81(Sun.AA, Sun.Ps, Sun.Vs);
            if (Star81.AA / 1800 === Math.floor(Star81.AA / 1800) || TemAM === Math.floor(Star81.AA / 1800)) {
                MN = DefTime;
                mnk = K;
                K = 3600;

                dDMYforToday = new Date(dateInput.getTime()); // โคลนวัตถุ Date ด้วยการใช้ getTime()
                dDMYforToday = dDMYforToday.setDate(dDMYforToday.getDate() + K - 1);
                ddmk1 = new Date(dDMYforToday);

                Yearddmk1 = yearTH;
                Yearddmk2 = ddmk1.getFullYear() + 543; //' ปี ค.ศ. ที่ดาวย้าย

                FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1);
                findVt = Math.floor(FindTaleanSuk.findVt);

                if (SystemYearThai) {
                    Dnewyear1 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                } else {
                    Dnewyear1 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                }

                Mkdef = (ddmk1 - Dnewyear1) / (1000 * 60 * 60 * 24);
                Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

                if (Mkdef < 0) {
                    JS = (Yearddmk2) - 1182;
                    VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                    vtd = Math.floor(VT);
                    vtm = VT - vtd;
                    vtM1 = vtm;

                    FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk2 - 1);
                    findVt = Math.floor(FindTaleanSuk.findVt);

                    if (SystemYearThai) {
                        Dnewyear2 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                    } else {
                        Dnewyear2 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                    }

                    Mkdef = (ddmk1 - Dnewyear2) / (1000 * 60 * 60 * 24);
                    Mkdef = Math.floor(Mkdef); // - 1 ทำให้ค่าไม่เท่ากับ .net

                } else {
                    JS = (Yearddmk2) - 1181;
                    //' หาเวลาเถลิกศก
                    VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                    //' เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
                    vtd = Math.floor(VT);
                    vtm = VT - vtd;
                    vtM1 = vtm;
                }


                // ''เปรียบเทียบหาเวลาประสงค์
                DefM = (Math.floor(Hour) * 60 + Math.floor(Min)) / 1440; //'DefM = เวลา 24.00 น. ถึง วันประสงค์
                DefH = 1 - vtM1; //'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน

                // 'เวลาประสงค์
                DefTime = (Math.floor(Min) / 60) + Math.floor(Hour);
                T1 = (Math.floor(Hour) * 60 + Math.floor(Min));

                if (T1 < (6 * 60)) {
                    TQ = 1440 + T1 - (6 * 60);
                } else {
                    TQ = T1 - (6 * 60); //'สมมุติว่ารุ่งอรุ่ณเวลา 6.00 น.
                }
            }
        }
    }
}

async function fcGetDayInMonth(month, year) {
    // Convert the year from Thai Buddhist Era to Gregorian by subtracting 543
    let gregorianYear = year - 543;

    // February leap year check for Gregorian calendar
    let isLeapYear = (gregorianYear % 4 === 0 && gregorianYear % 100 !== 0) || gregorianYear % 400 === 0;
    let daysInFebruary = isLeapYear ? 29 : 28;

    // Calculate days in given month
    switch (month) {
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
        case 12:
            return 31;
        case 4:
        case 6:
        case 9:
        case 11:
            return 30;
        case 2:
            return daysInFebruary;
        default:
            throw new Error("Invalid month");
    }
}

async function fcGetTanuPayakon(value) {
    switch (value) {
        case 1:
            return "อาทิตย์เป็นตนุเศษ อุปนิสัยเจ้าชะตา ใจร้อน กระตือรือร้น มีความทะเยอทะยานแรงกล้า จิตใจมุ่งมั่นจริงจังต่อชีวิต เชื่อมั่นในตัวเองสูง กล้าแสดงออก กล้าทำกล้ารับผิดชอบ จิตใจตื่นตัวอยู่ตลอด เปิดเผย ตรงไปตรงมา ไม่มีเล่ห์เหลี่ยม มีความคิดริเริ่มดี มักต่อสู้ดิ้นรน และสร้างสรรสิ่งใหม่ๆ";
        case 2:
            return "จันทร์เป็นตนุเศษ อุปนิสัยเจ้าชะตา เป็นคนเอาใจใส่ในชีวิตครอบครัว รักความสะอาด เป็นคนละเอียดปราณีต ชอบความเป็นระเบียบเรียบร้อย จิตใจดีมีเมตตา มีความสุภาพอ่อนน้อมถ่อมตน อ่อนไหว ละเอียดอ่อน ตื่นเต้น  เป็นผู้ตามมากว่าเป็นผู้นำ เป็นคนสุภาพเรียบร้อย มีสง่าราศี ปัญญาดี มีการศึกษาดี หน้าตาดี มีเสน่ห์";
        case 3:
            return "อังคารเป็นตนุเศษ อุปนิสัยเจ้าชะตา แกล้วกล้า ห้าวหาญ ไม่ยอมแพ้ มีความขยันหมั่นเพียร พบปัญหาและอุปสรรคจะหันหน้าเข้าต่อสู้ เข้มแข็ง มานะบากบั่นอดทนเป็นเลิศ ทะเยอทะยานสูง หวังสิ่งใดต้องทำให้ได้ เป็นคนเปิดเผย ใจคอนักเลง กล้าได้กล้าเสีย เวลาช่วยเหลือใครมักไม่มีขอบเขตจำกัด รักเพื่อนเสียสละเพื่อเพื่อนได้เสมอ มีความจงรักภักดีสูง กตัญญูรู้คุณคน";
        case 4:
            return "พุธเป็นตนุเศษ อุปนิสัยเจ้าชะตา ปัญญาดี สมองไว เข้าใจอะไรง่าย เป็นคนช่างสังเกต ชอบการเขียนอ่านสนทนา มีความฉลาดและมีศิลปในการพูด มีความประณีประนอม คิดเร็ว ตัดสินใจดี เข้าใจสิ่งต่างๆง่าย หยั่งรู้ในเหตุในผลได้เร็ว มีความกระตือรือล้น ตื่นตัวอยู่เสมอ ";
        case 5:
            return "พฤหัสเป็นตนุเศษ อุปนิสัยเจ้าชะตา ชอบศึกษาหาความรู้ รอบคอบ มีทรัพย์สินดี สุภาพอ่อนโยน ใจบุญ มีความยึดมั่นในคุณธรรมและความดีงาม เคารพในจารีตประเพณี มีศรัทธาในศาสนา พอใจในความสุขสงบ มีความเมตตากรุณาสูง ใจบุญ เห็นอกเห็นใจและโอบอ้อมอารีย์ มองโลกในแง่ดี อภัยให้กับผู้อื่นเสมอ จิตใจมั่งคง ใตร่ตรองยับยั้งชั่งใจดี ชอบการศึกษา ค้นคว้า สุภาพอ่อนน้อม";
        case 6:
            return "ศุกร์เป็นตนุเศษ อุปนิสัยเจ้าชะตา เป็นคนมีอารมณ์แจ่มใส เปิกบาน ร่าเริงสนุกสนาน มีรสนิยมปราณีต เข้าใจในศิลปะ มีปฏิภาณไหวพริบ เป็นคนไม่ตระหนี่ กล้าได้กล้าเสีย มีนิสัยชอบสะสม ของที่ให้ความสำคัญทางจิตใจ มีความเมตตาสงสารมากขึ้น รักความสะอาดหมดจด และ ระเบียบเรียบร้อยมากกว่าความสวยงามฉูดฉาด";
        case 7:
            return "เสาร์เป็นตนุเศษ อุปนิสัยเจ้าชะตา มีความยึดมั่นเด็ดเดี่ยว อดทนต่อการรอคอย มีความคิดถี่ถ้วน รอบคอบ มีความอุตสาหะ มานะพยายาม รักสงบ ใจเย็น ไม่หวั่นไหวง่าย ชอบแยกตัวสันโดษ เคร่งขรึม  จดจำแม่นและสึกซึ้ง เก็บความลับได้ดีเยี่ยม ถ่อมตัว พอใจในสิ่งที่ตัวเองมี  ไม่ชอบความหรูหราความอึกทึกครึกโครม นิยมของเก่า มีความคิดเพื่อตนเองก่อนสิ่งอื่น";
    }
}

function getPercentEventText(iPer) {
    let sStringText = "";

    if (iPer < 0) {
        sStringText = "ไม่มีโอกาสเกิดขึ้นเลย";
    } else if (iPer === 0) {
        sStringText = "ไม่มีโอกาสเกิดขึ้นเลย";
    } else if (iPer <= 10) {
        sStringText = "ไม่มีโอกาสเกิดขึ้นเลย (เพราะช่วงองศากระทบห่างกันมาก)";
    } else if (iPer <= 19) {
        sStringText = "มีโอกาสที่จะเกิดขึ้นน้อยมาก แทบจะไม่เกิดขึ้นเลย (เพราะช่วงองศากระทบห่างเกินไป)";
    } else if (iPer <= 29) {
        sStringText = "มีโอกาสที่จะเกิดขึ้นน้อยมากจนถึงไม่เกิดขึ้นเลย (เพราะช่วงองศากระทบห่างเกินไป)";
    } else if (iPer <= 39) {
        sStringText = "มีโอกาสที่จะเกิดขึ้นน้อยมาก";
    } else if (iPer <= 49) {
        sStringText = "มีโอกาสเกิดขึ้นน้อย";
    } else if (iPer <= 59) {
        sStringText = "มีโอกาสเกิดขึ้นไม่มากนักอาจเกิดขึ้นหรือไม่เกิดขึ้นก็ได้ (คือห้าสิบห้าสิบ)";
    } else if (iPer <= 69) {
        sStringText = "มีโอกาสเกิดขึ้นน้อยถึงระดับปานกลาง";
    } else if (iPer <= 79) {
        sStringText = "มีโอกาสเกิดขึ้นในระดับปานกลาง";
    } else if (iPer <= 90) {
        sStringText = "มีโอกาสเกิดขึ้นในระดับจากปานกลางไปถึงค่อนข้างมาก";
    } else if (iPer <= 97) {
        sStringText = "มีโอกาสเกิดขึ้นค่อนข้างมาก";
    } else if (iPer <= 99) {
        sStringText = "มีโอกาสเกิดขึ้นค่อนข้างมากถึงแน่นอน";
    } else if (iPer === 100) {
        sStringText = "มีโอกาสเกิดขึ้นแน่นอน 100%";
    } else {
        sStringText = "มีโอกาสเกิดขึ้นแน่นอนมากกว่า 100%";
    }

    return `เหตุการณ์นี้ ${sStringText}`;
}

module.exports = {
    calculateLunarDay,
    fcGetLukTimeLocalThailandThisProvValue,
    SetUpDownMThaiMoon,
    DownThaiMoonInfo,
    adjustBirthTime,
    CastHoroscope_SumSuriyatMain_Born,
    CastHoroscope_AllStar_Suriyata_SUM_Main,
    CastHoroscope_SumSuriyatMain_Today,
    CastHoroscope_SumSompodStarCalendarAstronomy_Born_Today,
    fcGetTanused_CastHoroscope,
    GetValueControl_SompodStar,
    CastHoroscope_SompodStarOnLabel_Born_Today,
    PakakornSompod,
    PayakornBorn,
    PayakornToday,
}