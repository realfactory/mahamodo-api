// Assuming db.mysql.js exports a connection or pool
const connection = require('../config/db.mysql.js');

// 'กำหนด เพิ่ม พ.ศ. ลงใน Combo
const YearMoonFrom = 2445; //ปฏิทิน ข้างขึ้น-แรม
const YearMoonTo = 2575; //ปฏิทิน ข้างขึ้น-แรม
const YearHoraFrom = 1700; //ปฏิทิน โหราศาสตร์ (สุริยยาตร์)
const YearHoraTo = 2600; //ปฏิทิน โหราศาสตร์ (สุริยยาตร์)
const sTextGraphic = "";

function calculateAges(req) {
    try {
        const birthdate = new Date(req.query.birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthdate.getFullYear();
        const m = today.getMonth() - birthdate.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
            age--;
        }

        return age;
    } catch (error) {
        throw error;
    }
}

function getRandomZodiacSign() {

    try {
        const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
        const sign = signs[Math.floor(Math.random() * signs.length)];

        return sign;

    } catch (error) {

        throw error;

    }
}

function getCharGroupForSetname() {
    let sGrpCh = [
        "อ  ะ า  ำ  ุ  ่  เ  แ  ู  ้  ะ  โ   ิ  ึ  ใ  ๊  ี  ื  ็  ไ",
        "ก ข ค ฆ ง",
        "จ ฉ ช ซ ฌ ญ",
        "ฎ ฏ ฐ ฑ ฒ ณ",
        "บ ป ผ ฝ พ ฟ ภ ม",
        "ศ ษ ส ห ฬ ฮ",
        "ด ต ถ ท ธ น",
        "ย ร ล ว"
    ];

    let CharUtsahaDay = [sGrpCh[4], sGrpCh[7], sGrpCh[5], sGrpCh[0], sGrpCh[2], sGrpCh[6], sGrpCh[1], sGrpCh[3]];
    let CharBorivanDay = sGrpCh.slice();
    let CharRyuDay = [sGrpCh[1], sGrpCh[2], sGrpCh[3], sGrpCh[6], sGrpCh[7], sGrpCh[0], sGrpCh[4], sGrpCh[5]];
    let CharKalaDay = [sGrpCh[5], sGrpCh[0], sGrpCh[1], sGrpCh[2], sGrpCh[6], sGrpCh[7], sGrpCh[3], sGrpCh[4]];
    let CharDechDay = [sGrpCh[2], sGrpCh[3], sGrpCh[6], sGrpCh[4], sGrpCh[5], sGrpCh[1], sGrpCh[7], sGrpCh[0]];
    let CharSriDay = [sGrpCh[3], sGrpCh[6], sGrpCh[4], sGrpCh[7], sGrpCh[0], sGrpCh[2], sGrpCh[5], sGrpCh[1]];
    let CharMontreeDay = [sGrpCh[7], sGrpCh[5], sGrpCh[0], sGrpCh[1], sGrpCh[3], sGrpCh[4], sGrpCh[2], sGrpCh[6]];
    let CharMoolDay = [sGrpCh[6], sGrpCh[4], sGrpCh[7], sGrpCh[5], sGrpCh[1], sGrpCh[3], sGrpCh[0], sGrpCh[2]];

    return {
        CharUtsahaDay,
        CharBorivanDay,
        CharRyuDay,
        CharKalaDay,
        CharDechDay,
        CharSriDay,
        CharMontreeDay,
        CharMoolDay
    };
}

function fcNoEToTh(arabicNumber) {
    const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    let arabicNumberStr = arabicNumber.toString();
    let thaiNumberStr = "";
    for (let i = 0; i < arabicNumberStr.length; i++) {
        if (!isNaN(arabicNumberStr[i])) {
            thaiNumberStr += thaiNumerals[parseInt(arabicNumberStr[i], 10)];
        } else {
            thaiNumberStr += arabicNumberStr[i];
        }
    }

    return thaiNumberStr;
}

function fcDayi17ToS(varInput) {
    const days = ["", "อาทิตย์", "จันทร์", "อังคาร", "พุธ (กลางวัน)", "พฤหัสบดี", "ศุกร์", "เสาร์", "พุธ (กลางคืน)"];
    return days[varInput] || "";
}

function fcMonthSFToSht(month) {
    const shortMonth = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return month >= 1 && month <= 12 ? shortMonth[month - 1] : '';
}

function fcMonthiToSF(month) {
    const shortMonth = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return month >= 1 && month <= 12 ? shortMonth[month - 1] : '';
}

function getProvince() {
    return new Promise((resolve, reject) => {
        const query = "SELECT * FROM province";
        connection.query(query, (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                reject(new Error(`Error retrieving data from the province table: ${error.message}`));
            } else {
                resolve(results);
            }
        });
    });
}

async function getSettingoption() {
    return new Promise((resolve, reject) => {
        const query = "SELECT * FROM settingoption where id = 1";
        connection.query(query, (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                reject(new Error(`Error retrieving data from the province table: ${error.message}`));
            } else {
                resolve(results);
            }
        });
    });
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

async function fcGetItemInTableDB(columnName, tableName, condition) {
    return new Promise((resolve, reject) => {
        const query = `SELECT ${columnName} FROM ${tableName} WHERE ${condition}`;

        connection.query(query, (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                reject(new Error(`Error retrieving data from ${tableName}: ${error.message}`));
            } else {
                resolve(results.length > 0 ? results[0][columnName] : null);
            }
        });
    });
}

async function dbQuery(sql) {
    return new Promise((resolve, reject) => {
        const query = sql;
        // console.log(query);
        connection.query(query, (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                reject(new Error(`Error retrieving data from ${tableName}: ${error.message}`));
            } else {
                resolve(results);
            }
        });
    });
}

function calculateLunarDay(now) {

    let day = now.getDate();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();
    let hour = now.getHours();
    let minute = now.getMinutes();

    DateSerialYMDToday = new Date(year, month - 1, day);
    DayMooni = DateSerialYMDToday.getDay() + 1;
    DaySuni = DayMooni;
    DayMooni = (DayMooni === 0) ? 7 : DayMooni;
    if (hour * 60 + minute < 6 * 60) {
        DayMooni -= 1;
    }
    if (DayMooni === 0) {
        DayMooni = 7;
    }
    if (DaySuni === 3 && hour * 60 + minute >= 18 * 60) {
        DayMooni = 8;
    } else if (DaySuni === 4 && hour * 60 + minute < 6 * 60) {
        DayMooni = 8;
    }

    return {
        DayMooni: DayMooni,
        DaySuni: DaySuni
    };
}

async function SetUpDownMThaiMoon(now, DayMooni, DaySuni) {

    let DownUps = "-";
    let Nighti = 0;
    let MThai = 0;
    let YThai = 0;
    let sqlMoon;
    
    // let chkSetUpDownMThaiMoon = fcGetItemInTableDB("chkSetUpDownMThaiMoon", "settingoption", "id=1");
    // chkSetUpDownMThaiMoon.then(function (resMoon) {
    //     if (resMoon === 'ใช่') {
    //         return resMoon;
    //     }
    // });


    let chkSetUpDownMThaiMoon = fcGetItemInTableDB("chkSetUpDownMThaiMoon", "settingoption", "id=1");
    chkSetUpDownMThaiMoon.then(function (resMoon) {
        if (resMoon === 'ใช่') {
            let day = now.getDate().toString().padStart(2, '0');
            let month = (now.getMonth() + 1).toString().padStart(2, '0');
            let year = (now.getFullYear() + 543).toString();

            if (DaySuni === DayMooni) {
                sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${day}/${month}/${year}'`;
            } else {

                if (cboBorn_Country_Option) {
                    now.setFullYear(year - 543);
                }

                now.setDate(now.getDate() - 1);

                let iNumBack = now.getDate().toString().padStart(2, '0');
                let iMonthBack = (now.getMonth() + 1).toString().padStart(2, '0');
                let iYearBBack = (cboBorn_Country_Option ? now.getFullYear() + 543 : now.getFullYear()).toString();

                sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${iNumBack}/${iMonthBack}/${iYearBBack}'`;

            }
        } else {

            let day = now.getDate().toString().padStart(2, '0');
            let month = (now.getMonth() + 1).toString().padStart(2, '0');
            let year = (now.getFullYear() + 543).toString();
            sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${day}/${month}/${year}'`;
        }

        if (DaySuni === 4 && DayMooni === 8) {
            let now = new Date();
            let day = now.getDate().toString().padStart(2, '0');
            let month = (now.getMonth() + 1).toString().padStart(2, '0');
            let year = (now.getFullYear() + 543).toString();
            sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${day}/${month}/${year}'`;
        }

        let getMoonData = dbQuery(sqlMoon);
        getMoonData.then(function (resMoon) {
            if (resMoon && resMoon.length > 0) {
                DownUps = resMoon[0].downup === 1 ? "แรม" : "ขึ้น";
                Nighti = resMoon[0].night;
                MThai = resMoon[0].mthai;
                YThai = resMoon[0].ythai;
                // console.log(DownUps,Nighti,MThai,YThai);
                return {
                    DownUps: DownUps,
                    Nighti: Nighti,
                    MThai: MThai,
                    YThai: YThai,
                };
            } else {
                console.error("No data returned from the query.");
                return null;
            }
        });
    });
}


module.exports = {
    calculateAges,
    getRandomZodiacSign,
    getCharGroupForSetname,
    fcDayi17ToS,
    fcNoEToTh,
    getProvince,
    getSettingoption,
    fcMonthSFToSht,
    fcMonthiToSF,
    fcGetLukTimeLocalThailandThisProvValue,
    fcGetItemInTableDB,
    dbQuery,
    calculateLunarDay,
    SetUpDownMThaiMoon,
    YearMoonFrom,
    YearMoonTo,
    YearHoraFrom,
    YearHoraTo,
    sTextGraphic,
};