//Extends inherits from another class
class AppError extends Error {
    constructor(message, statusCode) {
        //When we extend a parent class
        // we call super in order to extend
        // the parent constructor
        super(message);
        // only pass message in super, because
        // error class only accpets 1 param
        this.statusCode = statusCode;
        // 4 = fail , 5 = error
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        // We will be dealing with operational errors, ie user forgets
        // to input errors
        this.isOperational = true;

        //This is to avoid pollutiing the stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
