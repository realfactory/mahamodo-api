require("dotenv").config();
const path = require('path');
const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.static('public'));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
var corsOptions = { origin: "http://localhost:8081" };

const checkApiKey = require('./app/middlewares/checkApiKey');
const checkStaticIP = require('./app/middlewares/checkStickIP')

const apiRoutes = require('./app/routes/api.routes');
const Routes = require('./app/routes/routes');

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use('/', Routes);

// app.use('/api', checkStaticIP);

app.use('/api', checkApiKey);

app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});