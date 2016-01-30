var module = require('./');

require('dotenv').load();

process.env.NODE_ENV = 'test';
process.env.DEBUG = 'youtube';

module(function(err, list) {
    console.log('done', list);
});
