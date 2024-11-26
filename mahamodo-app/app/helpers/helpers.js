const connection = require('../config/db.mysql.js');
const db = require('./db.js');
const calendar = require('./calendarAstronomy.js');
const parameter = require('./parameter.js');

async function calculateAges(dateInput) {
    try {
        const birthdate = new Date(dateInput);
        const today = new Date();
        let age = today.getFullYear() - birthdate.getFullYear();
        const m = today.getMonth() - birthdate.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
            age--;
        }

        return age;
    } catch (error) {
        throw error;
    }
}

function getRandomZodiacSign() {

    try {
        const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
        const sign = signs[Math.floor(Math.random() * signs.length)];

        return sign;

    } catch (error) {

        throw error;

    }
}

async function getSettingoption() {
    return new Promise((resolve, reject) => {
        const query = "SELECT * FROM settingoption where id = 1";
        connection.query(query, (error, results) => {
            if (error) {
                console.error(`Error occurred: ${error.message}`);
                reject(new Error(`Error retrieving data from the province table: ${error.message}`));
            } else {
                resolve(results);
            }
        });
    });
}

async function formatTimeDifference(dateInput, Hour, min) {
    const currentDate = new Date();
    const pastDate = new Date(dateInput);

    // ตั้งค่าเวลาในอดีต
    if (Hour !== undefined && min !== undefined) {
        pastDate.setHours(Hour);
        pastDate.setMinutes(min);
    }

    // คำนวณปี
    let years = currentDate.getFullYear() - pastDate.getFullYear();

    // คำนวณเดือน
    let months = currentDate.getMonth() - pastDate.getMonth();
    if (months < 0) {
        years--;
        months += 12;
    }

    // คำนวณวัน
    let days = currentDate.getDate() - pastDate.getDate();
    if (days < 0) {
        months--;
        const previousMonth = (currentDate.getMonth() - 1 + 12) % 12; // เดือนก่อนหน้า
        const yearForPreviousMonth = previousMonth === 11 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
        const daysInPreviousMonth = new Date(yearForPreviousMonth, previousMonth + 1, 0).getDate(); // วันในเดือนก่อนหน้า
        days += daysInPreviousMonth;
    }

    // คำนวณชั่วโมงและนาที
    let hours = currentDate.getHours() - pastDate.getHours();
    if (hours < 0) {
        days--;
        hours += 24;
    }

    let minutes = currentDate.getMinutes() - pastDate.getMinutes();
    if (minutes < 0) {
        hours--;
        minutes += 60;
    }

    // สร้างผลลัพธ์
    const formattedDiff = `${years} ปี ${months} เดือน ${days} วัน`;
    // const formattedDiff = `${years} ปี ${months} เดือน ${days} วัน ${hours} ชั่วโมง ${minutes} นาที`;

    console.log(`Current: ${currentDate}, Past: ${pastDate}, Result: ${formattedDiff}`);
    return formattedDiff.trim();
}


module.exports = {
    calculateAges,
    getRandomZodiacSign,
    getSettingoption,
    formatTimeDifference,
};