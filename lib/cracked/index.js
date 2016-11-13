var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js');

var internals = {
    'name' : 'cracked',
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

            return Async.eachLimit($('div.meta a[href*=video_]'), 3, function(target, iNext) {
                var innerOption = {
                    "timeout"   : 10000,
                    "uri"       : $(target).attr("href"),
                    "headers"   :{
                        "gzip": false,
                        "Host": "www.cracked.com",
                        "Connection": "keep-alive",
                        "Pragma": "no-cache",
                        "Cache-Control": "no-cache",
                        "Upgrade-Insecure-Requests": "1",
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "DNT": "1",
                        "Accept-Language": "en-US,en;q=0.8",
                        "Cookie": "dmp=desktop:control:native; PHPSESSID=92d5ccdfd6e4da997afe356f0255dbe2; __bxcid=1f5a8da0-280b-4688-a418-75ca736ca563-1479075391624; __bxcurr=N4IgDmAuDOIFwEYAsB2AnABhQVgMxoCYDcA2AGnADcBjAO0ngQulkVUx3yNIrACcA9gzggAFpEhgRFACYCAtvBAB3VQDpqfAIbUA1gFMZGhSAp8ArnwA2S0yCuWbIgPSUAljP0CA-gQzEADm9IfT4-NwAzAE83WgBzAFpqAVoI.RY3FOgEiMF5BL59LSsEkJ1RUOg1cXkbCisYRnYsPEJichBPSiUAEXTdSAEwZwAZLSghuwFWEABBCCt9OwAjYRAAYVE8pYpl7rhsJAo3MFsKOK9vZLOQC59qahu7q9ony75XkTtnme.Lx6-50uAC83j4rFphBggeCUvBobdLvIASA.j5IKDAYifDobmBHPAANoAXQAvkAAAA__; __bxprev=N4IgJghgngziBcBtAjAFgOwE4AM6CsAzJgEzGoEC6AvkAA__; __bxtest=xyz"
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
                    var i$ = Cheerio.load(iBody);

                    var newObj = {
                            "source" : innerOption.uri,
                            "title" : i$('h1.title').text().trim(),
                            "data" : i$('iframe#youtubePlayer').attr('src').split('/').pop(),
                            "source_type" : "cracked",
                            "type" : "youtube"
                        };

                    L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                    if (newObj.title && newObj.data) {
                        internals.items.push(Utils.clone(newObj));
                    } else {
                        internals.errors.push('Ivalid object, missing title or data');
                    }

                    return setTimeout(function() {
                        return iNext();
                    }, 10);
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
