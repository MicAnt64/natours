// Stripe pkg only works in the backend, for the front end
// we include a script in the html in HEAD block
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // 1) Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);
    console.log('Tour: ', tour);
    // 2) Create the checkout sessions

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        //success_url: `${req.protocol}://${req.get('host')}`,

        // Success_url below is only for dev purposes
        // success_url: `${req.protocol}://${req.get('host')}/?tour=${
        //     req.params.tourId
        // }&user=${req.user.id}&price=${tour.price}`,
        success_url: `${req.protocol}://${req.get('host')}/my-tours`,

        // After success, we want to register our booking in the db.
        // This is a temp solution since it is not secure. When it is
        // deployed we will use stripe web hooks which is secure.
        // Any one with our url structure could call it w/o going through
        // checkout process - they can book a tour w.o paying (it
        // registers the booking without going through stripe).
        // So we will temp put booking data in url as a query string
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [
            {
                name: `${tour.name} Tour`,
                description: tour.summary,
                // imgs will only upload once app is deployed to web
                images: [
                    `https://www.natours.dev/img/tours/${tour.imageCover}`
                ],
                amount: tour.price * 100, // it's in cents
                currency: 'usd',
                quantity: 1
            }
        ]
    });
    console.log('Session: ', session);

    // 3) Create session as a response (send it to client)
    res.status(200).json({
        status: 'success',
        session: session
    });
});

// Function to create booking in DB (only for dev purposes - comment out for production)
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//     // THIS IS ONLY TEMP SINCE IT IS UNSECURE, ANYONE CAN MAKE BOOKINGS
//     // W.O. PAYING
//     const { tour, user, price } = req.query;

//     if (!tour || !user || !price) return next();
//     // So where is the next middleware? Well, when the booking with stripe
//     // is successful, we redirect the user to "/", so this is in a routes
//     // file, which routes file? view routes. That is:
//     // router.get('/', .....

//     // We dont save it into a var, since we are not sending back an
//     // API response, all we want to do is to create the new doc.
//     await Booking.create({ tour, user, price });

//     // We could call next which would call isLoggedIn m.w. followed
//     // by getOverview (renders the page). But remember that the url
//     // has additioanl data, so let's redirect to the original url.
//     //console.log('req: ', req);
//     //console.log('req.orig: ', req.originalUrl);
//     res.redirect(req.originalUrl.split('?')[0]);
//     //next();
// });

const createBookingCheckout = async (session) => {
    console.log('Session 2: ', session);
    console.log('Session client ref Id: ', session.client_reference_id);
    console.log('Session customer email: ', session.customer_email);
    console.log('Session line items(price): ', session.line_items[0]);
    const tour = session.client_reference_id;
    const user = (await User.findOne({ email: session.customer_email })).id;
    const price = session.line_items[0].amount / 100;
    await Booking.create({ tour, user, price });
};

exports.webhookCheckout = (req, res, next) => {
    // This code will run when a payment is successful. (Stripe will call webhook which then
    // calls this func)
    // 1) Read Stripe signature from headers
    const signature = req.headers['stipe-signature'];
    console.log('Signa', signature);
    // 2) Create a Stripe event (body will be in raw form)
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOKS_SECRET
        );
        console.log('Event: ', event);
    } catch (err) {
        return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if (event.type === 'checkout.session.complete') {
        // Then use event to create a booking in our DB
        createBookingCheckout(event.data.object);
    }

    res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
