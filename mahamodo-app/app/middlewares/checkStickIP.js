const { log } = require('console');
require('dotenv').config();

function checkStaticIP(req, res, next) {
    // Get the real IP of the client from the request headers or socket information.
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // If the IP is an IPv4-mapped IPv6 address, extract the IPv4 part.
    if (ip.includes('::ffff:')) {
        ip = ip.split('::ffff:')[1];
    }

    // List of allowed IP addresses.
    const allowedIPs = ["127.0.0.1", "192.168.100.8"];

    // Check if the IP is provided.
    if (!ip) {
        return res.status(401).json({
            error: 'IP is required.'
        });
    }

    // Check if the IP is in the list of allowed IPs.
    if (!allowedIPs.includes(ip)) {
        return res.status(403).json({
            error: 'IP is not supported.'
        });
    }

    // If the IP is allowed, proceed to the next middleware or route handler.
    next();
}

module.exports = checkStaticIP;
