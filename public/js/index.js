/* eslint-disable */
// This file is to get data from UI and then get action from other modules
// ie mapbox.js, login.js, alerts.js

// We use {} since it is not a default export
import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { signup } from './signup';
import { doc } from 'prettier';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import { showAlert } from './alerts';

// // DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');

// // DELEGATION
if (mapBox) {
    const locations = JSON.parse(mapBox.dataset.locations);
    displayMap(locations);
}
// //console.log(locations);

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // prevents the form from loading another page
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });
}

if (logOutBtn) {
    logOutBtn.addEventListener('click', logout);
}

if (userDataForm) {
    userDataForm.addEventListener('submit', async (e) => {
        // e is event, and we prevent the default which is to submit form
        // on submit click button

        e.preventDefault();
        document.querySelector('.btn--save-settings').textContent =
            'Updating...';
        // We need to programatically recreate a multiform data
        const form = new FormData();

        form.append('name', document.getElementById('name').value);
        form.append('email', document.getElementById('email').value);
        form.append('photo', document.getElementById('photo').files[0]);
        // files is an array

        //updateSettings({ name, email }, 'data');
        await updateSettings(form, 'data');

        document.querySelector('.btn--save-settings').textContent =
            'Save settings';

        location.reload();
    });
}

if (userPasswordForm) {
    userPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        document.querySelector('.btn--save-password').textContent =
            'Updating...';

        const passwordCurrent = document.getElementById('password-current')
            .value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm')
            .value;

        await updateSettings(
            { passwordCurrent, password, passwordConfirm },
            'password'
        );

        document.querySelector('.btn--save-password').textContent =
            'Save Password';
        document.getElementById('password-current').value = '';
        document.getElementById('password').value = '';
        document.getElementById('password-confirm').value = '';
    });
}

if (bookBtn) {
    bookBtn.addEventListener('click', (e) => {
        e.target.textContent = 'Processing...';
        // e.target is the element that was clicked
        // data-tour-id in pug/html will be converted to tourId (dash is converted to camel case. Data is dropped)
        // const tourId = e.target.dataset.tourId;
        // above is equal to below, we can do this since var tourId is = to dataset.tourId
        const { tourId } = e.target.dataset;
        bookTour(tourId);
    });
}

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 12);
