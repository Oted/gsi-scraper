var Async       = require('async'),
    Request     = require('request'),
    Utils       = require('./utils.js'),
    Plougher    = require('plougher'),
    Cheerio     = require('cheerio'),
    Hoek        = require('hoek'),
    internals   = {};

//for debug memoryleak
// var Heapdump    = require('heapdump');

// Heapdump.writeSnapshot();        
// setInterval(function(){ 
    // Heapdump.writeSnapshot();        
// }, 60000 * 1);

var DebugScraper        = require('debug')('scraper');
var Debug9gag           = require('debug')('9gag');
var DebugInfigag        = require('debug')('infigag');
var DebugGiphy          = require('debug')('giphy');
var DebugSoundcloud     = require('debug')('soundcloud');
var DebugTwitch         = require('debug')('twitch');
var DebugVine           = require('debug')('vine');
var DebugReddit         = require('debug')('reddit');
var DebugTed            = require('debug')('ted');
var DebugYoutube        = require('debug')('youtube');
var DebugDeviant        = require('debug')('deviant');
var DebugWallpapers     = require('debug')('wallpaperscraft');
var DebugDocumentaries  = require('debug')('documentaries');
var DebugReactionGifs   = require('debug')('reactiongifs');
var DebugAnimatedTabs   = require('debug')('animatedtabs');
var DebugViralVideos    = require('debug')('viralvideos');
var DebugDamn           = require('debug')('damn');
var DebugBuzzfeed       = require('debug')('buzzfeed');

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

    //if its damn.com
    if (file.indexOf('damn') > -1) {
        return setTimeout(function() {
            return internals.scrapeDamn(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its deviant
    if (file.indexOf('animated') > -1) {
        return setTimeout(function() {
            return internals.requestAnimated(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its viral
    if (file.indexOf('viralvideos') > -1) {
        return setTimeout(function() {
            return internals.scrapeViralVideos(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its deviant
    if (file.indexOf('deviant') > -1) {
        return setTimeout(function() {
            return internals.scrapeDeviant(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its wallpapers 
    if (file.indexOf('wallpapers') > -1) {
        return setTimeout(function() {
            return internals.scrapeWallpapers(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its top documentary films
    if (file.indexOf('reactiongifs') > -1) {
        return setTimeout(function() {
            return internals.scrapeReactionGifs(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its top documentary films
    if (file.indexOf('topdocumentaries') > -1) {
        return setTimeout(function() {
            return internals.scrapeDocumentaries(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its youtube
    if (file.indexOf('buzzfeed') > -1) {
        return setTimeout(function() {
            return internals.scrapeBuzzfeed(mapping, done);
        }, Math.floor(Math.random() * requestSpan));
    }

    //if its youtube
    if (file.indexOf('youtube') > -1) {
        return setTimeout(function() {
            return internals.scrapeYoutube(mapping, done);
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
        Async.mapLimit(mapping.urls, 2, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
            if (err || !results || results.length < 1) {
                Utils.dealWithErrors(file || 'unknown', err);
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
    if (!url) {
        return done(null, []); 
    }
    
    var plougher = new Plougher();
    DebugScraper('Scraping ' + url);
    plougher.scrape(url, mapping, function(err, results) {
        if (err) {
            console.error('scraping error ', err);
        }
    
        DebugScraper('Scraper mapped ' + results);
        plougher = null; 
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
                'source' : obj.source
            };
            return newObj;
        });

        DebugGiphy(JSON.stringify(json, null, " "));

        if (!json || json.length < 1) {
            Utils.dealWithErrors("giphy");
        }

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
                DebugTwitch('err in twitch!', err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugTwitch('err in twitch!', httpResponse.statusCode);
                return next();
            }

            var json = JSON.parse(body);
            json.featured.map(function(obj) {
                var newObj = {
                    'title' : obj.title,
                    'source' : 'http://www.twitch.tv/' + obj.stream.channel.name ,
                    'data' : 'http://www.twitch.tv/' + obj.stream.channel.name + '/embed'
                }
                
                allItems.push(newObj);
                return obj;
            });

            return next(null, json); 
        });
    }, function(err, results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("twitch", err);
            return done();
        }
        
        DebugTwitch(JSON.stringify(allItems, null, " "));
        return done(null, allItems);
    });
};

/**
 *  Request animated
 */
internals.requestAnimated = function(mapping, done) {
    var allItems = [];
    DebugAnimatedTabs('Scraping ' + mapping.urls.length + ' animated....');

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
                DebugAnimatedTabs('err in animated!', err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebigAnimatedTabs('err in animated!', httpResponse.statusCode);
                return next();
            }

            var json = JSON.parse(body);
            json.map(function(obj) {
                var newObj = {
                    'title' : obj.title,
                    'data' : obj.url
                }
               
                allItems.push(newObj);
                return obj;
            });
        
            return next(null, json); 
        });
    }, function(err, results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("animated", err);
            return done();
        }
        
        DebugAnimatedTabs(JSON.stringify(allItems, null, " "));
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
                        DebugTed('err in ted!', err);
                        return next();
                    }
                    
                    if (hR.statusCode !== 200) {
                        DebugTed('err in ted!', hR.statusCode);
                        return next();
                    }

                    if (!b) {
                        DebugTed('err in ted, nooo b!');
                        return next();
                    }

                    var j   = JSON.parse(b);
                    DebugTed('got ted ' + JSON.stringify(j, null, ' '));
                    try {
                        obj = {
                            'title' : j.talk.name, 
                            'data' : j.talk.media.internal['450k'].uri.split('?').shift(),
                            'source' : 'http://www.ted.com/talks/' + j.talk.slug,
                            'type' : 'video'
                        };
                    } catch (err) {
                        DebugTed('could not parse ted lol'); 
                    }

                    if (obj && obj.data.indexOf('.mp4' > -1)) {
                        allItems.push(obj);
                    }

                    return cont(null, json); 
                });
            }, function(err, results) {
                return next();
            });
        });
    }, function(err, results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("ted", err);
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
                DebugVine('err in vine!', err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugVine('err in vine!', httpResponse.statusCode);
                return next();
            }

            var json = JSON.parse(body);
            json.data.records.map(function(obj) {
                var newObj = {
                    'title' : obj.description,
                    'data' : obj.permalinkUrl,
                    'source' : obj.permalinkUrl
                }
                
                allItems.push(newObj);
                return obj;
            });
        
            return next(null, json); 
        });
    }, function(err, results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("vine", err);
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
                DebugReddit('err in reddit!', err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                return next();
            }

            var json = JSON.parse(body);
            json.data.children.map(function(obj) {
                var newObj = {
                    'source' : 'http://reddit.com' + obj.data.permalink,
                    'title' : obj.data.title,
                    'data' : obj.data.url
                }
                
                allItems.push(newObj);
                return obj;
            });
        
            return next(null, json); 
        });
    }, function(err, results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("reddit", err);
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
            Debug9gag('err in 9gagTv!', err);
            return done();
        }

        var json = JSON.parse(body).data.posts;

        json = json.map(function(obj) {
            var newObj = {
                'title' : obj.title,
                'data' : obj.sourceUrl,
                'source' : obj.url,
            };
            return newObj;
        });
        
        if (!json || json.length < 1) {
            Utils.dealWithErrors("9gagtv", err);
            return done();
        }

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
                Debug9gag('err in 9gag!', err);
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
            if (err || !results || results.length < 1) {
                Utils.dealWithErrors("9gag", err);
                return done();
            }
            
            results = Hoek.flatten(results);
            Debug9gag(JSON.stringify(results, null, " "));
            return done(null, results);
        });
    });
};

/**
 *  Scrape reactiongifs.com
 */
internals.scrapeReactionGifs = function(mapping, done) {
    var allItems = [];
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
                DebugReactionGifs('err in reaction!' + err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugReactionGifs('err in reaction!' + httpResponse.statusCode);
                return next();
            }
            
            var $ = Cheerio.load(body);
            
            $('div.post').each(function(i, item) {
                var newObj = {
                    "title" : ($(this).find('a[title]').attr('title') || "").trim().unleakString(),
                    "data" : $(this).find('div.entry img[src]').attr('src'),
                    "source" : option.uri
                }

                if (newObj.title && newObj.data) {
                    allItems.push(newObj);
                }
            });

            return next();
        });
    }, function(err, _results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("reactiongifs", err);
            return done();
        }

        DebugReactionGifs('Got items ' + allItems);
        return done(null, allItems);
    });
};

/**
 *  Scrape the deviantarts top pages!
 */
internals.scrapeViralVideos = function(mapping, done) {
    var allItems = [];
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
                DebugViralVideos('err in viral!' + err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugViralVideos('err in viral!' + httpResponse.statusCode);
                return next();
            }

            var $ = Cheerio.load(body);
            
            $('article').each(function(i, item) {
                var data = $(this).find('iframe').attr('src');
                
                if (!data) {
                    return;
                }

                var newObj = {
                    "title" : ($(this).find('h2.posttitle a').attr('title') || "").trim().unleakString(),
                    "data" : data.split('/').pop(),
                    "source" : option.uri,
                    "type" : "youtube"
                }

                if (newObj.title && newObj.data) {
                    allItems.push(newObj);
                }
            });

            return next();
        });
    }, function(err, _results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("viralvideos", err);
            return done();
        }

        DebugViralVideos('Got items ' + allItems);
        return done(null, allItems);
    });
};

/**
 *  Scrape damn.com 
 */
internals.scrapeDamn = function(mapping, done) {
    var allItems = [];
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
                DebugDamn('err in damn!' + err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugDamn('err in damn!' + httpResponse.statusCode);
                return next();
            }
            
            var $ = Cheerio.load(body);
            
            Async.eachLimit($('article.latestPost'), 1, function(target, inext) {
                var newObj = {
                    "title" : $(target).find('a').attr("title").trim().unleakString(),
                    "source" : $(target).find('a').attr("href"),
                    "type" : 'youtube'
                }

                var innerOption = {
                    "timeout"   : 10000,
                    "uri"       : $(target).find('a').attr("href"),
                    "headers"   : {
                        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                        "gzip":false
                    }
                };

                Request(innerOption, function(ierr, ihttpResponse, ibody) {
                    var text, data;

                    if (ierr) {
                        DebugDamn('inner err in damn!' + ierr);
                        return inext();
                    }
                    
                    if (ihttpResponse.statusCode !== 200) {
                        DebugDamn('inner err in damn!' + ihttpResponse.statusCode);
                        return inext();
                    }
                    
                    var i$ = Cheerio.load(ibody);
            
                    i$('script').each(function(i, e) {
                        if (i$(this).html().indexOf('new YT.Player') > -1) {
                            text = i$(this).html();
                        }
                    });

                    if (!text) {
                        return inext();
                    }

                    data = text.match(/videoId:\s\'(:?[\w|\d]+)\'/);
                    
                    if (data && data[1]) {
                        newObj.data = data[1];
                    }

                    if (newObj.data) {
                        allItems.push(newObj);
                    }

                    inext();
                });
            }, next);
        });
    }, function(err, _results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("damn", err);
            return done();
        }

        DebugDamn('Got items ' + allItems);
        return done(null, allItems);
    });
};

/**
 *  Scrape the deviantarts top pages!
 */
internals.scrapeDeviant = function(mapping, done) {
    var allItems = [];
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
                DebugDeviant('err in deviant!' + err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugDeviant('err in deviant!' + httpResponse.statusCode);
                return next();
            }

            var $ = Cheerio.load(body);
            
            $('div.page-results > div[userid]').each(function(i, item) {
                var newObj = {
                    "title" : ($(this).find('a.thumb img').attr('alt') || "").trim().unleakString(),
                    "data" : $(this).find('a.thumb').attr('data-super-img'),
                    "source" : option.uri
                }

                if (newObj.title && newObj.data) {
                    allItems.push(newObj);
                }
            });

            return next();
        });
    }, function(err, _results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("deviant", err);
            return done();
        }

        DebugDeviant('Got items ' + allItems);
        return done(null, allItems);
    });
};

/**
 *  Scrape some wallpapers!
 */
internals.scrapeWallpapers = function(mapping, done) {
    var allItems = [];
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
                DebugWallpapers('err in wallpapers!' + err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugWallpapers('err in wallpapers!' + httpResponse.statusCode);
                return next();
            }

            var $ = Cheerio.load(body);
            
            $('div.wallpaper_pre').each(function(i, item) {
                var newObj = {
                    "title"     : $(this).find('div.pre_name').text().trim().unleakString() + ' [wallpaper]',
                    "data"      : 'http:' + $(this).find('a img[src]').attr('src').replace(/\d\d+x\d\d+/,'1280x720'),
                    "source"    : option.uri
                }

                if (newObj.title && newObj.data) {
                    allItems.push(newObj);
                }
            });

            return next();
        });
    }, function(err, _results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("wallpapers", err);
            return done();
        }

        DebugWallpapers('Got items ' + allItems);
        return done(null, allItems);
    });
};

/**
 *  Scrape top documentaries!
 */
internals.scrapeDocumentaries = function(mapping, done) {
    var allItems = [];
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
                DebugDocumentaries('err in documetaries!' + err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugDocumentaries('err in document!' + httpResponse.statusCode);
                return next();
            }
            
            var $ = Cheerio.load(body);
            
            Async.eachLimit($('article.module'), 1, function(target, inext) {
                var newObj = {
                    "title" : $(target).find('h2 a').attr("title").trim().unleakString(),
                    "source" : $(target).find('h2 a').attr("href")
                }

                var innerOption = {
                    "timeout"   : 10000,
                    "uri"       : $(target).find('h2 a').attr("href"),
                    "headers"   : {
                        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                        "gzip":false
                    }
                };

                Request(innerOption, function(ierr, ihttpResponse, ibody) {
                    if (ierr) {
                        DebugDocumentaries('err in documetaries!' + ierr);
                        return inext();
                    }
                    
                    if (ihttpResponse.statusCode !== 200) {
                        DebugDocumentaries('err in document!' + ihttpResponse.statusCode);
                        return inext();
                    }
                    
                    var i$ = Cheerio.load(ibody);

                    newObj.data = i$('meta[itemprop=embedUrl]').attr('content');

                    if (newObj.title && newObj.data) {
                        allItems.push(newObj);
                    }

                    return inext();
                });
            }, next);
        });
    }, function(err, _results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("documentaries", err);
            return done();
        }

        DebugDocumentaries('Got items ' + allItems);
        return done(null, allItems);
    });
};

/**
 *  Scrape the buzz!
 */
internals.scrapeBuzzfeed = function(mapping, done) {
    var allItems = [];
    Async.eachLimit(mapping.urls, 2, function(url, next) {
        var option = {
            "timeout"   : 10000,
            "uri"       : url,
            "headers"   : {
                "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                "gzip":false
            }
        };

        //scrape the root pages and get each article containing youtube 
        Request(option, function(err, httpResponse, body) {
            if (err) {
                DebugBuzzfeed('o err in buzzfeed!' + err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugBuzzfeed('o err in buzzfeed!' + httpResponse.statusCode);
                return next();
            }

            var $       = Cheerio.load(body), 
                urls    = [];
            
            $('li.grid-posts__item a.lede__link[href]').each(function(i, item) {
                urls.push(item.attribs.href);
            });

            //for each article, scrape it
            Async.eachLimit(urls, 2, function(innerUrl, innerNext) {
                var innerOption = {
                    "timeout"   : 10000,
                    "uri"       : 'http://www.buzzfeed.com' + innerUrl,
                    "headers"   : {
                        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.94 Safari/537.36",
                        "gzip":false
                    }
                };

                Request(innerOption, function(innerErr, innerHttpResponse, innerBody) {
                    if (innerErr) {
                        DebugBuzzfeed('i err in buzzfeed!' + innerErr);
                        return innerNext();
                    }
                    
                    if (innerHttpResponse.statusCode !== 200) {
                        DebugBuzzfeed('i err in buzzfeed!' + innerHttpResponse.statusCode);
                        return innerNext();
                    }

                    var $       = Cheerio.load(innerBody),
                        videoEl = $('div.video-embed-big[id*=video_buzz]').attr('rel:thumb'),
                        title   = $('#post-title').text().trim().unleakString(),
                        videoId;
                    
                    if (!videoEl) {
                        return innerNext();
                    }

                    videoId = videoEl.split('/').slice(-2,-1).join();

                    if (!videoId || videoId.length !== 11) {
                        return innerNext();
                    }

                    var newObj = {
                        "title": title,
                        "data" : "http://www.youtube.com/watch?v=" + videoId,
                        "type" : "youtube",
                        "source" : innerOption.uri
                    }

                    allItems.push(newObj);

                    return innerNext();
                });
            }, function(err, _res){
                return next();
            });
        });
    }, function(err, _results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("buzzfeed", err);
            return done();
        }

        DebugBuzzfeed('Got items ' + allItems);
        return done(null, allItems);
    });
};

/**
 *  Scrape the youtube user pages!
 */
internals.scrapeYoutube = function(mapping, done) {
    var allItems = [];
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
                DebugYoutube('err in yotubue!' + err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugYoutube('err in yotube!' + httpResponse.statusCode);
                return next();
            }

            var $ = Cheerio.load(body);
            
            $('li.channels-content-item div.yt-lockup').each(function(i, item) {
                var newObj = {
                    "title" : $(this).find('a.yt-uix-sessionlink').text().trim().unleakString(),
                    "data" : 'http://www.youtube.com' + $(this).find('a.yt-uix-sessionlink').attr('href'),
                    "type" : "youtube",
                    "source" : option.uri
                }

                if (newObj.title && newObj.data) {
                    allItems.push(newObj);
                }
            });

            return next();
        });
    }, function(err, _results) {
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("youtube", err);
            return done();
        }

        DebugYoutube('Got items ' + allItems);
        return done(null, allItems);
    });
};



/**
 *  Scrape infigag links
 */
internals.requestInfigag = function(mapping, done) {
    var allItems = [];

    DebugInfigag('Scraping ' + mapping.urls.length + ' infigag links....');
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
                DebugInfigag('err in infigag!' + err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                DebugInfigag('err in infigag!' + httpResponse.statusCode);
                return next();
            }

            var json = JSON.parse(body);

            if (!json || !json.data) {
                DebugInfigag('no object in infigag');
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
            DebugInfigag('err in infigag', err);
            return done();
        }
        
        Async.mapLimit(allItems, 5, internals.scrapeUrl.bind(this, mapping.mapping), function(err, results) {
            if (err || !results || results.length < 1) {
                DebugInfigag('err in infigag', err);
                Utils.dealWithErrors("infigag", err);
                return done();
            }

            results = Hoek.flatten(results);
            DebugInfigag(JSON.stringify(results, null, " "));

            results = results.map(function(item) {
                if (!item || !item.data) {
                    return null;
                }

                item.data = item.data.replace('sa.gif','sv.mp4');
                return item;
            });

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
            DebugInfigag('err in infigag!');
            return done(data);
        }
        
        if (httpResponse.statusCode !== 200) {
            DebugInfigag('err in infigag!');
            return done(data);
        }

        var json    = JSON.parse(body);

        if (!json || !json.data) {
            DebugInfigag('err in infigag!');
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
                    DebugSoundcloud('err in soundclloud!', err);
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
        if (err || !allItems || allItems.length < 1) {
            Utils.dealWithErrors("soundcloud", err);
            return done();
        }

        DebugSoundcloud(JSON.stringify(allItems, null, " "));
        return done(null, allItems);
    });
};

module.exports = Scraper;
