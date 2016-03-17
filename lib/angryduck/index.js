var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js');

var internals = {
    'name' : 'angryduck',
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
    Async.eachLimit(internals.mapping.urls, 1, function(url, next) {
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

            var $ = Cheerio.load(body);

            Async.eachLimit($('div.thumbs a.thumbnail'), 3, function(target, iNext) {
                var innerOption = {
                    "timeout"   : 20000,
                    "uri"       : 'http://www.angryduck.com' + $(target).attr('href'),
                    "headers"   : {
                        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                        "gzip":false
                    }
                };

                var newObj = {
                    "source" : 'http://www.angryduck.com' + $(target).attr('href'),
                    "title" : $(target).find('img').attr('alt'),
                    "source_type" : "angryduck"
                };

                Request(innerOption, function(iErr, iHttpResponse, iBody) {
                    if (iErr) {
                        internals.errors.push(iErr.message);
                        return next();
                    }

                    if (iHttpResponse.statusCode !== 200) {
                        internals.errors.push('err in duck! ' + iHttpResponse.statusCode);
                        return next();
                    }

                    var i$ = Cheerio.load(iBody);

                    newObj.data = i$('.pic-holder div img').attr('src') || i$('.pic-holder div video source:nth-child(1)').attr('src');

                    if (newObj.data) {
                        newObj.data = 'http://www.angryduck.com' + newObj.data;
                    }

                    L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                    if (newObj.title && newObj.data) {
                        internals.items.push(Utils.clone(newObj));
                    } else {
                        internals.errors.push('Ivalid object, missing title or data');
                    }

                    return iNext();
                });
            }, next);
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
