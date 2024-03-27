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

    const now = new Date();
    const countryOption = "ประเทศไทย";
    if (now) {
        const lunarDay = helpers.calculateLunarDay(now);

        let lblDayTodayS = helpers.fcDayi17ToS(lunarDay.DaySuni);
        let Suris = lblDayTodayS.replace("(กลางวัน)", "").replace("(กลางคืน)", "");
        let lblDaySTodaySuriyaKati = "สุริยคติ: " + Suris;

        console.log(Suris);
        console.log(lblDaySTodaySuriyaKati);

        let setMoon = await helpers.SetUpDownMThaiMoon(now,  );
        console.log('setMoon ' + setMoon);

        // setMoon.then(function(resMoon){
        //     console.log('resMoon ' + resMoon);
        // });

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


};