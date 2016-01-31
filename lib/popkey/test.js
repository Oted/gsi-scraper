require('dotenv').load();

process.env.NODE_ENV = 'test';

var module = require('./');

module(function(errs, list) {
    console.log('used_mem : ' + process.memoryUsage().heapUsed);
    console.log('list', list.length);
    console.log('errs', errs.length);
});
