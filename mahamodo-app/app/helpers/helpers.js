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
    console.log(dateInput, Hour, min);
    
    const timezoneOffset = 7 * 60 * 60 * 1000; // UTC+7 สำหรับ Bangkok
    const currentDate = new Date();
    const pastDate = new Date(dateInput);

    // ตั้งค่าเวลาของ pastDate
    if (Hour !== undefined && min !== undefined) {
        pastDate.setHours(Hour);
        pastDate.setMinutes(min);
    }

    // คำนวณเวลาเป็น timestamp (แก้ไข timezone)
    pastDate.setTime(pastDate.getTime() + timezoneOffset);

    // คำนวณความแตกต่างระหว่างปัจจุบันกับวันเกิด
    const diffInSeconds = Math.floor((currentDate - pastDate) / 1000);

    const years = Math.floor(diffInSeconds / (365 * 24 * 3600));
    let remainingSeconds = diffInSeconds - years * 365 * 24 * 3600;

    const months = Math.floor(remainingSeconds / (30 * 24 * 3600));
    remainingSeconds -= months * 30 * 24 * 3600;

    const days = Math.floor(remainingSeconds / (24 * 3600));
    remainingSeconds -= days * 24 * 3600;

    const hours = Math.floor(remainingSeconds / 3600);
    remainingSeconds -= hours * 3600;

    const minutes = Math.floor(remainingSeconds / 60);

    // สร้างข้อความผลลัพธ์
    const formattedDiff = `${years} ปี ${months} เดือน ${days} วัน ${hours} ชั่วโมง ${minutes} นาที`;

    console.log(`Current: ${currentDate}, Past: ${pastDate}, Result: ${formattedDiff}`);
    return formattedDiff.trim();
}


module.exports = {
    calculateAges,
    getRandomZodiacSign,
    getSettingoption,
    formatTimeDifference,
};