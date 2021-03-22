const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// For this, controllers for booking route, we won't follow REST principles
//  since this wont be using CRUD operations. It only serves for the client
// to get a checkout session.

router.use(authController.protect);
// We can test this using postman, but later on we don't want to allow this.
router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

// All of these will be protected and restricted to admin and lead guides
router.use(authController.restrictTo('admin', 'lead-guide'));

router
    .route('/')
    .get(bookingController.getAllBookings)
    .post(bookingController.createBooking);

router
    .route('/:id')
    .get(bookingController.getBooking)
    .patch(bookingController.updateBooking)
    .delete(bookingController.deleteBooking);

module.exports = router;
