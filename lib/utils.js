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
    var errString = err.toString().slice(0,50);

    if (process.env.NODE_ENV !== "live") {
        console.log('Invalid result from ' + type + ' with errors ' + errString);
        return;
    }

    return trello.addCard(type, errString, '56acd5dcb3c03abf6cef7aed', function (error, trelloCard) {
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

/**
 *  Shuffle list
 */
module.exports.shuffle = function(list) {
    var nItems  = list.length,
       counter = nItems,
       index,
       temp;
 
    while (counter > 0) {
        //pick a randum index and decrease counter
        index = Math.floor(Math.random() * counter--);

        //swap the elemets
        temp = list[counter];
        list[counter] = list[index];
        list[index] = temp;
    }

    return list;
};

/**
 *  Filter out invalid things etc etc
 */
module.exports.middleware = function(arr) {
    return arr.filter(function(item) {
        return item && item.data;
    }).map(function(item) {
        item.title  = item.title || '';
        item.scraped = true;

        //peel off some stuff
        if (item.data.indexOf('//') === 0) {
            item.data = item.data.slice(2);
        }

        item.title = item.title.trim();

        if (!item.source) {
            item.source = module.exports.extractSourceFromData(item.data);
        }

        return item;
    });
};
