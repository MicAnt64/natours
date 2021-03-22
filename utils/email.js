const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

// user info contains email and name, url- contains
// reset password url. Followed by methods.

//new Email(user, url).sendWelcome();

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName = user.name.split(' ')[0];
        this.url = url;
        this.from = `Jonas Schmedtmann <${process.env.EMAIL_FROM}>`;
    }

    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            // Creater a transporter for Sendgrid
            return nodemailer.createTransport({
                // nodemailer knows server and ports
                // for sendgrid
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
        }

        return nodemailer.createTransport({
            //service: 'Gmail', if we want to use GMAIL
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async send(template, subject) {
        // Send the actual email
        // 1) Render the html for the email based on a pug template
        const html = pug.renderFile(
            `${__dirname}/../views/email/${template}.pug`,
            {
                //Pass data
                firstName: this.firstName,
                url: this.url,
                subject: subject
            }
        );
        // 2) Define the email options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject: subject,
            html: html,
            // Text is good to prevent spam
            text: htmlToText(html)
            // html:
        };

        // 3) Create a transport and send email.
        await this.newTransport().sendMail(mailOptions);
    }

    async sendWelcome() {
        await this.send('welcome', 'Welcome to the Natours Family!');
    }

    async sendPasswordReset() {
        await this.send(
            'passwordReset',
            'Your password reset token (valid for only 10 minutes)'
        );
    }
};

//const sendEmail = async (options) => {
// Follow 3 steps too send email
// 1. Create a transporter
// Its a service that will send the email ie GMAIL
// const transporter = nodemailer.createTransport({
//     //service: 'Gmail', if we want to use GMAIL
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//         user: process.env.EMAIL_USERNAME,
//         pass: process.env.EMAIL_PASSWORD
//     }
//     // Need to activate in gmail "less secure app" option
//     // We are not using gmail in this app is because
//     // gmail is not at all a good idea for a production app
//     // with gmail you can only send 500 emails a day, and then
//     // you may be marked as a spammer. We will be using SENDGRID
//     // IN the meantime we will use a development service which
//     // fakes to send email to real addresses, (they end up trapped)
//     // in a dev inbox, so we can take a look at how they will
//     // look for production. MAILTRAP.IO pkg
// });
// 2. Define email options
// const mailOptions = {
//     from: 'Jonas Schmedtmann <hello@jonas.iso>',
//     to: options.email,
//     subject: options.subject,
//     text: options.message
//     // html:
// };
// 3. Send the email w/ nodemailer
// Below is an async func that returns a promise
//await transporter.sendMail(mailOptions);
//};

//module.exports = sendEmail;
