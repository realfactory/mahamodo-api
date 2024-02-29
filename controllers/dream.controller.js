const Dream = require('../models/dream.model');

const dreamController = {

    List: async (req, res) => {
        try {
            Dream.findAll().then(dreams => {
                res.json(dreams);
            }).catch(error => {
                console.error('Error:', error);
            });
        } catch (error) {
            res.status(500).send({
                message: 'Error retrieving Dream' + error
            });
        }
    },
    Predict: async (req, res) => {
        try {

            if (!req.body || typeof req.body.predict === 'undefined') {
                return res.status(400).send({
                    message: 'No predict field provided'
                });
            }

            const predictValue = req.body.predict;
          
            const dreams = await Dream.findPredict(predictValue);
            
            res.json(dreams);
            
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send({
                message: 'Error retrieving Dream: ' + error.message
            });
        }
    },
};

module.exports = dreamController;