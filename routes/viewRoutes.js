const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
//const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(viewsController.alert);

// createBookingCheckout (only for dev purposes - comment out for production)
router.get(
    '/',
    //bookingController.createBookingCheckout,
    authController.isLoggedIn,
    viewsController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);

router.get('/register', viewsController.getRegistrationFrom); //****/

router.post(
    '/submit-user-data',
    authController.protect,
    viewsController.updateUserData
);

module.exports = router;
