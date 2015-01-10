var Async       = require('async'),
    Request     = require('request'),
    totals = {
        'injects' : 0,
        'rejects' : 0
    },
    requestSpan,
    targetUrl;

function Injector(url, span) {
    console.log('new injector!');
    totals.injects = 0;
    totals.rejects = 0;
    requestSpan = span;
    targetUrl = url;
};

/**
 *  Injects a lot of stuff to the target server.
 */
Injector.prototype.injectMultiple = function(list, done) {
    Async.each(list, this.inject, function(err) {
        done(null, totals);
    });
};

/**
 *  Injects one item
 */
Injector.prototype.inject = function(raw, next) {
    if (!raw || !raw.data) {
        console.log('No data provided for injector');
        return next();
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
                totals.rejects++;
                console.log(err);
                return next();
            }
            
            if (httpResponse.statusCode !== 200) {
                totals.rejects++;
                console.log(httpResponse.statusCode);
                return next();
            }

            totals.injects++;
            return next();
        });
    }, Math.floor(Math.random() * requestSpan));
};

module.exports = Injector;
