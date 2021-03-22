/* eslint-disable */
import axios from 'axios';
//import { response } from 'express';
import { showAlert } from './alerts';

// UpdateData

// Type is either password or data
export const updateSettings = async (data, type) => {
    // USe try catch block so we can handle errors

    try {
        const url =
            type === 'password'
                ? '/api/v1/users/updateMyPassword'
                : '/api/v1/users/updateMe';

        const result = await axios({
            method: 'PATCH',
            url: url,
            data: data
        });

        if (result.data.status === 'success') {
            showAlert('success', `${type.toUpperCase()} updated successfully!`);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
};
