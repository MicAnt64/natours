const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getOverview = catchAsync(async (req, res, next) => {
    // 1 - Get all the tour data from API collection
    const tours = await Tour.find();

    // 2 - Build template (done not in this controller)

    // 3 - Render the template with tour data
    res.status(200).render('overview', {
        title: 'All tours',
        tours: tours
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    // 1) Get data for the requested tour (include reviews and tour guides)
    //console.log(req.params);
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'review rating user'
    });

    if (!tour) {
        return next(new AppError('There is no tour with that name.', 404));
    }
    // 2) Build template

    // 3) Render template using the data from step 1
    res.status(200).render('tour', {
        title: `${tour.name} Tour`,
        tour: tour
    });
});

exports.getLoginForm = (req, res) => {
    res.status(200).render('login', {
        title: 'Log into your account'
    });
};

exports.getRegistrationFrom = (req, res) => {
    res.status(200).render('register', {
        title: 'Registration'
    });
};

exports.getAccount = (req, res) => {
    // Don't need to query for current user since the mw, protect, does it.
    res.status(200).render('account', {
        title: 'Your account'
    });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
    // 1) Find all the bookings for currently logged in users (returns bookings object for all bookings)
    const bookings = await Booking.find({ user: req.user.id });
    //console.log('Bookings: ', bookings);
    // 2) Then find tours with those ids
    const tourIDs = bookings.map((el) => el.tour.id);
    //console.log('tour ids: ', tourIDs);
    // We can't use findById since we will be using an operator ($in)
    // so it can place tours in an array.
    const tours = await Tour.find({ _id: { $in: tourIDs } });
    //console.log('tours: ', tours);

    // Use overview template but only show booked tours
    res.status(200).render('overview', {
        title: 'My Tours',
        tours: tours
    });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
            name: req.body.name,
            email: req.body.email
        },
        { new: true, runValidators: true }
    );

    res.status(200).render('account', {
        title: 'Your account',
        user: updatedUser
    });
});
