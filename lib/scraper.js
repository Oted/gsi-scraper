var Async       = require('async'),
    Request     = require('request'),
    utils       = require('./utils.js'),
    Plougher    = require('plougher'),
    Hoek        = require('hoek'),
    internals   = {},
    requestSpan;

var DebugScraper    = require('debug')('scraper');

var Debug9gag       = require('debug')('9gag');
var DebugInfigag    = require('debug')('infigag');
var DebugAnimated   = require('debug')('animated');
var DebugSoundcloud = require('debug')('soundcloud');
var DebugReddit     = require('debug')('reddit');

/**
 * cosntrs
 */
function Scraper(span) {
    console.log('Init scraper with a span of ' + span + 'ms.');
    requestSpan = span;
};

/**
 *  Function called when scraping
 */
Scraper.prototype.scrape = function(file, mapping, done) {
    //animated tabs is a special case, deal with it
    if (file.indexOf('animatedtabs') > -1) {
        return setTimeout(function() {
            return internals.requestAnimatedTabs(done);
        }, Math.floor(Math.random() * requestSpan));
    }
    
    //if its soundcloud 
    if (file.indexOf('soundcloud') > -1) {
        return setTimeout(function() {
            return internals.requestSoundcloud(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its 9gag
    if (file.indexOf('9gag') > -1) {
        return setTimeout(function() {
            return internals.request9gag(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its infigag
    if (file.indexOf('infigag') > -1) {
        return setTimeout(function() {
            return internals.requestInfigag(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its 9gag
    if (file.indexOf('reddit.json') > -1) {
        return setTimeout(function() {
            return internals.requestReddit(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    if (!mapping.urls || !Array.isArray(mapping.urls) || mapping.urls.length < 1) {
        return done(new Error('Mapping must have urls, it must e an array and must have at least one url.'));
    }

    if (!mapping.mapping) {
        return done(new Error('Mapping must have mapping lol'));
    }

    DebugScraper('Scraping ' + mapping.urls.length + ' other links....');
    Async.map(mapping.urls, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
        if (err) {
            return done();
        }
       
        results = Hoek.flatten(results);
        return done(null, results);
    });
};

/**
 *  Scrape one url with a mapping, callbacks when done with a result
 */
internals.scrapeUrl = function(mapping, url, done) {
    var plougher = new Plougher();
    setTimeout(function() { 
        DebugScraper('Scraping ' + url);
        plougher.scrape(url, mapping, function(err, results) {
            if (err) {
                console.error('scraping error ', err);
            }
        
            DebugScraper('Scraper mapped ' + results); 
            return done(null, results);
        });
    }, Math.floor(Math.random() * requestSpan));
};

/**
 *  Scrape anumated tabs
 */
internals.requestAnimatedTabs = function(done) {
    var option = {
        "method"    : "GET",
        "timeout"   : 10000,
        "uri"       : 'http://animatedtabs.com/allgifs/200',
        "headers"   : {
            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
            "gzip":false,
            'Content-Type': 'text/html; charset=UTF-8'
        }
    };

    DebugAnimated('Scraping 400 gifs from animated tabs....');
    Request(option, function(err, httpResponse, body) {
        if (err || !body) {
            console.log('err in animated tabs!');
            return done(err);
        }

        var json = JSON.parse(body);

        json = json.map(function(obj) {
            var newObj = {
                'title' : obj.title,
                'data' : obj.url
            };

            return newObj;
        });

        DebugAnimated(JSON.stringify(json, null, " "));
        return done(null, json);
    }).on('data', function(data) {
        DebugAnimated(data);
    });
};

/**
 *  Scrape 9gag links
 */
internals.requestReddit = function(mapping, done) {
    var allItems = [];
    DebugReddit('Scraping ' + mapping.urls.length + ' reddit threads....');

    Async.eachLimit(mapping.urls, 10, function(url, next) {
        var option = {
            "timeout"   : 10000,
            "uri"       : url,
            "headers"   : {
                "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                "gzip":false
            }
        };

        Request(option, function(err, httpResponse, body) {
            if (err) {
                console.log('err in reddit!');
                return next(err);
            }
            
            if (httpResponse.statusCode !== 200) {
                return next();
            }

            var json = JSON.parse(body);
            json.data.children.map(function(obj) {
                var newObj = {
                    'title' : obj.data.title,
                    'data' : obj.data.url
                }
                
                allItems.push(newObj);
                return obj;
            });
        
            return next(null, json); 
        });
    }, function(err, results) {
        if (err) {
            return done(err);
        }
        
        DebugReddit(JSON.stringify(allItems, null, " "));
        return done(null, allItems);
    });
};

/**
 *  Scrape 9gag links
 */
internals.request9gag = function(mapping, done) {
    var allItems = [];

    Debug9gag('Scraping ' + mapping.urls.length + ' 9gag links....');
    Async.eachLimit(mapping.urls, 5, function(url, next) {
        var option = {
            "timeout"   : 10000,
            "uri"       : url,
            "headers"   : {
                "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                "gzip":false
            }
        };

        Request(option, function(err, httpResponse, body) {
            if (err) {
                console.log('err in 9gag!');
                return next(err);
            }
           
            if (httpResponse.statusCode !== 200) {
                return next();
            }

            var json = JSON.parse(body);
            
            if (!json || !json.result) {
                return next();
            }
            
            json.result.map(function(obj) {
                allItems.push(obj.url);
                return obj;
            });

            return next(null, json); 
        });
    }, function(err, _results) {
        if (err) {
            return done(err);
        }
        
        Async.map(allItems, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
            if (err) {
                return done(err);
            }
            
            results = Hoek.flatten(results);
            Debug9gag(JSON.stringify(results, null, " "));
            return done(null, results);
        });
    });
};

/**
 *  Scrape infigag links
 */
internals.requestInfigag = function(mapping, done) {
    var allItems = [];

    DebugInfigag('Scraping ' + mapping.urls.length + ' infigag links....');
    Async.eachLimit(mapping.urls, 10, function(url, next) {
        var option = {
            "timeout"   : 10000,
            "uri"       : url,
            "headers"   : {
                "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                "gzip":false
            }
        };

        Request(option, function(err, httpResponse, body) {
            if (err) {
                console.log('err in infigag!' + err);
                return next(err);
            }
            
            if (httpResponse.statusCode !== 200) {
                console.log('err in infigag!' + httpResponse.statusCode);
                return next();
            }

            var json = JSON.parse(body);

            if (!json || !json.data) {
                return next();
            }
             
            //scrape more pages   
            return internals.helpInfigag(url, json.data, 5, function(newData) {
                if (!newData) {
                    return next();
                }
                
                newData.map(function(obj) {
                    allItems.push(obj.link);
                    return obj;
                });

                return next(null, json); 
            });
       });
    }, function(err, _results) {
        if (err) {
            return done(err);
        }
        
        Async.map(allItems, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
            if (err) {
                return done(err);
            }

            results = Hoek.flatten(results);
            DebugInfigag(JSON.stringify(results, null, " "));
            return done(null, results);
        });
    });
};


//help infigag sceraping
internals.helpInfigag = function(url, data, pages, done) {
    if (pages === 0) {
        return done(data);
    }

    var lastindex = data[data.length - 1].id;
    DebugInfigag('Requesting ' + (url + lastindex) + ' infigag...');
    
    var option = {
        "timeout"   : 10000,
        "uri"       : url + lastindex,
        "headers"   : {
            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
            "gzip":false
        }
    };

    Request(option, function(err, httpResponse, body) {
        if (err) {
            console.log('err in infigag!');
            return done(data);
        }
        
        if (httpResponse.statusCode !== 200) {
            console.log('err in infigag!');
            return done(data);
        }

        var json    = JSON.parse(body);

        if (!json || !json.data) {
            console.log('err in infigag!');
            return done(data);
        }

        return internals.helpInfigag(url, data.concat(json.data), --pages, done);
    });
};

/**
 *  Scrape soundcloud
 */
internals.requestSoundcloud = function(mapping, done) {
    //for all urls (soundclid users) in mapping
    var allItems = [];
    DebugSoundcloud('Scraping ' + mapping.urls.length + ' soundcloud users....');

    Async.eachLimit(mapping.urls, 10, function(url, next) {
        var option = {
            "timeout"   : 10000,
            "uri"       : 'http://api.soundcloud.com/resolve.json?url=' + url + '&client_id=e6c07f810cdefc825605d23078c77e8d',
            "headers"   : {
                "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                "gzip":false
            }
        };

        Request(option, function(err, httpResponse, body1) {
            if (err) {
                console.log('err in soundclloud!');
                return next(err);
            }
            
            if (httpResponse.statusCode !== 200) {
                return next();
            }

            var json1 = JSON.parse(body1);
            
            var innerOption = {
                "timeout"   : 10000,
                "uri"       : 'http://api.soundcloud.com/users/' + json1.id + '/favorites.json?client_id=e6c07f810cdefc825605d23078c77e8d',
                "headers"   : {
                    "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                    "gzip":false
                }
            };

            Request(innerOption, function(err2, httpResponse2, body2) {
                if (err2) {
                    return next(err);
                }

                if (httpResponse2.statusCode !== 200) {
                    return next();
                }
                
                var json = JSON.parse(body2);

                json.map(function(obj) {
                    var newObj = {
                            'title' : obj.title,
                            'type' : 'soundcloud',
                            'data' : obj.permalink_url
                        };

                    //its added here
                    allItems.push(newObj);
                    return newObj;
                });

                return next();
            });
        });
    }, function(err) {
        if (err) {
            return done(err);
        }

        DebugSoundcloud(JSON.stringify(allItems, null, " "));
        return done(null, allItems);
    });
};

module.exports = Scraper;
