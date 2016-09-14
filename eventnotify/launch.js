'use strict';

var login = require('../index.js');
var fs = require('fs');
var assert = require('assert');

// Wit.ai integration
const bot = require('./witbot.js');
const Config = require('../const.js');

//Create a new Wit bot instance
const Wit = bot.getWit();

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

            // Get uesr's fbid and get their session
            var sender = event.senderID;
            var sessionId = findOrCreateSession(sender);

            // Get message body
            var text = event.body;

            // Always mark messages as read
            api.markAsRead(event.threadID, function(err) {
                if(err) console.log(err);
            });

            // Run wit.ai when invoked with "EventNotify ..."
            var invoked = text.startsWith("EventNotify ");
            if(invoked) {
                var request = text.substring(12); // Trim prefix

                Wit.runActions(sessionId,
                    '@EventNotify ' + text,
                    sessions[sessionId].context,
                    (error, context) => {
                        if (error) {
                            console.error('Got error from wit: ' + error);
                        } else {
                            console.log('No error from wit.');
                        }
                    }
                );

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
