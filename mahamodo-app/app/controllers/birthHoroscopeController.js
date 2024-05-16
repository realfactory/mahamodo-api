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
    let yourCurrentDate = 'วันที่ ' + now + ' เวลา ' + currentHour + ':' + currentMinute + ' น.';

    // ' รับค่าสมผุส เดิม (สมผุสดาวกำเนิด)
    if (birthDate) {
        NewBirthDate = await Support.fcDateGlobal(birthDate);
        SuriyatDate = await main.CastHoroscope_SumSuriyatMain_Born(NewBirthDate, cboBorn_H, cboBorn_M, CutTimeLocalYN, sProv);
        SompodStar = await rdiOptionSompodBorn_Ra_CheckedChanged(1, SuriyatDate);
        SompodStar10 = await rdiOptionSompodBorn_Ra_CheckedChanged(2, SuriyatDate);
    }

    // ' รับค่าสมผุส จร (สมผุสดาววันนี้)
    if (Today) {
        NewTodayDate = await Support.fcDateGlobal(Today);
        TodaySuriyatDate = await main.CastHoroscope_SumSuriyatMain_Today(NewTodayDate, LukH, LukM);
        SompodStarToday = await rdiOptionSompodBorn_Ra_CheckedChanged(3, TodaySuriyatDate);
        SompodStarToday10 = await rdiOptionSompodBorn_Ra_CheckedChanged(4, TodaySuriyatDate);
    }

    let Pakakorn = await main.PakakornSompod(SuriyatDate, TodaySuriyatDate);

    async function rdiOptionSompodBorn_Ra_CheckedChanged(option, SuriyatDate) {
        let SompodStarOnLabel;
        SompodStarOnLabel = await main.CastHoroscope_SompodStarOnLabel_Born_Today(option, SuriyatDate);
        return SompodStarOnLabel;
    }

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

        varBornLuk_PopsChars: Pakakorn.varBornLuk_PopsChars,
        varBornLuk_OwnerHousePopSS: Pakakorn.varBornLuk_OwnerHousePopSS,
        varBornLuk_KasediInPopistr: Pakakorn.varBornLuk_KasediInPopistr,

        Query_StarStayR10: Pakakorn.Query_StarStayR10,

        AscendantPrediction_Title: Pakakorn.AscendantPrediction_Title,
        AscendantPrediction_Sub: Pakakorn.AscendantPrediction_Sub,
        AscendantPrediction_Desc: Pakakorn.AscendantPrediction_Desc,
        AscendantPredictionGem_Title: Pakakorn.AscendantPredictionGem_Title,
        AscendantPredictionGem_Desc: Pakakorn.AscendantPredictionGem_Desc,

        StarStay_GumLuk: Pakakorn.StarStay_GumLuk,
        StarStay_Patani: Pakakorn.StarStay_Patani,

        StarAsTanuSED_Title: Pakakorn.StarAsTanuSED_Title,
        StarAsTanuSED_Sub: Pakakorn.StarAsTanuSED_Sub,
        StarAsTanuSED_Desc: Pakakorn.StarAsTanuSED_Desc,

        Star_Same_Title: Pakakorn.Star_Same_Title,
        Star_Same_Sub: Pakakorn.Star_Same_Sub,
        Star_Same_Desc: Pakakorn.Star_Same_Desc,

        Standard_Stars_DuangRasee_Title: Pakakorn.Standard_Stars_DuangRasee_Title,
        Standard_Stars_DuangRasee_Sub: Pakakorn.Standard_Stars_DuangRasee_Sub,
        Standard_Stars_DuangRasee_Desc: Pakakorn.Standard_Stars_DuangRasee_Desc,

        Standard_Stars_DuangNavang_Sub: Pakakorn.Standard_Stars_DuangNavang_Sub,
        Standard_Stars_DuangNavang_Title: Pakakorn.Standard_Stars_DuangNavang_Title,
        Standard_Stars_DuangNavang_Desc: Pakakorn.Standard_Stars_DuangNavang_Desc,

        Star_Kalakini_Title: Pakakorn.Star_Kalakini_Title,
        Star_Kalakini_Sub: Pakakorn.Star_Kalakini_Sub,
        Star_Kalakini_Desc: Pakakorn.Star_Kalakini_Desc,

        Star_Born_TamPop_Title: Pakakorn.Star_Born_TamPop_Title, //คำทำนายพื้นดวงกำเนิด ตามดาวที่อยู่ในภพต่างๆ
        Star_Born_TamPop_Sub: Pakakorn.Star_Born_TamPop_Sub,
        Star_Born_TamPop_Desc: Pakakorn.Star_Born_TamPop_Desc,

        House_Star_Pops_Title: Pakakorn.House_Star_Pops_Title, //คำทำนายพื้นดวงกำเนิด ตามดาวเจ้าเรือนอยู่ในภพต่างๆ (ภพผสมภพ)
        House_Star_Pops_Sub: Pakakorn.House_Star_Pops_Sub,
        House_Star_Pops_Desc: Pakakorn.House_Star_Pops_Desc,

        Wandering_Star_Now_Title: Pakakorn.Wandering_Star_Now_Title, //คำทำนายเหตุการณ์ปัจจุบัน (ดาวจร)
        Wandering_Star_Now_Sub: Pakakorn.Wandering_Star_Now_Sub,
        StarAsInRaseeiAsStar_Sub: Pakakorn.StarAsInRaseeiAsStar_Sub,
        StarAsInRaseeiAsStar_Desc: Pakakorn.StarAsInRaseeiAsStar_Desc,
        StarAsInRaseeiAsStar_Move: Pakakorn.StarAsInRaseeiAsStar_Move,
        StarAsInRaseeiAsStar_Percent: Pakakorn.StarAsInRaseeiAsStar_Percent,

    });
};

exports.putDateForm = async (req, res) => {
    let provinces = await db.getProvince();
    res.render('birth_horoscope_form', {
        appName: 'API Services.',
        provinces: provinces,
    });
}