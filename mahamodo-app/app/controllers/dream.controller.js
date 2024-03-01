const db = require("../models");

const Dream = db.dreams;

const Op = db.Sequelize.Op;

exports.findAll = (req, res) => {
  Dream.findAll()
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving tutorials."
      });
    });
};

exports.Predict = (req, res) => {

  const predict = req.body.predict;

  const condition = predict ? { sdream: { [Op.like]: `%${predict}%` } } : null;

  Dream.findAll({ where: condition })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      console.error("Error while retrieving data:", err);
      res.status(500).send({
        message: "An error occurred while retrieving data."
      });
    });
    
};