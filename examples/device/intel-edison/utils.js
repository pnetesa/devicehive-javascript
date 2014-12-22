'use strict';

var utils = function utils() {  
};

utils.prototype.sleep = function (ms) 
{
    var start = Date.now();
    while(Date.now() < start + ms) {
      var i = 0;
    }
};

utils.prototype.showError = function (err) {
    console.log('Error: ' + JSON.stringify(err));
};

utils.prototype.callByKey = function (map, key, args) {
    var func = map[key];
    if (func) {
        func(args);
    }
};

module.exports = new utils();
