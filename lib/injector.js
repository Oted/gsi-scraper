var Async       = require('async'),
    Request     = require('request'),
    requestSpan,
    targetUrl;

function Injector(url, span) {
    requestSpan = span;
    targetUrl = url;
};

/**
 *  Injects a lot of stuff to the target server.
 */
Injector.prototype.injectMultiple = function(list, done) {
    console.log('Injecting ' + list.length + ' items...');
    
    Async.each(list, this.inject, done)
};

/**
 *  Injects one item
 */
Injector.prototype.inject = function(raw, done) {
    if (!raw || !raw.data) {
        console.log('No data provided for injector');
        return;
    }

    raw.title = raw.title || '';

    //peel off some stuff
    if (raw.data.indexOf('//') === 0) {
        raw.data = raw.data.slice(2);
    }

    //add these things with a randomized timeout
    setTimeout(function () {
        console.log('injecting ' + JSON.stringify(raw) + ' to ' + targetUrl);
        Request.post({url:targetUrl, form: raw}, function(err, httpResponse, body) {
            if (err) {
                console.log(err);
                return done(err);
            }
            
            if (httpResponse.statusCode !== 200) {
                console.log(httpResponse.statusCode);
                return done(httpResponse.statusCode);
            }
            
            return done();
        });
    }, Math.floor(Math.random() * requestSpan));
};

module.exports = Injector;
