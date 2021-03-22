const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });
// Each router has access to the params of their specific routes.
// But in this reviewRoutes file, there is no acces to the tourId
// param in the routes that preceeds it. But it is available in the tourRoute.
// So we basically, need to merge the parameters.
// So if we get either:
// Post /tour/34rhljr4t/reviews   or
// Post /reviews
// Both will end up in the handler below, and will allow us access to the tourid.

// To do anything with reviews, one must be logged in
router.use(authController.protect);

// No guides or admins can post reviews, only users.
// Admin should be able to update or delete reviews.
// Guides cannot add, edit or delete reviews, since guides are performing the tour.

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'),
        reviewController.seTourUserIds,
        reviewController.createReview
    );

router
    .route('/:id')
    .get(reviewController.getReview)
    .patch(
        authController.restrictTo('admin', 'user'),
        reviewController.updateReview
    )
    .delete(
        authController.restrictTo('admin', 'user'),
        reviewController.deleteReview
    );

module.exports = router;
