/* eslint-disable */
import axios from 'axios'; //// es 6 module syntax
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
    // good practice to use try catch block if we have mult async commands
    try {
        const stripe = Stripe(
            'pk_test_51IUMozEpGafBR2a06wDg1ekNpHn7r4IytXfU5Xt2W7FD17SKVn0FNwpjbbU0AuzXVXQP6DE80UTpqmIyGqVvPUTi00lUe0LBzQ'
        ); //here we use the public key

        // 1) Get the checkout session from the server (api) to send to the client
        // we are only doing a get req , so we can just pass the url
        const session = await axios(
            `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
        );

        console.log('stripe session: ', session);
        // 2) Use stripe object to auto create checkout form and charge the credit card
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        });
    } catch (err) {
        console.log('stripe err: ', err);
        showAlert('error', err);
    }
};
