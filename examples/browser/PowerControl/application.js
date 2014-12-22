var app = {
    
    maxPower: 1000,
        
    // start the application
    start: function ($, deviceHive, deviceId) {
        
        this.$onOffStatus = $('#on-off');
        this.$messages = $('#messages');
        this.$protection = $('#protection');
        this.$overload = $('#overload');
        this.$danger = $('#danger');
        this.$powerLevel = $('#power-level');
        this.$btnToggleProtection = $('#btn-toggle-protection');
        this.$btnToggleProtection.click(this.toggleProtectionOnOff);

        this.meter = new Meter($);
        this.deviceHive = deviceHive;

        // get device information
        var that = this;
        this.deviceHive.getDevice(deviceId)
            .done(function (device) {
                that.device = device;
                that.getEquipmentState(device);
                that.subscribeNotifications(device);
            })
            .fail(that.handleError);
    },
    
    // gets current reactor state
    getEquipmentState: function (device) {
        var that = this;
        this.deviceHive.getEquipmentState(device.id)
            .done(function (data) {
                jQuery.each(data, function (index, equipment) {
                    if (equipment.id == "rotary-sensor") {
                        that.updatePowerLevel(equipment.parameters);
                    }
                });
            })
            .fail(that.handleError);
    },

    // subscribes to device notifications
    subscribeNotifications: function (device) {
        var that = this;
        this.deviceHive.channelStateChanged(function (data) {
            that.updateChannelState(data.newState);
        });

        this.deviceHive.openChannel(null, 'websocket')
            .then(function() {
                var sub = that.deviceHive.subscribe({deviceIds: device.id});

                sub.message(function () {
                    that.handleNotification.apply(that, arguments);
                });

                return sub;
            })
            .fail(that.handleError);
    },

    // handles incoming notification
    handleNotification: function (deviceId, notification) {
        if (notification.notification === "equipment") {
            if (notification.parameters.equipment === "rotary-sensor") this.updatePowerLevel(notification.parameters);
        } 
        else if (notification.notification == "software") {
            if (notification.parameters.event === "blow-up") this.blowUp(notification.parameters);
        } 
    },

    // updates channel state
    updateChannelState: function (state) {
        if (state === DHClient.channelStates.connected)
            this.$onOffStatus.text('ON');
        if (state === DHClient.channelStates.connecting)
            this.$onOffStatus.text('connecting...');
        if (state === DHClient.channelStates.disconnected)
            this.$onOffStatus.text('OFF');
    },

    OVERLOAD_LEVEL: 750,

    DANGEROUS_LEVEL: 900,

    // updates power level on the page
    updatePowerLevel: function (parameters) {
        
        var power = parameters.power;
        this.$powerLevel.text(power);

        if (power > this.maxPower) {
            this.maxPower = power;
        }
        
        this.setProtectionOnOff(parameters.isProtectionOn);
        this.$protection.css('visibility',
            parameters.isProtectionFired ? 'visible' : 'hidden');
        
        this.updateIndicators(power);
        
        var value = Math.round(power / this.maxPower * 100);
        this.meter.setValue(value);

        this.showMessage();
        this.showMessage(parameters.message);
        this.showMessage('[' + (new Date()).toLocaleTimeString() + ']');
    },
    
    updateIndicators: function (power) {
        if ((power > this.OVERLOAD_LEVEL) && (power <= this.DANGEROUS_LEVEL)) {
            this.$overload.css('visibility', 'visible');
            this.$danger.css('visibility', 'hidden');
        } else if (power > this.DANGEROUS_LEVEL) {
            this.$overload.css('visibility', 'visible');
            this.$danger.css('visibility', 'visible');
        } else {
            this.$overload.css('visibility', 'hidden');
            this.$danger.css('visibility', 'hidden');
        }
    },

    showMessage: function (message) {
        message || (message = '');
        this.$messages.html(message + '<br />' + this.$messages.html());
    },
    
    blowUp: function (parameters) {
        this.deviceHive.closeChannel();
        $('html').css('background-color', '#000000');
        $('body').css('background-color', '#000000');
        $('#main').css('background-color', '#000000');
        $('#indicators')
            .text(parameters.message)
            .css('color', '#ff0000');
    },
    
    isProtectionOn: true,
    
    toggleProtectionOnOff: function () {
        $(this).attr('disabled', true);
        $(this).text('changing...');
        app.isProtectionOn = !app.isProtectionOn;
        app.deviceHive.sendCommand(app.device.id, 
                "toggle-protection", 
                { isProtectionOn: app.isProtectionOn })
            .result(30)
            .done(function (res) {
                app.setProtectionOnOff(res.parameters.isProtectionOn);
            })
            .fail(app.handleError);
    },
    
    setProtectionOnOff: function (isProtectionOn) {
        this.isProtectionOn = isProtectionOn;
        this.$btnToggleProtection.text(
            this.isProtectionOn ? 'Protection on' : 'Protection off');
        this.$btnToggleProtection.attr('disabled', false);
    },

    handleError: function (e) {
        alert(e);
    }
};