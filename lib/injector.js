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
   var nItems  = list.length,
       counter = nItems,
       index,
       temp;
    
    while (counter > 0) {
        //pick a randum index and decrease counter
        index = Math.floor(Math.random() * counter--);

        //swap the elemets
        temp = list[counter];
        list[counter] = list[index];
        list[index] = temp;
    }
    
    Async.each(list, this.inject, function(err) {
        done(null, totals);
    });
};

/**
 *  Check cahcke and stuf, 
 *  Injects one item if allowed
 */
Injector.prototype.inject = function(raw, next) {
    var apiURL  = process.env.API_URL;

    if (!raw || !raw.data) {
        console.error('No data provided for injector!');
        return next();
    }
    
    var hash = utils.generateHash(raw.data);
    
    setTimeout(function () {
        ItemModel.findOne({_hash : hash}, function(err, found) {
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
            Request.post({url: apiURL, form: raw}, function(err, httpResponse, body) {
                if (err) {
                    //process.stdout.write('-');
                    totals.rejects++;
                    console.error(err);
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
