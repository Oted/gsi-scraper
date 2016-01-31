require('dotenv').load();

process.env.NODE_ENV = 'test';

var module = require('./');

module(function(err, list) {
    console.log('used_mem : ' + process.memoryUsage().heapUsed);
    console.log('done', list.length);
});
