const helpers = require('../helpers/helpers');
const db = require('../helpers/db');
const main = require('../helpers/main');
const Support = require('../helpers/Support');
const {
    logger
} = require('sequelize/lib/utils/logger');

// รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
exports.putDate = async (req, res) => {

    let NewBirthDate, SuriyatDate, SompodStar, SompodStar10, TodaySuriyatDate, SompodStarToday, SompodStarToday10;
    let provinces = await db.getProvince();
    let YourName = req.query.YourName;
    let YourSurName = req.query.YourSurName;
    let CutTimeLocalYN = req.query.CutTimeLocalYN;
    let birthDate = req.query.birthdate ? req.query.birthdate : "Not provided";
    let sProv = req.query.sProv;
    let cboBorn_Country_Option = req.query.cboBorn_Country_Option;
    let cboBorn_H = req.query.cboBorn_H;
    let cboBorn_M = req.query.cboBorn_M;
    let Today = req.query.Today;
    let LukH = req.query.LukH;
    let LukM = req.query.LukM;

    let now = new Date(Today);
    // let currentDate = now.toISOString().split('T')[0];
    let currentDate = new Intl.DateTimeFormat('en-CA', { // 'en-CA' uses YYYY-MM-DD format by default
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Bangkok'
    }).format(now);

    let currentHour = LukH.padStart(2, '0');
    let currentMinute = LukM.padStart(2, '0');
    let yourCurrentDate = 'วันที่ ' + currentDate + ' เวลา ' + currentHour + ':' + currentMinute + ' น.';

    // ' รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
    if (birthDate) {
        NewBirthDate = await Support.fcDateGlobal(birthDate);
        SuriyatDate = await main.CastHoroscope_SumSuriyatMain_Born(NewBirthDate, cboBorn_H, cboBorn_M, CutTimeLocalYN, sProv);
        SompodStar = await rdiOptionSompodBorn_Ra_CheckedChanged(1, SuriyatDate);
        SompodStar10 = await rdiOptionSompodBorn_Ra_CheckedChanged(2, SuriyatDate);
    }

    // dayMooni: SuriyatDate.dayMooni,
    // daySuni: SuriyatDate.daySuni,
    // ' รับค่าสมผุส จร (สมผุสดาววันนี้)
    if (Today) {
        NewTodayDate = await Support.fcDateGlobal(Today);
        TodaySuriyatDate = await main.CastHoroscope_SumSuriyatMain_Today(NewTodayDate, LukH, LukM);
        SompodStarToday = await rdiOptionSompodBorn_Ra_CheckedChanged(3, TodaySuriyatDate);
        SompodStarToday10 = await rdiOptionSompodBorn_Ra_CheckedChanged(4, TodaySuriyatDate);
    }

    let Pakakorn = await main.PakakornSompod(SuriyatDate);

    async function rdiOptionSompodBorn_Ra_CheckedChanged(option, SuriyatDate) {
        let SompodStarOnLabel;
        SompodStarOnLabel = await main.CastHoroscope_SompodStarOnLabel_Born_Today(option, SuriyatDate);
        return SompodStarOnLabel;
    }

    console.log(Pakakorn.Query_StarStayR);

    res.render('birth_horoscope', {
        appName: 'API Services.',
        currentDate: currentDate,
        currentHour: currentHour,
        currentMinute: currentMinute,
        yourCurrentDate: yourCurrentDate,
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
        SompodStar: SompodStar,
        SompodStar10: SompodStar10,
        SompodStarToday: SompodStarToday,
        SompodStarToday10: SompodStarToday10,
        varBornLuk_PopsChars : Pakakorn.varBornLuk_PopsChars,
        varBornLuk_OwnerHousePopSS : Pakakorn.varBornLuk_OwnerHousePopSS,
        varBornLuk_KasediInPopistr : Pakakorn.varBornLuk_KasediInPopistr,
        Query_StarStayR10 : Pakakorn.Query_StarStayR10,

    });
};