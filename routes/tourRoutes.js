const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
//const reviewController = require('../controllers/reviewController');
const reviewRouter = require('./reviewRoutes');

// Or we can use destructuring
//const {getAllTours, createTour, getTour, updateTour, deleteTour} = require('./../controllers/tourController');

// It is convention to change tourRouter => router
const router = express.Router();

// For nested routes
// This means that for the specific route we declare,
// we want to use the reviewRouter. Basically, we are mounting
// a router (see app.js).. So now the tour router and review router
// are nicely decoupled. But there is one piece missing. We needm
// the rev router to access the tourId param
router.use('/:tourId/reviews', reviewRouter);

// This middleware funct grabs id from tour route
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

//latlng are the coordinates of my location
// distance of max travel I am willing to take
// unit km or mi
router
    .route('/tours-within/:distance/center/:latlng/unit/:unit')
    .get(tourController.getToursWithin);
// /tours-distance?distance=233&center=-40,45&unit=mi
// above would be one using query strings, but the other way
// is a bit cleaner.
// tours-distance/233/center/-40,45/unit/mi

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

// POST /tour/34rjfka3/reviews
// Get /tour/23h34ktjh3/reviews/sfjkl234jrlk34j  to get a review

// It might seem counter intuitive to call the reviewContoller
// in the tour route, but since we are doing nested routes,
// then we do so.
// So now we our using tourId, and we need to let the controller,
//know to use this id, and user id. so this will be in review controller.

// This is a simple nested post route, the review route
// is within the tour route since reviews belong to tours
// The problem with this is that it is a bit messy, because
// we put a route for creating a review in the tour routes,
// and we have a similar piece of code in the reviews (duplicate code)
// We will fix this using an EXPRESS feature called
// MERGE PARAMS (see reviewRoutes.js) It lets the reviewRoutes access the tourId param
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
