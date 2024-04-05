const connection = require('../config/db.mysql.js');
const db = require('./db.js');
const calendar = require('./calendarAstronomy.js');
const parameter = require('./parameter.js');


function calculateAges(req) {
    try {
        const birthdate = new Date(req.query.birthdate);
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

    // Set the hours and minutes if provided
    if (Hour !== undefined && min !== undefined) {
        pastDate.setHours(Hour);
        pastDate.setMinutes(min);
    }

    let diffInSeconds = Math.floor((currentDate - pastDate) / 1000);

    const years = Math.floor(diffInSeconds / (365 * 24 * 3600));
    diffInSeconds -= years * 365 * 24 * 3600;
    const months = Math.floor(diffInSeconds / (30 * 24 * 3600));
    diffInSeconds -= months * 30 * 24 * 3600;
    const days = Math.floor(diffInSeconds / (24 * 3600));
    diffInSeconds -= days * 24 * 3600;
    const hours = Math.floor(diffInSeconds / 3600);
    diffInSeconds -= hours * 3600;
    const minutes = Math.floor(diffInSeconds / 60);

    let formattedDiff = '';
    formattedDiff += years > 0 ? years + ' ปี ' : '';
    formattedDiff += months > 0 ? months + ' เดือน ' : '';
    formattedDiff += days > 0 ? days + ' วัน ' : '';
    formattedDiff += hours > 0 ? hours + ' ชั่วโมง ' : '';
    formattedDiff += minutes > 0 ? minutes + ' นาที ' : '';

    return formattedDiff.trim();
}

module.exports = {
    calculateAges,
    getRandomZodiacSign,
    getSettingoption,
    formatTimeDifference,
};