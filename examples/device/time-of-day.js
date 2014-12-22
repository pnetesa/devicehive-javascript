/*
 * Demostrates manipulations with hardware sensors using DeviceHive
 * javascript library. Sends light sensor values to display on
 * front-end page.
 * 
 * The circuit:
 * - Light sensor attached to analog input 0
 * - Button attached to digital input 3 (optional)
 * - LED attached to digital output 4 (optional)
 * - Set Base Shield's switch to 5 volts mode
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

var pin = {
    A0: 0,
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
                    name: 'Light Sensor',
                    type: 'SensorTag',
                    code: '62fb45c8cc314d208fbb65bc344fe5c1'
                }]
        }
    },
    
    websocket: true,
    
    start: function () {
        app.deviceHive.registerDevice(app.device, app.deviceRegistered);
        console.log('\'time-of-day\' started...');
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
        
        board.analogRead(pin.A0, 3, app.readLightLevel);
    },
    
    readLightLevel: function (err, data) {
        if (err) {
            return showError(err);
        }
        
        console.log("Light level: %d%%", Math.round(data / 1000 * 100));
        
        var params = { equipment: 'light-sensor', value: data };
        app.deviceHive.sendNotification('equipment', params, app.notifCallback);
    },
    
    notifCallback: function (err, res) {
        if (err) {
            return showError(err);
        }
        console.log(JSON.stringify(res));
    },
});

app.start();
