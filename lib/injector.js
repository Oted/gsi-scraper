var Async       = require('async'),
    Request     = require('request'),
    utils       = require('./utils.js'),
    totals = {
        'injects' : 0,
        'rejects' : 0,
        'duplicates' : 0
    },
    ItemModel,
    requestSpan;

/**
 *  Constructor for the injector, handles all the calls to the 
 */
function Injector(span, itemModel) {
    console.log('New injector!');
    ItemModel           = itemModel;
    totals.injects      = 0;
    totals.rejects      = 0;
    totals.duplicates   = 0;
    requestSpan         = span;
};

/**
 *  Injects a lot of stuff, shuffle before.
 */
Injector.prototype.injectMultiple = function(list, done) {
    Async.each(list, this.inject, function(err) {
        done(null, totals);
    });
};

/**
 *  Check cahcke and stuf, 
 *  Injects one item if allowed
 */
Injector.prototype.inject = function(raw, next) {
    if (!raw || !raw.data) {
        return next();
    }
    
    var hash = utils.generateHash(raw.data);
    
    setTimeout(function () {
        ItemModel.findOne({
            _hash : hash
        }, function(err, found) {
            if (err) {
                return next(err);
            }

            if (found) {
                totals.duplicates++;
                //process.stdout.write('d');
                return next();
            }

            raw.title   = raw.title || '';
            raw.scraped = true;

            //peel off some stuff
            if (raw.data.indexOf('//') === 0) {
                raw.data = raw.data.slice(2);
            }

            //add these things with a randomized timeout (also callbackhell)
            Request.post({ url: process.env.API_URL, form: raw }, function(err, httpResponse, body) {
                if (err) {
                    //process.stdout.write('-');
                    totals.rejects++;
                    console.log('err in inject ' + err);
                    return next();
                }
                
                if (httpResponse.statusCode !== 200) {
                    //process.stdout.write('-');
                    totals.rejects++;
                    return next();
                }

                //process.stdout.write('+');
                totals.injects++;
                return next();
            });
        });
    }, Math.floor(Math.random() * requestSpan));
};

module.exports = Injector;
