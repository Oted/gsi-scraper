

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
module.exports.dealWithErrors = function(type, err) {
    console.log('WARNING ' + type + ' DOES NOT WORK!');
};
