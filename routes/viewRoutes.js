const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// We want mw to be applied to all routes, is logged in
//router.use(authController.isLoggedIn); we remove this line
// since /me route uses protect and both this and is loggedIn,
// checked if user is logged in, whcih is not good for performance

// It doesnt matter if we add createbookingcheckout at the begginini
// since it doesnt matter if we are logged in or not. This is a temp soln
// unitl we have site deployed.
router.get(
    '/',
    bookingController.createBookingCheckout,
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
