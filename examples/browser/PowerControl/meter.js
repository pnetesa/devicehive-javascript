var Meter = function ($, enableReset) {

    var $hand = $('#hand');
    var $scaleValue = $('#scale-value');
    var lastSet = null;
    
    if (enableReset) {
        setInterval(function () {
            if ((+new Date() - lastSet) < 10000) {
                return;
            }
            
            setValue(0);
        }, 10000);
    }

    var setValue = function (value) {

        $hand.rotate(Math.ceil(value / 100 * 180));
        $scaleValue.text(value + '%');

        var color = '#0fa703';
        if (value > 50 && value <= 75) {
            color = '#d7b600';
        } else if (value > 75) {
            color = '#e20000';
        }
        $scaleValue.css('color', color);

        lastSet = +new Date();
    };

    return {
        setValue: setValue
    };
}