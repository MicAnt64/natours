const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    // 400 = Bad request
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    // A regex goes between two /(here)/
    const value = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    //console.log(value);
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    // First we get the values: name, difficulty, ratingsAvg.
    // Use map to loop and return error message
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
    // A) API
    // originalUrl - is the entire url excluding the host
    // so when we hit the url the route starts with /api...
    if (req.originalUrl.startsWith('/api')) {
        // We need to pass in the res object
        // so we can send the response
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }
    // B)  Rendered Website (not Api)
    console.error('Error !!! :', err);
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong API!',
        msg: err.message
    });
};

const sendErrorProd = (err, req, res) => {
    // A) API
    if (req.originalUrl.startsWith('/api')) {
        //A)  Operational trusted error: send msg to client
        //console.log('is OP', err.isOperational);
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        }
        // Send generic error for programming, unknown
        // error. Don't leak error details
        // B)
        //1) Log error for us developers
        console.error('Error !!! :', err);
        //2) Send generic msg
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong.'
        });
    }
    // B) RENDERED WEBSITE
    // Operational trusted error: send msg to client
    //console.log('is OP', err.isOperational);
    // eslint-disable-next-line no-lonely-if
    if (err.isOperational) {
        //console.log(err);
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong PROD!',
            msg: err.message
        });
    }
    // Send generic error for programming, unknown
    // error. don't leak error details

    //1) Log error for us developers
    console.error('Error !!! :', err);
    //2) Send generic msg
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later.'
    });
};

module.exports = (err, req, res, next) => {
    //console.log(err.stack);
    // It will show us where the error happened

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    err.message =
        err.message || 'Something went wrong! Please try again later.';

    // Right now we are sending this msg to everyone
    // whether we are in development or in production
    // in production, we want the min error message to our client.
    // ie just send a nice human friendly message.
    // But in development, we want as much info as possible.
    // we could log it to the console., but it would be
    // useful to send it to postman.
    console.log('NODE ENV: ', process.env.NODE_ENV);
    if (process.env.NODE_ENV === 'development') {
        console.log('Development Env.');
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        console.log('Production Env.');
        // We create a hard copy since it is bad
        // practice to modify the actual err.
        let error = Object.create(err);
        //error.message = err.message;

        // Operational errors checks - type of error
        // where the user makes a mistake - ie wrong email (no @) etc
        // For cast Error (that is we use inproper ID in Get Tour).
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        // For error in Update Create tour where we use identical tour name of existing one
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        // Validation error - when updating a tour
        // console.log('err type:::', error.name);
        if (error.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
        }
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
};
