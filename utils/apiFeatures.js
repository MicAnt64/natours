class APIFeatures {
    constructor(query, queryString) {
        // 1st arg is MongoDB query object
        // 2nd arg is query string from request
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        //console.log('Query Obj');
        //console.log(JSON.stringify(this.queryObj));
        //console.log('Query Str');
        //console.log(this.queryString);
        const queryObj = { ...this.queryString }; //we destructure and make an obj
        // 1A) Regular Filtering
        // Create array of fields we want to exclude
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach((el) => delete queryObj[el]);

        // 1B) Advanced Filtering
        let queryStr = JSON.stringify(queryObj);

        queryStr = queryStr.replace(
            /\b(gte|gt|lte|lt)\b/g,
            (match) => `$${match}`
        );

        this.query = this.query.find(JSON.parse(queryStr));
        // This will eventually feed into
        //let query = Tour.find(JSON.parse(queryStr));

        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join('');
            //console.log(sortBy);
            // sort method is available to the query instance of Tour
            this.query = this.query.sort(sortBy);
            // If there is a tie, you can add another field
            // i.e. sort('price ratingsAverage')
        } else {
            // This will be default if no sort argument is
            // passed as a req, then sort by date of creation
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            //default if user doesn't specify fields
            // here we remove useless fields (- is to remove)
            this.query = this.query.select('-__v');
        }

        return this;
    }

    paginate() {
        const page = this.queryString.page * 1 || 1;
        //*1 trick converts str to num
        // the or 1 is to have the default value set to 1, ie null or 1 = 1
        // or returns the what the user set
        const limit = this.queryString.limit * 1 || 100;
        const skipVal = (page - 1) * limit;

        this.query = this.query.skip(skipVal).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;
