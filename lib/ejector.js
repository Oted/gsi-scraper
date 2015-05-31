var Async       = require('async');
var Request     = require('request');
var DebugTwitch = require('debug')('twitch');
var DebugVine   = require('debug')('vine');

var internals   = {},
    expireTime  = 1000 * 60 * 60 * 120,
    requestSpan,
    targetUrl,
    totals = {
        "removed" : 0
    };

//models
var ItemModel;


/**
 *  Ejector takes care of removal of old stuff
 */
function Ejector(itemModel) {
    console.log('New ejector!');
    ItemModel = itemModel;
    totals.removed  = 0;
};

/**
 * This inits the ejector process, which starts with validating different data,
 * then ejects out dated things
 */
Ejector.prototype.getToWork = function(span, done) {
    var aWhileAgo = new Date() - 1000 * 60 * 60 * 12;

    //query the stuff that we need to know how its doing
    ItemModel.find({enabled : true, type : {$in : ['twitch', 'youtube', 'vine', 'img']}, _sort : {$gte : aWhileAgo}}, function(err, docs) {
        if (err) {
            console.log('err', err);
            return ejectOutDated(span, done);
        }

        Async.eachLimit(docs, 10, function(doc, next) {
            if (doc.type === 'twitch') {
                return checkTwitch(doc, next);
            }

            if (doc.type === 'youtube') {
                return checkYoutube(doc, next);
            }
 
            if (doc.type === 'vine' || doc.type === 'img') {
                return check404(doc, next);
            }
            
            return next();
        }, function(err) {
            return ejectOutDated(span, done); 
        });
    });
};

/**
 *  Start removing stuff thats old.
 *  Span is the timespan under which to go through it
 *  Eject out dated stuff.
 */
var ejectOutDated = function(span, done) {
    requestSpan     = span;
    var someTimeAgo = Date.now() - expireTime;

    //get all the items that has expired
    ItemModel.find({_sort : {$lte : someTimeAgo}, enabled : true}, function(err, docs) {
        if (err) {
            return done(err);
        }

        if (!docs || docs.length === 0) {
            return setTimeout(function() {
                return done(null, totals); 
            }, span);
        }
    
        console.log('Found ' + docs.length + ' out dated items.');
        //remove after delay
        Async.each(docs, function(doc, next) {
            setTimeout(function() {
                totals.removed++;

                if (doc.type === 'twitch') {
                    //if this is a stream, remove it
                    doc.remove(next);
                } else {
                    //all othe content should be set to disabled to avoid duplications
                    doc.enabled = false;
                    doc.save(next);
                }
            }, Math.floor(Math.random() * span));
        }, function(){
            done(null, totals);
        });
    });
};

/**
 *  Check vine links for 404
 */
var check404 = function(doc, done) {
    var option = {
        "timeout"   : 10000,
        'uri'       : doc.toObject().data,
        "headers"   : {
            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
            "gzip":false
        }
    };

    Request(option, function(err, res, body) {
        if (err || res.statusCode !== 200) {
            var newSort = ((+Date.now()) - expireTime);
            console.log(doc.data, ' is not embeddable', newSort);
            doc.set('_sort', newSort.toString());
            return doc.save(done);
        }

        return done();
    });
};

/**
 * Gets a twitch doc to se if its still online, 
 * if not update the sort time and let the ejector take care of it.
 */
var checkTwitch = function(doc, done) {
    var streamName = doc.toObject().data.split('/').slice(-2,-1).join(''),
        option = {
            "timeout"   : 10000,
            "uri"       : 'https://api.twitch.tv/kraken/streams/' + streamName,
            "headers"   : {
                "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                "gzip":false
            }
        };

    Request(option, function(err, httpResponse, body) {
        //if any of these update the doc
        if (err || httpResponse.statusCode !== 200 || !JSON.parse(body).stream) {
            var newSort = ((+Date.now()) - expireTime);
            DebugTwitch(option.uri, ' is offline', newSort);
            doc.set('_sort', newSort.toString());
            return doc.save(done);
        }

        return done();
    });
};


/**
 * Check youtube and if they are allowed to be watched where ever
 */
var checkYoutube = function(doc, done) {
    var option = {
        "timeout"   : 10000,
        'uri'       : 'https://www.googleapis.com/youtube/v3/videos?id=' + doc.data + '&key=' + process.env.YOUTUBE_API_KEY + '&part=status',
        "headers"   : {
            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
            "gzip":false
        }
    };

    Request(option, function(err, res, body) {
        if (err || res.statusCode !== 200) {
            console.log(option.uri, ' could not be fetched', err);
            return done();
        }

        var json = JSON.parse(body);

        if (!json || !json.items) {
            console.log(option.uri, ' could not be fetched');
            return done();
        }

        if (json.items.length < 1 || json.items[0].status.embeddable === false) {
            var newSort = ((+Date.now()) - expireTime);
            console.log(doc.data, ' is not embeddable', newSort);
            doc.set('_sort', newSort.toString());
            return doc.save(done);
        }

        return done();
    });
};


module.exports = Ejector;
