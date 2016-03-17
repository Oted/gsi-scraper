var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js');
var General     = require('../general.js');

var internals = {
    'name' : 'reddit',
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

            try {
                var json = JSON.parse(body);
            } catch (err) {
                internals.errors.push(err.message);
                return next();
            }

            return Async.each(json.data.children, function(obj, innerNext) {
                var subReddit = obj.data.subreddit.toLowerCase();

                var newObj = {};

                if (obj.data.url.indexOf('imgur.com') > -1 && obj.data.url.split('/').pop().indexOf('.') === -1) {
                    return General.scrapeImgur(obj.data.url, function(err, imgurObj) {
                        if (err) {
                            return innerNext();
                        };

                        if (imgurObj.title && imgurObj.data) {
                            internals.items.push(Utils.clone(imgurObj));
                        }

                        L(url + ' - > \n' + JSON.stringify(imgurObj, null, " "));

                        return innerNext();
                    });
                }

                newObj = {
                    'source' : 'http://reddit.com' + obj.data.permalink,
                    'title' : obj.data.title,
                    'data' : obj.data.url,
                    'source_type' : 'reddit',
                    'author' : obj.data.subreddit
                };

                if (['gif', 'videos', 'pics', 'gifs', 'gifextra'].indexOf(subReddit) === -1) {
                    if (subReddit === 'documentaries') {
                        newObj.category = 'documentary';
                    }

                    if (subReddit === 'nostalgia') {
                        newObj.category = 'nostalgic';
                    }

                    if (subReddit === 'creepy' || subReddit === 'horror') {
                        newObj.category = 'creepy';
                    }

                    if (subReddit === 'fails') {
                        newObj.category = 'fails';
                    }

                    if (subReddit === 'reactiongifs') {
                        newObj.category = 'reaction';
                    }

                    if (subReddit === 'nonononoyes' ||
                            subReddit === 'fffffffuuuuuuuuuuuu' ||
                            subReddit === 'hybridanimals' ||
                            subReddit === 'funny') {
                        newObj.category = 'funny';
                    }

                    if (subReddit === 'inspiring' || subReddit === 'lifehacks') {
                        newObj.category = 'inspiring';
                    }

                    if (subReddit === 'earthporn' || subReddit === 'imaginarylandscapes') {
                        newObj.category = 'beautiful';
                    }
                }

                L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                if (newObj.title && newObj.data) {
                    internals.items.push(Utils.clone(newObj));
                } else {
                    internals.errors.push('Ivalid object, missing title or data');
                }

                return innerNext();
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
