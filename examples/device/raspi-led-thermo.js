/*
 * Demostrates manipulations with hardware sensors using DeviceHive
 * javascript library. Sends temperature sensor values to display on
 * front-end page. Reacts to front-end switch to turn LED on and off.
 * 
 * The circuit:
 * - Temperature sensor attached to analog input 0
 * - Button attached to digital input 3
 * - LED attached to digital output 4 (optional)
 * 
 * Note: some environments may not work properly with websockets. In
 * this case comment out 'websocket' field. Longpolling will be used.
 * 
 */
global.XMLHttpRequest = require('xhr2');
global.WebSocket = require('ws');
var DeviceHive = require('./devicehive/devicehive.device.js');
var board = require('./intel-edison/intel-edison');
var showError = require('./intel-edison/utils.js').showError;
var callByKey = require('./intel-edison/utils.js').callByKey;

var pin = {
    A0: 0,
    D3: 3,
    D4: 4,
    D13: 13
};

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
                    name: 'Temperature Sensor',
                    type: 'SensorTag',
                    code: '70f31319a57e4eaa97bb6dcb89ccb2c5'
                }]
        }
    },
    
    websocket: true,
    
    start: function () {
        app.deviceHive.registerDevice(app.device, app.deviceRegistered);
        console.log('\'raspi-led-thermo\' started...');
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
        
        app.subscribe(app.onCommand);
        
        board.analogRead(pin.A0, 3, app.readTemperature);
        board.digitalRead(pin.D3, app.readHwButton);
    },
    
    subscribe: function (callback) {
        var subscription = app.deviceHive.subscribe(function (err, subscription) {
            if (err) {
                return showError(err);
            }
            console.log('subscribe - OK');
        });
        subscription.message(callback);
    },
    
    readTemperature: function (err, data) {
        if (err) {
            return showError(err);
        }
        
        var t = app.toCelcius(data);
        console.log("Temperature is: %d", t);
        
        var params = { equipment: 'temp', temperature: t };
        app.deviceHive.sendNotification('equipment', params, app.notifCallback);
    },
    
    toCelcius: function (val) {
        var B = 3975;
        var t = val;
        
        // get the resistance of the sensor
        var resistance = (1023 - t) * 10000 / t;
        
        // convert to temperature via datasheet
        var temperature = 1 / (Math.log(resistance / 10000) / B + 1 / 298.15) - 273.15;
        
        return Math.round(temperature);
    },
    
    readHwButton: function (err, data) {
        if (err) {
            return showError(err);
        }
        
        if (data === 0) {
            return;
        }
        
        app.toggleLed(app.isLedOn ? 0 : 1);
    },
    
    isLedOn: false,
    
    toggleLed: function (on) {
        app.isLedOn = (on === 1);
        console.log('isLedOn=%s', app.isLedOn);
        
        board.digitalWrite(pin.D4, on);
        board.digitalWrite(pin.D13, on);
        
        var params = { equipment: 'LED', state: on };
        app.deviceHive.sendNotification('equipment', params, app.notifCallback);
    },
    
    notifCallback: function (err, res) {
        if (err) {
            return showError(err);
        }
        console.log(JSON.stringify(res));
    },
    
    onCommand: function (notification) {
        callByKey(app.commands, notification.command, notification.parameters);
    },
    
    commands: {
        'UpdateLedState': function (parameters) {
            callByKey(app.equipment, parameters.equipment, parameters);
        }
    },
    
    equipment: {
        'LED': function (parameters) {
            app.toggleLed(parseInt(parameters.state));
        }
    },
});

app.start();
