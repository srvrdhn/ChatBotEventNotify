var login = require('../index.js');
var fs = require('fs');
var assert = require('assert');

// Bot login information
// DO NOT COMMIT credentials.json TO DATABASE
var conf = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
var credentials = {
  email: conf.user.email,
  password: conf.user.password,
};

/**
 * Logs into the bot's FB account, provides callback method that parses user
 * input and sends it to wit.ai for NLP processing.
 * @param credentials   Array of email, password strings
 * @param callback      Callback function to execute upon login
 */
login(credentials, function callback (err, api) {
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
