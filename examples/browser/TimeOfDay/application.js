var app = {
    
    $body: null,
    $container: null,
    $intensity: null,
    $lightText: null,
    maxLights: 760,
    
    // start the application
    start: function ($, deviceHive, deviceId) {
        this.$body = $('body');
        this.$container = $('.container');
        this.$intensity = $('.light-intensity');
        this.$lightText = $('.light-text');

        this.deviceHive = deviceHive;

        // get device information
        var that = this;
        this.deviceHive.getDevice(deviceId)
            .done(function (device) {
                that.device = device;
                that.updateDeviceInfo(device);
                that.subscribeNotifications(device);
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
        if (notification.notification == "equipment") {
            if (notification.parameters.equipment == "light-sensor") this.updateLightLevel(notification.parameters.value);
        }
        else if (notification.notification == "$device-update") {
            if (notification.parameters.status) this.device.status = notification.parameters.status;
            if (notification.parameters.name) this.device.name = notification.parameters.name;
            this.updateDeviceInfo(this.device);
        }
    },

    // updates device information on the page
    updateDeviceInfo: function (device) {
        $(".device-name").text(device.name);
        $(".device-status").text(device.status);
    },

    // updates channel state
    updateChannelState: function (state) {
        if (state === DHClient.channelStates.connected)
            $(".channel-state").text("Connected");
        if (state === DHClient.channelStates.connecting)
            $(".channel-state").text("Connecting");
        if (state === DHClient.channelStates.disconnected)
            $(".channel-state").text("Disconnected");
    },

    // updates backgoround on the page
    updateLightLevel: function (value) {
        
        app.$intensity.text(Math.round(value / 10) + ' LUX');

        if (value > app.maxLights) {
            app.maxLights = value;
        }
        
        value = Math.round(value / app.maxLights * 100);

        var level = Math.round(value / 100 * 255).toString(16);
        level = ('0' + level).slice(-2);
        var rgb = '#' + level + level + level;
        app.$body.css('background', rgb);
        app.$container.css('color', (value < 50 ? '#ffff00' : '#000000'));
        app.setLightText(value);
    },
    
    setLightText: function (value) {

        var lightText = 'Nighttime';
        if (value > 10 && value <= 20) {
            lightText = 'Full moon overhead at tropical latitudes';
        } else if (value > 20 && value <= 30) {
            lightText = 'Twilight in the city';
        } else if (value > 30 && value <= 40) {
            lightText = 'Late evening';
        } else if (value > 40 && value <= 50) {
            lightText = 'Even more dark, turn the lights on';
        } else if (value > 50 && value <= 60) {
            lightText = 'Getting dark...';
        } else if (value > 60 && value <= 70) {
            lightText = 'Evening time';
        } else if (value > 70 && value <= 80) {
            lightText = 'Daytime, yet it\'s cloudy';
        } else if (value > 80 && value <= 90) {
            lightText = 'Sunny day, a bit of clouds';
        } else if (value > 90) {
            lightText = 'Clear, sunny day';
        }

        app.$lightText.text(lightText);
    },

    handleError: function (e) {
        alert(e);
    }
};