const helpers = require('../helpers/helpers');

// รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
exports.putDate = async (req, res) => {

    let provinces = await helpers.getProvince();
    let YourName = req.query.YourName;
    let YourSurName = req.query.YourSurName;

    let CutTimeLocalYN = req.query.CutTimeLocalYN;
    let birthDate = req.query.birthdate ? req.query.birthdate : "Not provided";
    let sProv = req.query.sProv;
    let YourProvsLuk = req.query.sProv;
    let cboBorn_Country_Option = req.query.cboBorn_Country_Option;
    let cboBorn_H = req.query.cboBorn_H;
    let cboBorn_M = req.query.cboBorn_M;

    let now = new Date();
    let cboNumToday = now;
    let cboMonthToday = helpers.fcMonthiToSF((now.getMonth() + 1));

    // วันนี้ จันทรคติ สุรยคติ

    if (birthDate) {
        let NumTodayi = now.getDate();
        let MonthTodayi = now.getMonth() + 1; // JavaScript months are 0-indexed
        let YearBTodayi = now.getFullYear() + 543; // Adding 543 for the Thai solar calendar year
        let YearKTodayi = now.getFullYear();
        let DayTodayMooni = "";
        let DateSerialYMDToday;

    
        //กับไปแก้ 
        if (cboBorn_Country_Option === "ประเทศไทย") {
            DateSerialYMDToday = new Date(YearBTodayi, MonthTodayi - 1, NumTodayi); // m-d-Y and Weekday
        } else {
            DateSerialYMDToday = new Date(YearKTodayi, MonthTodayi - 1, NumTodayi); 
        }

        DayTodayMooni = DateSerialYMDToday.getDay() - 1;

        DayTodaySuni = DayTodayMooni; // 'วัน 1-8 แบบจันทรคติ (ให้รับค่าเหมือนกันกับ จันทรคติไปก่อน จะมีเงื่อนไปเปลี่ยนแปลงทีหลัง)

        DayTodayMooni = (DayTodayMooni === 0) ? 7 : DayTodayMooni; // Adjusting so Sunday is 7 instead of 0

        
        let totalMinutesToday = now.getHours() * 60 + now.getMinutes();

        if (totalMinutesToday < 6 * 60) {
            DayTodayMooni = DayTodayMooni - 1;
        }

        if (DayTodayMooni == 0) {
            DayTodayMooni = 7;
        }

        if (DayTodayMooni === 4 && totalMinutesToday >= 18 * 60) {
            DayTodayMooni = 8;
        }

        if (DayTodayMooni === 5 && totalMinutesToday < 6 * 60) {
            DayTodayMooni = 8;
        }

        let lblDayTodayS = helpers.fcDayi17ToS(DayTodayMooni);
        let Suris = lblDayTodayS.replace("(กลางวัน)", "").replace("(กลางคืน)", "");
        let lblDaySTodaySuriyaKati = "สุริยคติ: " + Suris;
        //end

        // จันทรคติ ขึ้น-แรม เดือน ปี วันนี้
        let DownUps = "-";
        let Nighti = 0;
        let MThai = 0;
        let YThai = 0;
        var sqlMoon;

        let chkSetUpDownMThaiMoon = await helpers.fcGetItemInTableDB("chkSetUpDownMThaiMoon", "settingoption", "id=1");
        if (chkSetUpDownMThaiMoon === 'ใช่') {
            let day = now.getDate().toString().padStart(2, '0');
            let month = (now.getMonth() + 1).toString().padStart(2, '0');
            let year = (now.getFullYear() + 543).toString();

            if (DayTodaySuni === DayTodayMooni) {
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
            // Handling the else condition similarly.
            let day = now.getDate().toString().padStart(2, '0');
            let month = (now.getMonth() + 1).toString().padStart(2, '0');
            let year = (now.getFullYear() + 543).toString();
            sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${day}/${month}/${year}'`;
        }

        // 'ถ้าตรงตามเงื่อนไขนี้ก็ให้ใช้ตามสากล
        // 'กรณีวันนี้เป็นวันพุธ เวลา 18.00-23.59 น.  สุริยคติเป็น 4  จันทรคติเป็น 8  เงื่อนไขข้างบน If แรกจะเป็นจริง แล้วจะย้อนหลัง เพื่อหาขึ้นแรม เพราะ สุริยกับจันทรไม่เท่ากัน ซึ่งการย้อนหลังจะผิดเพี้ยน
        // 'จึงทำเงื่อนไขนี้ไว้ ถ้า สุริิยคติ=4 จันทรคติ=8 แสดงว่าเวลาปัจจุบันตอนนี้คือ 18.00-23.59 ไม่ต้องย้อนหลัง เพราะวัน 8 ก็ยังถือว่าเป็นวันวันเดียวกันอยู่ (คือวันพุธ) ยังใช้ขึ้น-แรมเดียวกัน  ฉะนั้นจึงให้หาขึ้นแรมแบบสากล
        if (DayTodaySuni === 4 && DayTodayMooni === 8) {
            let now = new Date();
            let day = now.getDate().toString().padStart(2, '0');
            let month = (now.getMonth() + 1).toString().padStart(2, '0');
            let year = (now.getFullYear() + 543).toString();
            sqlMoon = `SELECT * FROM calendar_moon WHERE dmy='${day}/${month}/${year}'`;
        }

        const getMoonData = await helpers.dbQuery(sqlMoon);
        if (getMoonData && getMoonData.length > 0) {
            DownUps = getMoonData[0].downup === 1 ? "แรม" : "ขึ้น";
            Nighti = getMoonData[0].night;
            MThai = getMoonData[0].mthai;
            YThai = getMoonData[0].ythai;
            console.log(DownUps, Nighti, MThai, YThai);
        } else {
            console.error("No data returned from the query.");
        }

    }

    res.render('birth_horoscope', {
        appName: 'Mahamodo Put Date Process',
        birthDate: birthDate,
        provinces: provinces,
        selectedProvinceId: sProv,
        cboBorn_H: cboBorn_H,
        cboBorn_M: cboBorn_M,
        CutTimeLocalYN: CutTimeLocalYN,
        cboBorn_Country_Option: cboBorn_Country_Option,
        YourName: YourName,
        YourSurName: YourSurName,
    });


    //luckana bk
    // let sHs = "ไม่ทราบ";
    // let sMs = "ไม่ทราบ";

    // // เงื่อนไขเกิดที่ประเทศใด
    // if (cboBorn_Country_Option == 'ประเทศไทย') {
    //     if (!cboBorn_H && !cboBorn_M) {
    //         cboBorn_H = "ไม่ทราบ";
    //         cboBorn_M = "ไม่ทราบ";

    //         if (!sProv) {
    //             YourProvsLuk = "ไม่ทราบ";
    //             sHs = "06";
    //             sMs = "30";
    //             sProv = "กรุงเทพมหานคร";
    //         } else {
    //             sHs = "06";
    //             sMs = "30";
    //             sProv = YourProvsLuk.trim();
    //         }
    //     } else {
    //         sHs = cboBorn_H.trim();
    //         sMs = cboBorn_M.trim();
    //         if (!sProv) {
    //             YourProvsLuk = "ไม่ระบุสถานที่เกิด";
    //             sProv = "ไม่ระบุสถานที่เกิด";
    //         } else {
    //             sProv = YourProvsLuk.trim();
    //         }
    //     }

    // } else if (cboBorn_Country_Option == 'ต่างประเทศ') {
    //     if (!cboBorn_H && !cboBorn_M) {
    //         cboBorn_H = "ไม่ทราบ";
    //         cboBorn_M = "ไม่ทราบ";
    //         sHs = "06";
    //         sMs = "30";
    //     } else {
    //         sHs = cboBorn_H.trim();
    //         sMs = cboBorn_M.trim();
    //     }
    // }

    // if (req.query.birthdate) {
    //     let [YearKBornLuk, month, day] = req.query.birthdate.split('-');
    //     if ((YearKBornLuk + 543) <= 2483) {
    //         if (month >= 1 && month <= 3) {
    //             YearKBornLuk = (YearKBornLuk - 543) + 1
    //         }
    //     }

    //     let MonthShortBornLuk = helpers.fcMonthSFToSht(month);
    // }

    // let sTimeLocalThisProv = await helpers.fcGetLukTimeLocalThailandThisProvValue(sProv) //' -00:24.21  รับค่าเวลาท้องถิ่นเพื่อนำไปใช้
    // let varTLocalCut_Luk = 0; // 'ค่าที่จะนำไปตัดเวลาหาลัคนาใน CastHoroscope_AutoMinit ค่าเริ่มต้นที่ 0 ก่อน

    // Case "ประเทศไทย" 
    // let MinuteLocal, intTimeHBorn, intTimeMBorn, intTimeAllMBorn = '';
    // if (cboBorn_Country_Option == 'ประเทศไทย') {
    //     if (CutTimeLocalYN == 1) {
    //         let sTLC = sTimeLocalThisProv.substring(4, 6); // Extracting '24' from '-00:24:21'
    //         let MinuteLocal = parseInt(sTLC, 10); // Converting '24' to 24
    //         let intTimeHBorn = parseInt(sHs, 10); // Converting hours string to number
    //         let intTimeMBorn = parseInt(sMs, 10); // Converting minutes string to number
    //         let intTimeAllMBorn = (intTimeHBorn * 60) + intTimeMBorn; // Converting total birth time to minutes
    //     }
    // }
};