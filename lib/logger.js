module.exports = process.env.NODE_ENV === 'test' ? console.log.bind(this, new Date()) : function(){};
