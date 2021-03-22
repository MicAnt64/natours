const mongoose = require('mongoose');

// We will use parent ref in the booking. We keep a ref to the tour and the user
// who booked the tour
const bookingSchema = new mongoose.Schema({
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Booking must belong to a tour!']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Booking must belong to a user!']
    },
    // We want to record the price the purchase was made at, since
    // we price can change over time.
    price: {
        type: Number,
        required: [true, 'Booking must have a price.']
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    // Paid is more for if a customer doesnt have a cc and want to pay
    // outside of stripe. Admin can set this.
    paid: {
        type: Boolean,
        default: true
    }
});

// We want to populate the tour and user automatically whenever
// there is a query. We used query middleware.
// We can do both user and tour here w.o. and impact
// to performance since only admin and guides. (ie
// a guide checking who booked his tour)
bookingSchema.pre(/^find/, function (next) {
    this.populate('user').populate({
        path: 'tour',
        select: 'name'
    });
    // We need to call next middle ware since
    // this is a pre middle ware so the process doesnt
    // get stuck
    next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
