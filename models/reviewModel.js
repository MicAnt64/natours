// We will implement parent ref, since a review will belong to a tour and a user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review cannot be empty!']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour!']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user!']
    }
});

// We want user to only create 1 review per tour, so
// we set each combo of tour and user to be unique
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Nested routes: as of now, when we create a review,
// we pass in the user and tour id's in postman, but,
// this is not how it should work in the real world. The
// the id should come from the currently logged in user,
// and the tour should come from the tour on display. That
// info should be encoded in the route (the URL)
// tour id is in url.... (this below is a nested route)
// POST /tour/34rjfka3/reviews
// Get /tour/23h34ktjh3/reviews/sfjkl234jrlk34j  -> to get a review
// Add options to schema to make it so virtual properties show up in a json obj.
// This allows us to have a virtual property (a field that is not stored in the DB)
// but is calculated and shown in the output.
// So now we can call on reviews and see what tours the review is associated with.
// But, if we call on tour, how to we see what reviews are assoicated wiht it?
// This problem arises since we did parent ref on the reviews. The parent doesn't know
// about its children, since the children are the only thing making references to the parent.
// Sometimes thats ok, but here we want the parent to know about its children.
// There are 2 solutions to this: 1) We manually query for reviews, each time we query for tours.
// 2) we can also do child ref from the tours so it can point to reviews, but that would make
// a huge array and become problematic due to its size. This is why we picked parent ref.
// ANOTHER SOLUTION IS: VIRTUAL POPULATE!!!
// Virtual populate - we can populate tour with reviews. So we can get all the children
// of parent, without storing an array in the parent. Think of virtual pop.
reviewSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name photo'
    });

    next();
});

// Static method
reviewSchema.statics.calcAverageRatings = async function (tourId) {
    //this points to current model

    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 }, //adds 1 for each tour
                avgRating: { $avg: '$rating' }
            }
        }
    ]);
    //console.log(stats);
    // We want our stats to persist
    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
            // 4.5 is default if no reviews
        });
    }
};

// Use middleware
reviewSchema.post('save', function () {
    // this points to doc currently being saved (review)
    // Problem is Review var is not defined. A way arround it
    // is:
    this.constructor.calcAverageRatings(this.tour);
});

// A review is updated or deleted using findByIdAndUpdate
// and findByIAdDelete. We don't have doc mw, only query mw,
// in query we dont have access in the doc to extract info
// from it. So this trick is...
// pre mw for hooks ... this will work for findOneAndUpdate
// and findOneAndDelete
// gets the next keyword since it is pre-middleware

reviewSchema.pre(/^findOneAnd/, async function (next) {
    //this is the current query, we want the review document
    //r is for review
    //console.log(this);
    this.r = await this.findOne();
    //console.log(this.r);
    next();
});

reviewSchema.post(/^findOneAnd/, async function () {
    // Query has finished and review update has finished
    // this.r = this in reviewSchema.post
    // this.findOne() does not work here since the query has been executed
    await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
