require('dotenv').config();

function checkApiKey(req, res, next) {

    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
        return res.status(401).json({
            error: 'API key is required'
        });
    }

    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({
            error: 'Invalid API key'
        });
    }
    
    next(); // Proceed to the next middleware/route handler
}

module.exports = checkApiKey;
