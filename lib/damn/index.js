var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js'); 

var internals = {
    'name' : 'damn',
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
           
            return Async.eachLimit($('article.latestPost'), 1, function(target, inext) {
                var newObj = {
                    "title" : $(target).find('a').attr("title").trim(),
                    "source" : $(target).find('a').attr("href"),
                    "source_type" : "damn",
                    "type" : 'youtube'
                }

                var innerOption = {
                    "timeout"   : 10000,
                    "uri"       : $(target).find('a').attr("href"),
                    "headers"   : {
                        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                        "gzip":false
                    }
                };

                return Request(innerOption, function(ierr, ihttpResponse, ibody) {
                    var text, data;

                    if (ierr) {
                        L('inner err in damn!' + ierr);
                        return inext();
                    }
                    
                    if (ihttpResponse.statusCode !== 200) {
                        L('inner err in damn!' + ihttpResponse.statusCode);
                        return inext();
                    }
                    
                    var i$ = Cheerio.load(ibody);
            
                    i$('script').each(function(i, e) {
                        if (i$(this).html().indexOf('new YT.Player') > -1) {
                            text = i$(this).html();
                        }
                    });

                    if (!text) {
                        return inext();
                    }

                    data = text.match(/videoId:\s\'(:?[\w|\d]+)\'/);
                    
                    if (data && data[1]) {
                        newObj.data = data[1];
                    }

                    L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                    if (newObj.title && newObj.data) {
                        internals.items.push(Utils.clone(newObj));
                    } else {
                        internals.errors.push('Ivalid object, missing title or data');
                    }

                    return inext();
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
