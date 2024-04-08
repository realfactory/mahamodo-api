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

    let day = date.getDate();
    let month = date.getMonth() + 1; // JavaScript months are 0-indexed.
    let year = date.getFullYear();
    let dateFormat = new Date(year, month - 1, day); // Setup initial date format.

    if (cutTimeLocalYN) {

        const timeLocal = await fcGetLukTimeLocalThailandThisProvValue(sProv);
        const minuteLocal = parseInt(timeLocal[0].ProvTime.substring(4, 6), 10);

        const intTimeAllMBorn = (hour * 60) + minute;

        let totalMLocalMAndBornM = intTimeAllMBorn - minuteLocal;
        if (intTimeAllMBorn < minuteLocal) {
            totalMLocalMAndBornM += 1440;
            dateFormat.setDate(dateFormat.getDate() - 1);
        }

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

//'รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
async function CastHoroscope_SumSuriyatMain_Born(dataInput, Hour, min, CutTimeLocalYN, sProv) {

    const LunarDay = await calculateLunarDay(dataInput, Hour, min, CutTimeLocalYN, sProv);
    const lblDayBirth = formatDate.fcDayi17ToS(LunarDay.daySuni);
    const getMoonBirth = await SetUpDownMThaiMoon(dataInput, LunarDay.dayMooni, LunarDay.daySuni, sProv);
    const birthTimeInfo = await adjustBirthTime(dataInput, Hour, min, CutTimeLocalYN, sProv);
    const YearAgeInfo = await helpers.formatTimeDifference(dataInput, Hour, min);
    let YourBirthday = birthTimeInfo.formattedDate;
    let YourBirthdayDateUse = birthTimeInfo.dateUse;
    let birthDateMoonInfo = getMoonBirth.MoonInfo;
    let SurisBirth = lblDayBirth.replace("(กลางวัน)", "").replace("(กลางคืน)", "");
    let lblDaySBirthSuriyaKati = "สุริยคติ: " + SurisBirth;

    return {
        dayMooni: LunarDay.dayMooni,
        daySuni: LunarDay.daySuni,
        YearAgeInfo: YearAgeInfo,
        YourBirthday: YourBirthday,
        YourBirthdayDateUse: YourBirthdayDateUse,
        birthDateMoonInfo: birthDateMoonInfo,
        SurisBirth: SurisBirth,
        lblDaySBirthSuriyaKati: lblDaySBirthSuriyaKati,
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

    let Pi = parameter.pi;
    let JS = yearTH - 1181; //' JS = จุลศักราช

    //'H = หรคุณ
    let H = JS * 365.25875 + 1.46625;

    //'H = (JS * 292207 + 373) / 800 + 1  ' คิดคำนวนอีกวิธีหนึ่ง
    let H1 = H - Math.floor(H);
    let X1 = H;

    //'K = กัมมัชพล
    let K = (1 - (H - Math.floor(H))) * 800;
    let X2 = K;

    //'M = มาสเกณฑ์
    let M = ((H * 703) + 650) / 20760;
    let M1 = (Math.floor(H) * 11 + 650) / 692;

    M1 = (Math.floor(H) + Math.floor(M1)) / 30;
    let X3 = M1;

    // 'D = ดิถี
    // 'D = (M - (Int(M))) * 30
    let d = (M1 - Math.floor(M1)) * 30;
    let X4 = d;

    //'คำนวณหา อธิมาศ
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

    //'V = วาร
    let V = H - (Math.floor(H / 7)) * 7;
    let X7 = V;

    //'หาเวลาเถลิงศก
    let VT = JS * 0.25875 - Math.floor(JS / 4 + 0.5) + Math.floor(JS / 100 + 0.38) - Math.floor(JS / 400 + 0.595) - 5.53375;

    // 'เวลาเถลิกศก เลขจำนวนเต็มเป็นวัน ทศนิยมเป็นเวลา
    // 'dd = DateDiff("d", DateValue(vt), #6/24/2475#)

    let BeginNewYearNum = Math.floor(VT);
    let vtm = VT - BeginNewYearNum; //'เถลิงศก วันที่
    let vtM1 = vtm;
    vtm *= 24;
    let BeginNewYearH = Math.floor(vtm); //'เถลิงศก ชม.
    let vtmm = vtm - BeginNewYearH;
    vtmm *= 60;
    let BeginNewYearM = Math.floor(vtmm); //'เถลิงศก นาที
    let BeginNewYearSec = (vtmm - BeginNewYearM); // * 60 

    BeginNewYearSec = BeginNewYearSec * 60;
    BeginNewYearSec = Math.floor(BeginNewYearSec);
    let BeginNewYearYearB = JS + 1181 //'เถลิงศก ปี พ.ศ.
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

    // console.log('Used Born Begin DMY:', UsedBornBeginDMY);
    // console.log(birthDate );
    // console.log(DateSerialYMDdNewYear );
    // console.log('JSBornShow:', JSBornShow); //1353
    // console.log('Def:', Def); //113
    // console.log(SystemYearThai); // false
    // console.log(BeginNewYearYearB); //2534
    // console.log(BeginNewYearNum); //16
    // console.log(DateSerialYMDdNewYear); //1991-04-16T17:00:00.000Z

    if (Def < 0) {
        JS = yearTH - 1181; //' JS = จุลศักราช

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

    // console.log(Mass); // 1 1
    // console.log(PD); //2  2
    // console.log(JPd); //132 132

    let Md2;
    let mDate;

    if (SystemYearThai) {
        Md2 = new Date(BeginNewYearYearB, 3, BeginNewYearNum); // Month is 0-indexed in JavaScript (0 is January)
    } else {

        Md2 = new Date(BeginNewYearYearB - 543, 3, BeginNewYearNum + 1);
    }

    // console.log(JPd); //102
    // console.log(Md2); //1991-04-15T17:00:00.000Z

    mDate = new Date(Md2);
    mDate.setDate(mDate.getDate() + JPd);

    // console.log(mDate); // 1991-08-26T17:00:00.000Z  08/16/1991

    let x18 = mDate;

    // 'DefM = เวลา 24.00 น. ถึง วันประสงค์
    let DefM = (parseInt(adjustedHour) * 60 + parseInt(adjustedMinute)) / 1440;

    // 'DefH = เวลาเถลิกศกถึง 24.00 น. อีกวัน
    let DefH = 1 - vtM1;
    let DefV = (mDate - DateSerialYMDdNewYear) / (1000 * 60 * 60 * 24) - 1;

    // console.log(mDate); // 1991-08-26T17:00:00.000Z  //08/26/1991
    // console.log(DateSerialYMDdNewYear);//1991-04-16T17:00:00.000Z // 04/16/1991

    // console.log(DefH); //0.4450000000000536
    // console.log(DefV); // 100 // 131

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


    //'VT = วารอัตตา
    VT = HT - (Math.floor(HT / 7)) * 7;
    let x17 = VT;

    // ' สมผุสดาว
    // '==========================================================================================
    // '*****สมผุสอาทิตย์******
    // 'สุรทินประสงค์ deF1
    // 'กัมมัชพลประสงค์  KTP


    // 113.865833333 0 0 0 1353    
    // 113.8658333333333 0 0 0 1353
    let AA = 0,
        Ps = 0,
        Vs = 0;
    const Sun = await CastHoroscope_Sun(Deff1, AA, Ps, Vs, JS);

    let Rad = Array.from({
        length: 13
    }, () => new Array(21));

    Rad[1][0] = Sun.AA; //'สมผุสอาทิตย์ คือ AA   สามารถเอาไปหาค่า ราศี องศา ลิปดา ได้เลย เช่น Ra = AA / 1800 หาสมผุสดาวนี้ว่าอยู่ราศีใด aRa คือ ราศี 1 ราศีมี 1800 ลิปดา
    Rad[1][16] = Sun.S1; //'ผลอาทิตย์
    Rad[1][17] = Sun.Vs; //' มัธยมรวิ
    Rad[1][18] = Sun.ZP; ///'มัธยมอาทิตย์
    Rad[1][11] = Sun.Ps; //'กำลังพระเคราะห์
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

    //'******************************** 1 สมผุสจันทร์ ******************************
    // 727451 6708 3.141592654 0 10.166666666666666 0 0 null null
    // 727451 6708 3.141592654 0 10.1               0 0 null null 
    let Moon = await CastHoroscope_Moon(Fm, Vs, Pi, AM, DefTime, HM, DM, Zm = null, Mum = null);

    Rad[2][0] = Moon.AM; //'สมผุสจันทร์ คือ AM
    Rad[2][18] = Moon.Zm; //'มัธยมจันทร์

    //'****** หาเพียร 'Rad(2, 11) = Rad(2, 18)
    Rad[2][11] = Rad[2][0];

    //'เพียร
    if (Rad[2][0] < Rad[1][0]) Rad[2][11] = Rad[2][11] + 21600;
    Rad[2][11] = Rad[2][11] - Rad[1][0];
    Rad[2][12] = Rad[2][11] / 720;

    //' มัธยมอุจ
    Rad[2][13] = Moon.Mum;

    //'ถ้านี่เป็นการเข้ามารับค่าสมผุสดาวเพื่อใช้แสดง "ปฏิทินโหราศาสตร์"
    // let tfUse_for_CalendarHora = false;
    // if (tfUse_for_CalendarHora) {
    //     //'คำนวณหาดาวจันทร์ย้ายราศี (ดาวจันทร์ยก)
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
    //         StarWillMoveH2 = Math.floor(MN) //'รับค่า ชม.  (อีก...ชม. ดาวจันทร์จะย้าย)
    //         StarWillMoveM2 = Math.floor((MN - Math.floor(MN)) * 60) //''รับค่า นาที.  (อีก...นาที. ดาวจันทร์จะย้าย)
    //     }
    // }

    let HHM = Moon.HM;

    // '***************************** 2 สมผุสจันทร์ วันแรม 1 ค่ำ เดือน 8  ************
    let MyDay = mDate.getDate();
    let MyMonth = mDate.getMonth() + 1;
    Fm = 365 * CS + MyDay + Math.floor(275 * MyMonth / 9) + 2 * Math.floor(0.5 + 1 / MyMonth) + Math.floor(CS / 4) - Math.floor(CS / 100) + Math.floor(CS / 400) + 2;

    // AM = 0 : Vs = VVs : HM = 0 : DM = 0
    AM = 0;
    Vs = VVs;
    HM = 0;
    DM = 0;

    // console.log(Fm, Vs, DefTime, Moon.Zm, Moon.Mum );
    //fm 727469 vs 7760 difftime 10.1  zm 26763  Mum 16204 
    //fm 727470 vs 7760 difftime 10.17 zm 26763  Mum 16204

    let Moon2 = await CastHoroscope_Moon(Fm, Vs, Pi, AM, DefTime, HM, DM, Moon.Zm, Moon.Mum);
    Rad[2][5] = Moon2.AM; //19851 //19154
    let GoodM = Rad[2][5] * 0.00125;
    let GoodM1 = GoodM;

    //'ตรวจสอบฤกษ์ของวันแรม 1 ค่ำ เดือน 8
    let VGm1 = Math.floor(Rad[2][5] * 0.00125);

    //'คืนค่า Vs และ Ps
    Vs = TemVS
    Ps = TemPS
    HM = HHM
    // console.log(Rad[2][5] ,Vs ,Ps ,HM);
    // 19851 6708 16055508 494309
    // 19154 6708 16055508 494309

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
    Rad[3][0] = Mars.AA; //'สมผุสอังคาร คือ AA
    Rad[3][18] = Mars.Z; //'มัธยมอังคาร

    //'******************************* 4 สมผุส พุธ*******************************
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
    Rad[4][0] = Mercury.AA; //'สมผุสพุธ คือ AA
    Rad[4][18] = Mercury.Z; //'มัธยมพุธ

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
    Rad[5][0] = Jupiter.AA //'สมผุสพฤหัส คือ AA 
    Rad[5][18] = Jupiter.Z //'มัธยมพฤหัสบดี
    // const fctest = await fcTest_SompudStar_RadToResultRaOngLib(Rad[5][0]);

    //'********************************* 6 สมผุสศุกร์**********************************
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
    Rad[6][0] = Venus.AA; //'สมผุสศุกร์ คือ AA
    Rad[6][18] = Venus.Z; // 'มัธยมศุกร์

    //'*********************************** 7 สมผุสเสาร์*********************************
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
    Rad[7][0] = Saturn.AA //'สมผุสเสาร์ คือ AA
    Rad[7][18] = Saturn.Z //'มัธยมเสาร์

    //'************************************* 8 สมผุสมฤตยู*******************************
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
    Rad[0][0] = Deadly.AA //'สมผุสมฤตยู คือ AA
    Rad[0][18] = Deadly.Z //'มัธยมมฤตยู

    // //'************************************* 9 สมผุสราหู********************************
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
    Rad[8][0] = AA; //'สมผุสราหู คือ AA
    Rad[8][18] = Z; //'มัธยมราหู

    //'************************************* 10 สมผุสเกตุ********************************
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

    Rad[9][0] = AA //'สมผุสเกตุ คือ AA
    Rad[9][18] = ZZ //'มัธยมเกตุ

    let testbox;

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
    // CastHoroscope_AutoMinit_Rasijak

    
}

// 'รับค่าสมผุส จร (สมผุสดาววันนี้)
async function CastHoroscope_SumSuriyatMain_Today(dataInput, Hour, min) {

}

// 'ในโค้ดนี้เราต้องการเฉพาะสมผุสของดาว เนปจูน พูลโต เท่านั้น  จุดประสงค์ต้องการแค่สมผุสของดาว เนปจูน พูลโต เท่านั้น
async function CastHoroscope_SumSompodStarCalendarAstronomy_Born(dataInput, Hour, Min, cutTimeLocalYN, sProv) {

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
    let julinday = calendar.jday(year, month, DayAdj, UniHour, Unimin, 0, 1) //' c50

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
        A1_Pluto
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

    //'ราศี อาทิตย์
    let Xsun = Math.floor(KTP / 24350);

    // 'กัมมัชพลเหลือจากราศี RKTP
    let RKTP = KTP - Xsun * 24350;

    //'องศา DP
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

    //'ขัน Xsun
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
    DefTime = 10.1;
    //'อุจพลจันทร์   Um
    Um = Um - Math.floor(Um / 3232) * 3232;

    //'มัธยมอุจ  Mum
    Mum = Math.floor((Um + DefTime / 24) * 21600 / 3232) + 2;

    // 'อวมาน Wm
    let Wm = HM * 703 + 650 + Math.floor(DefTime * 703 / 24);

    // 'มาสเกณฑ์ Mm
    let MM = Math.floor(Wm / 20760);

    //'อวมานเหลือจากมาส Km
    let Km = Wm - MM * 20760;

    //'ดิถี  Dm
    DM = Math.floor(Km / 692);

    //'อวมาน Wm1
    let Wm1 = Km - DM * 692;

    //'มัธยมจันทร์(ลิปดา) Zm
    Zm = DM * 720 + Math.floor(1.04 * Wm1) - 17 + Vs;

    //'อุจวิเศษ  UVm
    let UVm = Zm - Mum;
    let Im = Math.sin((UVm / 60) * Pi / 180);
    // Im = 0.06946629077719282 // 0.700446500083193

    // If UVm > 21600 Then UVm = UVm - 21600
    // If UVm > 5400 Then UVm = 10800 - UVm
    // If UVm < -5400 Then UVm = 10800 - (UVm + 21600)
    // If UVm > 5400 Then UVm = 10800 - UVm

    if (UVm > 21600) UVm -= 21600;
    UVm = UVm > 5400 ? 10800 - UVm : UVm;
    UVm = UVm < -5400 ? 10800 + UVm : UVm;

    //'Xm = Math.Abs(UVm / 60 / 15)
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

    //'สมผุสจันทร์   Am
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
    let P2 = A2 * TL / 1800; //'เวลาที่เป็นอนาคต
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

module.exports = {
    calculateLunarDay,
    fcGetLukTimeLocalThailandThisProvValue,
    SetUpDownMThaiMoon,
    DownThaiMoonInfo,
    adjustBirthTime,
    CastHoroscope_SumSuriyatMain_Born,
    CastHoroscope_AllStar_Suriyata_SUM_Main,
    CastHoroscope_SumSuriyatMain_Today,
    CastHoroscope_SumSompodStarCalendarAstronomy_Born,
}