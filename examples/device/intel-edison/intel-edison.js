/*
 *
 * Wrapper for Inte's MRAA to control GPI, ADC/DAC and I2C
 *
 * Based on intel-iot adaptor
 * http://cylonjs.com
 *
 * Copyright (c) 2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
 *
 * Copyright (c) 2014 DeviceHive
 * Licensed under MIT license.
*/

'use strict';

var Mraa = require('mraa');

var MIN_PULSE_WIDTH = 600;
var MAX_PULSE_WIDTH = 2500;
var MAX_PERIOD = 7968;
var I2C_PORT = 6;

var Adaptor = function Adaptor() {  
  this.pins = [];
  this.pwmPins = [];
  this.analogPins = [];
  this.interval = 1000;
  this.i2c = null;
};

Adaptor.prototype.digitalRead = function(pin, callback) {
  var prev;

  pin = parseInt(pin, 10);

  if (!this.pins[pin]) {
    this.pins[pin] = new Mraa.Gpio(pin);
  }

  this.pins[pin].dir(Mraa.DIR_IN);

  setInterval(function() {
    var val = this.pins[pin].read();

    if (val !== prev) {
      prev = val;
      callback(null, val);
    }
  }.bind(this), 10);
};

Adaptor.prototype.digitalWrite = function(pin, value) {
  pin = parseInt(pin, 10);
  value = parseInt(value, 10);
  if (this.pins[pin] == null) {
    this.pins[pin] = new Mraa.Gpio(pin);
  }
  this.pins[pin].dir(Mraa.DIR_OUT);
  this.pins[pin].write(value);
  return value;
};

Adaptor.prototype.analogRead = function(pin, tolerance, callback) {
  var prev = -1;

  pin = parseInt(pin, 10);

  if (!this.analogPins[pin]) {
    this.analogPins[pin] = new Mraa.Aio(pin);
  }

  setInterval(function() {
    var val = this.analogPins[pin].read();

    if (Math.abs(val - prev) > tolerance) {
      prev = val;
      callback(null, val);
    }
  }.bind(this), this.interval);
};

Adaptor.prototype.servoWrite = function(pin, value) {
  this.pwmWrite(pin, MIN_PULSE_WIDTH + value * (MAX_PULSE_WIDTH - MIN_PULSE_WIDTH), true);
};

Adaptor.prototype.pwmWrite = function(pinNum, value, servo) {
  pinNum = parseInt(pinNum, 10);

  var pin = this.pwmPins[pinNum];

  if (!pin) {
    pin = new Mraa.Pwm(pinNum);

    if (utils.isGalileoGen1()) {
      pin.period_us(500);
    }

    pin.enable(true);

    this.pwmPins[pinNum] = pin;
  }

  if (servo === true) {
    pin.period_us(MAX_PERIOD);
    pin.pulsewidth_us(value);
  } else {
    pin.write(value);
  }
};

Adaptor.prototype.i2cWrite = function(address, cmd, callback) {
  if (this.i2c == null) {
    this.i2c = new Mraa.I2c(I2C_PORT);
  }
  this.i2c.address(address);
      
  console.log("ADDRESS = %s, DATA = %s", address.toString(16), new Buffer(cmd).toString('hex'));

  this.i2c.write(new Buffer(cmd).toString());
  if ('function' === typeof(callback)) { callback(); }
};

Adaptor.prototype.i2cRead = function(address, cmd, length, callback) {
  if (this.i2c == null) {
    this.i2c = new Mraa.I2c(I2C_PORT);
  }
  this.i2c.address(address);
  this.i2c.write(new Buffer([cmd]).toString());
  var data = this.i2c.read(length);
  callback(null, new Buffer(data, 'ascii'));
};

module.exports = new Adaptor();