const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
//const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// Since we don't have only 1 func to export,we dont use module.exports
// so we add the functions to the exports object, the go to tourRoutes,js
// and import them using require

// 2) ROUTE HANDLERS
// Route Handler = call back function. Refactor!!
// It is best to groups routes in one group and route handlers in another group

const multerStorage = multer.memoryStorage();

// Multer filter
const multerFilter = (req, file, cb) => {
    // Test if file is an image
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload only images', 400), false);
    }
};

// Folder to save images that are uploaded
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    {
        name: 'images',
        maxCount: 3
    }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    // req.files for mult files, for single file req.file
    //console.log(req.files);

    if (!req.files.imageCover || !req.files.images) return next();

    // 1) Process Cover Img
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`);
    //.toFile(`starter/public/img/tours/${req.body.imageCover}`);

    // 2) Process other images
    req.body.images = [];

    await Promise.all(
        //We use map so it can return an array so
        // we can use Promise.all
        req.files.images.map(async (file, idx) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${
                idx + 1
            }.jpeg`;

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${filename}`);
            //.toFile(`starter/public/img/tours/${filename}`);

            req.body.images.push(filename);
        })
    );

    next();
});
// This middleware is no longer needed since we are using mongo

exports.aliasTopTours = (req, res, next) => {
    // The get req string is: 127.0.0.1:3000/api/v1/tours?limit=5&sort=-ratingsAverage,price
    // so we are adding fields to req.query to make it like the
    // above
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage, price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

exports.getAllTours = factory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res, next) => {
//     const features = new APIFeatures(Tour.find(), req.query)
//         .filter()
//         .sort()
//         .limitFields()
//         .paginate();
//     //console.log(features);
//     //console.log(features.query);
//     const tours = await features.query;

//     //Send response
//     res.status(200).json({
//         status: 'success',
//         results: tours.length,
//         data: {
//             tours: tours
//         }
//     });
// });

// 2nd arg is populateOptions, the path is the field we
// want to populate
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// exports.getTour = catchAsync(async (req, res, next) => {
//     //console.log(req.params);
//     // The populate added at the end is the grab object ids (child refs)
//     // and populate the data, the - in the select fields removes indicated
//     // fields
//     //const tour = await Tour.findById(req.params.id);
//     const tour = await Tour.findById(req.params.id).populate('reviews');

//     //Since we need to do this again for getAllTours,
//     // We will create query middleware in our tour models
//     //.populate({
//     //    path: 'guides',
//     //    select: '-__v -passwordChangedAt'
//     //});

//     if (!tour) {
//         return next(new AppError('No tour found with that ID', 404));
//     }

//     res.status(200).json({
//         status: 'success',
//         data: {
//             tour: tour
//         }
//     });
// });

// We need the next func passed the anonym func
// so we can pass the error into the global
// error handling
exports.createTour = factory.createOne(Tour);
// exports.createTour = catchAsync(async (req, res, next) => {
//     // Now we can remove the try catch block,
//     // since the catch is now transferred to the
//     // catch portion in catchAsync func
//     const newTour = await Tour.create(req.body);

//     res.status(201).json({
//         status: 'success',
//         data: {
//             tour: newTour
//         }
//     });
// });

exports.updateTour = factory.updateOne(Tour);

// exports.updateTour = catchAsync(async (req, res, next) => {
//     //console.log(req.body);
//     // New: true allows for server to res with new doc
//     const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//         new: true,
//         runValidators: true
//     });

//     if (!updatedTour) {
//         return next(new AppError('No tour found with that ID', 404));
//     }

//     res.status(200).json({
//         status: 'success',
//         data: {
//             tour: updatedTour
//         }
//     });
// });

// We replace this using the factory handler
exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//     const tour = await Tour.findByIdAndDelete(req.params.id);

//     if (!tour) {
//         return next(new AppError('No tour found with that ID', 404));
//     }
//     // Dont need to save data and return to client
//     // if it is a delete ops
//     // 204 is no content
//     // null return since nothing is returned
//     res.status(204).json({
//         status: 'success',
//         data: null
//     });
// });

// Here we use the Mongo feature; aggregation pipeline
// Steps; we pass an array of stages (1 per element)
exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        },
        {
            $group: {
                //_id: '$ratingsAverage',
                //_id: { '$difficulty' },
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
            }
        },
        {
            // 1 for ascending
            $sort: { avgPrice: 1 }
        }
        // {
        //     //We can repeat stages
        //     $match: { _id: { $ne: 'EASY' } },
        // },
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats: stats
        }
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;

    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                // key what we want to groupby, val where to find
                _id: { $month: '$startDates' },
                numTourStarts: { $sum: 1 },
                //push creates an array
                tours: { $push: '$name' }
            }
        },
        {
            $addFields: { month: '$_id' }
        },
        {
            $project: { _id: 0 }
        },
        {
            $sort: { numTourStarts: -1 }
        },
        {
            $limit: 12
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            plan: plan
        }
    });
});

//'/tours-within/:distance/center/:latlng/unit/:unit',
// tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    // convert radius to radians, div dist by radius of earth
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
        next(
            new AppError(
                'Please provide latitude and longitude in the format: lat,lng.',
                400
            )
        );
    }

    //console.log(distance, lat, lng, unit);
    // we will add an index t startLocation in tourModel
    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    });
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

    if (!lat || !lng) {
        next(
            new AppError(
                'Please provide latitide and longitude in the format: lat,lng',
                400
            )
        );
    }

    //alwyas use aggregation pipeline to do agg
    // reqs that we have a geospatial index for at least 1 field
    // if multilple fields, the we need to specify the fields
    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]
                    //mult by 1 to convert to numbers
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier // since its in meters
                // name of field that is created and dist stored
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    });
});
