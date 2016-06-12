var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js');

var internals = {
    'name' : 'instagram',
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
    return Async.eachLimit(internals.mapping.urls, 1, function(urlObj, next) {
        var options = {
            "timeout"   : 10000,
            "url" : urlObj.url,
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

            var $ = Cheerio.load(body),
                target = $('script').filter(function(a, el) {
                    if (!el.children[0]) {
                        return false;
                    }

                    return el.children[0].data.indexOf('window._sharedData') > -1;
                });

            if (!target) {
                internals.errors.push('Err could not get target in INSTAGRAM');
                return next();
            }

            var targetBody, targetString, targetObj, page, target;

            try {
                targetBody      = target[0].children[0].data;
                targetString    = targetBody.replace('window._sharedData = ', '');
                targetObj       = JSON.parse(targetString.slice(0,-1));
            } catch (err) {
                internals.errors.push(err);
                return next();
            }

            target = targetObj.entry_data.ProfilePage;

            if (!target || target.length < 1) {
                internals.errors.push(new Error('No target stuff : <'));
                return next();
            }

            page = target[0];

            if (!page || !page.user || !page.user.media.nodes) {
                internals.errors.push('No page in map');
                return;
            }

            return Async.eachLimit(page.user.media.nodes, 5, function(item, innerNext) {
                var newObj = {
                    "title" : (item.caption || ''),
                    "data" : item.display_src.split('?').shift() || item.display_src,
                    "search" : options.url.split('/').slice('/').slice(-2,-1).toString(),
                    "source_type" : "instagram",
                    "source"  : options.url,
                    "author" : options.url.split('/').slice('/').slice(-2,-1).toString().toLowerCase(),
                };

                if (urlObj.category) {
                    newObj.category = urlObj.category;
                }

                //if this is a video the data needs to be fetched from the item page, go there
                if (item.is_video) {
                    return Request({
                        'url' : 'https://www.instagram.com/p/' + item.code + '/',
                        "headers"   : {
                            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                            "gzip":false
                        }
                    }, function(err, res, body) {
                        if (err) {
                            internals.errors.push(err.message);
                            return next();
                        }

                        if (res.statusCode !== 200) {
                            internals.errors.push('Invalid statuscode ' + httpResponse.statusCode);
                            return next();
                        }

                        newObj.data = Cheerio.load(body)('meta[property=og\\:video]').attr('content');
                        L(urlObj.url + ' - > \n' + JSON.stringify(newObj, null, " "));

                        if (newObj.title && newObj.data) {
                            newObj.title = (newObj.title || '').replace('\n',', ');
                            internals.items.push(Utils.clone(newObj));
                        } else {
                            internals.errors.push('Ivalid object, missing title or data');
                        }

                        return innerNext();
                    });
                }

                L(urlObj.url + ' - > \n' + JSON.stringify(newObj, null, " "));

                if (item.dimensions) {
                    newObj.height = item.dimensions.height;
                }

                if (newObj.title && newObj.data) {
                    newObj.title = (newObj.title || '').replace('\n',', ');
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
