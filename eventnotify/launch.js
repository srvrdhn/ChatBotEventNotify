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

                    // Get entities, which include events, times, etc.
                    var res = data.entities;

                    var contacts = [];  // Holds all found participants
                    var date;           // Datetime for the event
                    var eventName;      // Event name
                    var location;       // Event location

                    // Retrieve event name
                    if (res.hasOwnProperty('event')) {
                        console.log('Event extracted: ' + res.event[0].value);
                        api.sendMessage('Event extracted: ' + res.event[0].value, event.threadID);
                        eventName = res.event[0].value;
                    } else {
                        console.log('No events found.');
                    }

                    // Retrieve datetime
                    if (res.hasOwnProperty('datetime')) {
                        console.log('Datetimes(s) extracted: ' + res.datetime[0].value);
                        api.sendMessage('Datetimes(s) extracted: ' + res.datetime[0].value, event.threadID);
                        date = res.datetime[0].value;
                    } else {
                        console.log('No datetimes found.');
                    })

                    // Retrieve participants
                    if (res.hasOwnProperty('contact')) {
                        for (var i = 0; i < res.contact.length; i++) {
                            var c = res.contact[i];
                            console.log('Contact(s) extracted: ' + c.value);
                            api.sendMessage('Contact(s) extracted: ' + c.value, event.threadID);
                            api.getUserID(c.value.substring(1), function(err, data) {
                                if(err) return callback(err);
                                // Send the message to the best match (best by Facebook's criteria)
                                var threadID = data[0].userID;
                                api.sendMessage("Come to " + eventName + " at " + date, threadID);
                         });
                        }
                    } else {
                        console.log('No contacts found.');
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
