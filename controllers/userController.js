const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// We commented this out since we will be saving
// the file in memory so we can resize it.
// const multerStorage = multer.diskStorage({
//     //cb = callback
//     destination: (req, file, cb) => {
//         cb(null, 'starter/public/img/users');
//         cb(null, 'public/img/users');
//     },
//     filename: (req, file, cb) => {
//         // user-3knd3nk2nkn9d(id)-39939393(timestamp).jpeg
//         const extension = file.mimetype.split('/')[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${extension}`);
//     }
// });

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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    //the img is in memory at req.file.buffer
    // We want square images - crop it

    // We need to set filename because other mW func calls it
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    console.log('reqFile', req.file);
    console.log('reqFileFilename', req.file.filename);

    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`);
    //.toFile(`starter/public/img/users/${req.file.filename}`);

    next();
});

const deletePhotoFromServer = async (photo) => {
    const path = `${__dirname}/../public/img/users/${photo}`;
    await fs.unlink(path, (err) => {
        if (err) return console.log('Delete photo error: ', err);
        console.log('Previous photo has been deleted.');
    });
};

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};

    Object.keys(obj).forEach((fieldName) => {
        if (allowedFields.includes(fieldName)) {
            newObj[fieldName] = obj[fieldName];
        }
    });

    return newObj;
};

exports.getAllUsers = factory.getAll(User);

// GetMe endpoint so user can get his own data. We will use
// the getOne factory function. The only issue is getOne, uses ID,
// from the parameter. But we want the ID from currently logged in
// user, so we don't have to pass ID as a param.

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) Create an error if the user tries to update the password (POST)
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password updates. Please use /updateMyPassword.'
            ),
            400
        );
    }

    // 2) FIlter out unwanted field names that are not allowed access to the user
    const filteredBody = filterObj(req.body, 'name', 'email');
    if (req.file) filteredBody.photo = req.file.filename;

    // 2a) Delete old photo
    if (req.file) await deletePhotoFromServer(req.user.photo);
    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
        data: null
    });
});

exports.getUser = factory.getOne(User);

exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined! Please use /signup instead.'
    });
};

// This only works for admin, do not attemp to update pw with this.
exports.updateUser = factory.updateOne(User);

// Only the admin should be able to delete the user
// If the user does it, active is then set to false.
exports.deleteUser = factory.deleteOne(User);
