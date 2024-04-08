const helpers = require('../helpers/helpers');
const db = require('../helpers/db');
const main = require('../helpers/main');
const formatDate = require('../helpers/formatDate');

// รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
exports.putDate = async (req, res) => {
    let SuriyatDate, SumSompod, SuriyatLukDate, AllStar;
    let birthDateMoonInfo;
    let LukMoonInfo;
    let countryOption = "ประเทศไทย";

    let provinces = await db.getProvince();

    let YourName = req.query.YourName;
    let YourSurName = req.query.YourSurName;
    let CutTimeLocalYN = req.query.CutTimeLocalYN;
    let birthDate = req.query.birthdate ? req.query.birthdate : "Not provided";
    let sProv = req.query.sProv;
    let cboBorn_Country_Option = req.query.cboBorn_Country_Option;
    let cboBorn_H = req.query.cboBorn_H;
    let cboBorn_M = req.query.cboBorn_M;
    let Lukdate = req.query.Lukdate;

    let now = new Date();
    let currentDate = now.toISOString().split('T')[0];
    let currentHour = now.getHours().toString().padStart(2, '0');
    let currentMinute = now.getMinutes().toString().padStart(2, '0');

    //'รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
    if (birthDate) {
        const NewBirthDate = await formatDate.fcDateGlobal(birthDate);
        SuriyatDate = await main.CastHoroscope_SumSuriyatMain_Born(NewBirthDate, cboBorn_H, cboBorn_M, CutTimeLocalYN, sProv);
        // 'เริ่มคำนวณตามสูตรคัมภีร์สุริยยาตร์ หาสมผุสของดาวทุกดวง
        // iiNum, iiMonth, iiYearB, BeginDMY_Talengsok, DateSerialYMDBorn, sHuse, sMuse, X0, x13, x15, x11, x12, x16, x14, x17, 0, 0, False
        AllStar = await main.CastHoroscope_AllStar_Suriyata_SUM_Main(NewBirthDate, cboBorn_H, cboBorn_M, CutTimeLocalYN, sProv);

        // เริ่มคำนวณตามสูตรคัมภีร์สุริยยาตร์
        let Rad = Array.from({
            length: 13
        }, () => new Array(21));

        let varBornPutdate_StarStayR = Array.from({
            length: 12
        }, () => new Array(12));

        let varBornPutdate_StarO = Array.from({
            length: 12
        }, () => new Array(12));

        let varBornPutdate_StarL = Array.from({
            length: 12
        }, () => new Array(12));

        let varBornPutdate_LerkPass = Array.from({
            length: 12
        }, () => new Array(12));

        let varBornPutdate_MLerkPass = Array.from({
            length: 12
        }, () => new Array(12));

        let varBornPutdate_SecLerkPass = Array.from({
            length: 12
        }, () => new Array(12));

        let varBornPutdate_LerkNow = Array.from({
            length: 12
        }, () => new Array(12));

        let varBornPutdate_NLerkNow = Array.from({
            length: 12
        }, () => new Array(12));

        let varBornPutdate_No1To9LerkNow = Array.from({
            length: 12
        }, () => new Array(12));

        let varBornPutdate_FixedStarLerkNow = Array.from({
            length: 12
        }, () => new Array(12));

        let SumSompod = await main.CastHoroscope_SumSompodStarCalendarAstronomy_Born(NewBirthDate, cboBorn_H, cboBorn_M, CutTimeLocalYN, sProv);

        // Assuming the array should actually start from index 0 but have placeholders to match a 1-indexed system
        // If Neptune and Pluto are supposed to be at indices 11 and 12 following a 1-indexed logic, in a 0-indexed system, they would be at positions 10 and 11.
        Rad[10][0] = SumSompod.A1_Neptune; // Neptune's value stored at Rad[10][0] 
        Rad[11][0] = SumSompod.A1_Pluto; // Pluto's value stored at Rad[11][0]


        //ยังทำไม่ถึง
        // 'ลัคนา == 9707.85714285
        Rad[10][0] = Rad[1][0];
        // 'รอบที่ 1 (0)  คำนวณ ดาว 0-10 ระบบดวงอีแปะ   รอบที่ 2 (1)  คำนวณ ดาว 0-10 ระบบดวง 10 ลัคนา
        for (let e10 = 0; e10 <= 1; e10++) {

            // 'ทำดาว 0-12   มฤตยู - พูลโต (11 เนปจูน  12 พูลโต)
            for (let ii = 0; ii <= 12; ii++) {
                // 'ให้โดดออกไปเลย ไม่ต้องทำต่อเพราะ 11 เนปจูน  12 พูลโต ไม่มีในระบบ 10 ลัคน์
                if ((ii === 11 || ii === 12) && e10 === 1) {
                    break;
                }

                // Accessing the corresponding Rad array value
                // 'A1 = Rad(ii, 0)  ระบบดวงอีแปะ    A1 = Rad(ii, 1) ระบบดวง 10 ลัคนา  2 ขึ้นไปไม่มี
                let A1 = Rad[ii][e10];

                // console.log(A1, ii , e10);

                // 'รับค่า  ดาวนี้ (ii) อยู่ราศี....... เช่น ดาว 1 อยู่ราศี 7   varBornPutdate_StarStayR(e10, 1)=7
                varBornPutdate_StarStayR[e10][ii] = Math.floor(A1 / 1800);

                // console.log(varBornPutdate_StarStayR[e10][ii], e10, ii);

                let B1 = A1 - (varBornPutdate_StarStayR[e10][ii] * 1800);
                if (B1 === 0) B1 = 1;

                varBornPutdate_StarO[e10][ii] = Math.floor(B1 / 60) //'รับค่า ดาวนี้ (ii)  อยู่องศา..... 
                varBornPutdate_StarL[e10][ii] = Math.floor(B1 - (varBornPutdate_StarO[e10][ii]) * 60) //'รับค่า ดาวนี้ (ii)  อยู่ลิปดา..... 

                // 'ฤกษ์ ที่ผ่านมาแล้ว (ได้ผ่านฤกษ์นี้แล้ว)
                varBornPutdate_LerkPass[e10][ii] = Math.floor(A1 * 0.00125); //'ฤกษ์ที่..n...ได้ผ่านไปแล้ว
                // 'ฤกษ์ที่..n...ได้ผ่านไปแล้ว..n..นาที
                // varBornPutdate_MLerkPass[e10][ii] = MSVB6.Right("00" & Math.floorMath.floor(((A1 * 0.00125) - (Val(varBornPutdate_LerkPass[e10][ii]))) * 60), 2)
                let minutes = Math.floor(((A1 * 0.00125) - Number(varBornPutdate_LerkPass[e10][ii])) * 60);
                varBornPutdate_MLerkPass[e10][ii] = minutes.toString().padStart(2, '0');

                let SecLerk = Math.floor(((((A1 * 0.00125) - Number(varBornPutdate_LerkPass[e10][ii])) * 60) % 1) * 60);
                let SecLerkString = SecLerk.toFixed(2);
                let formattedSecLerk = ("00" + parseInt(SecLerkString.split('.')[0])).slice(-2);
                varBornPutdate_SecLerkPass[e10][ii] = formattedSecLerk;

                // 'ฤกษ์ปัจจุบัน (ขณะนี้อยู่ฤกษ์ที่...)
                let NoTimei1To9;
                let Timei = Math.floor(A1 * 0.00125) + 1;

                if (Timei > 27) Timei = 1;
                varBornPutdate_LerkNow[e10][ii] = Timei;
                varBornPutdate_NLerkNow[e10][ii] = formatDate.fcTime27To9(Timei) & ". " & formatDate.fcTimeNoiToS(Timei, NoTimei1To9);
                varBornPutdate_No1To9LerkNow[e10][ii] = formatDate.fcTime27To9(Timei);
                varBornPutdate_FixedStarLerkNow[e10][ii] = formatDate.fcTimeFixedStar(Timei);

                // console.log(varBornPutdate_LerkNow[e10][ii]);
                // console.log(varBornPutdate_NLerkNow[e10][ii]);
                // console.log(varBornPutdate_No1To9LerkNow[e10][ii]);
                // console.log(varBornPutdate_FixedStarLerkNow[e10][ii]);

                // 'แก้การ Error เมื่อดาวอยู่ราศี 12 คือ จำนวน Rad(n,n)  / 1800 ได้ 12
                if (varBornPutdate_StarStayR[e10][ii] >= 12) varBornPutdate_StarStayR[e10][ii] = 0;

                let varBornPutdate_TriStarAsRasee = [];
                let varBornPutdate_Nasss = [];
                let varBornPutdate_NavangStarAsRasee = [];
                let varBornPutdate_Tri = [];
                let varBornPutdate_Trisss = [];
                let varBornPutdate_TriyangHarmi = [];

                //''ขณะกำลังทำ ช่องราศีแสดงราศี ซึ่งในช่องนี้มีดาว..i (0-10)..อยู่
                if (varBornPutdate_StarStayR[e10][ii] == 0) {
                    if (B1 > 0 && B1 <= 200) {
                        varBornPutdate_Nasss[e10][ii] = "1:3:0";
                        varBornPutdate_NavangStarAsRasee[e10][ii] = 0;
                        varBornPutdate_Tri[e10][ii] = 3;
                        varBornPutdate_Trisss[e10][ii] = "3:0";
                        varBornPutdate_TriyangHarmi[e10][ii] = 1;
                    }
                    if (B1 > 200 && B1 <= 400) {
                        varBornPutdate_Nasss[e10][ii] = "2:6:1";
                        varBornPutdate_NavangStarAsRasee[e10][ii] = 1;
                        varBornPutdate_Tri[e10][ii] = 3;
                        varBornPutdate_Trisss[e10][ii] = "3:0";
                        varBornPutdate_TriyangHarmi[e10][ii] = 1;
                    }
                    if (B1 > 400 && B1 <= 600) {
                        varBornPutdate_Nasss[e10][ii] = "3:4:2";
                        varBornPutdate_NavangStarAsRasee[e10][ii] = 2;
                        varBornPutdate_Tri[e10][ii] = 3;
                        varBornPutdate_Trisss[e10][ii] = "3:0";
                        varBornPutdate_TriyangHarmi[e10][ii] = 1;
                    }

                }

                // console.log(varBornPutdate_StarStayR);
                // console.log(varBornPutdate_Nasss);
                // console.log(varBornPutdate_NavangStarAsRasee);
                // console.log(varBornPutdate_Tri);
                // console.log(varBornPutdate_Trisss);
                // console.log(varBornPutdate_TriyangHarmi);

            } //' For ii = 0 To 10 'ทำดาว 0-10
        } //'For E10 = 0 To 1  'รอบที่ 1 (0)  คำนวณ ดาว 0-10 ระบบดวงอีแปะ   รอบที่ 2 (1)  คำนวณ ดาว 0-10 ระบบดวง 10 ลัคนา

    }

    // if (Lukdate) {

    //     let [yearL, monthL, dayL] = Lukdate.split('-');
    //     let NewLukDate = new Date(yearL, monthL - 1, dayL);
    //     const lblDayLuk = await helpers.calculateLunarDay(NewLukDate, currentHour, currentMinute, 0, null);
    //     const lblDayTodayLuk = helpers.fcDayi17ToS(lblDayLuk.daySuni);
    //     const SurisLuk = lblDayTodayLuk.replace("(กลางวัน)", "").replace("(กลางคืน)", "");
    //     let lblDaySTodaySuriyaKatiNow = "สุริยคติ: " + SurisLuk;
    //     const getMoonLuk = await helpers.SetUpDownMThaiMoon(NewLukDate, lblDayLuk.dayMooni, lblDayLuk.daySuni);
    //     LukMoonInfo = getMoonLuk.MoonInfo;
    //     const LukTimeInfo = await helpers.adjustBirthTime(NewLukDate, cboBorn_H, cboBorn_M, 0, null);
    //     YourLukDate = LukTimeInfo.formattedDate;

    // }


    res.render('birth_horoscope', {
        appName: 'API Services.',
        currentDate: currentDate,
        currentHour: currentHour,
        currentMinute: currentMinute,
        birthDate: birthDate,
        provinces: provinces,
        selectedProvinceId: sProv,
        cboBorn_H: cboBorn_H,
        cboBorn_M: cboBorn_M,
        CutTimeLocalYN: CutTimeLocalYN,
        cboBorn_Country_Option: cboBorn_Country_Option,
        YourName: YourName,
        YourSurName: YourSurName,
        lblDaySBirthSuriyaKati: SuriyatDate.lblDaySBirthSuriyaKati,
        YourBirthday: SuriyatDate.YourBirthday,
        YourBirthdayDateUse: SuriyatDate.YourBirthdayDateUse,
        YearAgeInfo: SuriyatDate.YearAgeInfo,
        birthDateMoonInfo: SuriyatDate.birthDateMoonInfo,
        LukMoonInfo: SuriyatDate.LukMoonInfo,
    });
};