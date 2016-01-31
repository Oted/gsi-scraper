var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js'); 

var internals = {
    'name' : 'cheezburger',
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

            Async.eachLimit($('div[class*=col-] > a[href*="cheezburger.com"]'), 3, function(target, iNext) {
                var innerOption = {
                    "timeout"   : 20000,
                    "uri"       : $(target).attr('href'),
                    "headers"   : {
                        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                        "gzip":false
                    }
                };

                var newObj = {
                    "source" : $(target).attr('href'),
                    "source_type" : "cheezburger"
                };

                Request(innerOption, function(iErr, iHttpResponse, iBody) {
                    if (iErr) {
                        internals.errors.push(err.message);
                        return iNext();
                    }
                    
                    if (iHttpResponse.statusCode !== 200) {
                        internals.errors.push('Invalid statuscode ' + iHttpResponse.statusCode);
                        return iNext();
                    }
         
                    var i$ = Cheerio.load(iBody);

                    newObj.title = i$('meta[property="og:title"]').attr('content');

                    if (i$('div.nw-post-asset img').attr('src')) {
                        newObj.data = i$('div.nw-post-asset img').attr('src');
                        newObj.type = 'img';
                    } else if (i$('iframe.video-embed').attr('src')) {
                        newObj.data = i$('iframe.video-embed').attr('src').split('/embed/').pop().split('?').shift();
                        newObj.type = 'youtube';
                    }
    
                    L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                    if (newObj.title && newObj.data) {
                        newObj.title = (newObj.title || '').replace('\n',', ');
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
