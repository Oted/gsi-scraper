require('dotenv').load();

process.env.NODE_ENV = 'test';

var module = require('./');

module(function(errs, list) {
    console.log('used_mem : ' + process.memoryUsage().heapUsed);
    console.log('errors', errs.length);
    console.log('items', list.length);
});
