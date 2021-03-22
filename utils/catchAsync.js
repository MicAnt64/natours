// It's goal is to catch our asynchronous errors
// we pass an func as our arg
// since we will be passing in a async funct, when there
// is an error, the promise will be rejected, so
// we can catch the error
// We want this to return a func so we can
// associate it with CreateTour.
// CatchAsync takes a func as arg, and returns
// an anonym func with args (req, res, next), that
//  does something, but wait unitl express calls it.
//const catchAsync = (fn) => {
module.exports = (fn) => {
    return (req, res, next) => {
        //fn(req, res, next).catch((err) => next(err));
        // we cans simply it further using next,
        // since it is the error from the rejected promis
        // is in the catch, and passed through next, then
        // it will be processd by our global error handlers
        fn(req, res, next).catch(next);
    };
};
