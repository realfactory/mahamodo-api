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

    console.log('Used Born Begin DMY:', UsedBornBeginDMY);

    // 'เปรียบเทียบหาเวลาประสงค์
    // MsgBox(SystemYearThai) // false
    // MsgBox(BeginNewYearYearB)
    // MsgBox(BeginNewYearNum)
    // MsgBox(DateSerialYMDdNewYear)
    // MsgBox(Def)
    
    // 2534
    // 16
    // 4/16/1991
    // 113


}



// 'รับค่าสมผุส จร (สมผุสดาววันนี้)
async function CastHoroscope_SumSuriyatMain_Today(dataInput, Hour, min) {

}

//
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

    // //เสาร์
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

    // // Assuming you have variables like SunR, MoonR, Mars, Mercury, Jupiter, Venus, Saturn, Uranus, Neptune, and Pluto defined with their respective data.
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

    console.log(A1_Neptune);
    console.log(A1_Pluto);
    console.log(ElicYesterday);
    console.log(ElicTomorrow);
    console.log(Direction);
    console.log(Speed);

    console.log(`Latitude: ${Latitude_Degree}° ${Latitude_Degree}'`);
    console.log(`Longitude: ${Longitude_Degree}° ${Longitude_Degree}'`);
    console.log(`RealtimeZone: ${RealtimeZone}`);
    console.log(`ThaiRa: ${ThaiRa}`);
    console.log(`ThaiAscendant: ${ThaiAscendant}`);
    console.log(`ThaiMidHeaven: ${ThaiMidHeaven}`);
    console.log(`ThaiObliquti: ${ThaiObliquti}`);
    console.log(`ThaiT: ${ThaiT}`);
    console.log(`ThaiJulian: ${ThaiJulian}`);
    console.log(`ProfesAya: ${ProfesAya}`);
    console.log(`DegreeAya: ${DegreeAya}`);
    console.log(`Thaidgr: ${Thaidgr}`);
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