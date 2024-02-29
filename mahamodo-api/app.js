const express = require('express');
const app = express();
const port = 3000;
const checkApiKey = require('./middlewares/checkApiKey');

const apiRoutes = require('./routes/api.routes');

app.use(express.json());


app.get('/', (req, res) => {
    res.send('Welcome Mahamodo API Service.');
});

// Apply the checkApiKey middleware globally to all routes under /api
app.use('/api', checkApiKey);

app.use('/api', apiRoutes);

// If you have an endpoint directly under /api that needs protection
app.get('/api', checkApiKey, (req, res) => {
    res.json({
        message: 'You have access to the protected data.'
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});