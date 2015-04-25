var fs              = require('fs'),
    Async           = require('async'),
    Hoek            = require('hoek'),
    Mongoose        = require('mongoose'),
    Injector        = require('./lib/injector.js'),
    Ejector         = require('./lib/ejector.js'),
    Scraper         = require('./lib/scraper.js'),
    requestSpan     = 1000 * 60 * 1,
    internals       = {};

//create the scraper
scraper = new Scraper(Math.floor(requestSpan / 2));

//process.env.MONGO_URL   = 'mongodb://localhost:27017/messapp';
//process.env.API_URL     = 'http://localhost:3000/api/items';

process.env.MONGO_URL   = 'mongodb://188.166.45.196:27017/messapp';
process.env.API_URL     = 'http://188.166.45.196:3000/api/items';

/**
 *  Init function for item processing
 */
internals.init = function(mappings) {
    console.time('runtime');
    console.log('Initializing...');
    
    var ejector = new Ejector(process.env.MONGO_URL, Mongoose, function(err, ItemModel) {
        if (err) {
            throw err;
        }

        //remove and add stuff in parallel
        Async.parallel([
            //eject stuff (set to disabled)
            ejector.getToWork.bind(ejector, requestSpan),
            
            //scrape all mappings in parallel
            function(callback) {
                //before this set up the phanom instance
                scraper.setUpPhantom(function() {
                    //inb4 callback hell, call scrapeMapping on each mapping provided
                    Async.map(mappings, internals.scrapeMapping, function(err, results) {
                        var injector = new Injector(process.env.API_URL, Math.floor(requestSpan / 2), ItemModel);

                        results = Hoek.flatten(results || []);
                        injector.injectMultiple(results, callback);
                    });
                })
            }
        ], function(err, results) {
            if (err) {
                throw err;
            }

            console.log('this run took : ');
            console.timeEnd('runtime');
            console.log(JSON.stringify(results, null, " "));
            ejector.close();
            ejector = null;
            internals.init(mappings);
        });
    });
};

/**
 *  Completely scrapes a mapping file and callbacks when done
 */
internals.scrapeMapping = function(file, done) {
    try {
        var mapping = require('./mappings/' + file);
        scraper.scrape(file, mapping, done); 
    } catch (err) {
        return done(err); 
    }
};

//if mapping file is provided, just debug it
if (process.argv.length === 3) {
    var mappingFile = process.argv[2];

    scraper.setUpPhantom(function() {
        internals.scrapeMapping(mappingFile, function(err, results) {
            results = Hoek.flatten(results);
            console.log(JSON.stringify(results, null, " "));
        });
    });
} else {
    fs.readdir('./mappings/', function(err, files) {
        if (err) {
            throw err;
        } 

        var isJson = /\.json$/;
        var mappings = files.filter(function(file) {
            return isJson.test(file);
        });
       
        /**
         *  Set an interval and repeat the scraping
         */
        // setInterval(function () {
            // console.log('Starting a new session!');
            // internals.init(mappings);
        // }, requestSpan + 1000 * 60 * 3);
            
        //and one at runstart
        internals.init(mappings);
    });
}

//on uncaught
process.on('uncaughtException', function(err) {
    //throw err;
    console.log('Caught exception: ' + err);
});
