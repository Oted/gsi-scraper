var Async       = require('async');
var Request     = require('request');
var TimeStamp   = require('mongoose-times');
var db;

var internals   = {},
    expireTime  = 1000 * 60 * 60 * 60,
    requestSpan,
    targetUrl,
    totals = 0;

//models
var RatingModel,
    ItemModel,
    AddjectiveModel;

//enum schema types
var itemTypes       = ['youtube', 'img', 'gif', 'gifv', 'soundcloud', 'vimeo', 'vine', 'text', 'video', 'instagram', 'sound', 'other'];

/**
 *  Ejector takes care of removal of old stuff
 */
function Ejector(url, Mongoose, done) {
    totals      = 0;
    var that    = this;

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
 *  Start removing stuff thats old.
 *  Span is the timespan under which to go through it
 */
Ejector.prototype.getToWork = function(span, done) {
    requestSpan     = span;
    var someTimeAgo = Date.now() - expireTime;

    //get all the items that has expired
    ItemModel.find({_sort : {$lt : someTimeAgo}, enabled : true}, function(err, docs) {
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
                totals++;
                doc.enabled = false;
                doc.save(next);
            }, Math.floor(Math.random() * span));
        }, function(){
            done(null, totals);
        });
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
