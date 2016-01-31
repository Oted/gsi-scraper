var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js');
var General     = require('../general.js');

var internals = {
    'name' : '9gag',
    'items' : [],
    'errors' : [],
    'mapping' : require('./mapping.json')
};

/**
 *  Itit function
 */
module.exports = function(done) {
    console.time(internals.name);
    L('Starting!');

    Async.eachLimit(internals.mapping.urls, 1, function(url, done) {
        var options = {
            "timeout"   : 10000,
            "url" : url,
            "headers"   : {
                "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                "gzip":false
            }
        };

        return Request(options, function(err, httpResponse, body) {
            if (err) {
                internals.errors.push(err.message);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                internals.errors.push('Invalid statuscode ' + httpResponse.statusCode);
                return next();
            }
            
            try {
                var json = JSON.parse(body);
            } catch (err) {
                var $    = Cheerio.load(body);
            }
            
            if (!json || !json.result) {
                if (!$) {
                    internals.errors.push('No result in 9gag');
                    return next();
                }

                var list = $('article.badge-entry-container').map(function(i,el) {
                    return $(el).attr('data-entry-url');
                });


                //if here this is hitting a normal page
                return Async.eachLimit(list, 5, function(url, next) {
                    return General.scrape9gagLink(url, function(innerErr, newObj) {
                        if (innerErr) {
                            internals.errors.push(innerErr.message);
                            return next();
                        }

                        L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                        if (newObj.title && newObj.data) {
                            internals.items.push(Utils.clone(newObj));
                        } else {
                            internals.errors.push('Ivalid object, missing title or data');
                        }

                        return next();
                     });
                }, function() {
                    return done();
                });
            }

            //if here we should be dealing with an ajax endpoint
            return Async.eachLimit(json.result, 5, function(obj, next) {
                return General.scrape9gagLink(obj.url, function(innerErr, newObj) {
                    if (innerErr) {
                        internals.errors.push(innerErr.message);
                        return next();
                    }

                    L(url + ' - > \n' + JSON.stringify(newObj.data, null, " "));

                    if (newObj.title && newObj.data) {
                        internals.items.push(Utils.clone(newObj));
                    } else {
                        internals.errors.push('Ivalid object, missing title or data');
                    }

                    return next();
                 });
            }, function() {
                return done();
            });
        });
    }, function() {
        console.timeEnd(internals.name);
        if (internals.errors.length) {
            L('Finish with errors ' + internals.errors.join(', '));
        }

        if (!internals.items.length) {
            L('Finish with no items :( ');
        }

        return done(internals.errors, Utils.clone(internals.items));
    });
};
