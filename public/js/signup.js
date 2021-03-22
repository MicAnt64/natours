/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const signup = async (
    name,
    location,
    email,
    password,
    passwordConfirm
) => {
    try {
        await axios({
            method: 'POST',
            url: '/api/v1/users/signup',
            data: {
                name: name,
                location: location,
                email: email,
                password: password,
                passwordConfirm: passwordConfirm
            }
        });

        if (res.data.status === 'success') {
            showAlert('success', 'Registration successful!');
            window.setTimeout(() => {
                window.location.replace('/me');
            }, 1000);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
        console.log(err.response.data.message);
    }
};
