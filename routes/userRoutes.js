const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Routes for User resources
// THIS SIGNUP IS FOR BACKEND ONLY
router.post('/signup', authController.signup);

// We use post for login since we want to send data from client to server
router.post('/login', authController.login);
router.get('/logout', authController.logout); // we use a get, since we are not sending or changing data

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// We are adding middleware to protect all routes below (middleware runs in sequence)
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);
router.patch(
    '/updateMe',
    userController.uploadUserPhoto,
    userController.resizeUserPhoto,
    userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));
// Now only admin can get all users, create  users, update and delete users
// PATTERN If no ID is in route, we get all users or create a new one
router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);
// If id is provided, we get 1 user, update 1 or delete 1
router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;
