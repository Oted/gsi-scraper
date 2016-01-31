process.env.NODE_ENV = 'test';

var module = require('./');

module(function(errs, list) {
    console.log('used_mem : ' + process.memoryUsage().heapUsed);
    console.log('errs', errs.length);
    console.log('list', list.length);
});
