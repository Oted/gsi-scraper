var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js');
var General     = require('../general.js');

var internals = {
    'name' : 'ifunny',
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

    return Async.eachLimit(internals.mapping.urls, 1, function(url, next) {
        var options = {
            "timeout"   : 10000,
            "url" : url,
            "headers"   : {
                "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                "gzip":false,
                "X-Requested-With" : "XMLHttpRequest",
                "Accept" : "application/json"
            }
        };

        return Request(options, function(err, httpResponse, body) {
            var $;

            if (err) {
                internals.errors.push(err.message);
                return next();
            }

            if (httpResponse.statusCode !== 200) {
                internals.errors.push('Invalid statuscode ' + httpResponse.statusCode);
                return next();
            }

            try {
                body = JSON.parse(body);
            } catch (err) {
                internals.errors.push(err);
                return next();
            }

            return Async.eachLimit(body.content.items, 1, function(item, innerNext) {
                if (!item) {
                    return innerNext();
                }

                var newObj = {
                    "title" : item.tags.join(' '),
                    "source" : item.link,
                    "category" : "funny"
                };

                switch (item.type) {
                    case "vine" :
                        return General.scrapeVine(item.vine.source_url, function(innerErr, vineItem) {
                            if (innerErr) {
                                internals.errors.push(innerErr);
                                return innerNext();
                            }

                            vineItem.sorce = item.link;

                            if (newObj.title && newObj.data) {
                                internals.items.push(vineItem);
                            }

                            return innerNext();
                        });

                    case "video" :
                        newObj.data = item.video.url;
                        newObj.type = 'youtube';
                        break;

                    case "gif" :
                        newObj.data =  item.gif.mp4_url || item.gif.webm_url;
                        newObj.type = 'gif';
                        break;

                    default :
                        newObj.data = item.url;
                        break;
                }

                if (item || item.size) {
                    newObj.height = item.size.h || null;
                    newObj.width = item.size.w || null;
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
