const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// Since we have more than 1 func export, we don't use module.exports
// We add the functions to the exports object, them go to tourRoutes.js
// and import them using require.

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
        //We use map so it can return an array so we can use Promise.all
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

exports.aliasTopTours = (req, res, next) => {
    // The get req string is: 127.0.0.1:3000/api/v1/tours?limit=5&sort=-ratingsAverage,price
    // so we are adding fields to req.query to make it like the above
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage, price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

exports.getAllTours = factory.getAll(Tour);

// 2nd arg is populateOptions, the path is the field we want to populate
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// Here we use the Mongo feature: aggregation pipeline
// Steps: we pass an array of stages (1 per element)
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
                // key: what we want to groupby, val: where to find
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

    // Convert radius to radians, div dist by radius of earth
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
    // We will add an index to startLocation in tourModel
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

    // Alwyas use aggregation pipeline to do aggregation
    // reqs that we have a geospatial index for at least 1 field;
    // if multilple fields, the we need to specify the fields.
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
