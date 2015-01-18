//recently inserted items
var insertedItems = [],
    cacheSize     = 10000;


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
 *  Check the cache for the item, if its there return true,
 *  otherwise add it to the cache and return false
 */
module.exports.checkNAdd = function(hash) {
    if (insertedItems.indexOf(hash) > -1) {
        return true;
    }
    
    //else its not in the cache and should be inserted.
    insertedItems.unshift(hash);
    module.exports.controlCacheSize();
    return false;
};

/**
 *  Constol the cache size
 */
module.exports.controlCacheSize = function() {
    if (insertedItems.lengt > cacheSize) {
        insertedItems = insertedItems.slice(cacheSize);
    }
};
