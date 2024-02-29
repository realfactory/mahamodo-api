// Import your User model
const User = require('../models/user.model');

const userController = {
  // List all users
  listUsers: async (req, res) => {
    try {
        const users = await User.findAll();
    //   const users = await User.findOne({ where: { id: 1 } });
      res.json(users);
    } catch (error) {
      res.status(500).send({
        message: 'Error retrieving users' + error
      });
    }
  },
  // Additional controller methods (e.g., createUser, getUser, etc.)
};

module.exports = userController;
