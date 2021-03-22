const crypto = require('crypto');
const { promisify } = require('util'); // to promisify a func
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (userId) => {
    //console.log(process.env.JWT_EXPIRES_IN);
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        secure: false,
        httpOnly: true
    };

    // To send a cookie, we just attach it to the response obj
    // The expires option is for the browser to delete the cookie
    // Time needs to be in (ms)
    // secure option (the cookie will only be sent on a secure connection),
    // that is https
    // httpOnly, is so cookie cannot be accessed or modified in any
    // way by the browser. THis prevents cross site scripting attacks (XSS)
    // We activate the secure true when we go into production.
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    // Remove password from the output (it's ok to do this)
    // since we are only modifying the response send to the client
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user: user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    // THIS MW IS FOR ADMIN (BACK END USE)
    // We want to avoid anyone signing up as an admin
    //const newUser = await User.create(req.body);
    // If we want to add a new admin user, we would
    // just create a new user the regular way, and then go
    // to MongoDB Compass and then add the admin role
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role
    });

    let url = `${req.protocol}://localhost:3000/me`;
    if (process.env.NODE_ENV === 'production') {
        url = `${req.protocol}://${req.get('host')}/me`;
    }
    //console.log(url);
    //const email = new Email();
    await new Email(newUser, url).sendWelcome();
    // The payload is: 1 - mongodb id, secret string (keep it
    // in config.env file), standard is to make secret 32 chars long
    // pass in options (when jwt expires) see config.env
    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    //const email = req.body.email; // use obj destructuring;
    // if props are part of object, we can just do this
    const { email, password } = req.body;

    // We now check the credentials
    // 1 check if email and pw exist in form
    // The reason we add return below is that we want
    // the login func to finish right away
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }
    // 2 check if user exists and pw is correct
    const user = await User.findOne({ email: email }).select('+password');
    //We need to explicityly select pw, we add + to field that was
    // originally not selected.
    //If email is wrong, then next line wont run so we move
    //const correctPassword = await user.correctPassword(password, user.password);
    //console.log(user);

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    // 3 if all ok, send token to client
    createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedOut', {
        expires: new Date(Date.now - 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        status: 'success'
    });
};

exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and check if it exists
    // Common practice is to send token with http header with req
    // Check in app.js line that has req.headers
    // To set a json web token as a header, there is a standard for it
    // Always use a header "Authorization", the value is "Bearer <toekn val>"
    //Below are conditions were we want to save the tokem
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    //console.log('token', token);

    if (!token) {
        // 401 = unauthorized
        return next(
            new AppError(
                'You are not logged in! Please log in to get access.',
                401
            )
        );
    }
    // 2) VERIFICATION - Validate token (JWT verifies)
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    //console.log('Decoded', decoded);
    // 3) If verification is succesful, check if user still exists
    //This is good if token is stolen, and user changes his pw,
    // so the token is no longer valid
    // currentUser = existing user
    const currentUser = await User.findById(decoded.id);
    //console.log('current us', currentUser);

    if (!currentUser) {
        return next(
            new AppError(
                'The user belonging to this token no longer exists.',
                401
            )
        );
    }
    // 4) Check if user changed passwords after the jwt (token) was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                'User recently changed password! Please log in again.',
                401
            )
        );
    }
    // 5) then next() is called = GRANT ACCESS TO PROTECTED ROUTE
    // put user data on the request, currentUser = existingUser
    // so we can user req.user in the next middle ware func
    // when we stack stuff on the req obj, we can pass it
    // to other middleware
    req.user = currentUser;
    res.locals.user = currentUser; // So we can use it in all the templates
    //console.log(currentUser);
    next();
});

// Only for rendered pages, there will be no error
exports.isLoggedIn = async (req, res, next) => {
    // this mw, is for rendered pages, not to protect a route
    // we will use this to determine if the buttons register & login
    // are show, or the user name logged in and the log out button

    if (req.cookies.jwt) {
        try {
            // 1) VERIFICATION - Validate token (JWT verifies) verifies the token
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET
            );
            //console.log('Decoded', decoded);
            // 3) If verification is succesful, check if user still exists
            //This is good if token is stolen, and user changes his pw,
            // so the token is no longer valid
            // currentUser = existing user
            // Check if user exists
            const currentUser = await User.findById(decoded.id);
            //console.log('current us', currentUser);

            if (!currentUser) {
                return next();
            }
            // 3) Check if user changed passwords after the jwt (token) was issued
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }
            // 3) then next() is called = GRANT ACCESS TO PROTECTED ROUTE
            // put user data on the request, currentUser = existingUser
            // so we can user req.user in the next middle ware func
            // when we stack stuff on the req obj, we can pass it
            // to other middleware
            // So if there is a token, the token is verified, the user
            // still exists and they havent changed their password, then
            // then it means THAT THERE IS A LOGGED IN USER.
            // So we make our user have access to our templates
            // We make the user var (data) accessible to our templates,
            // so in the template (all of them) will have access to res.locals and
            // user. look at header.pug ...
            res.locals.user = currentUser;
            return next(); // next mw is called
            // By using return next(), we jump out of this callback (middle ware)
            // and avoide recalling the next() below
        } catch (err) {
            return next();
        }
    }
    // if there is no cookie, hence no logged in user, next should still be called
    next();
}; // we remove the catchAsync for isLoggedIn since we dont' want it to triggered
// when the user logs out, in this case we want to catch the errors locally

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles is an array
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    'You do not have permission to perform this action.',
                    403
                )
            );
        }
        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1. Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    //Verify if user exists
    if (!user) {
        return next(
            new AppError('There is no user with that email address.', 404)
        );
    }
    //2. Generate random token
    const resetToken = user.createPasswordResetToken();
    //We add the arg, to avoid getting an error since
    // we won't be specifying all the mandatory data
    // for the required fields in the user schema
    await user.save({ validateBeforeSave: false });
    //3. Send token back as an email
    //req.protocol is to know if it is http or https

    try {
        const resetURL = `${req.protocol}://${req.get(
            'host'
        )}/api/v1/users/resetPassword/${resetToken}`;

        await new Email(user, resetURL).sendPasswordReset();

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    } catch (err) {
        //We don't user our routine error handler
        // because we want to reset the token and
        // expiration time.
        user.createPasswordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        //console.log(err);

        return next(
            new AppError(
                'There was an error sending the email. Try again later.',
                500
            )
        );
    }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1. Get user based on the token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    //Filter for users that have passwordexp 10 min < now
    // if expired, it will return nothing
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });
    // 2. If token has not expired, and there is user,
    // set the new password.
    if (!user) {
        return next(new AppError('Token is invalid or expired.', 400));
    }

    // If there is a user then set the pw
    // We will send a pw and pw confirm via the body
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    // Now reset the token and expires...
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Now lets save
    // We don't want to turn off the validators
    // We save because it modifies the doc , not
    // update it ???
    await user.save();
    // 3. Update the changedPasswordAt property for user
    // 4. Log the user in, send the JWT to the client.
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    // This is only for authenticated users (they are already)
    // logged in, so we can get the id
    // We need to ask for pw since we def in schema to not return it
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed pw is correct
    if (
        !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
        return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If pw, is correct, then updated it
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;

    await user.save();
    //WHY DONT WE USE USER.FINDBYIDANDUPDATE(), BECAUSE
    // 1- THE VALIDATION WONT WORK, BECUASE THE VALIDATOR DOESNT
    // RUN ON UPDATE, ONLY ON CREATE AND SAVE. ALSO, THE PRESAVE
    // MIDDLE WARES WONT WORK, SO THE PW WONT BE ENCRYPTED, AND
    // THE CHANGED AT WONT WORK.
    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
});
