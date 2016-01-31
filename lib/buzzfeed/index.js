var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js'); 

var internals = {
    'name' : 'buzzfeed',
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

            var $       = Cheerio.load(body), 
                urls    = [];
            
            $('li.grid-posts__item a.lede__link[href]').each(function(i, item) {
                if (urls.indexOf(item.attribs.href) === -1) {
                    urls.push(item.attribs.href);
                }
            });

            return Async.eachLimit(urls, 3, function(target, iNext) {
                var innerOption = {
                    "timeout"   : 10000,
                    "uri"       : 'http://www.buzzfeed.com' + target,
                    "headers"   : {
                        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                        "gzip":false
                    }
                };

                return Request(innerOption, function(iErr, iHttpResponse, iBody) {
                    if (iErr) {
                        internals.errors.push(iErr.message);
                        return iNext();
                    }
                    
                    if (iHttpResponse.statusCode !== 200) {
                        internals.errors.push('Invalid statuscode ' + iHttpResponse.statusCode);
                        return iNext();
                    }

                    var i$      = Cheerio.load(iBody),
                        videoEl = i$('div.video-embed-big[id*=video_buzz]').attr('rel:thumb'),
                        title   = i$('#post-title').text().trim(),
                        videoId;
                    
                    if (!videoEl) {
                        return iNext();
                    }

                    videoId = videoEl.split('/').slice(-2,-1).join();

                    if (!videoId || videoId.length !== 11) {
                        internals.errors.push('No video_id');
                        return iNext();
                    }

                    var newObj = {
                        "title": title,
                        "data" : videoId,
                        "type" : "youtube",
                        "source" : innerOption.uri,
                        "source_type" : 'buzzfeed'
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
