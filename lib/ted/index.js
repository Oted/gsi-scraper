var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js');

var internals = {
    'name' : 'ted',
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
        var option = {
            'uri' : 'http://www.ted.com/talks/grid?filter=trending',
            'gzip' : true,
            'headers' : {
                'Host': 'www.ted.com',
                'Connection': 'keep-alive',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36',
                'Referer': 'http://www.ted.com/',
                'Accept-Encoding': 'gzip, deflate, sdch',
                'Accept-Language': 'sv-SE,sv;q=0.8,en-US;q=0.6,en;q=0.4'
            }
        };

        Request.get(option, function(err, httpResponse, body) {
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
                internals.errors.push(err.message);
                return next();
            }

            var ids = json.map(function(obj) {
                return 'https://api.ted.com/v1/talks/' + obj.id + '.json?api-key=memdvz7jc4qes6z9dejjuwne'
            });

            return Async.eachLimit(ids, 1, function(url, cont) {
                Request(url, function(e, hR, b) {
                    if (e) {
                        internals.errors.push(e.message);
                        return next();
                    }

                    if (hR.statusCode !== 200) {
                        internals.errors.push('Invalid statuscode ' + hR.statusCode);
                        return next();
                    }

                    if (!b) {
                        internals.errors.push('No body');
                        return next();
                    }

                    try {
                        var j   = JSON.parse(b);
                    } catch (err) {
                        internals.errors.push(err.message);
                        return next();
                    }

                    L('got ted ' + JSON.stringify(j, null, ' '));
                    try {
                        var newObj = {
                            'title' : j.talk.name,
                            'data' : j.talk.media.internal['450k'].uri.split('?').shift(),
                            'source' : 'http://www.ted.com/talks/' + j.talk.slug,
                            'type' : 'video',
                            'source_type' : 'ted',
                            'category' : 'learing'
                        };
                    } catch (err) {
                        internals.errors.push(err.message);
                        L('could not parse ted lol', err.message);
                        return cont(err);
                    }

                    L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                    if (newObj.title && newObj.data && newObj.data.indexOf('.mp4' > -1)) {
                        internals.items.push(Utils.clone(newObj));
                    } else {
                        internals.errors.push('Ivalid object, missing title or data');
                    }

                    return cont();
                });
            }, function(err, results) {
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
