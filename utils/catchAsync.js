// The goal is to catch our asynchronous errors. We pass a func
// as our argument. Since we will be passing in a async func,
// when there is an error, the promise will be rejected, so
// we can then catch the error. We want this to return a func
// so we can associate it with another func, i.e. CreateTour.

// CatchAsync takes a func as arg, and returns
// an anonymous func with args (req, res, next), that
// does something, but wait until express calls it.

module.exports = (fn) => {
    return (req, res, next) => {
        //fn(req, res, next).catch((err) => next(err));
        // We can simplify it further using just next,
        // since the error from the rejected promise is
        // piped to catch, and passed through next, then
        // it will be processd by our global error handlers.
        fn(req, res, next).catch(next);
    };
};
