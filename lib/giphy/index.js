var Async       = require('async');
var Request     = require('request');
var Cheerio     = require('cheerio');
var Utils       = require('../utils.js');
var L           = require('../logger.js'); 

var internals = {
    'name' : 'giphy',
    'items' : [],
    'errors' : [],
    'mapping' : require('./mapping.json')
};

/**
 *  Itit function
 */
module.exports = function(done) {
    var url = internals.mapping.urls[0];

    console.time(internals.name);
    L('Starting!');

    var option = {
        "method"    : "GET",
        "timeout"   : 10000,
        "url"       : url,
        "headers"   : {
            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
            "gzip":false,
            'Content-Type': 'text/html; charset=UTF-8'
        }
    };

    Request(option, function(err, httpResponse, body) {
        if (err) {
            internals.errors.push(err.message);
            return next();
        }

        if (httpResponse.statusCode !== 200) {
            internals.errors.push('Invalid statuscode ' + httpResponse.statusCode);
            return next();
        } 


        if (err || !body) {
            Utils.dealWithErrors("giphy", err);
            DebugGiphy('err in giphy!', err);
            return done();
        }

        var json = JSON.parse(body).data;

        json = json.map(function(obj) {
            var newObj = {
                'title' : obj.caption || 
                          obj.tags[Math.floor(Math.random() * obj.tags.length)],
                'data' : obj.images.original.url,
                'source' : obj.source,
                'source_type' : 'giphy'
            };

            L(url + ' - > \n' + JSON.stringify(newObj, null, " "));

            if (newObj.title && newObj.data) {
                internals.items.push(Utils.clone(newObj));
            } else {
                internals.errors.push('Ivalid object, missing title or data');
            }

            return newObj;
        });

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
