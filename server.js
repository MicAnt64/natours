const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
    console.log('Uncaught Exception!!! Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

// Need to request environment variables before the app files
dotenv.config({ path: './config.env' });
//dotenv.config({ path: './starter/config.env' });

const app = require('./app');

const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

// 2nd arg deals with deprecation warnings
mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    })
    .then(() => console.log('DB connection successful!'));

//console.log(app.get('env')); //Print development
//app.get('env') gets us the environment variable
//console.log(process.env); // Returns a lot

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

// How to handle unhandled rejections
// Each time there is an unhandled rejections
// somewhere in our app, the process object
// emits an object called : unhandled rejection
// we can then subscribe to that event.
// It is best to have a safety net like this
// to handle promise rejections.
// This helps to capture Async Code errors.
// These handlers should be on top of the code.
process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection! Shutting Down...');
    console.log(err.name, err.message);
    // Shut down app - arg 0=success , 1=uncalledException
    // The problem with this is that it is an abrupt way
    // of ending the program. A graceful way is to 1st close
    // the server and then the app; to do that, we save the
    // server to a variable
    server.close(() => {
        // This allows the server to have time
        // to process any req
        process.exit(1);
    });
});

// Another Heroku specific config, which is to respond to a SIGTERM signal
// which heroku emits for time to time. A dyno is a container, which the app
// is running, and it restarts every 24 hrs in order to keep app in a healthy
// state. It does this by sending a SIGTERM signal to app, which shuts down the
// app. Sometimes this shut down is abrupt and it leaves req being processed
// hanging in the air (this happens also with an unhandled rejection).
// Files modified: app.js (enabled proxy trusting), authController.js (enabled
// checking header for x-forwarder-proto) and server.js (below)
process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED. Shutting down gracefully.');
    // Allows server to shutdown gracefully by allowing pending req to process until the end
    server.close(() => {
        console.log('Process terminated.');
    });
});
