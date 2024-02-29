const Luktamnaikalakiniinpop = require('../models/luktamnaikalakiniinpop.model');

const LuktamnaikalakiniinpopController = {

    List: async (req, res) => {
        try {
            Luktamnaikalakiniinpop.findAll().then(resData => {
                res.json(resData);
            }).catch(error => {
                console.error('Error:', error);
            });
        } catch (error) {
            res.status(500).send({
                message: 'Error retrieving Luktamnaikalakiniinpop' + error
            });
        }
    },
    Update: async (req, res) => {
        try {

            if (!req.body || !req.body.id) {
                return res.status(400).send({
                    message: 'Missing required fields'
                });
            }

            const resData = await Luktamnaikalakiniinpop.findUpdate(req.body);

            res.json(resData);

        } catch (error) {
            res.status(500).send({
                message: 'Error retrieving Luktamnaikalakiniinpop' + error
            });
        }
    }

};

module.exports = LuktamnaikalakiniinpopController;