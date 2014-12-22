var app = {
    
    words: [
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
    ],
    
    // start the application
    start: function ($, deviceHive, deviceId) {
        
        this.$device = $('#deice');
        this.$status = $('#status');
        this.$state = $('#state');
        this.$suggestedWord = $('#suggested-word');
        this.$comment = $('#comment');
        
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
            .then(function () {
                var sub = that.deviceHive.subscribe({ deviceIds: device.id });
                
                sub.message(function () {
                    that.handleNotification.apply(that, arguments);
                });
                
                that.newGame();
                return sub;
            })
            .fail(that.handleError);
    },
    
    // handles incoming notification
    handleNotification: function (deviceId, notification) {
        if (notification.notification === 'guess') {
            this.setGuess(notification.parameters);
        } else if (notification.notification === 'new-game') {
            this.newGame();
        } else if (notification.notification === '$device-update') {
            if (notification.parameters.status)
                this.device.status = notification.parameters.status;
            if (notification.parameters.name)
                this.device.name = notification.parameters.name;
            this.updateDeviceInfo(this.device);
        }
    },
    
    // updates device information on the page
    updateDeviceInfo: function (device) {
        this.$device.text(device.name);
        this.$status.text(device.status);
    },

    // updates channel state
    updateChannelState: function (state) {
        if (state === DHClient.channelStates.connected)
            this.$state.text('Connected');
        if (state === DHClient.channelStates.connecting)
            this.$state.text('Connecting...');
        if (state === DHClient.channelStates.disconnected)
            this.$state.text('Disconnected');
    },
    
    firstHit: true,
    
    word: '',
    
    suggestedWord: '',
    
    checkTimeout: null,
    
    setGuess: function (parameters) {
        this.suggestedWord = parameters.word;
        this.$suggestedWord.text(this.suggestedWord);
        this.$comment.text('Now let me check...');
        
        if (this.checkTimeout) {
            clearTimeout(this.checkTimeout);
        }

        this.checkTimeout = setTimeout(function () {
            if (app.word === app.suggestedWord) {
                if (app.firstHit) {
                    app.$comment.text('Really cool! Yo\'ve guessed it from the first time. Tap sensor for new game.');
                } else {
                    app.$comment.text('Correct! You\'ve guessed it right. Tap sensor for new game.');
                }
            } else {
                app.$comment.text('No. I meant word starting from \'' + app.word.substr(0, 1) + '\'... Try again.');
                app.firstHit = false;
            }

            app.checkTimeout = null;
        }, 5000);
    },
    
    newGame: function () {
        if (this.checkTimeout) {
            clearTimeout(this.checkTimeout);
        }

        this.firstHit = true;
        this.word = this.words[Math.ceil(Math.random() * (this.words.length - 1))];
        this.$suggestedWord.text('...');
        this.$comment.text('Started new game.');
    },
    
    handleError: function (e) {
        alert(e);
    }
};