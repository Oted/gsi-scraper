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
            var author = options.url.split('/').slice(-2,-1).toString();
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
                    "source" : options.url,
                    "author" : author
                }

                switch (author.toLowerCase()) {
                    case "ignentertainment" :
                        newObj.category = 'gaming';
                    break;

                    case "pewdiepie" :
                        newObj.category = 'gaming';
                    break;

                    case "theguardian" :
                        newObj.category = 'news';
                    break;

                    case "testtubenetwork" :
                        newObj.category = 'news';
                    break;

                    case "thenewyorktimes" :
                        newObj.category = 'news';
                    break;

                    case "skynews" :
                        newObj.category = 'news';
                    break;

                    case "bbcworldwide" :
                        newObj.category = 'news';
                    break;

                    case "reutersvideo" :
                        newObj.category = 'news';
                    break;

                    case "russiatoday" :
                        newObj.category = 'news';
                    break;

                    case "theyoungturks" :
                        newObj.category = 'news';
                    break;

                    case "bbcnews" :
                        newObj.category = 'news';
                    break;

                    case "aljazeeraenglish" :
                        newObj.category = 'news';
                    break;

                    case "tnlfailchannel" :
                        newObj.category = 'fails';
                    break;

                    case "failcity" :
                        newObj.category = 'fails';
                    break;

                    case "tnlfailchannel" :
                        newObj.category = 'fails';
                    break;

                    case "failarmy" :
                        newObj.category = 'fails';
                    break;

                    case "UCvPXiKxH-eH9xq-80vpgmKQ" :
                        newObj.category = 'history';
                    break;

                    case "bigthink" :
                        newObj.category = 'inspiring';
                    break;

                    case "nasatelevision" :
                        newObj.category = 'science';
                    break;

                    case "asapscience" :
                        newObj.category = 'science';
                    break;

                    case "kqeddeeplook" :
                        newObj.category = 'science';
                    break;
                }

                newObj.title += options.url.indexOf('user') > -1 ? ' [' + options.url.split('/').slice(-2, -1).join('') + ']' : '';

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
        }

        if (!internals.items.length) {
            L('Finish with no items :( ');
        }

        return done(internals.errors, Utils.clone(internals.items));
    });
};
