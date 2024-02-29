const express = require('express');
const router = express.Router();

// Import your user controller
const userController = require('../controllers/user.controller');

// Define routes
router.get('/users', userController.listUsers);
// router.post('/users', userController.createUser);
// router.get('/users/:id', userController.getUser);
// router.put('/users/:id', userController.updateUser);
// router.delete('/users/:id', userController.deleteUser);

// Export the router
module.exports = router;