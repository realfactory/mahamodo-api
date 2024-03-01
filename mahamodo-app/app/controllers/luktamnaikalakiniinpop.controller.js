// const Luktamnaikalakiniinpop = require('../models/luktamnaikalakiniinpop.model');

// const LuktamnaikalakiniinpopController = {

//     List: async (req, res) => {
//         try {
//             Luktamnaikalakiniinpop.findAll().then(resData => {
//                 res.json(resData);
//             }).catch(error => {
//                 console.error('Error:', error);
//             });
//         } catch (error) {
//             res.status(500).send({
//                 message: 'Error retrieving Luktamnaikalakiniinpop' + error
//             });
//         }
//     },
//     Update: async (req, res) => {
//         try {

//             if (!req.body || !req.body.id) {
//                 return res.status(400).send({
//                     message: 'Missing required fields'
//                 });
//             }

//             const resData = await Luktamnaikalakiniinpop.findUpdate(req.body);

//             res.json(resData);

//         } catch (error) {
//             res.status(500).send({
//                 message: 'Error retrieving Luktamnaikalakiniinpop' + error
//             });
//         }
//     }

// };

// module.exports = LuktamnaikalakiniinpopController;

const db = require("../models");

const LukModel = db.luktamnaikalakiniinpops;

const Op = db.Sequelize.Op;

exports.findAll = (req, res) => {
    LukModel.findAll()
        .then(data => {
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving tutorials."
            });
        });
};

exports.update = (req, res) => {

    if (!req.body || !req.body.id) {
        return res.status(400).send({
            message: 'Missing required fields'
        });
    }

    const id = req.body.id;

    LukModel.update(req.body, {where: {id: id}})
        .then(num => {
            if (num == 1) {
                LukModel.findByPk(id)
                    .then(data => {
                        res.send({data : data , message : "Luktamnaikalakiniinpop was updated successfully." });
                    })
                    .catch(err => {
                        res.status(500).send({
                            message: "Error retrieving Tutorial with id=" + id
                        });
                    });
            } else {
                res.send({
                    message: `Cannot update Luktamnaikalakiniinpop with id=${id}. Maybe Luktamnaikalakiniinpop was not found or req.body is empty!`
                });
            }
        })
        .catch(err => {
            res.status(500).send({
                message: "Error updating Luktamnaikalakiniinpop with id=" + id
            });
        });
};