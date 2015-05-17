var Async       = require('async'),
    Request     = require('request'),
    utils       = require('./utils.js'),
    Plougher    = require('plougher'),
    Phantom     = require('phantom')
    Hoek        = require('hoek'),
    internals   = {};

var phantomJS,
    requestSpan;

var DebugScraper    = require('debug')('scraper');

var Debug9gag       = require('debug')('9gag');
var DebugInfigag    = require('debug')('infigag');
var DebugGiphy      = require('debug')('giphy');
var DebugSoundcloud = require('debug')('soundcloud');
var DebugTwitch     = require('debug')('twitch');
var DebugVine       = require('debug')('vine');
var DebugReddit     = require('debug')('reddit');
var DebugTed        = require('debug')('ted');
var DebugPhantom    = require('debug')('phantom');

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
    //giphy is a special case, deal with it
    if (file.indexOf('giphy') > -1) {
        return setTimeout(function() {
            return internals.requestGiphy(done);
        }, Math.floor(Math.random() * requestSpan));
    }
    
    //if its soundcloud 
    if (file.indexOf('soundcloud') > -1) {
        return setTimeout(function() {
            return internals.requestSoundcloud(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its 9gagtv
    if (file.indexOf('9gagtv') > -1) {
        return setTimeout(function() {
            return internals.request9gagTv(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its vine
    if (file.indexOf('vine') > -1) {
        return setTimeout(function() {
            return internals.requestVine(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its 9gag
    if (file.indexOf('9gag') > -1) {
        return setTimeout(function() {
            return internals.request9gag(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its infigag
    if (file.indexOf('twitch') > -1) {
        return setTimeout(function() {
            return internals.requestTwitch(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its infigag
    if (file.indexOf('infigag') > -1) {
        return setTimeout(function() {
            return internals.requestInfigag(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its ted
    if (file.indexOf('ted.json') > -1) {
        return setTimeout(function() {
            return internals.requestTed(mapping, done);
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
    setTimeout(function() { 
        Async.mapLimit(mapping.urls, 5, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
            if (err) {
                return done();
            }
           
            results = Hoek.flatten(results);
            return done(null, results);
        });
    }, Math.floor(Math.random() * requestSpan));
};

/**
 *  Scrape one url with a mapping, callbacks when done with a result
 */
internals.scrapeUrl = function(mapping, url, done) {
    var plougher = new Plougher();
    DebugScraper('Scraping ' + url);
    plougher.scrape(url, mapping, function(err, results) {
        if (err) {
            console.error('scraping error ', err);
        }
    
        DebugScraper('Scraper mapped ' + results); 
        return done(null, results);
    });
};

/**
 *  Scrape giphy
 */
internals.requestGiphy = function(done) {
    var option = {
        "method"    : "GET",
        "timeout"   : 10000,
        "uri"       : 'http://api.giphy.com/v1/gifs/trending?api_key=gS5OxnlQs5T5m&limit=200',
        "headers"   : {
            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
            "gzip":false,
            'Content-Type': 'text/html; charset=UTF-8'
        }
    };

    DebugGiphy('Scraping 200 gifs from giphy....');
    Request(option, function(err, httpResponse, body) {
        if (err || !body) {
            console.log('err in giphy!', err);
            return done();
        }

        var json = JSON.parse(body).data;

        json = json.map(function(obj) {
            var newObj = {
                'title' : obj.caption || 
                          obj.tags[Math.floor(Math.random() * obj.tags.length)],
                'data' : obj.images.original.url
            };
            return newObj;
        });

        DebugGiphy(JSON.stringify(json, null, " "));
        return done(null, json);
    }).on('data', function(data) {
        //DebugGiphy(data);
    });
};

/**
 *  Scrape twitch
 */
internals.requestTwitch = function(mapping, done) {
    var allItems = [];
    DebugTwitch('Scraping ' + mapping.urls.length + ' twitch....');

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
                console.log('err in twitch!', err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                console.log('err in twitch!', httpResponse.statusCode);
                return next();
            }

            var json = JSON.parse(body);
            json.featured.map(function(obj) {
                var newObj = {
                    'title' : obj.title,
                    'data' : 'http://www.twitch.tv/' + obj.stream.channel.name + '/embed'
                }
                
                allItems.push(newObj);
                return obj;
            });
        
            return next(null, json); 
        });
    }, function(err, results) {
        if (err) {
            return done();
        }
        
        DebugTwitch(JSON.stringify(allItems, null, " "));
        return done(null, allItems);
    });
};
/**
 *  Scrape twitch
 */
internals.requestTed = function(mapping, done) {
    var allItems = [];
    DebugTed('Scraping ' + mapping.urls.length + ' ted\'s....');

    Async.eachLimit(mapping.urls, 1, function(url, next) {
        var option = {
            'uri' : 'http://www.ted.com/talks/grid?filter=trending',
            'gzip' : true,
            'headers' : {
                'Host': 'www.ted.com',
                'Connection': 'keep-alive',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36',
                'Referer': 'http://www.ted.com/',
                'Accept-Encoding': 'gzip, deflate, sdch',
                'Accept-Language': 'sv-SE,sv;q=0.8,en-US;q=0.6,en;q=0.4'
            }
        };
        
        Request.get(option, function(err, httpResponse, body) {
            if (err) {
                console.log('err in ted!', err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                console.log('err in ted!', httpResponse.statusCode);
                return next();
            }
            
            var json = JSON.parse(body);
    
            var ids = json.map(function(obj) {
                return 'https://api.ted.com/v1/talks/' + obj.id + '.json?api-key=memdvz7jc4qes6z9dejjuwne'
            });

            return Async.eachLimit(ids, 1, function(url, cont) {
                Request(url, function(e, hR, b) {
                    if (e) {
                        console.log('err in ted!', err);
                        return next();
                    }
                    
                    if (hR.statusCode !== 200) {
                        console.log('err in ted!', hR.statusCode);
                        return next();
                    }

                    if (!b) {
                        console.log('err in ted, nooo b!');
                        return next();
                    }

                    var j   = JSON.parse(b);
                    DebugTed('got ted ' + JSON.stringify(j, null, ' '));
                    try {
                        obj = {
                            'title' : j.talk.name, 
                            'data' : j.talk.media.internal['450k'].uri.split('?').shift(),
                            'type' : 'ted'
                        };
                    } catch (err) {
                        console.log('could not parse ted lol'); 
                    }

                    allItems.push(obj || {});
                    return cont(null, json); 
                });
            }, function(err, results) {
                return next();
            });
        });
    }, function(err, results) {
        if (err) {
            return done();
        }
        
        DebugTed(JSON.stringify(allItems, null, " "));
        return done(null, allItems);
    });
};


/**
 *  Scrape vine
 */
internals.requestVine = function(mapping, done) {
    var allItems = [];
    DebugVine('Scraping ' + mapping.urls.length + ' vine....');

    Async.eachLimit(mapping.urls, 2, function(url, next) {
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
                console.log('err in vine!', err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                console.log('err in vine!', httpResponse.statusCode);
                return next();
            }

            var json = JSON.parse(body);
            json.data.records.map(function(obj) {
                var newObj = {
                    'title' : obj.description,
                    'data' : obj.permalinkUrl
                }
                
                allItems.push(newObj);
                return obj;
            });
        
            return next(null, json); 
        });
    }, function(err, results) {
        if (err) {
            return done();
        }
        
        DebugVine(JSON.stringify(allItems, null, " "));
        return done(null, allItems);
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
                console.log('err in reddit!', err);
                return next();
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
            return done();
        }
        
        DebugReddit(JSON.stringify(allItems, null, " "));
        return done(null, allItems);
    });
};

/**
 *  Scraper 9gag tv
 */
internals.request9gagTv = function(mapping, done) {
    var option = {
        "method"    : "GET",
        "timeout"   : 10000,
        "uri"       : 'http://9gag.tv/api/index/1xqex?count=100&direction=1&includeSelf=0',
        "headers"   : {
            "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
            "gzip":false,
            'Content-Type': 'text/html; charset=UTF-8'
        }
    };

    Debug9gag('Scraping 100 vids from 9gagtv....');
    Request(option, function(err, httpResponse, body) {
        if (err || !body) {
            console.log('err in 9gagTv!', err);
            return done();
        }

        var json = JSON.parse(body).data.posts;

        json = json.map(function(obj) {
            var newObj = {
                'title' : obj.title,
                'data' : obj.sourceUrl
            };
            return newObj;
        });

        Debug9gag(JSON.stringify(json, null, " "));
        return done(null, json);
    }).on('data', function(data) {
        //DebugGiphy(data);
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
                console.log('err in 9gag!', err);
                return next();
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
            return done();
        }
        
        Async.mapLimit(allItems, 5, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
            if (err) {
                return done();
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
                return next();
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
            return done();
        }
        
        Async.mapLimit(allItems, 5, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
            if (err) {
                return done();
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
                console.log('err in soundclloud!', err);
                return next();
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
                    console.log('err in soundclloud!', err);
                    return next();
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
        DebugSoundcloud(JSON.stringify(allItems, null, " "));
        return done(null, allItems);
    });
};

/**
 * Run the function on the page.
 */
internals.evaluate = function(func, external) {
    var args = [].slice.call(arguments);

    var wrapped = function() {
        external.apply(null, arguments);
    };
  
    args[1] = wrapped;
    
    console.log('.evaluate() fn on the page');
    phantomJS.page.evaluate.apply(phantomJS.page, args);
};


/**
 *  Tear down the phantom
 */
Scraper.prototype.tearDown = function() {
    if (!phantomJS) {
        return;
    }

    phantomJS.page.close();
    phantomJS.phantom.exit();
};

/**
 *  Set up the phantom
 */
Scraper.prototype.setUpPhantom = function(done) {
    return done();
    
    var absolutePath    = __dirname.split('/').slice(0, -1).join('/'),
        args            = [],
        dnodeOpts       = {};

    args.push('--load-images=false');
    args.push('--web-security=false');

    var port = parseInt((+(new Date()) + '').slice(-5)) + 1024;

    //combine flags, options and callback into args
    args.push({
        port: port,
        dnodeOpts: dnodeOpts,
        path: absolutePath + '/node_modules/phantomjs/bin/'
    });

    //set up instance and page
    args.push(function(instance, err) {
        if (err) {
            console.log('phantom, Error on instance: ' + err);
            return done(err);
        }

        instance.createPage(function(page, innerErr) {
            if (innerErr) {
                console.log('phantom, Error on crate : ' + innerErr);
                return done(innerErr);
            }

            page.onError(function(error){
                console.log('phantom, Error on page : ' + error);
                return true;
            });

            page.viewportSize = {
                "width" : 1023,
                "height" : 768
            };
                        
            phantomJS = {
                "phantom"   : instance,
                "page"      : page
            }
            
            return done();
        });
    });

    Phantom.create.apply(Phantom, args);
}


module.exports = Scraper;
