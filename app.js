const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
// In order to get access to cookies in a request, we need
// middleware from pkg: cookie-parser.
// We use this cookie to protect our routes
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');
//const { Router } = require('express');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.enable('trust proxy');

app.set('view engine', 'pug');

// Implement CORS
// Allows other browsers to access resources on our API
// It adds specific headers...
// If you only want to add cors to a specific route (ie reviews), we then use...
// app.use('/api/v1/reviews', cors(), reviewRouter);
// Now what is we want our app to be on one domain or subdomain, and our
// api and another domain or subdomain? (ie api.natours.com and natours.com)
// we the do app.use(cors({ origin: 'https://www.natours.com'}));
// This below will only work for simple req (get and post). Non simple req (put, patch,
// delete, and also req that use cookies or non standard headers). These types of req
// require a pre-flight phase.
app.use(cors());

// Pre-flight phase for non-simple req.
// Arg 1 - route for which we want to handle options, 2 - is handler.
app.options('*', cors());
//app.options('/api/tours/:id', cors())

// Define where views are located
// app.set('views', './views'); not ideal, since the path is always
// relative from DIR where we launch app. In our case, it's the root dir
// but there are cases where that might not be so.
// Join will add the slash (/)
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// SERVING STATIC FILES
// To show static files, then we can
// go to localhost/overview.html (don't need to refer public folder)
// Since it adds this path to the root: app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// SET SECURITY HTTP HEADERS
// We will use: npm i helmet, since express doesn't provide this out of the box func.
// We call the func, not reference it. Make sure to put this line early in the stack.
app.use(helmet());

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
                baseUri: ["'self'"],
                fontSrc: ["'self'", 'https:', 'data:'],
                scriptSrc: [
                    "'self'",
                    'https:',
                    'http:',
                    'blob:',
                    'https://*.mapbox.com',
                    'https://js.stripe.com',
                    'https://m.stripe.network',
                    'https://*.cloudflare.com'
                ],
                frameSrc: [
                    "'self'",
                    'https://js.stripe.com',
                    'https://hooks.stripe.com'
                ],
                objectSrc: ["'none'"],
                styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
                workerSrc: [
                    "'self'",
                    'data:',
                    'blob:',
                    'https://*.tiles.mapbox.com',
                    'https://api.mapbox.com',
                    'https://events.mapbox.com',
                    'https://m.stripe.network'
                ],
                childSrc: ["'self'", 'blob:'],
                imgSrc: ["'self'", 'data:', 'blob:'],
                formAction: ["'self'"],
                connectSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'data:',
                    'blob:',
                    'https://*.stripe.com/',
                    'https://api.stripe.com',
                    'https://checkout.stripe.com',
                    'https://*.mapbox.com',
                    'https://*.cloudflare.com/',
                    'https://bundle.js:*',
                    'ws://127.0.0.1:*/',
                    'ws://localhost:8080/'
                ],
                upgradeInsecureRequests: []
            }
        }
    })
);

// DEVELOPMENT OR PRODUCTION LOGGING
console.log('Prod or Dev mode: ', process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// LIMIT REQUESTS
// Rate limiting prevents the same IP from making too many
// requests to an IP. This helps to prevent DOS and Brute
// Force attacks. The rate limiter will be implemented as
// a global middleware function. What a rate limiter does is
// it counts the # of requests coming from an IP, and when
// there are too many requests, then it blocks these requests.
// So we will do this in app.js. We will use the package:
// npm i express-rate-limit.
// Adapt MAX based on expectations.

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
});

// The rate limiter will affect all routes that start with the url: /api
app.use('/api', limiter);

// BODY PARSER, READING DATA FROM THE BODY INTO REQ.BODY
// We will limit how much data can be sent in the body to prevent evil regex (DOS)
// So if our body is larger than 10kb, it will not be accepted.
// Parses data from body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Parses data from cookies
app.use(cookieParser());

// DATA SANITIZATION AGAINST NoSQL QUERY INJECTTION (ie "email": {"$gt":""},
//    "password": "pass1234"),
// AND AGAINST XSS ATTACKS.
// This is a perfect place to do it, since the line above reads the
// data into req.body, then we can clean it. To protect ourselves from query injections
// lets install a middleware, npm i express-mongo-sanitize, and aslo npm i xss-clean.
// MongoSanitize - we call and it returns a mw func. Prevents NoSQL injections -
// it looks at req.body, req query string and req params, and it filters out all "$", and "."
// so the mongo operators won't work
app.use(mongoSanitize());

// DATA SANITIZATION AGAINST XSS
// This will clean user input from malicious html code. Also, by adding
// validation to our Mongoose schema, it helps us from XSS.
app.use(xss());

// PREVENT PARAMETER POLLUTION
// Use at the end, since what it does is clear up the query string
// npm i hpp
// hpp = http parameter pollution
// Whitelist is an array where we allow properties to be duplicated
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price'
        ]
    })
);

// Compresses TEXT returned to client.
app.use(compression());

// TEST/DEV MIDDLEWARE (seful to take look at headers)
app.use((req, res, next) => {
    // We will manipulate request by defining/adding a property
    req.requestTime = new Date().toISOString();
    //console.log(req.headers);
    //console.log(req.cookies);
    next();
});

//3) ROUTES
// Mounting the routers- here we specify what middleware to apply to what route.

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// How do we create a route handler for a route that was
// not catched by any other of our route handlers?
// If they are catched, then one of app.use funcs
// above are triggered. If not, it keeps reading unit
// It hit the middleware below.

// Middleware is added to the middleware stack in the order
// that it is defined in our code.
app.all('*', (req, res, next) => {
    // If we pass an arg into next, express will know its an error
    // and skips all middleware stack and jumps to the one below
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Express comes with MW handlers out of the box
// When we give it 4 args, express recognizes it is
// an error handling mw, 1st arg HAS TO BE err
// This is our simple error handling mw
app.use(globalErrorHandler);

//4) To start the server
// now instead of running nodemon app.js we run nodemon server.js
module.exports = app;
