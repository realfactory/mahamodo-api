function fcDayi17ToS(varInput) {
    const days = ["", "อาทิตย์", "จันทร์", "อังคาร", "พุธ (กลางวัน)", "พฤหัสบดี", "ศุกร์", "เสาร์", "พุธ (กลางคืน)"];
    return days[varInput] || "";
}

function fcYearOldiToS(VarInput) {
    const yearNames = ["", "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง", "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"];

    return yearNames[VarInput] || "";
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

function fcMonthSFToSht(month) {
    const shortMonth = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return month >= 1 && month <= 12 ? shortMonth[month - 1] : '';
}

function fcMonthiToSF(month) {
    const shortMonth = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return month >= 1 && month <= 12 ? shortMonth[month - 1] : '';
}

async function diffYearBorn(year, month) {
    let yearTh = parseInt(year) + 543;
    if (yearTh <= 2483 && month >= 1 && month <= 3) {
        yearTh += 1;
    }
    return yearTh - 543;
}

async function fcDateGlobal(InputDate) {
    
    let [yearB, monthB, dayB] = InputDate.split('-');

    yearB = await diffYearBorn(yearB, monthB);

    // let updatedDate = new Date(yearB, monthB - 1, dayB);

    let NewDateUTC = new Date(Date.UTC(yearB, monthB - 1, dayB));

    return NewDateUTC;
}

module.exports = {
    fcDayi17ToS,
    fcYearOldiToS,
    getCharGroupForSetname,
    fcNoEToTh,
    fcMonthSFToSht,
    fcMonthiToSF,
    fcDateGlobal,
}