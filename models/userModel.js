const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name!']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    // We don't want pw info returned, so we select: false
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // This only works on create and save
            // methods available in the USER Object
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords do not match'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

// We will use mongoose MW to handle password encryption
// This will be a presave MW, so we will set a
// pre hook/pre MW on save, this will be implemented
// after getting the data but before saving it ...
userSchema.pre('save', async function (next) {
    // We want to encrypt pw only when it is created or updated.
    // This. refers to the current document (user).
    // This only runs function if the pw is modified.
    if (!this.isModified('password')) return next();

    // 2nd arg - salt param (or cost), larger vals = more cpu intensive.
    // This hash is the async ver, and it returns a promise,
    // so we need to await it and make the func async.
    // Hash the pw w/ a cost of 12
    this.password = await bcrypt.hash(this.password, 12);

    // Now we delete the confirm pw. We only need it for
    // validation, but we don't want it to persist in the DB.
    // Delete pw Conf field
    this.passwordConfirm = undefined;

    next();
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    // There is one thing that we need to keep under
    // consideration, sometimes, saving to the DB is slower
    // than creating a JWT, so if the createdPwAt is after
    // the JWT issuance, then it will look like the
    // user has updated their pw, so let's subtract 1 sec.
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// We use regex so that we can apply this to anything that
// starts with find. We only allow users who are active to do CRUD
userSchema.pre(/^find/, function (next) {
    //this points to the current query
    //this.find({ active: true }); since other documents dont' have this
    // field yet, we just find
    this.find({ active: { $ne: false } });
    next();
});

// Checks if login pw === to one stored in Mongo doc.
// Need to use bcrypt which hashes pw and compares
// returned val to stored val. Encrypted pw
// cannot be reversed.

// 1st we create an instance method that will be
// available to all documents of a certain collection
userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    //this.password is not be available since we set selected:false
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Static instance method
// We want to check if the user has changed their pw
// after their token was issued.
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    // This points to current doc
    if (this.passwordChangedAt) {
        const changedTimeStamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        //console.log(changedTimeStamp, JWTTimestamp);
        // If token time issued < password changed time
        // then return true
        return JWTTimestamp < changedTimeStamp;
    }
    //By default we return false = user hasn't changed pw after
    // token was issued. If pw has never changed = return false
    // False means not changed.
    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    //Should be a random string, but doesn't need to
    // be as cryptographically strong as the password hash
    // so we will use the built-in crypto module.
    const resetToken = crypto.randomBytes(32).toString('hex');
    // We will need to encrypt this since if a hacker gets access
    // to db and this pw, then they will be able to access the
    // user's account. So we will encrypt it, but not with such
    // a strong encryption.
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    //console.log({ resetToken }, this.passwordResetToken);

    // Exp in 10min (in millisec)
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    // We want to return the plain text token, since this
    // is what we want to return via email.
    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
