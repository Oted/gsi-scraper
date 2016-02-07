var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js'); 

var internals = {
    'name' : 'soundcloud',
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

    return Async.eachLimit(internals.mapping.urls, 10, function(url, next) {
        var option = {
            "timeout"   : 10000,
            "uri"       : 'http://api.soundcloud.com/resolve.json?url=' + url + '&client_id=e6c07f810cdefc825605d23078c77e8d',
            "headers"   : {
                "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                "gzip":false
            }
        };

        return Request(option, function(err, httpResponse, body1) {
            if (err) {
                internals.errors.push(err.message);
                return next();
            }

            if (httpResponse.statusCode !== 200) {
                internals.errors.push('Invalid statuscode ' + httpResponse.statusCode);
                return next();
            } 

            try {
                var json1 = JSON.parse(body1);
            } catch (err) {
                internals.errors.push(err.message);
                return next();
            }
            
            var innerOption = {
                "timeout"   : 10000,
                "uri"       : 'http://api.soundcloud.com/users/' + json1.id + '/favorites.json?client_id=e6c07f810cdefc825605d23078c77e8d',
                "headers"   : {
                    "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                    "gzip":false
                }
            };

            return Request(innerOption, function(err2, httpResponse2, body2) {
                if (err2) {
                    internals.errors.push(err2.message);
                    L('err in soundclloud!', err2);
                    return next();
                }

                if (httpResponse2.statusCode !== 200) {
                    internals.errors.push('Invalid statuscode ' + httpResponse2.statusCode);
                    L('err in soundclloud!', err2);
                    return next();
                }
                
                try {
                    var json = JSON.parse(body2);
                } catch (err) {
                    internals.errors.push(err.message);
                    return next();
                }

                json.map(function(obj) {
                    var newObj = {
                        'title' : obj.title,
                        'type' : 'soundcloud',
                        'data' : obj.permalink_url,
                        'source_type' : 'soundcloud',
                        'source' : url
                    };

                    newObj.title += obj.user.permalink ? ' [' + obj.user.permalink + ']' : ''

                    L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                    if (newObj.title && newObj.data) {
                        internals.items.push(Utils.clone(newObj));
                    } else {
                        internals.errors.push('Ivalid object, missing title or data');
                    }
                });

                return next();
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
