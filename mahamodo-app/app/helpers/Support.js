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

 // 'พิเศษ 'ตั้งแต่ พ.ศ.2483 ลงไป ถ้าเป็นเดือน 1,2,3 (ม.ค., ก.พ., มี.ค.) ให้ + พ.ศ. เพิ่ม 1
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

    let NewDateUTC = new Date(Date.UTC(yearB, monthB - 1, dayB));

    return NewDateUTC;
}

// async function fcTime27To9(varInput) {
//     return ((varInput - 1) % 9) + 1;
// }

async function fcTime27To9(varInput) {
    var result = varInput % 9;
    return result === 0 ? 9 : result;
}

async function fcTimeNoiToS(varInput) {
    const mapping = {
        1: "ทลิทโท",
        2: "มหัทธโน",
        3: "โจโร",
        4: "ภูมิปาโล",
        5: "เทศาตรี",
        6: "เทวี",
        7: "เพชฌฆาต",
        8: "ราชา",
        9: "สมโณ"
    };

    const noTimei1To9 = ((varInput - 1) % 9) + 1;
    return {
        name: mapping[noTimei1To9],
        number: noTimei1To9
    };
}

async function fcTimeFixedStar(varInput) {
    const starsMapping = {
        1: "อัศวินี",
        2: "ภรณี",
        3: "กฤติกา",
        4: "โรหิณี",
        5: "มฤคศิร",
        6: "อารทรา",
        7: "ปุนัพสุ",
        8: "ปุษยะ",
        9: "อาศเลษา",
        10: "มาฆะ",
        11: "บุรพผลคุนี",
        12: "อุตรผลคุนี",
        13: "หัฏฐะ",
        14: "จิตรา",
        15: "สวาตี",
        16: "วิสาขะ",
        17: "อนุราธ",
        18: "เชษฐา",
        19: "มูละ",
        20: "บุรพสาฬหะ",
        21: "อุตตราสาฬหะ",
        22: "ศรวณะ",
        23: "ธนิษฐา",
        24: "ศตภิษัช",
        25: "บุรพภัทรบท",
        26: "อุตตรภัทรบท",
        27: "เรวดี"
    };

    return starsMapping[varInput] || "";
}

async function fciToSHarm(varInput) {
    switch (varInput) {
        case 0:
            return "พิษนาค";
        case 1:
            return "พิษครุฑ";
        case 2:
            return "พิษสุนัข";
        default:
            return "";
    }
}

async function fcPopiToS(VarInput) {
    const popMapping = {
        0: "ตนุ",
        1: "กดุมภะ",
        2: "สหัชชะ",
        3: "พันธุ",
        4: "ปุตตะ",
        5: "อริ",
        6: "ปัตนิ",
        7: "มรณะ",
        8: "ศุภะ",
        9: "กัมมะ",
        10: "ลาภะ",
        11: "วินาศ"
    };
    return popMapping[VarInput] || "";
}

async function fcStariToS(VarInput) {
    const popMapping = {
        0: "มฤตยู",
        1: "อาทิตย์",
        2: "จันทร์",
        3: "อังคาร",
        4: "พุธ",
        5: "พฤหัส",
        6: "ศุกร์",
        7: "เสาร์",
        8: "ราหู",
        9: "เกตุ",
    };
    return popMapping[VarInput] || "";
}

async function fcPopSToi(VarInput) {
    const popMapping = {
        "ตนุ": 0,
        "กดุมภะ": 1,
        "สหัชชะ": 2,
        "พันธุ": 3,
        "ปุตตะ": 4,
        "อริ": 5,
        "ปัตนิ": 6,
        "มรณะ": 7,
        "ศุภะ": 8,
        "กัมมะ": 9,
        "ลาภะ": 10,
        "วินาศ": 11
    };
    return popMapping[VarInput] || 0;
}

async function fcMonthiToSSht(VarInput) {
    const popMapping = {
        1: "ม.ค.",
        2: "ก.พ.",
        3: "มี.ค.",
        4: "เม.ย.",
        5: "พ.ค.",
        6: "มิ.ย.",
        7: "ก.ค.",
        8: "ส.ค.",
        9: "ก.ย.",
        10: "ต.ค.",
        11: "พ.ย.",
        12: "ธ.ค.",
    };
    return popMapping[VarInput] || "";
}

async function SpeedChar_Born(VarInput){
    const popMapping = {
        1: "พ",
        2: "ม",
        3: "",
        4: "ส",
    };
    return popMapping[VarInput] || "";
}

async function fcTimeSToi(VarInput) {
    switch (VarInput) {
        case "ทลิทโท":
            return 1;
        case "มหัทธโน":
            return 2;
        case "โจโร":
            return 3;
        case "ภูมิปาโล":
            return 4;
        case "เทศาตรี":
            return 5;
        case "เทวี":
            return 6;
        case "เพชฌฆาต":
            return 7;
        case "ราชา":
            return 8;
        case "สมโณ":
            return 9;
        default:
            return 0;
    }
}

async function fcRaseeToStarKased(VarInput) {
    switch (VarInput) {
        case 0:
            return 3;
        case 1:
            return 6;
        case 2:
            return 4;
        case 3:
            return 2;
        case 4:
            return 1;
        case 5:
            return 4;
        case 6:
            return 6;
        case 7:
            return 3;
        case 8:
            return 5;
        case 9:
            return 7;
        case 10:
            return 8;
        case 11:
            return 5;
        default:
            return -1;
    }
}

async function fcRaseeToStarPra(VarInput) {
    switch (VarInput) {
        case 0:
            return 6;
        case 1:
            return 3;
        case 2:
            return 5;
        case 3:
            return 7;
        case 4:
            return 8;
        case 5:
            return 5;
        case 6:
            return 3;
        case 7:
            return 6;
        case 8:
            return 4;
        case 9:
            return 2;
        case 10:
            return 1;
        case 11:
            return 4;
        default:
            return -1;
    }
}

async function fcRaseeToStarMahauj(VarInput) {
    switch (VarInput) {
        case 0:
            return 1;
        case 1:
            return 2;
        case 2:
            return 99;
        case 3:
            return 5;
        case 4:
            return 99;
        case 5:
            return 4;
        case 6:
            return 7;
        case 7:
            return 8;
        case 8:
            return 99;
        case 9:
            return 3;
        case 10:
            return 99;
        case 11:
            return 6;
        default:
            return -1;
    }
}

async function fcRaseeToStarNij(VarInput) {
    switch (VarInput) {
        case 0:
            return 7;
        case 1:
            return 8;
        case 2:
            return 99;
        case 3:
            return 3;
        case 4:
            return 99;
        case 5:
            return 6;
        case 6:
            return 1;
        case 7:
            return 2;
        case 8:
            return 99;
        case 9:
            return 5;
        case 10:
            return 99;
        case 11:
            return 4;
        default:
            return -1; // Handle unexpected input
    }
}

async function fcRaseeToStarMahajak(VarInput) {
    switch (VarInput) {
        case 0:
            return 2;
        case 1:
            return 7;
        case 2:
            return 99;
        case 3:
            return 1;
        case 4:
            return 4;
        case 5:
            return 3;
        case 6:
            return 99;
        case 7:
            return 5;
        case 8:
            return 6;
        case 9:
            return 8;
        case 10:
            return 99;
        case 11:
            return 99;
        default:
            return -1; // Handle unexpected input
    }
}

async function fcRaseeToStarRachachock(VarInput) {
    switch (VarInput) {
        case 0:
            return 5;
        case 1:
            return 3;
        case 2:
            return 1;
        case 3:
            return 6;
        case 4:
            return 4;
        case 5:
            return 2;
        case 6:
            return 8;
        case 7:
            return 7;
        case 8:
            return 99;
        case 9:
            return 99;
        case 10:
            return 99;
        case 11:
            return 99;
        default:
            return -1;
    }
}

async function fcRaseeiToS(varInput) {
    let result = "";
    switch (varInput) {
        case 0:
            result = "เมษ";
            break;
        case 1:
            result = "พฤษภ";
            break;
        case 2:
            result = "เมถุน";
            break;
        case 3:
            result = "กรกฎ";
            break;
        case 4:
            result = "สิงห์";
            break;
        case 5:
            result = "กันย์";
            break;
        case 6:
            result = "ตุลย์";
            break;
        case 7:
            result = "พิจิก";
            break;
        case 8:
            result = "ธนู";
            break;
        case 9:
            result = "มังกร";
            break;
        case 10:
            result = "กุมภ์";
            break;
        case 11:
            result = "มีน";
            break;
        default:
            result = "Unknown"; // Optional: handle undefined or unexpected inputs.
    }
    return result;
}

module.exports = {
    fcDayi17ToS,
    fcYearOldiToS,
    getCharGroupForSetname,
    fcNoEToTh,
    fcMonthSFToSht,
    fcMonthiToSF,
    fcDateGlobal,
    fcTime27To9,
    fcTimeNoiToS,
    fcTimeFixedStar,
    fciToSHarm,
    fcPopiToS,
    fcRaseeToStarKased,
    fcRaseeToStarPra,
    fcRaseeToStarMahauj,
    fcRaseeToStarNij,
    fcRaseeToStarMahajak,
    fcRaseeToStarRachachock,
    fcRaseeiToS,
    fcStariToS,
    fcPopSToi,
    fcTimeSToi,
    fcMonthiToSSht,
    SpeedChar_Born
}