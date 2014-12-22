/*
 * Demostrates manipulations with hardware sensors using DeviceHive
 * javascript library. Sends rotary sensor values to show on
 * front-end page. Accepts command that disables "reactor shield".
 * 
 * The circuit:
 * - Rotary Angle sensor attached to analog input 0
 * - Buzzer attached to digital input 3 (optional)
 * - LED attached to digital output 4
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
var callByKey = require('./intel-edison/utils.js').callByKey;

var pin = {
    A0: 0,
    D3: 3,
    D4: 4,
};

var ON = 1;
var OFF = 0;
var OVERLOAD_LEVEL = 750;   
var DANGEROUS_LEVEL = 900;

var app =({
    
    deviceHive: new DeviceHive('http://nn7502.pg.devicehive.com/api', 
        '6ae2c23b-8571-4521-81ef-d9dcfd614b34', 
        'CtIeVHXvfLW5bRX8c/8/BdD9VugfiEHj8EJJDejuyRc='),
    
    device: {
        name: "Intel Edison With Sensor Tags",
        key: '{00000000-0000-0000-0000-000000000000}',
        deviceClass: {
            name: 'Intel Edison',
            version: '0.0.1',
            equipment: [{
                    name: 'Rotary Angle Sensor',
                    type: 'SensorTag',
                    code: '272d2e5cc86244aa80d758e9c018258b'
                }]
        }
    },
    
    websocket: true,
    
    start: function () {
        app.deviceHive.registerDevice(app.device, app.deviceRegistered);
        console.log('\'power-control\' started...');
        app.showAlert(OFF);
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
        board.analogRead(pin.A0, 3, app.readSensorValue);
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
    
    isProtectionOn: true,
    
    readSensorValue: function (err, data) {
        if (err) {
            return showError(err);
        }
        
        var context = {
            message: '', 
            isProtectionFired: false,
            data: data
        };
        
        app.applyProtection(context);
        app.checkSafetyLevel(context);

        console.log("Power level: %d", context.data);
        console.log(context.message);
        
        var params = {
            equipment: 'rotary-sensor', 
            isProtectionOn: app.isProtectionOn,
            isProtectionFired: context.isProtectionFired,
            power: context.data, 
            message: context.message
        };
        app.deviceHive.sendNotification('equipment', params, app.notifCallback);
    },
    
    applyProtection: function (context) {
        
        if (!app.isProtectionOn) {
            return;
        }

        if (context.data > OVERLOAD_LEVEL) {
            context.isProtectionFired = true;
            context.data = OVERLOAD_LEVEL - 10;
            context.message += 'Protection mechanizm has worked! ';
        }
    },    
    explodetime: null,
    
    checkSafetyLevel: function (context) {
        
        if ((context.data > OVERLOAD_LEVEL) && (context.data <= DANGEROUS_LEVEL)) {
            context.message = 'REACTOR OVERLOADED!';
            app.enableAlert();
            return;
        } else if (context.data > DANGEROUS_LEVEL) {
            context.message = 'TOO MUCH RADIATION!';
            app.enableAlert();
            app.blowUp(context);
            return;
        }
    
        app.explodetime = null;
        context.message += 'Power level is in norm';
        app.disableAlert();
    },
    
    blowUp: function (context) {
        if (!app.explodetime) {
            app.explodetime = +new Date();
            return;
        }
        
        if ((+new Date() - app.explodetime) < 5000) {
            context.message += ' WILL EXPLODE IN FEW SECONDS!';
            return;
        }

        var params = {event: 'blow-up', message: 'REACTOR HAS EXPLODED!' };
        app.deviceHive.sendNotification('software', params, function (err, res) {
            
            if (err) {
                showError(err);
            }
            
            app.showAlert(OFF);
            console.log(params.message);
            process.exit();
        });
    },
    
    alertInterval: null,
    
    enableAlert: function () {
        
        if (app.alertInterval) {
            return;
        }

        var beepOn = false;
        app.alertInterval = setInterval(function () {
            app.showAlert(app.beepOn ? ON : OFF);
            app.beepOn = !app.beepOn;
        }, 500);
    },

    disableAlert: function () {
        if (!app.alertInterval) {
            return;
        }

        app.showAlert(OFF);
        clearInterval(app.alertInterval);
        app.alertInterval = null;
    },
    
    showAlert: function (on) {
        board.digitalWrite(pin.D3, on);
        board.digitalWrite(pin.D4, on);
    },
    
    notifCallback: function (err, res) {
        if (err) {
            return showError(err);
        }
        console.log(JSON.stringify(res));
    },
    
    onCommand: function (cmd) {
        callByKey(app.commands, cmd.command, cmd);
    },
    
    commands: {
        'toggle-protection': function (command) {
            app.isProtectionOn = command.parameters.isProtectionOn;
            console.log('Protection mechanizm: %s', app.isProtectionOn ? 'ON' : 'OFF');
            command.update({
                status: 'Success',
                isProtectionOn: app.isProtectionOn
            });
        }
    },
});

app.start();
