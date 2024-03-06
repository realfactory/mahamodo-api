require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
var corsOptions = {
    origin: "http://localhost:8081"
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({
    extended: true
}));

const checkApiKey = require('./app/middlewares/checkApiKey');
const apiRoutes = require('./app/routes/api.routes');

// simple route
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to mahamodo api  application."
    });
});

// Apply the checkApiKey middleware globally to all routes under /api
app.use('/api', checkApiKey);

app.use('/api', apiRoutes);

// require("./app/routes/turorial.routes")(app);

// set port, listen for requests
const PORT = process.env.NODE_DOCKER_PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});