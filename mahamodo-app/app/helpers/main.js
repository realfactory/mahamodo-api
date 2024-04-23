const connection = require('../config/db.mysql.js');
const calendar = require('./calendarAstronomy.js');
const db = require('./db.js');
const formatDate = require('./formatDate.js');
const parameter = require('./parameter.js');
const helpers = require('./helpers.js');

async function cutTimeLocal(date, hour, minute, cutTimeLocalYN, sProv) {
    let adjustedHour, adjustedMinute, timeLocalResponse, timeLocal, minuteLocal;
    let province = sProv ? sProv : 'กรุงเทพมหานคร';

    // If cutTimeLocal is not needed, return the original hour and minute.
    if (!cutTimeLocalYN) {
        return {
            date,
            hour,
            minute
        }
    }

    // Retrieve the local time difference for the specified province.
    timeLocal = await fcGetLukTimeLocalThailandThisProvValue(sProv);
    minuteLocal = parseInt(timeLocal[0].ProvTime.substring(4, 6), 10);

    // Calculate the total minutes by converting the hours to minutes and adding the minutes, then adjust by the local offset.
    if (cutTimeLocalYN) {
        timeLocalResponse = await fcGetLukTimeLocalThailandThisProvValue(province);
        minuteLocal = parseInt(timeLocalResponse[0].ProvTime.substring(4, 6));
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

    } else {
        adjustedHour = parseInt(birthHour, 10);
        adjustedMinute = parseInt(birthMinute, 10);
    }

    return {
        date,
        adjustedHour,
        adjustedMinute
    }

}

async function calculateLunarDay(date, hour, minute, cutTimeLocalYN, sProv) {

    let intTimeAllMBorn, minuteLocal, totalMLocalMAndBornM, timeLocal;
    let day = date.getDate();
    let month = date.getMonth() + 1; // JavaScript months are 0-indexed.
    let year = date.getFullYear();
    let yearTh = date.getFullYear() + 543;

    // 'พิเศษ 'ตั้งแต่ พ.ศ.2483 ลงไป ถ้าเป็นเดือน 1,2,3 (ม.ค., ก.พ., มี.ค.) ให้ + พ.ศ. เพิ่ม 1
    // if (yearTh <= 2483 && (month === 1 || month === 2 || month === 3)) {
    //     year += 1;
    // }

    let dateFormat = new Date(year, month - 1, day); // Setup initial date format.

    if (cutTimeLocalYN) {

        timeLocal = await fcGetLukTimeLocalThailandThisProvValue(sProv);
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

                    MoonInfo = await DownThaiMoonInfo(DownUps, Nighti, MThai, YThai);

                    resolve({
                        DownUps: DownUps,
                        Nighti: Nighti,
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
        varsBornStringUDLuk = ` ตรงกับ ${DownUps} ${Night} ค่ำ เดือน ${MThai} ปี${formatDate.fcYearOldiToS(YThai)}`;
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
    const dateUse = `${zeroPad(day, 2)}/${zeroPad(month, 2)}/${year} ${zeroPad(adjustedHour, 2)}:${zeroPad(adjustedMinute, 2)}`;

    return {
        formattedDate,
        dateUse
    };

}

// 'รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
async function CastHoroscope_SumSuriyatMain_Born(dataInput, Hour, min, CutTimeLocalYN, sProv) {

    const LunarDay = await calculateLunarDay(dataInput, Hour, min, CutTimeLocalYN, sProv);
    const lblDayBirth = formatDate.fcDayi17ToS(LunarDay.daySuni);
    const getMoonBirth = await SetUpDownMThaiMoon(dataInput, LunarDay.dayMooni, LunarDay.daySuni);
    const birthTimeInfo = await adjustBirthTime(dataInput, Hour, min, CutTimeLocalYN, sProv);
    const YearAgeInfo = await helpers.formatTimeDifference(dataInput, Hour, min);

    let YourBirthday = birthTimeInfo.formattedDate;
    let YourBirthdayDateUse = birthTimeInfo.dateUse;
    let birthDateMoonInfo = getMoonBirth.MoonInfo;
    let SurisBirth = lblDayBirth.replace("(กลางวัน)", "").replace("(กลางคืน)", "");
    let lblDaySBirthSuriyaKati = "สุริยคติ: " + SurisBirth;
    let iStarAll = 12; // 'กำหนดจำนวนสมาชิกอาเรย์

    const StarStayData = require('../json/StarStay.json');
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

    // 'เริ่มคำนวณตามสูตรคัมภีร์สุริยยาตร์ หาสมผุสของดาวทุกดวง
    AllStar = await CastHoroscope_AllStar_Suriyata_SUM_Main(dataInput, Hour, min, CutTimeLocalYN, sProv);
    Rad = AllStar.Rad;

    // 'ให้ /1800 เป็นราศี. เศษทศนิยม *1800  แล้ว / 60 เป็นองศา. ทศนิยมที่เหลือ * 60 เป็นลิปดา.
    let SumSompod = await CastHoroscope_SumSompodStarCalendarAstronomy_Born_Today(dataInput, Hour, min, CutTimeLocalYN, sProv);
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

    // 'ลัคนา
    Rad[10][0] = Rad[1][1];
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

            // 'รับค่า  ดาวนี้ (ii) อยู่ราศี....... เช่น ดาว 1 อยู่ราศี 7   varBornPutdate_StarStayR(e10, 1)=7
            varBornPutdate_StarStayR[e10][ii] = Math.floor(A1 / 1800);

            let B1 = A1 - (varBornPutdate_StarStayR[e10][ii] * 1800);
            if (B1 === 0) B1 = 1;

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
            fcTimeNoiToS = await formatDate.fcTimeNoiToS(Timei, NoTimei1To9)
            varBornPutdate_LerkNow[e10][ii] = Timei;
            varBornPutdate_NLerkNow[e10][ii] = await formatDate.fcTime27To9(Timei) + ". " + fcTimeNoiToS.name;
            varBornPutdate_No1To9LerkNow[e10][ii] = await formatDate.fcTime27To9(Timei);
            varBornPutdate_FixedStarLerkNow[e10][ii] = await formatDate.fcTimeFixedStar(Timei);
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
                varBornPutdate_TriyangHarms[0][iStarii] = await formatDate.fciToSHarm(iiPis);
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
        RaseeAsPopLuks[iCountR] = await formatDate.fcPopiToS(iPop);
        varBornPutdate_PopLuksRasee[0][iCountR] = await formatDate.fcPopiToS(iPop);
        iCountR++;
        if (iCountR > 11) iCountR = 0;
    }

    for (let Starii = 0; Starii <= iStarAll; Starii++) {
        varBornPutdate_PopLuksStar[0][Starii] = varBornPutdate_PopLuksRasee[0][varBornPutdate_StarStayR[0][Starii]];
    }

    iCountR = varBornPutdate_StarStayR[0][10]; // Reset iCountR to the position of Rasee
    // ' ใส่ค่าภพ ให้กับดวงกำเนิด เช่น  ดาว 0 = "สหัชชะ"  ดวงอีแปะ
    for (let iPop = 0; iPop <= 11; iPop++) {
        RaseeAsPopLuks[iCountR] = await formatDate.fcPopiToS(iPop);
        varBornPutdate_PopLuksRasee[1][iCountR] = await formatDate.fcPopiToS(iPop);
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
        if (await formatDate.fcRaseeToStarKased(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", เกษตร";
        }
        if (await formatDate.fcRaseeToStarPra(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", ประ";
        }
        if (await formatDate.fcRaseeToStarMahauj(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", มหาอุจจ์";
        }
        if (await formatDate.fcRaseeToStarNij(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", นิจ";
        }
        if (await formatDate.fcRaseeToStarMahajak(varBornPutdate_StarStayR[0][j]) == j) {
            S += ", มหาจักร";
        }
        if (await formatDate.fcRaseeToStarRachachock(varBornPutdate_StarStayR[0][j]) == j) {
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
        if (await formatDate.fcRaseeToStarKased(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", เกษตร";
        }
        if (await formatDate.fcRaseeToStarPra(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", ประ";
        }
        if (await formatDate.fcRaseeToStarMahauj(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", มหาอุจจ์";
        }
        if (await formatDate.fcRaseeToStarNij(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", นิจ";
        }
        if (await formatDate.fcRaseeToStarMahajak(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
            S += ", มหาจักร";
        }
        if (await formatDate.fcRaseeToStarRachachock(varBornPutdate_NavangStarAsRasee[0][j]) == j) {
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
            if (await formatDate.fcRaseeToStarKased(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", เกษตร";
            }
            if (await formatDate.fcRaseeToStarPra(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", ประ";
            }
            if (await formatDate.fcRaseeToStarMahauj(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", มหาอุจจ์";
            }
            if (await formatDate.fcRaseeToStarNij(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", นิจ";
            }
            if (await formatDate.fcRaseeToStarMahajak(varBornPutdate_StarStayR[1][j]) == j) {
                S += ", มหาจักร";
            }
            if (await formatDate.fcRaseeToStarRachachock(varBornPutdate_StarStayR[1][j]) == j) {
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
            if (await formatDate.fcRaseeToStarKased(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", เกษตร";
            }
            if (await formatDate.fcRaseeToStarPra(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", ประ";
            }
            if (await formatDate.fcRaseeToStarMahauj(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", มหาอุจจ์";
            }
            if (await formatDate.fcRaseeToStarNij(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", นิจ";
            }
            if (await formatDate.fcRaseeToStarMahajak(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
                S += ", มหาจักร";
            }
            if (await formatDate.fcRaseeToStarRachachock(varBornPutdate_NavangStarAsRasee[1][j]) == j) {
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
    let iStarAsHomeLuk = await formatDate.fcRaseeToStarKased(iLukStayRasee); // '2. ดาวเจ้าเรือนของลัคนา เช่น 5
    let iStarKasedOfLukAsRasee = iStarRa[0][iStarAsHomeLuk]; // '3. ดาวเกษตรของลัคนา อยู่ราศี... เช่น 0
    let iStarAsHouse = await formatDate.fcRaseeToStarKased(iStarKasedOfLukAsRasee); // 'รับค่าดาวเจ้าบ้าน
    let iStarAsHouseOfLukAsRasee = iStarRa[0][iStarAsHouse]; // '4. ดาวเจ้าเรือนลัคนาอยู่ในตำแหน่งราศีที่..... คือค่าจาก iStarRa10(0, iStarAsHouse) นั่นเอง

    let iStarAsTanuSED = await fcGetTanused_CastHoroscope(iLukStayRasee, iStarAsHomeLuk, iStarKasedOfLukAsRasee, iStarAsHouseOfLukAsRasee)
    let varBornPutdate_StarAsTanuSED = [];
    varBornPutdate_StarAsTanuSED[0] = iStarAsTanuSED;

    //  'ใส่ข้อความว่า "ตนุเศษ" ใน STD (คุณภาพดาว)
    S = varBornPutdate_RaSTD[0][iStarAsTanuSED];
    if (S === "-" || S === "") {
        if (S === "-") {
            S = S.replace("-", ""); // Replace '-' with an empty string.
        }
        varBornPutdate_RaSTD[0][iStarAsTanuSED] = "ตนุเศษ";
    } else {
        varBornPutdate_RaSTD[0][iStarAsTanuSED] = "ตนุเศษ, " + S;
    }

    // 'ใส่ค่าภพตนุเศษ  ให้กับดวงราศีจักร (ดวงอีแปะ) กำเนิด
    iCountR = varBornPutdate_StarStayR[0][iStarAsTanuSED];
    for (let iPop = 0; iPop <= 11; iPop++) {
        // 'ใส่ค่าภพตนุเศษ ให้กับดวงราศีจักร (ดวงอีแปะ) 
        varBornPutdate_PopTanusedRasee[0][iCountR] = await formatDate.fcPopiToS(iPop); // Assuming fcPopiToS(iPop) is defined and returns a string.
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
    let iStarAsHomeLuk10 = await formatDate.fcRaseeToStarKased(iLukStayRasee10); // '2. ดาวเจ้าเรือนของลัคนา เช่น 5
    let iStarKasedOfLukAsRasee10 = iStarRa10[1][iStarAsHomeLuk10]; // '3. ดาวเกษตรของลัคนา อยู่ราศี... เช่น 0
    let iStarAsHouse10 = await formatDate.fcRaseeToStarKased(iStarKasedOfLukAsRasee10); // 'รับค่าดาวเจ้าบ้าน
    let iStarAsHouse10OfLukAsRasee = iStarRa10[1][iStarAsHouse10]; // '4. ดาวเจ้าเรือนลัคนาอยู่ในตำแหน่งราศีที่..... คือค่าจาก iStarRa10(0, iStarAsHouse) นั่นเอง

    iStarAsTanuSED = await fcGetTanused_CastHoroscope(iLukStayRasee10, iStarAsHomeLuk10, iStarKasedOfLukAsRasee10, iStarAsHouse10OfLukAsRasee)
    varBornPutdate_StarAsTanuSED = [];
    varBornPutdate_StarAsTanuSED[1] = iStarAsTanuSED;

    // ''ใส่ข้อความว่า "ตนุเศษ" ใน STD (คุณภาพดาว)
    S = varBornPutdate_RaSTD[1][iStarAsTanuSED];
    if (S === "-" || S === "") {
        if (S === "-") {
            S = S.replace("-", ""); // Replace '-' with an empty string.
        }
        varBornPutdate_RaSTD[1][iStarAsTanuSED] = "ตนุเศษ";
    } else {
        varBornPutdate_RaSTD[1][iStarAsTanuSED] = "ตนุเศษ, " + S;
    }

    // ''ใส่ค่าภพตนุเศษ  ให้กับดวง10ลัคน์
    iCountR = varBornPutdate_StarStayR[1][iStarAsTanuSED]; // 'ตนุเศษ10ลัคน์ อยู่ที่ ราศี.....
    for (let iPop = 0; iPop <= 11; iPop++) {
        // ' ใส่ค่าภพตนุเศษ ให้กับดวง10ลัคน์ 
        varBornPutdate_PopTanusedRasee[1][iCountR] = await formatDate.fcPopiToS(iPop); // Assuming fcPopiToS(iPop) is defined and returns a string.
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
        YearAgeInfo: YearAgeInfo,
        YourBirthday: YourBirthday,
        YourBirthdayDateUse: YourBirthdayDateUse,
        birthDateMoonInfo: birthDateMoonInfo,
        SurisBirth: SurisBirth,
        lblDaySBirthSuriyaKati: lblDaySBirthSuriyaKati,
        Rad: Rad,
        varBornPutdate_PopTanusedRasee: varBornPutdate_PopTanusedRasee,
        varBornPutdate_PopTanusedStar: varBornPutdate_PopTanusedStar,
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
        varBornPutdate_NaRaSTD
    };

}

// 'รับค่าสมผุส จร (สมผุสดาววันนี้)
async function CastHoroscope_SumSuriyatMain_Today(dateInput, Hour, min) {

    const LunarToday = await calculateLunarDay(dateInput, Hour, min, null, null);

    const lblDayToday = formatDate.fcDayi17ToS(LunarToday.daySuni);

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

        JS = yearTH - 1181; // ' JS = จุลศักราช

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
        Def = Math.floor((birthDate - DateSerialYMDdNewYear) / (1000 * 60 * 60 * 24));
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
    Rad[1][0] = Sun.AA; // 'สมผุสอาทิตย์ คือ AA   สามารถเอาไปหาค่า ราศี องศา ลิปดา ได้เลย เช่น Ra = AA / 1800 หาสมผุสดาวนี้ว่าอยู่ราศีใด aRa คือ ราศี 1 ราศีมี 1800 ลิปดา
    let TemPS = Sun.Ps;
    let TemVS = Sun.Vs;

    // 'คำนวนหาวันที่ดาวย้ายราศี
    let TemAA = Math.floor(Sun.AA / 1800);
    let TemTime = DefTime // 'เวลาประสงค์
    let iMinute35Day_Star1 = 50400; // 'ตอนแรกนับ 31 วัน (44640 นาที) แต่เจอ bug จึงนับเผื่อไว้ 35 วันไปเลย (50400 นาที)  31*24*60=50400  ดาวอาทิตย์เดิน 1 เดือน/1 ราศี
    let MN;
    let DefMN;
    let Deff3;

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

    // 739398 420 3.141592654 0 15.65 0 0
    // 739398 420 3.141592654 0 15.65 0 0
    // console.log(Fm, Vs, Pi, AM, DefTime, HM, DM);
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
    // console.log(TemTime);

    // For K = 0 To 4320 '3 วัน (นาที)
    for (let K = 0; K <= 4320; K++) {
        let DefTime = TemTime + (K / 60);
        let DefMN = (DefTime * 60) / 1440;
        let Deff3 = Def + DefMN + DefH;
        AA = 0;
        Ps = 0;
        Vs = 0;
        let Sun = await CastHoroscope_Sun(Deff3, AA, Ps, Vs, JS);
        let Moon = await CastHoroscope_Moon(Fm, Sun.Vs, Pi, AM, DefTime, HM, DM, Zm = null, Mum = null);
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

    // '******************************3 สมผุสอังคาร***************************
    let mnk = 0;
    let A0 = 1,
        A1 = 2,
        A2 = 16,
        A3 = 505,
        b = 5420,
        c = 127,
        e = 4 / 15;
    d = 45;
    AA = 0;
    let Mars = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
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
    for (let K = 0; K <= 360; K++) {
        //'DefTime = TemTime + (K / 60)
        let DefMN = (DefTime * 60) / 1440;
        //'deftime = temtime
        Deff3 = Def + DefMN + DefH + K;
        //'ddMK = Int(deff3)
        AA = 0;
        Ps = 0;
        VS = 0;
        Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS, JS)
        A0 = 1;
        A1 = 2;
        A2 = 16;
        A3 = 505;
        b = 5420;
        c = 127;
        d = 45;
        e = 4 / 15;
        AA = 0;
        Vs = Sun.Vs;

        let Star = await CastHoroscope_Star(Sun.Ps, A0, A1, A2, A3, b, c, d, e, Sun.Vs, AA, Z);

        Z = Star.Z;

        if (Star.AA / 1800 === Math.floor(Star.AA / 1800) || TemAM < Math.floor(Star.AA / 1800) || TemAM > Math.floor(Star.AA / 1800)) {
            MN = DefTime;
            mnk = K;
            if (TemAM < Math.floor(AA / 1800)) {
                Deff3 = Deff3 - 1;
            }

            let ddmk1 = (dateInput.getDate() + (K - 1));

            // let ddmk1 = dateInput.setDate(dateInput.getDate() + K - 1); //'วันที่ ดาวย้ายราศี
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

            let TodaydayDef = (dateInput - Dnewyear1) / (1000 * 60 * 60 * 24);
            TodaydayDef = Math.floor(TodaydayDef) - 1;

            let Mkdef = (Dnewyear1 - ddmk1) / (1000 * 60 * 60 * 24);
            Mkdef = Math.floor(Mkdef) - 1;
            let vtd;

            JS = Yearddmk1 - (Mkdef < 0 ? 1182 : 1181);

            VT = JS * 0.25875 - Math.trunc(JS / 4 + 0.5) + Math.trunc(JS / 100 + 0.38) - Math.trunc(JS / 400 + 0.595) - 5.53375;
            // 'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
            vtd = Math.floor(VT);
            vtm = VT - vtd;
            vtM1 = vtm;

            DefM = (parseInt(adjustedHour) * 60 + parseInt(adjustedMinute)) / 1440;
            DefH = 1 - vtM1;
            DefTime = (parseInt(adjustedHour) / 60) + parseInt(adjustedMinute);
            T1 = (parseInt(adjustedHour) * 60 + parseInt(adjustedMinute));

            if (T1 < (6 * 60)) {
                TQ = 1440 + T1 - (6 * 60);
            } else {
                TQ = T1 - (6 * 60);
            }

            Deff1 = Mkdef + DefM + DefH;
            Deff2 = DefV + DefH + 0.25;

            K = 360;
            for (JK = 0; JK <= 1440; JK++) {
                let DefTime = TemTime + (JK / 60);
                let DefMN = (DefTime * 60) / 1440;
                let Deff3 = Mkdef + DefMN + DefH;
                AA = 0, Ps = 0, VS2 = 0;
                Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
                A0 = 1, A1 = 2, A2 = 16, A3 = 505, b = 5420, c = 127, d = 45, e = 4 / 15, AA = 0, Vs = Sun.Vs;
                Star = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
                if (Star.AA / 1800 === Math.floor(Star.AA / 1800) || TemAM < Math.floor(Star.AA / 1800)) {
                    MN = DefTime;
                    TemAM = Math.floor(StarM.AA / 1800);
                    JK = 1440;
                }
            }
        }
    }


    DefTime = TemTime;
    Hmove = Math.floor(MN) // 'ชัวโมงที่ดาวย้ายราศี
    Mmove = Math.floor((MN - Math.floor(MN)) * 60) // 'นาที่ที่ดาวย้ายราศี
    let MNKMove = mnk - 1;

    //เด๋วมาทำต่อ 
    
    // MsgBox(mnk) 40 
    // MsgBox(DefTime) 0.15
    // MsgBox(Hmove) 22
    // MsgBox(Mmove) 8 
    // MsgBox(MNKMove) 39

    console.log(DefTime, Hmove, Mmove, MNKMove);

    //'คืนค่าเดิม
    Vs = TemVS;
    Ps = TemPS;
    HM = HHM;
    let MNO = 0;
    JS = TemJs;
    AA = TemAA;
    DefH = TemDefh;

    //1 2  16 505 5420 127 45 0.26666             19755 15.3  5 22.829027777777778 0.90625              4/22/2024   15.3 0  
    //1 2  16 505 5420 127 45 0.26666666666666666 19755 15.22 5 22.829305555555553 0.9062500000000036   ""          15.22 0
    // console.log(A0, A1, A2, A3, b, c, d, e, AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO) 
    // let TimeStarMove = await CastHoroscope_TimeStarMove(A0, A1, A2, A3, b, c, d, e, AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MNO, JS, adjustedHour, adjustedMinute);

    // console.log(TimeStarMove);

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
        JS = yearTH - 1181; // ' JS = จุลศักราช

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
        Def = Math.floor((birthDate - DateSerialYMDdNewYear) / (1000 * 60 * 60 * 24));

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
    let Moon = await CastHoroscope_Moon(Fm, Vs, Pi, AM, DefTime, HM, DM, Zm = null, Mum = null);
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
    d = 45;
    AA = 0;
    const Mars = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[3][0] = Mars.AA; // 'สมผุสอังคาร คือ AA
    Rad[3][18] = Mars.Z; // 'มัธยมอังคาร

    // '******************************* 4 สมผุส พุธ*******************************
    A0 = 7;
    A1 = 46;
    A2 = 4;
    A3 = 1;
    b = 10642;
    c = 220;
    d = 100;
    e = 21;
    AA = 0;
    const Mercury = await CastHoroscope_StarM(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[4][0] = Mercury.AA; // 'สมผุสพุธ คือ AA
    Rad[4][18] = Mercury.Z; // 'มัธยมพุธ

    // '******************************** 5 สมผุสพ ฤหัสบดี****************************
    A0 = 1;
    A1 = 12;
    A2 = 1;
    A3 = 1032
    b = 14297;
    c = 172;
    d = 92;
    e = 3 / 7
    AA = 0
    const Jupiter = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[5][0] = Jupiter.AA // 'สมผุสพฤหัส คือ AA 
    Rad[5][18] = Jupiter.Z // 'มัธยมพฤหัสบดี
    // const fctest = await fcTest_SompudStar_RadToResultRaOngLib(Rad[5][0]);

    // '********************************* 6 สมผุสศุกร์**********************************
    A0 = 5;
    A1 = 3;
    A2 = -10;
    A3 = 243;
    b = 10944;
    c = 80;
    d = 320;
    e = 11;
    AA = 0;
    const Venus = await CastHoroscope_StarM(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[6][0] = Venus.AA; // 'สมผุสศุกร์ คือ AA
    Rad[6][18] = Venus.Z; // 'มัธยมศุกร์

    // '*********************************** 7 สมผุสเสาร์*********************************
    A0 = 1;
    A1 = 30;
    A2 = 6;
    A3 = 10000;
    b = 11944;
    c = 247;
    d = 63;
    e = 7 / 6;
    AA = 0;
    const Saturn = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
    Rad[7][0] = Saturn.AA // 'สมผุสเสาร์ คือ AA
    Rad[7][18] = Saturn.Z // 'มัธยมเสาร์

    // '************************************* 8 สมผุสมฤตยู*******************************
    A0 = 1;
    A1 = 84;
    A2 = 1;
    A3 = 7224;
    b = 16277;
    c = 124;
    d = 644;
    e = 3 / 7;
    AA = 0;
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
    Z = (Math.floor((adjustedMinute) / 60) + Math.floor(adjustedHour)) / 24;

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

    //let testbox;
    // 'For i = 0 To 9
    // '    Dim SompodX As String = fcTest_SompudStar_RadToResultRaOngLib(Rad(i, 0))
    // '    TestBug &= vbNewLine & "ดาว " & i & " : " & SompodX & "  AA หรือ Rad(" & i & ",0)=" & Rad(i, 0) & " มัธยม Rad(" & i & ")(18)=" & Rad(i, 18)
    // 'Next

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

    const newDate = await cutTimeLocal(dataInput, Hour, Min, cutTimeLocalYN, sProv);
    // Date-related calculations
    let day = newDate.date.getDate();
    let month = newDate.date.getMonth() + 1; // Months are zero-indexed
    let year = newDate.date.getFullYear();
    let hour = newDate.adjustedHour;
    let min = newDate.adjustedMinute;

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
    // 56.45683954985647 22.413852410687827 108.99933094769413 107.51546495063738 82.88759007247029 4973.255404348218
    // 56.456            22.4138            108.9993           107.51             82.887            4973.2554043   
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
    // 1.0140443890890996 16.308909735796334 137.5591616465426 135.0951144706618 110.4672395924947 6628.034375549682
    // 1.0140443890891    16.3089097357963   137.559161646543  135.095114470662  110.467239592495  6628.03437554968     
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
    // 2.4523028754527743 6.832620914053475 166.33912344207326    164.78132261979522 140.15344774162813 8409.206864497688
    // 2.45230287545276   6.83262091405454  166.33912344207326    164.78132261       140.1534477        8409.206  
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
    // 0.6755823399146188 5.706049442489903 156.37034299099898 156.02118895260455 131.39331407443746 7883.598844466247
    // 0.67558233991465   5.70604944249076  156.370342990998   156.021188952604   131.393314074437   7883.5988444622 
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
    // 6.358949187924624 14.725965142563748 145.0908970392492 142.48478570401116 117.85691082584407 7071.414649550644
    // 6.35894918792462  14.725965142564    145.090897039248  142.48478570401    117.856910825843   7071.4146495507   
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
    let RadSpeed = Array(13).fill().map(() => Array(5).fill(0));

    // Assuming you have variables like SunR, MoonR, Mars, Mercury, Jupiter, Venus, Saturn, Uranus, Neptune, and Pluto defined with their respective data.
    const calculateElicValues = (bodyToday, bodyYesterday, bodyTomorrow, index) => {

        if (Math.abs(bodyToday[4] - bodyYesterday[4]) > 180) {
            ElicYesterday[index] = 360 - Math.abs(bodyToday[4] - bodyYesterday[4]);
        } else {
            ElicYesterday[index] = Math.abs(bodyToday[4] - bodyYesterday[4]);
        }

        if (Math.abs(bodyToday[4] - bodyTomorrow[4]) > 180) {
            ElicTomorrow[index] = 360 - Math.abs(bodyToday[4] - bodyTomorrow[4]);
        } else {
            ElicTomorrow[index] = Math.abs(bodyToday[4] - bodyTomorrow[4]);
        }

        // Direction logic
        if (Math.abs(bodyToday[4] - bodyYesterday[4]) <= 180) {
            Direction[index] = bodyToday[4] < bodyYesterday[4] ? "พักร" : "";
        } else {
            Direction[index] = "";
        }
    };


    calculateElicValues(SunR[1], SunR[2], SunR[3], 1); //อาทิตย์
    calculateElicValues(MoonR[1], MoonR[2], MoonR[3], 2); // จัทร์
    calculateElicValues(Mars[1], Mars[2], Mars[3], 3); //อังคาร

    // Speed and RadSpeed calculations
    for (let i = 1; i <= 13; i++) {
        if (i === 8) continue; // Skip to match your case

        Speed[i] = ElicTomorrow[i] > ElicYesterday[i] ? "เสริด" :
            (ElicTomorrow[i] < ElicYesterday[i] ? "" : "มนท์");

        RadSpeed[i - (i > 8 ? 3 : 0)][4][0] = Speed[i] === "เสริด" ? 4 :
            (Speed[i] === "มนท์" ? 2 : RadSpeed[i - (i > 8 ? 3 : 0)][4][0]);
    }

    // Usage example for Neptune and Pluto, adapt as necessary
    let A1_Neptune = Neptune[1][0]; // 15604.402798323506   // 15604.4027983235
    let A1_Pluto = Pluto[1][0]; // 12184.7757067649     // 12184.7757067649

    // console.log(A1_Neptune);
    // console.log(A1_Pluto);
    // console.log(ElicYesterday);
    // console.log(ElicTomorrow);
    // console.log(Direction);
    // console.log(Speed);
    // console.log(`Latitude: ${Latitude_Degree}° ${Latitude_Degree}'`);
    // console.log(`Longitude: ${Longitude_Degree}° ${Longitude_Degree}'`);
    // console.log(`RealtimeZone: ${RealtimeZone}`);
    // console.log(`ThaiRa: ${ThaiRa}`);
    // console.log(`ThaiAscendant: ${ThaiAscendant}`);
    // console.log(`ThaiMidHeaven: ${ThaiMidHeaven}`);
    // console.log(`ThaiObliquti: ${ThaiObliquti}`);
    // console.log(`ThaiT: ${ThaiT}`);
    // console.log(`ThaiJulian: ${ThaiJulian}`);
    // console.log(`ProfesAya: ${ProfesAya}`);
    // console.log(`DegreeAya: ${DegreeAya}`);
    // console.log(`Thaidgr: ${Thaidgr}`);

    return {
        A1_Neptune,
        A1_Pluto,
        Direction
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
    // 0.6071447282514929 0.67144728251493 
    // console.log(ii);

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

    // 2243 // 2243
    // console.log(BU)

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

    let iStarAsHouse = await formatDate.fcRaseeToStarKased(iStarKasedOfLukAsRasee); // 'รับค่าดาวเจ้าบ้าน

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

    let iStarAsTanuSED = (iCountFromLukToStarAsHomeLuk * iCountFromStarHomeLukToStarHouse) % 7;

    if (iStarAsTanuSED == 0) {
        iStarAsTanuSED = 7;
    }

    return iStarAsTanuSED;
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

    let iStarAll = 12;
    let e10 = 0

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

    let strSS, TitleTable, columnIindex;

    if (option == 1) {
        // 0 -- 0 มฤตยู -> เรียง 1-9 แล้ว ลักนาแถวแรก -> แล้ว เนปจูน -> พูลโต
        TitleTable = ["ลั. ลัคนา", "1. อาทิตย์", "2. จันทร์", "3. อังคาร", "4. พุธ", "5. พฤหัส", "6. ศุกร์", "7. เสาร์", "8. ราหู", "9. เกตุ", "0. มฤตยู", "น. เนปจูน", "พ. พูลโต"];
        columnIindex = [10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 11, 12];

        for (let i = 0; i <= iStarAll; i++) {

            lblStarStayRNo[columnIindex[i]] = SuriyatDate.varBornPutdate_StarStayR[e10][i];
            lblStarStayR[columnIindex[i]] = await formatDate.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[e10][i]); // ' กรกฎ
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
            lblStarStayRNo[columnIindex[i]] = SuriyatDate.varBornPutdate_StarStayR[e10][i];
            lblStarStayR[columnIindex[i]] = await formatDate.fcRaseeiToS(SuriyatDate.varBornPutdate_StarStayR[e10][i]); // ' กรกฎ
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
    }

    return {
        TitleTable,
        lblStarStayRNo,
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

/** ยังไม่ได้ test case
 * @returns {number} MN
 */
async function CastHoroscope_TimeStarMove(A0, A1, A2, A3, b, c, d, e, AA, DefTime, Def, DefMN, DefH, dateInput, TemTime, MN = null, JS, Hour, Min) {
    // 'คำนวนหาวันที่ดาวย้ายราศี
    let date = new Date(dateInput);

    let TemJs = JS;
    let TemAM = Math.floor(AA / 1800);
    let SystemYearThai = false;

    let day = date.getDate();
    let month = date.getMonth() + 1; // Adjust for zero-based index
    let year = date.getFullYear();
    let yearTH = date.getFullYear() + 543;

    let Dnewyear1, Dnewyear2, ddmk1; // date
    let Ps, Vs, VS2, Sun, Star, mnk, Yearddmk2, Yearddmk1, FindTaleanSuk, findVt, VT, vtd, vtm, TodaydayDef, Mkdef, vtM1, T1, TQ, HM;
    let Deff1, Deff2, Deff3, DefV, Hmove, Mmove, MNKMove, dDMYforTodayMove, TemDefh, HHM;

    for (let K = 0; K <= 3600; K++) {
        DefMN = (DefTime * 60) / 1440;
        Deff3 = Def + DefMN + DefH + K;
        AA = 0;
        Ps = 0;
        VS2 = 0;
        Vs = (await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS)).Vs;
        AA = 0;
        Star = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);
        if (Star.AA / 1800 == Math.floor(Star.AA / 1800) || TemAM < Math.floor(Star.AA / 1800) || TemAM > Math.floor(Star.AA / 1800)) {
            MN = DefTime;
            mnk = K;

            // ddmk1 = dateInput.setDate(dateInput.getDate() + K - 1); //'วันที่ ดาวย้ายราศี
            // ddmk1 = (dateInput.getDate() + (K - 1)); //'วันที่ ดาวย้ายราศี
            ddmk1 = new Date(date.getFullYear(), date.getMonth(), date.getDate() + K - 1);
            Yearddmk1 = yearTH;
            Yearddmk2 = ddmk1.getFullYear() + 543; //' ปี ค.ศ. ที่ดาวย้าย
            FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk1);
            findVt = Math.floor(FindTaleanSuk.findVt);

            if (SystemYearThai) {
                Dnewyear1 = new Date(Yearddmk1, 3, findVt); // Month is 0-indexed in JS: 3 = April
            } else {
                Dnewyear1 = new Date(Yearddmk1 - 543, 3, findVt + 1);
            }

            TodaydayDef = (date - Dnewyear1) / (1000 * 60 * 60 * 24);
            TodaydayDef = Math.floor(TodaydayDef) - 1;
            Mkdef = (Dnewyear1 - ddmk1) / (1000 * 60 * 60 * 24);
            Mkdef = Math.floor(Mkdef) - 1;

            if (Mkdef < 0) {
                JS = (Yearddmk2) - 1182;
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                FindTaleanSuk = await CastHoroscope_FindTaleanSuk(Yearddmk2 - 1);
                findVt = Math.floor(FindTaleanSuk.findVt);

                if (SystemYearThai) {
                    Dnewyear2 = new Date(Yearddmk2, 3, findVt); // Month is 0-indexed in JS: 3 = April
                } else {
                    Dnewyear2 = new Date(Yearddmk2 - 543, 3, findVt + 1);
                }

                TodaydayDef = (dateInput - Dnewyear2) / (1000 * 60 * 60 * 24);
                TodaydayDef = Math.floor(TodaydayDef) - 1;
                Mkdef = (Dnewyear2 - ddmk1) / (1000 * 60 * 60 * 24);
                Mkdef = Math.floor(ddmk1) - 1;

            } else {
                JS = (Yearddmk2) - 1181;
                //'หาเวลาเถลิกศก
                VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;
                vtd = Math.floor(VT);
                vtm = VT - vtd;
                vtM1 = vtm;
            }

            //''เปรียบเทียบหาเวลาประสงค์
            let DefM = (Math.floor(Hour) * 60 + Math.floor(Min)) / 1440; //'DefM = เวลา 24.00 น. ถึง วันประสงค์
            let DefH = 1 - vtM1; //'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน

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

                AA = 0;
                Ps = 0;
                VS2 = 0;
                Sun = await CastHoroscope_Sun(Deff3, AA, Ps, VS2, JS);
                AA = 0;
                Vs = Sun.VS2;
                Star = await CastHoroscope_Star(Ps, A0, A1, A2, A3, b, c, d, e, Vs, AA, Z = null);

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
    // dDMYforTodayMove = dateInput.setDate(dateInput.getDate() + (mnk - 1));
    dDMYforTodayMove = new Date(date.getFullYear(), date.getMonth(), date.getDate() + mnk - 1);
    Vs = null; //TemVS
    Ps = null; //TemPS
    HM = HHM;
    JS = TemJs;
    DefH = TemDefh;

    return {
        DefTime,
        Hmove,
        MNKMove,
        dDMYforTodayMove,
        Vs,
        Ps,
        HM,
        JS,
        DefH
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
}