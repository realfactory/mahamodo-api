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
        // SumSompod = main.CastHoroscope_SumSompodStarCalendarAstronomy_Born(NewBirthDate, cboBorn_H, cboBorn_M, CutTimeLocalYN, sProv);

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