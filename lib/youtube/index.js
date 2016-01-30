var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js'); 

var internals = {
    'name' : 'youtube',
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
            var $;

            if (err) {
                internals.errors.push(err.message);
                return next();
            }

            if (httpResponse.statusCode !== 200) {
                internals.errors.push('Invalid statuscode ' + httpResponse.statusCode);
                return next();
            }
            
            $ = Cheerio.load(body);
            $('li.channels-content-item div.yt-lockup').each(function(i, item) {
                var newObj = {
                    "title" : $(this).find('a.yt-uix-sessionlink').text().trim(),
                    "data" : 'http://www.youtube.com' + $(this).find('a.yt-uix-sessionlink').attr('href'),
                    "type" : "youtube",
                    "source_type" : "youtube",
                    "source" : options.url
                }

                L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                if (newObj.title && newObj.data) {
                    internals.items.push(Utils.clone(newObj));
                } else {
                    internals.errors.push('Ivalid object, missing title or data');
                }
            });

            return next();
        });
    }, function() {
        console.timeEnd(internals.name);
        if (internals.errors.length) {
            L('Finish with errors ' + internals.errors.join(', '));
            Utils.reportError(internals.name, internals.errors.join(', '));
        }

        if (!internals.items.length) {
            L('Finish with no items :( ');
            Utils.reportError(internals.name, 'No items recieved');
            return done(new Error('No items recieved'));
        }

        return done(null, Utils.clone(internals.items));
    });
};