const pool = require('../config/connection.mysql2');

class Luktamnaikalakiniinpop {
    constructor(id) {
        this.id = id;
    }

    static findAll() {
        return new Promise((resolve, reject) => {
            pool.query('SELECT * FROM luktamnaikalakiniinpop')
                .then(([rows]) => {
                    resolve(rows);
                })
                .catch(err => reject(err));
        });
    }

    static async findUpdate(data) {
        
        const { id, counsel, prompt } = data;

        const updateQuery = 'UPDATE luktamnaikalakiniinpop SET counsel = ?, prompt = ? WHERE id = ?';

        try {
            const [result] = await pool.query(updateQuery, [counsel, prompt, id]);

            if (result.affectedRows === 0) {
                throw new Error('Record not found or no update made.');
            }

            const [updatedRows] = await pool.query('SELECT * FROM luktamnaikalakiniinpop WHERE id = ?', [id]);
            return updatedRows.length > 0 ? updatedRows[0] : null;

        } catch (error) {
            throw error;
        }
    }

}

module.exports = Luktamnaikalakiniinpop;