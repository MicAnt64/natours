const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
    console.log('Uncaught Exception! Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

// Need to req env vars before the app files
dotenv.config({ path: './config.env' });
//dotenv.config({ path: './starter/config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);
// 2nd arg is to deal with deprecation warnings
// the callback in connect passes a connection
// object to then
//.connect(process.env.DATABASE_LOCAL, {  to connect to
// local db
mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    })
    .then(() => console.log('DB connection successful!'));

//New Document created out of the tour model
// testTour is now and instance of the Tour model
// and it now has some methods
// const testTour = new Tour({
//     name: 'The Park Camper',
//     price: 997,
// });

// Saves to the tour collection, save returns
// a promise that we can consume
// testTour
//     .save()
//     .then((doc) => {
//         console.log(doc, ' has been saved');
//     })
//     .catch((err) => {
//         console.log('ERROR: ', err);
//     });

//console.log(app.get('env')); //Print development
//app.get('env') gets us the environment variable

//console.log(process.env); // Returns a lot

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    // This callback func is called as soon
    // as the server starts listening
    console.log(`App running on port ${port}...`);
});

// How to handle unhandled rejections
// Each time there is an unhandled rejections
// somewhere in our app, the process object
// emits an object called : unhandled rejection
// we can then subscribe to that event
// It is best to have a safety net like this
// to handle promise rejections
// This helps to capture Async Code errors
// These handlers should be on top of the code
process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection! Shutting Down...');
    console.log(err.name, err.message);
    //console.log(err);
    // Shut down app - arg 0=success , 1=uncalledException
    // The problem with this is that it is an abrupt way
    // of ending the program. A graceful way is to 1st close
    // the server and then the app. to do that, we save the
    // server to a variable
    server.close(() => {
        // THis allows the server to have time
        // to process any req,
        process.exit(1);
    });
    // process.exit(1);
});

// Now what about Sync Code errors?
// What are uncalled exceptions
// all bugs that are not handle anywhere
// example log something that doesnt exist
//console.log(x);
// process.on('uncaughtException', (err) => {
//     console.log('Uncaught Exception! Shutting down...');
//     console.log(err.name, err.message);
//     server.close(() => {
//         process.exit(1);
//     });
// });
