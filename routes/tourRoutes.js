const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
//const reviewController = require('../controllers/reviewController');
const reviewRouter = require('./reviewRoutes');

// It is a naming convention to simply name it router instead of tourRouter
const router = express.Router();

// Nested Routes
// For the specific route we declare, we want to use the reviewRouter.
// Basically, we are mounting a router (see app.js)..
// So now the tour router and review router are nicely decoupled.
// But there is one piece missing. We need the review router to access the tourId param.
router.use('/:tourId/reviews', reviewRouter);

// This middleware func grabs id from tour route
//router.param('id', tourController.checkId);

router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
    .route('/monthly-plan/:year')
    .get(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide', 'guide'),
        tourController.getMonthlyPlan
    );

// latlng - are the coordinates of my location
// distance - max travel I am willing to take
// unit - km or mi
router
    .route('/tours-within/:distance/center/:latlng/unit/:unit')
    .get(tourController.getToursWithin);
// /tours-distance?distance=233&center=-40,45&unit=mi
// Ex above would be one using query strings, but the other way
// is a bit cleaner. EX: tours-distance/233/center/-40,45/unit/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// We will remove authorization on get tour request in case
// we want to make an api for tour and make them accessible
// to other operators, so we remove authController.protect
router
    .route('/')
    .get(tourController.getAllTours)
    .post(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.createTour
    );
router
    .route('/:id')
    .get(tourController.getTour)
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.uploadTourImages,
        tourController.resizeTourImages,
        tourController.updateTour
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.deleteTour
    );

// This is a simple nested post route, the review route
// is within the tour route since reviews belong to tours.
// The problem with this is that it is a bit messy, because
// we put a route for creating a review in the tour routes,
// and we have a similar piece of code in the reviews (duplicate code).
// We will fix this using an EXPRESS feature called
// MERGE PARAMS (see reviewRoutes.js) It lets the reviewRoutes access the tourId param.
// 1st we import the review router in the tour router
// Look at the top of the script router.use() ...

// router
//     .route('/:tourId/reviews')
//     .post(
//         authController.protect,
//         authController.restrictTo('user'),
//         reviewController.createReview
//     );

module.exports = router;
