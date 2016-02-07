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

            var targetBody, targetString, targetObj;

            try {
                targetBody      = target[0].children[0].data;
                targetString    = targetBody.split('=').slice(1).pop().trim().slice(0,-1);
                targetObj       = JSON.parse(targetString);
            } catch (err) {
                internals.errors.push('Could not fetch all needed data for instagram');
                return next();
            }

            targetObj.entry_data.ProfilePage.map(function(page) {
                page.user.media.nodes.map(function(item) {
                    var newObj = {
                        "title" : (item.caption || '').length >= 134 ? item.caption.slice(0,137) + '...' : item.caption,
                        "data" : item.display_src,
                        "source_type" : "instagram",
                        "source"  : options.url
                    };

                    newObj.title += ' [' + options.url.split('/').slice(-2, -1).join('') + ']'

                    L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

                    if (newObj.title && newObj.data) {
                        newObj.title = (newObj.title || '').replace('\n',', ');
                        internals.items.push(Utils.clone(newObj));
                    } else {
                        internals.errors.push('Ivalid object, missing title or data');
                    }
                });
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
