require('dotenv').load();
var Trello = require("trello");
var trello = new Trello(process.env.TRELLO_KEY, process.env.TRELLO_TOKEN);

/**
 *  Gerneate unique hash out of data field
 */
module.exports.generateHash = function(string) {
    if (typeof string !== 'string') {
        string = JSON.stringify(string);
    }

    return require('crypto').createHash('md5').update(string).digest("hex");
};

/**
 *  Extractor function for sorce from data,
 *  returns the source
 */
module.exports.extractSourceFromData = function(obj) {
    if (!obj || !obj.data) {
        return null;
    }

    if (obj.source) {
        return obj.source;
    }

    //if its the case that we have a imgur link we can usually just 
    //remove the suffix filetype and return the link
    if (obj.data.indexOf('imgur.com/') > -1) {
        return obj.data.split('.').slice(0,-1).join('.').replace('//i.','//');
    }

    return null;
};

/**
 *  Deals with errors or no results from the scrapers
 *  Report issue function, should hook into api, mail or similar
 */
module.exports.reportError = function(type, err) {
    if (process.env.NODE_ENV !== "live") {
        console.log(err || 'WARNING ' + type + ' DOES NOT WORK!');
        return;
    }

    return trello.addCard(type, err || 'WARNING ' + type + ' DOES NOT WORK!', '56acd5dcb3c03abf6cef7aed', function (error, trelloCard) {
        if (error) {
            console.log('Could not add card:', error);
        } else {
            console.log('Added card:', trelloCard);
        }
    });
};

/**
 * Clone an object
 */
module.exports.clone = function(obj) { 
    return JSON.parse(JSON.stringify(obj));
};
