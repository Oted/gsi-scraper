var Async       = require('async');
var Request     = require('request');
var TimeStamp   = require('mongoose-times');
var DebugTwitch = require('debug')('twitch');
var Mongoose;
var db;

var internals   = {},
    expireTime  = 1000 * 60 * 60 * 60,
    requestSpan,
    targetUrl,
    totals = {
        "removed" : 0
    };

//models
var RatingModel,
    ItemModel,
    AddjectiveModel;

//enum schema types
var itemTypes       = ['youtube', 'img', 'gif', 'gifv', 'soundcloud', 'vimeo', 'vine', 'text', 'video', 'instagram', 'twitch', 'ted', 'sound', 'other'];

/**
 *  Ejector takes care of removal of old stuff
 */
function Ejector(url, mongoose, done) {
    Mongoose        = Mongoose ? Mongoose : mongoose;
    totals.removed  = 0;
    var that        = this;

    db = Mongoose.connect(url, function(err, res) {
        if (err) {
            return done(err);
        }

        //item schema
        var itemSchema = new Mongoose.Schema({
            _hash   : { type : String, unique : true },
            _sort   : { type : String },
            title   : { type : String },
            type    : { type: String, enum: itemTypes },
            data    : { type : Mongoose.Schema.Types.Mixed, required : 'Data is required.' },
            score   : { type : Number, default : 0 },
            ip      : { type : String },
            scraped : { type : Boolean, default : false },
            enabled : { type : Boolean, default : true }
        }).plugin(TimeStamp);
        
        //item model
        ItemModel = Mongoose.models.Item ? Mongoose.model('Item') : Mongoose.model('Item', itemSchema);
        return done(null, ItemModel);
    });
};

/**
 * This inits the ejector process, which starts with validating different data,
 * then ejects out dated things
 */
Ejector.prototype.getToWork = function(span, done) {
    //query the stuff that we need to know how its doing
    ItemModel.find({enabled : true, type : {$in : ['twitch']}}, function(err, docs) {
        if (err) {
            console.log('err', err);
            return ejectOutDated(span, done); 
        }

        Async.each(docs, function(doc, next) {
            if (doc.type === 'twitch') {
                return checkTwitch(doc, next);
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
            return done(null, totals); 
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
 *  Close connection
 */
Ejector.prototype.close = function() {
    console.log('Closing db!');
    ItemModel = RatingModel = AddjectiveModel = null;
    Mongoose.connection.close();
};


module.exports = Ejector;
