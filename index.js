var fs          = require('fs'),
    Plougher    = require('plougher'),
    Async       = require('async'),
    Hoek        = require('hoek'),
    Request     = require('request'),
    Injector    = require('./lib/injector.js'),
    Ejector     = require('./lib/ejector.js'),
    requestSpan = 1000 * 60 * 20,
    internals   = {};

//mongo connection
process.env.MONGO_URL = 'mongodb://localhost:27017/messapp';

/**
 *  Init function for item processing
 */
internals.init = function(mappings) {
    console.time('runtime');
    console.log('Initializing...');
    
    var ejector = new Ejector(process.env.MONGO_URL, function() {
        
        //remove and add stuff in parallel
        Async.parallel([
            //eject stuff
            ejector.getToWork.bind(ejector, requestSpan),
            
            //scrape all mappings in parallell
            function(callback) {
                Async.map(mappings, internals.scrapeMapping, function(err, results) {
                    if (err) {
                        throw err;
                    }

                    var injector = new Injector('http://localhost:3000/api/items', Math.floor(requestSpan / 2));

                    results = Hoek.flatten(results);
                    injector.injectMultiple(results, callback);
                });
            }
        ], function(err, results) {
            if (err) {
                throw err;
            }

            console.log('this run took : ');
            console.timeEnd('runtime');
            console.log(JSON.stringify(results, null, " "));
            
            return process.exit();
        });
    });
};

/**
 *  Completely scrapes a mapping file and callbacks when done
 */
internals.scrapeMapping = function(file, done) {
    try {
        var mapping = require('./mappings/' + file);
    } catch (err) {
        throw err; 
    }

    //animated tabs is a special case, deal with it
    if (file.indexOf('animatedtabs') > -1) {
        return internals.requestAnimatedTabs(done);
    }
    
    //if its soundcloud 
    if (file.indexOf('soundcloud') > -1) {
        return internals.requestSoundcloud(mapping, done);
    }

    //if its 9gag
    if (file.indexOf('9gag') > -1) {
        return internals.request9gag(mapping, done);
    }

    //if its 9gag
    if (file.indexOf('reddit.json') > -1) {
        return internals.requestReddit(mapping, done);
    }


    if (!mapping.urls || !Array.isArray(mapping.urls) || mapping.urls.length < 1) {
        return done(new Error('Mapping must have urls, it must e an array and must have at least one url.'));
    }

    if (!mapping.mapping) {
        return done(new Error('Mapping must have mapping lol'));
    }

    console.log('Scraping ' + JSON.stringify(mapping.urls) + '....');
    Async.map(mapping.urls, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
        if (err) {
            return done(err);
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
        console.log('Scraping ' + url); 
        plougher.scrape(url, mapping, function(err, result) {
            if (err) {
                console.log(err);
            }

            return done(null, result);
        });
    }, Math.floor(Math.random() * (requestSpan / 2)));
};

/**
 *  Scrape anumated tabs
 */
internals.requestAnimatedTabs = function(done) {
    console.log('Scraping animated tabs....');
    Request('http://animatedtabs.com/allgifs/400', function(err, httpResponse, body) {
        if (err) {
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

        return done(null, json);
    });
};

/**
 *  Scrape 9gag links
 */
internals.requestReddit = function(mapping, done) {
    var allItems = [];
    console.log('Scraping ' + JSON.stringify(mapping.urls) + '....');

    Async.each(mapping.urls, function(url, next) {
        Request(url, function(err, httpResponse, body) {
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
        
        return done(null, allItems);
    });
};

/**
 *  Scrape 9gag links
 */
internals.request9gag = function(mapping, done) {
    var allItems = [];

    console.log('Scraping ' + JSON.stringify(mapping.urls) + '....');
    Async.each(mapping.urls, function(url, next) {
        Request(url, function(err, httpResponse, body) {
            if (err) {
                console.log('err in 9gag!');
                return next(err);
            }
            
            if (httpResponse.statusCode !== 200) {
                return next();
            }

            var json = JSON.parse(body);
            json.result.map(function(obj) {
                allItems.push(obj.url);
                return obj;
            });

            return next(null, json); 
        });
    }, function(err, results) {
        if (err) {
            return done(err);
        }
        
        Async.map(allItems, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
            if (err) {
                return done(err);
            }

            results = Hoek.flatten(results);
            return done(null, results);
        });
    });
};

/**
 *  Scrape soundcloud
 */
internals.requestSoundcloud = function(mapping, done) {
    //for all urls (soundclid users) in mapping
    var allItems = [];
    console.log('Scraping ' + JSON.stringify(mapping.urls) + '....');

    Async.each(mapping.urls, function(url, next) {
        Request('http://api.soundcloud.com/resolve.json?url=' + url + '&client_id=e6c07f810cdefc825605d23078c77e8d', function(err, httpResponse, body1) {
            if (err) {
                console.log('err in soundclloud!');
                return done(err);
            }
            
            if (httpResponse.statusCode !== 200) {
                return next();
            }

            var json1 = JSON.parse(body1);
            
            Request('http://api.soundcloud.com/users/' + json1.id + '/favorites.json?client_id=e6c07f810cdefc825605d23078c77e8d', function(err, httpResponse, body2) {
                if (err) {
                    return done(err);
                }

                var json = JSON.parse(body2);

                json.map(function(obj) {
                    var newObj = {
                            'title' : obj.title,
                            'type' : 'soundcloud',
                            'data' : obj.id + ''
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

        return done(null, allItems);
    });
};

//if mapping file is provided
if (process.argv.length === 3) {
    var mappingFile = process.argv[2];

    return internals.scrapeMapping(mappingFile, function(err, results) {
        var injector = new Injector('http://localhost:3000/api/items', Math.floor(requestSpan / 2));

        results = Hoek.flatten(results);
        injector.injectMultiple(results, function(err, res) {
            console.log(err, res);
        });
    });
}

//else read all mappings
fs.readdir('./mappings/', function(err, files) {
    if (err) {
        throw err;
    } 

    var isJson = /\.json$/;
    var mappings = files.filter(function(file) {
        return isJson.test(file);
    });

    internals.init(mappings);
});


//on uncaught
process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});
