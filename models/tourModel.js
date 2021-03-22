const mongoose = require('mongoose');
const slugify = require('slugify');
//const User = require('./userModel');
//const validator = require('validator');

// Creating Schema
const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A tour must have a name'],
            unique: true,
            trim: true,
            maxlength: [
                40,
                'A tour name must have less than or equal to 40 characters.'
            ],
            minlength: [
                10,
                'A tour name must have more than or equal to 10 characters.'
            ]
            //No need to call it, just ref it, it is called by db
            // array is shorthand way to do func, and message
            // without explicitly typing the key word (vvalidate, message)
            // validate: [
            //     validator.isAlpha,
            //     'Tour name must only contain characters.'
            // ]
        },
        slug: String,
        duration: {
            type: Number,
            required: [true, 'A tour must have a duration']
        },
        maxGroupSize: {
            type: Number,
            required: [true, 'A tour must have a group size']
        },
        difficulty: {
            type: String,
            required: [true, 'A tour must have a difficulty'],
            // Notation for enum is the real deal, other validators are short hand
            // Enum is only for str, max and min is for nums and dates
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Difficulty is either: easy, medium or difficult.'
            }
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, 'Rating must be above 1.0'],
            max: [5, 'Rating must be below 5.0'],
            set: (val) => Math.round(val * 10) / 10
            // Above is to round 4.6666 to 4.7
        },
        ratingsQuantity: {
            type: Number,
            default: 0
        },
        price: {
            type: Number,
            required: [true, 'A tour must have a price']
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function (val) {
                    // This keyword only points to current doc on
                    // NEW DOC CREATION , NOT ON UPDATE. There are complicated
                    // workarounds.
                    return val < this.price;
                },
                //Mongoose trick ({})
                message:
                    'Discount price ({VALUE}) should be less than the regular price.'
            }
        },
        summary: {
            type: String,
            trim: true,
            required: [true, 'A tour must have a description']
        },
        description: {
            type: String,
            trim: true
        },
        imageCover: {
            type: String,
            required: [true, 'A tour must have a cover image']
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false //isnt displayed for any response (security)
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false
        },
        startLocation: {
            // GeoJSON (this object is not for optons like others fields)
            // GeoJSON does longitude then latitude
            // We want to specify that we only accept Point
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String
        },
        locations: [
            {
                type: {
                    type: String,
                    default: 'Point',
                    enum: ['Point']
                },
                coordinates: [Number],
                address: String,
                description: String,
                day: Number
            }
        ],
        // We will embed tour guides,
        // and later reference them (and comment the membedding)
        //guides: Array
        // This is how we do referencing, populating th e
        // info will happen when we query, so the code
        // will be in tourController in func where we get
        // a single tour
        guides: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User'
            }
        ]
        // Child Ref, but array can grow out of hand - so we will replace
        // this with virtual populate.
        // reviews: [
        //     {
        //         type: mongoose.Schema.ObjectId,
        //         ref: 'Review'
        //     }
        // ]
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);
// Create indexing to retrieve information quicker
// 1 sort price index in ascending order, and -1 for descending
//tourSchema.index({ price: 1 });  // once an index is created, to delete it, we have to do it from atlas
// dont use index if write/read ration is high, since
// creating index is time consuming and requires storing in mem
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); //for geospatial data, its a 2d index

//Virtual Properties
// Arrow func doesnt have this keyword, we need it
// since it will point to current doc
// virual wpnt be persistent in DB but will
// be there as soon as we get the data
tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

// Virtual Populate
// 1st arg is name of field to return. Ref is model we want to ref, then specify name of fields
// to connect to dataset. We specify 2 fields, foreign and local.
// ForeignField = is name of field in review model where ref to current model is stored.
// LocalField = says where id is stored in current tour model. So basically what we are saying is
// use _id in our current tourModel and use that id in the tour field in the Review model referenced
// in order to get the reviews afiliated with our tour.
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

// Mongoose MW is aka pre and post hooks
// 4 types: doc, query, aggregate and model mw
//This will be called before a doc is saved to db
// DOCUMENT MIDDLEWARE: runs before (only works for save and create) .save() and .create()
// but not on insertMany()
// A slug is a string we can put in the url
// so we use the slugify package (npm i slugify)
// we have a next func in mongo mw, need to pass it
// in arg so we can call it.
// Need to put slug in our schema!
// This pointer only works for save and create but not update.
tourSchema.pre('save', function (next) {
    // we define a new property on this (the mongo doc)
    // lower converts to lower case
    this.slug = slugify(this.name, { lower: true });
    next();
});

// Pre middleware for creating tour with embedded guides array
// This code is for creating, so we will need to add for updating
// Now there are some drawback for embedding guides:
// Imagine a tour guides updates his info, so need to check if tour
// has a guide, then update the info. But  referencing might be
// simpler.
// tourSchema.pre('save', async function (next) {
//     // This maps and returns an array full of
//     // promises
//     const guidesPromises = this.guides.map(
//         async (id) => await User.findById(id)
//     );

//     this.guides = await Promise.all(guidesPromises);

//     next();
// });

// save is a hook (aka middleware)
// tourSchema.pre('save', function (next) {
//     console.log('Will save doc ...');
//     next();
// });

// Post middleware. we also have access to documnet
// here we dont have the this keyword accessible
// tourSchema.post('save', function (doc, next) {
//     console.log(doc);
//     next();
// });

// QUERY MIDDLEWARE
// Query mw - allows us to run funcs before or
// after a find query is executed.
// Adjust the line below so it applies to
// findOne as well, use regex so it applies
// the hook to any hook that start with find
//tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
    // This now points at the current query
    // and not the document like in the save hook above.
    // Lets assume there are secret tours that
    // we don't want to appear in the output
    // We only want to show tours that are not secret
    // Normal tours dont have secretTour attr, so we
    // set it like below (note mongoose will add it and
    // set it to false but in actual Mongo DB it wont be
    // there for the ones that don't have it.)
    // the hook is chained to the getAllTours MW
    // after all the filter and before the execution
    this.find({ secretTour: { $ne: true } });
    // We can set properties to the query string like below
    // We will create a timer to see how long it takes
    // to execute and return the query
    this.start = Date.now();
    next();
});

// To populate guides field in tours (child ref)
tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });

    next();
});

// Here we now get access to docs returned from the query
tourSchema.post(/^find/, function (docs, next) {
    console.log(`Query took ${Date.now() - this.start} ms!`);
    //console.log(docs);
    next();
});

// AGGREGATION MIDDLEWARE
// It allows us to add hooks before or after an
// aggregation happens (like GET TOUR-STATS)
// So let's exlude the secret tour in the aggregation

tourSchema.pre('aggregate', function (next) {
    // This points to the agg obj
    // unshift add to beginning of the array
    // This is convenient since we dont have to add
    // this additional match step to additional controllers
    const aggPipe = this.pipeline()[0];
    if (Object.keys(aggPipe)[0] !== '$geoNear') {
        this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
    }
    // having match here interferes with geoNear in tourController file
    // since geonear needs to be 1st
    console.log(this.pipeline());
    next();
});

// Validation means checking if the entered in right
// format for each field in our schema, and that values
// have been entered for all req fields. Sanitization
// means that all the inputed data is clean (no malicious)
// code is going into our DB (GOLD STANDARD) to never
// accept incoming as it is.
// Require in our schema is an actual data validator,
// unique - isn;t really considered as a validator,
// maxlength, and minlength are validators
// By setting the validators = true in update controller
// we enforce the schema on update tours
// Min and Max on number types are also validators
// Enum is another type of validator to constrain choices
// We also have a match validator to check if Str input matches a given regex

//Custom Validators (when built in ones are not enough)
// In essence, a validator is a simple func that returns
// True or False when a condition is met
// We will build one to check and see if the priceDiscount
// is lower than the price itslef.

// NPM lib for validators VALIDATOR
// npm i validator

// Creating Model
// convetion to have 1st letter uppercase
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
