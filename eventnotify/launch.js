var login = require('../index.js');
var fs = require('fs');
var assert = require('assert');

login({email: "redacted@gmail.com", password: "redacted"}, function callback (err, api) {
    if(err) return console.error(err);

    api.setOptions({listenEvents: true});

    var stopListening = api.listen(function(err, event) {
        if(err) return console.error(err);

        switch(event.type) {
            case "message":

            // Always mark messages as read
            api.markAsRead(event.threadID, function(err) {
                if(err) console.log(err);
            });

            // Run wit.ai when invoked with "EventNotify ..."
            var invoked = event.body.startsWith("EventNotify ");
            if(invoked) {
                var request = event.body.substring(12); // Trim prefix
                api.sendMessage("Request recieved: " + request, event.threadID);
                console.log('New invocation: ' + event.body);
            }
            break;

            case "event":
            console.log(event);
            break;
        }
    });
});
