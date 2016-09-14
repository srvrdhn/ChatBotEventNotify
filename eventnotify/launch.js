'use strict';

var login = require('../index.js');
var fs = require('fs');
var assert = require('assert');
const {Wit, log} = require('node-wit');

// Will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};


const actions = {

    send(request, response) {
        return new Promise(function(resolve, reject) {
            console.log(JSON.stringify(response));
            return resolve();
        });
    },
    createEvent({sessionId, context, text, entities}) {
        console.log('Session ${sessionId} received ${text}');
        console.log('The current context is ${JSON.stringify(context)}');
        console.log('Wit extracted ${JSON.stringify(entities)}');
        return Promise.resolve(context);
    }
};

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
const client = new Wit({
    accessToken: conf.user.serverAccessToken,
    actions,
    logger: new log.Logger(log.DEBUG) // optional
});


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

                console.log('Sending wit message' + text);
                client.message('@' + text, sessions[sessionId].context)
                .then((data) => {
                    console.log('Yay, got Wit.ai response: ' + JSON.stringify(data, null, 4));
                    // console.log('Got wit.ai response!')
                })
                .catch(console.error);
            }
            break;

            case "event":
            console.log(event);
            break;
        }
    });
});