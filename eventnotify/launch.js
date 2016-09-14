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
                console.log('Sending wit message' + text);
                client.message(text.substring(12), sessions[sessionId].context)
                .then((data) => {
                    console.log('Yay, got Wit.ai response: ' + JSON.stringify(data, null, 4));
                    // console.log('Got wit.ai response!')

                    console.log();

                    api.sendMessage(JSON.stringify(data, null, 4), event.threadID);

                  //Personal Message. Searches for sample user name and 
                  //then sends a message to that user. The user is based on facebook's graph 
                  //search of the user. 

                  //TODO: Improve based on https://github.com/Schmavery/facebook-chat-api/blob/master/DOCS.md#getFriendsList
                  //friends list (cross reference userIDS until matches).
                  api.getUserID("USER NAME", function(err, data) {
                    console.log(data);
                    if(err) return callback(err);

                    // Send the message to the best match (best by Facebook's criteria)
                  //  var threadID = data[0].userID;
                   // api.sendMessage("if you're reading this its too late", threadID);
                  });

/*
                    console.log('Event extracted: ' + response.entities.event, event.threadID);
                    console.log('Contact(s) extracted: ' + response.entities.contact, event.threadID);
                    console.log('Datetimes(s) extracted: ' + response.entities.datetime, event.threadID);

                    api.sendMessage('Event extracted: ' + response.entities.event, event.threadID);
                    api.sendMessage('Contact(s) extracted: ' + response.entities.contact, event.threadID);
                    api.sendMessage('Datetimes(s) extracted: ' + response.entities.datetime, event.threadID);
*/
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
