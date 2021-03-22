const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// The goal is to create a func that return a func
// with a similar format to the one below, we generalize
// not only to Tours, but Users and Reviews as well

exports.deleteOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndDelete(req.params.id);

        if (!doc) {
            return next(new AppError('No document found with that ID', 404));
        }

        res.status(204).json({
            status: 'success',
            data: null
        });
    });

exports.updateOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!doc) {
            return next(new AppError('No doc found with that ID', 404));
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: doc
            }
        });
    });

exports.createOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.create(req.body);

        res.status(201).json({
            status: 'success',
            data: {
                data: doc
            }
        });
    });

exports.getOne = (Model, populateOptions) =>
    catchAsync(async (req, res, next) => {
        //console.log(req.params);
        // The populate added at the end is the grab object ids (child refs)
        // and populate the data, the - in the select fields removes indicated
        // fields
        //const tour = await Tour.findById(req.params.id);

        let query = Model.findById(req.params.id);
        if (populateOptions) query = query.populate(populateOptions);
        const doc = await query;
        //const doc = await Model.findById(req.params.id).populate('reviews');

        //Since we need to do this again for getAllTours,
        // We will create query middleware in our tour models
        //.populate({
        //    path: 'guides',
        //    select: '-__v -passwordChangedAt'
        //});

        if (!doc) {
            return next(new AppError('No doc found with that ID', 404));
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: doc
            }
        });
    });

exports.getAll = (Model) =>
    catchAsync(async (req, res, next) => {
        // To allow for nested GET reviews on tour (hacky)
        let filter = {};
        // this is we want 1 particular review
        if (req.params.tourId) filter = { tour: req.params.tourId };

        const features = new APIFeatures(Model.find(filter), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();
        //console.log(features);
        //console.log(features.query);
        // set out own indexes on fields that are queried often
        // to make reading quicker
        //const doc = await features.query.explain();
        const doc = await features.query;

        //Send response
        res.status(200).json({
            status: 'success',
            results: doc.length,
            data: {
                data: doc
            }
        });
    });
