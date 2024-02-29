const pool = require('../config/connection.mysql2');

class Dream {
  constructor(id) {
    this.id = id;
  }

  static findAll() {
    return new Promise((resolve, reject) => {
      pool.query('SELECT * FROM dream')
        .then(([rows]) => {
          // const dreams = rows.map(row => new Dream({id,sdream}));
          resolve(rows);
        })
        .catch(err => reject(err));
    });
  }

  static findPredict(req) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM dream WHERE sdream LIKE CONCAT("%", ?, "%") ORDER BY sdream DESC';
      pool.query(query, [req])
        .then(([rows]) => {
          resolve(rows);
        })
        .catch(err => reject(err));
    });
  }
}

module.exports = Dream;