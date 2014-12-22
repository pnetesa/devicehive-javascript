/*
 * Guess word game. Demostrates manipulations with hardware sensors 
 * using DeviceHive javascript library.
 * 
 * The circuit:
 * - LCD display connected to any of I2C input
 * - Button sensor attached to digital input 4
 * - Touch sensor attached to digital input 3
 * 
 * Note: some environments may not work properly with websockets. In
 * this case comment out 'websocket' field. Longpolling will be used.
 * 
 */
global.XMLHttpRequest = require('xhr2');
global.WebSocket = require('ws');
var DeviceHive = require('./devicehive/devicehive.device.js');
var lcd = require('./intel-edison/lcd');
var board = require('./intel-edison/intel-edison');
var showError = require('./intel-edison/utils.js').showError;
var callByKey = require('./intel-edison/utils.js').callByKey;

var pin = {
    D3: 3,
    D4: 4
};

var words = [
    'Orange',
    'Pineapple',
    'Apple',
    'Banana',
    'Peach',
    'Strawberry',
    'Kiwi',
    'Cherry',
    'Potato',
    'Avocado'
];

var app = ({
    
    deviceHive: new DeviceHive('http://localhost/DeviceHive.API',
        '9f33566e-1f8f-11e2-8979-c42c030dd6a5',
        'CtIeVHXvfLW5bRX8c/8/BdD9VugfiEHj8EJJDejuyRc='),
    
    device: {
        name: "Intel Edison With Sensor Tags",
        key: '{00000000-0000-0000-0000-000000000000}',
        deviceClass: {
            name: 'Intel Edison',
            version: '0.0.1',
            equipment: [{
                    name: 'Button',
                    type: 'SensorTag',
                    code: '144834fa06e64cd1adc2bd15513dc5e4'
                }]
        }
    },
    
    websocket: true,
    
    selectedIndex: 0,
    
    start: function () {
        lcd.begin(16, 2);
        app.writeLcd('-= App started! =-');

        app.deviceHive.registerDevice(app.device, app.deviceRegistered);
        console.log('\'guess-word\' started...');
    },
    
    deviceRegistered: function (err, res) {
        if (err) {
            return showError(err);
        }
        
        app.deviceHive.openChannel(app.channelOpened, 
            app.websocket ? 'websocket' : 'longpolling');
    },
    
    channelOpened: function (err, name) {
        if (err) {
            return showError(err);
        }
        
        app.writeLcd(words[app.selectedIndex]);

        board.digitalRead(pin.D3, app.newGame);
        board.digitalRead(pin.D4, app.nextWord);

        app.deviceHive.sendNotification('new-game', app.notifCallback);
    },
    
    nextWord: function (err, data) {
        if (err) {
            return showError(err);
        }

        if (data !== 1) {
            return;
        }
        
        var word = words[++app.selectedIndex % words.length];

        console.log('Selected word: %s', word);
        app.writeLcd(word);
        
        app.deviceHive.sendNotification('guess', 
            { word: word }, app.notifCallback);
    },
    
    newGame: function (err, data) {
        if (err) {
            return showError(err);
        }
        
        app.writeLcd('-= New game =-');
        app.deviceHive.sendNotification('new-game', app.notifCallback);
    },
    
    notifCallback: function (err, res) {
        if (err) {
            return showError(err);
        }
        console.log(JSON.stringify(res));
    },

    writeLcd: function (text) {
        lcd.clear();
        lcd.print(text);
    }
});

app.start();
