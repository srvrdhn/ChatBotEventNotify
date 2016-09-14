'use strict';

var login = require('../index.js');
var fs = require('fs');
var assert = require('assert');
const Wit = require('./witbot.js');

// Will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

/**
* Returns the session for the specified fbid.
* If none are found, creates the session and returns it.
*/
function findOrCreateSession(fbid) {
    let sessionId;

    // Check if this fbid's session already exists
    Object.keys(sessions).forEach( k => {
        if (sessions[k].fbid === fbid) {
            sessionId = k;  // Found session
        }
    });
    // If no session was found
    if (!sessionId) {
        //Create new session
        sessionId = new Date().toISOString();
        sessions[sessionId] = {
            fbid: fbid,
            context: {
                _fbid_: fbid
            }
        };  // set context, _fbid_
    }
    return sessionId;
}

// Facebook login information
var conf = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
var credentials = {
    email: conf.user.email,
    password: conf.user.password,
};

// Create new Wit ai instance
console.log('Attempting to launch witbot ' + conf.user.serverAccessToken);
const client = Wit.getWit(conf.user.serverAccessToken);

/**
* Logs into the bot's FB account, provides callback method that parses user
* input and sends it to wit.ai for NLP processing.
* @param credentials   Array of email, password strings
* @param callback      Callback function to execute upon login
*/
login(credentials, function callback (err, api) {
    if(err) return console.error(err);

    api.setOptions({listenEvents: true});

    api.listen(function(err, event) {
        if(err) return console.error(err);

        switch(event.type) {
            case "message":

            // Get uesr's fbid and get their session
            var sender = event.senderID;
            var sessionId = findOrCreateSession(sender);

            // Get message body
            var text = event.body;

            // Run wit.ai when invoked with "EventNotify ..."
            if (text) {
                var invoked = text.startsWith("EventNotify ");
            }
            if(invoked) {
                client.message(text.substring(12), sessions[sessionId].context)
                .then((data) => {
                    console.log('Yay, got Wit.ai response: ' + JSON.stringify(data, null, 4));

                    console.log();

                    var response = data;

                    if (response.entities.hasOwnProperty('event')) {
                        console.log('Event extracted: ' + response.entities.event[0].value, event.threadID);
                        api.sendMessage('Event extracted: ' + response.entities.event[0].value, event.threadID);
                    } else {
                        console.log('No events found.');
                    }

                    if (response.entities.hasOwnProperty('contact')) {
                        for (var i = 0; i < response.entities.contact.length; i++) {
                            var c = response.entities.contact[i];
                            console.log('Contact(s) extracted: ' + c.value, event.threadID);
                            api.sendMessage('Contact(s) extracted: ' + c.value, event.threadID);
                        }
                    } else {
                        console.log('No contacts found.');
                    }

                    if (response.entities.hasOwnProperty('datetime')) {
                        console.log('Datetimes(s) extracted: ' + response.entities.datetime[0].value, event.threadID);
                        api.sendMessage('Datetimes(s) extracted: ' + response.entities.datetime[0].value, event.threadID);
                    } else {
                        console.log('No datetimes found.');
                    }

                })
                .catch(console.error);
            } else {
                console.log('No invocation on message: ' + text);
            }
            break;

            case "event":
            console.log(event);
            break;
        }
    });
});
