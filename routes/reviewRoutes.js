const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });
// The above is... since each router has access to the params
// of their specific routes. But in reviewRoutes file, there
// is no acces to the tourId param in the routes that preceeds
// it and is available in the tourRoute. So we basicallyu
// need to merge the parameters.

// so if we get either
// Post /tour/34rhljr4t/reviews
// Post /reviews
// Both will end up in the handler below, and allow us access to the tourid.

// This is the route of reviews, we will later mount this router on /api/reviews
// (like we did with tours and users)
// we will import it in app.js

// We want authenticated users to add users, and users that are regular (not admin)
// nor tour guides.

// to do anything with reviews, one must be logged in
router.use(authController.protect);

// No for authorization.. no guides or admins can post
// reviews, only users.
// Admin should be able to update or delete reviews.
// Guides cannot add, edit or delete reviews, since
// guides or performing the tour.

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
