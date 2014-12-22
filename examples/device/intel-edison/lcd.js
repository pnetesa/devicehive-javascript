/*
  rgb_lcd.cpp
  2013 Copyright (c) Seeed Technology Inc.  All right reserved.

  Author:Loovee
  2013-9-18

  This library is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation; either
  version 2.1 of the License, or (at your option) any later version.

  This library is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this library; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

'use strict';

var board = require('./intel-edison');
var utils = require('./utils');

// Device I2C Arress
var LCD_ADDRESS   =  (0x7c>>1);
var RGB_ADDRESS   =  (0xc4>>1);


// color define 
var WHITE          = 0;
var RED            = 1;
var GREEN          = 2;
var BLUE           = 3;

var REG_RED        = 0x04;        // pwm2
var REG_GREEN      = 0x03;        // pwm1
var REG_BLUE       = 0x02;        // pwm0

var REG_MODE1      = 0x00;
var REG_MODE2      = 0x01;
var REG_OUTPUT     = 0x08;

// commands
var LCD_CLEARDISPLAY = 0x01;
var LCD_RETURNHOME = 0x02;
var LCD_ENTRYMODESET = 0x04;
var LCD_DISPLAYCONTROL = 0x08;
var LCD_CURSORSHIFT = 0x10;
var LCD_FUNCTIONSET = 0x20;
var LCD_SETCGRAMADDR = 0x40;
var LCD_SETDDRAMADDR = 0x80;

// flags for display entry mode
var LCD_ENTRYRIGHT = 0x00;
var LCD_ENTRYLEFT = 0x02;
var LCD_ENTRYSHIFTINCREMENT =  0x01;
var LCD_ENTRYSHIFTDECREMENT = 0x00;

// flags for display on/off control
var LCD_DISPLAYON = 0x04;
var LCD_DISPLAYOFF = 0x00;
var LCD_CURSORON = 0x02;
var LCD_CURSOROFF = 0x00;
var LCD_BLINKON = 0x01;
var LCD_BLINKOFF = 0x00;

// flags for display/cursor shift
var LCD_DISPLAYMOVE = 0x08;
var LCD_CURSORMOVE = 0x00;
var LCD_MOVERIGHT = 0x04;
var LCD_MOVELEFT = 0x00;

// flags for function set
var LCD_8BITMODE = 0x10;
var LCD_4BITMODE = 0x00;
var LCD_2LINE = 0x08;
var LCD_1LINE = 0x00;
var LCD_5x10DOTS = 0x04;
var LCD_5x8DOTS = 0x00;

function i2c_send_byteS(dta)
{
    board.i2cWrite(LCD_ADDRESS, dta);        // transmit to device #4
};

function command(value)
{
    i2c_send_byteS([0x08].concat(value));
}

function setReg(addr, dta)
{
    board.i2cWrite(RGB_ADDRESS, [addr, dta]);
}

var LCD = function() {  
    this._displayfunction = 0;
    this._charSize = LCD_5x8DOTS;
    this._numlines = 0;
    this._currline = 0;
};

LCD.prototype.setRGB = function (r, g ,b)
{
    setReg(REG_RED, r);
    setReg(REG_GREEN, g);
    setReg(REG_BLUE, b);
};

LCD.prototype.begin = function (cols, lines) 
{
    if (lines > 1) {
        this._displayfunction |= LCD_2LINE;
    }
    this._numlines = lines;
    this._currline = 0;

    this._displayfunction |= LCD_5x10DOTS;

    // SEE PAGE 45/46 FOR INITIALIZATION SPECIFICATION!
    // according to datasheet, we need at least 40ms after power rises above 2.7V
    // before sending commands. Arduino can turn on way befer 4.5V so we'll wait 50
    utils.sleep(50);
    command(LCD_FUNCTIONSET | this._displayfunction);

    // this is according to the hitachi HD44780 datasheet
    // page 45 figure 23

    // Send function set command sequence
    command(LCD_FUNCTIONSET | this._displayfunction);
    utils.sleep(5);  // wait more than 4.1ms

    // second try
    command(LCD_FUNCTIONSET | this._displayfunction);
    utils.sleep(2);

    // third go
    command(LCD_FUNCTIONSET | this._displayfunction);


    // finally, set # lines, font size, etc.
    command(LCD_FUNCTIONSET | this._displayfunction);

    // turn the display on with no cursor or blinking default
    this._displaycontrol = LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF;
    this.display();

    // clear it off
    this.clear();

    // Initialize to default text direction (for romance languages)
    this._displaymode = LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT;
    // set the entry mode
    command(LCD_ENTRYMODESET | this._displaymode);
    
    
    // backlight init
    setReg(0, 0);
    setReg(1, 0);
    setReg(0x08, 0xAA);     // all led control by pwm
    
    this.setRGB(255, 255, 255);

};

/********** high level commands, for the user! */
LCD.prototype.clear = function ()
{
    command(LCD_CLEARDISPLAY);        // clear display, set cursor position to zero
    utils.sleep(2);          // this command takes a long time!
};

LCD.prototype.home = function ()
{
    command(LCD_RETURNHOME);        // set cursor position to zero
    utils.sleep(2);          // this command takes a long time!
};

LCD.prototype.setCursor = function (col, row)
{
    var res = (row == 0 ? col|0x80 : col|0xc0);
    command([res]);
};

// Turn the display on/off (quickly)
LCD.prototype.noDisplay = function()
{
    this._displaycontrol &= ~LCD_DISPLAYON;
    command(LCD_DISPLAYCONTROL | this._displaycontrol);
};

LCD.prototype.display = function() 
{
    this._displaycontrol |= LCD_DISPLAYON;
    command(LCD_DISPLAYCONTROL | this._displaycontrol);
};

// Turns the underline cursor on/off
LCD.prototype.noCursor = function()
{
    this._displaycontrol &= ~LCD_CURSORON;
    command(LCD_DISPLAYCONTROL | this._displaycontrol);
};

LCD.prototype.cursor = function() 
{
    this._displaycontrol |= LCD_CURSORON;
    command(LCD_DISPLAYCONTROL | this._displaycontrol);
};

// Turn on and off the blinking cursor
LCD.prototype.noBlink = function()
{
    this._displaycontrol &= ~LCD_BLINKON;
    command(LCD_DISPLAYCONTROL | this._displaycontrol);
};

LCD.prototype.blink = function()
{
    this._displaycontrol |= LCD_BLINKON;
    command(LCD_DISPLAYCONTROL | this._displaycontrol);
};

// These commands scroll the display without changing the RAM
LCD.prototype.scrollDisplayLeft = function()
{
    command(LCD_CURSORSHIFT | LCD_DISPLAYMOVE | LCD_MOVELEFT);
};

LCD.prototype.scrollDisplayRight = function()
{
    command(LCD_CURSORSHIFT | LCD_DISPLAYMOVE | LCD_MOVERIGHT);
};

// This is for text that flows Left to Right
LCD.prototype.leftToRight = function()
{
    this._displaymode |= LCD_ENTRYLEFT;
    command(LCD_ENTRYMODESET | this._displaymode);
};

// This is for text that flows Right to Left
LCD.prototype.rightToLeft = function()
{
    this._displaymode &= ~LCD_ENTRYLEFT;
    command(LCD_ENTRYMODESET | this._displaymode);
};

// This will 'right justify' text from the cursor
LCD.prototype.autoscroll = function()
{
    this._displaymode |= LCD_ENTRYSHIFTINCREMENT;
    command(LCD_ENTRYMODESET | this._displaymode);
};

// This will 'left justify' text from the cursor
LCD.prototype.noAutoscroll = function()
{
    this._displaymode &= ~LCD_ENTRYSHIFTINCREMENT;
    command(LCD_ENTRYMODESET | this._displaymode);
}

// Allows us to fill the first 8 CGRAM locations
// with custom characters
LCD.prototype.createChar = function(location, charmap)
{
    location &= 0x7; // we only have 8 locations 0-7
    command(LCD_SETCGRAMADDR | (location << 3));
    i2c_send_byteS([0x40].concat(charmap));
}

// send data
LCD.prototype.write = function(value)
{
    i2c_send_byteS([0x40].concat(value));
};

// print string
LCD.prototype.print = function(s)
{
    var buf = new Buffer(s, 'ascii');
    for(var i = 0; i < buf.length; i++)
    {
        this.write(buf.readUInt8(i));
    }
};

 module.exports = new LCD();