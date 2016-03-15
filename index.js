require('dotenv').load();

var RUN_TIME = process.env.RUN_TIME || 1000 * 60 * 60;

var Fs              = require('fs'),
    Async           = require('async'),
    Request         = require('request'),
    Mongoose        = require('mongoose'),
    Utils           = require('./lib/utils');

var internals = {
    items : [],
    count : {
        'injects' : 0,
        'rejects' : 0,
        'total' : 0
    }
};

/**
 *  Init function for index
 */
var run = function() {
    console.time('run');
    var path = require('path');

    var directories = Fs.readdirSync('./lib').filter(function(file) {
        return Fs.statSync(path.join('./lib', file)).isDirectory();
    });


    console.log('Scraping targets : \n', process.env.TARGET ? process.env.TARGET : directories.join('\n'));
    console.log();

    //TIGHT, TIGHT, TIGHT
    return Async.each(directories, function(dir, next) {
        if (process.env.TARGET && process.env.TARGET !== dir) {
            return next();
        }

        return require('./lib/' + dir)(function(errors, results) {
            results = Utils.middleware(results || []);

            if (results.length < 1) {
                console.log('No items from ' + dir);
                Utils.reportError(dir, errors.join(', '));
                return next();
            }

            internals.count[dir]                = results.length;
            internals.count[dir + '_errors']    = errors.length;
            internals.count['total']           += results.length;

            console.log('used_mem : ' + process.memoryUsage().heapUsed);
            console.log();

            internals.items = internals.items.concat(results);
            return next();
        });
    }, function() {
        console.log('Dealing with ' + internals.items.length + ' items now...');

        return Async.eachLimit(Utils.shuffle(internals.items), 5, function(item, next) {
            return inject(item, function(err) {
                return setTimeout(function() {
                    return next();
                }, Math.floor(RUN_TIME /internals.items.length));
            });
        }, function(err) {
            console.log(JSON.stringify(internals.count, null, " "));
            console.timeEnd('run');
            console.log('DONE!');
        });
    });
};

/**
 *  Injects one item if allowed
 */
var inject = function(item, next) {
    if (process.env.NODE_ENV === 'test') {
        console.log('Would insert ' + item);
        return next();
    }

    return Request.post({ url: process.env.API_URL, form: item }, function(err, httpResponse, body) {
        if (err) {
            internals.count.rejects++;
            console.log('Error when inserting item ', err);
            return next();
        }

        if (httpResponse.statusCode !== 200) {
            internals.count.rejects++;
            return next();
        }

        internals.count.injects++;
        return next();
    });
};

return run();
