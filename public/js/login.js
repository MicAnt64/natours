/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
    //console.log(email, password); dont put sensitive data to the console
    // Async/await is for modern browsers.
    // Axios will throw error based on response code, so we can use try catch blocks
    // To make http, we are going to use a popular lib called axios
    try {
        const result = await axios({
            method: 'POST',
            // Relative url is fine since api and website will be hosted on the same server.
            url: '/api/v1/users/login',
            data: {
                email: email,
                password: password
            }
        });

        // To send data from html form to node application. There are 2 ways
        // 1 - http request, 2) or use an html form

        // Response
        //console.log(result.data);
        if (result.data.status === 'success') {
            showAlert('success', 'Logged in successfully!');

            // After 1.5 sec, load homepage
            window.setTimeout(() => {
                location.assign('/');
            }, 1000);
        }

        //console.log(result);
    } catch (err) {
        // This is axios specific
        //console.log(err.response.data);
        showAlert('error', err.response.data.message);
    }
};

export const logout = async () => {
    try {
        const result = await axios({
            method: 'GET',
            url: '/api/v1/users/logout'
        });
        // Now we reload the page - need to do it in frontend (not backend - express)
        if ((result.data.status = 'success')) {
            //location.reload(true); // true -> forces a reload from server and not browser cache
            location.assign('/');
        }
    } catch (err) {
        console.log(err.response);
        showAlert('error', 'Error logging out! Try again.');
    }
};
