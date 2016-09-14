'use strict';

var login = require('../index.js');
var fs = require('fs');
var assert = require('assert');
const Wit = require('./witbot.js');

// Will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

// Padding constants
const HEADER = '~~~~~~~~ EventNotify ~~~~~~~\n';
const FOOTER = '~~~~~~~~~~~~~~~~~~~~~~~~~';


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

    if(api)    api.setOptions({listenEvents: true});

    if(api)
    api.listen(function(err, event) {
        if(err) return console.error(err);

        switch(event.type) {
            case "message":

            // Get uesr's fbid and get their session
            var sender = event.senderID;
            var senderName;
            var genderPos = "his";

            api.getUserInfo(sender, function(err, ret) {
                if(err) return console.error(err);
                for(var prop in ret) {
                    senderName = ret[prop].firstName;
                    if(ret[prop].gender != 2) genderPos = "her";
                }
            });

            var sessionId = findOrCreateSession(sender);

            var info;


         /*   api.getThreadInfo(event.threadID, callback(err, info))
            if(err) return console.error(err);
            var ids = info.participantIDs;
            for(var person in ids) {
                thisID = ids[person];
                api.getUserInfo(thisID, function(err, ret) {
                    if(err) return console.error(err);
                    for(var prop in ret) {
                        thisName = ret[prop].firstName;
                        console.log(thisName);
                    }
                });
            } */

            // Get message body
            var text = event.body;

            var display = '';

            /**************************************************************
            * -------------------- PARSE USER INPUT -------------------- *
            **************************************************************/

            if (!text) break;

            var ind = text.indexOf("color");

            if(ind != -1) {
                console.log('understood message');

                var index = text.indexOf(":");
                if(index != -1) var change = text.substring(index + 1, text.length);


                api.changeThreadColor(change, event.threadID, function callback(err) {
                    if(err) return console.error(err);
                });

            }

            var ind = text.indexOf("emoji");

            if(ind != -1) {
                var index = text.indexOf(":");
                var change = text.substring(index + 1, text.length);

                api.changeThreadEmoji("💯", "0000000000000", function callback(err) {
                    if(err) return console.error(err);
                });
            }

            // Display current events UI upon "EventNotify"
            if (text && text.toLowerCase() === "eventnotify") {
                var retval = HEADER + displayEvents() + "\n" + FOOTER;
                api.sendMessage(retval, event.threadID);
            }

            // Run wit.ai upon "EventNotify ..."
            if (text) {
                var invoked = text.startsWith("EventNotify ");
            }
            if(invoked) {
                client.message(text.substring(12), sessions[sessionId].context)
                .then((data) => {
                    console.log(JSON.stringify(data, null, 4));

                    // Get entities, which include events, times, etc.
                    var res = data.entities;

                    var contacts = [];  // Holds all found participants
                    var date;           // Datetime for the event
                    var dateString;     // Formatted date
                    var eventName;      // Event name
                    var location;       // Event location

                    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

                    // Retrieve event name
                    if (res.hasOwnProperty('event')) {
                        console.log('Event extracted: ' + res.event[0].value);
                        display += 'Event extracted: ' + res.event[0].value + "\n";
                        eventName = res.event[0].value;
                    } else {
                        console.log('No events found.');
                    }

                    // Retrieve location
                    if (res.hasOwnProperty('location')) {
                        console.log('Location extracted: ' + res.location[0].value);
                        display += 'Location extracted: ' + res.location[0].value + "\n";
                        location = res.location.value;
                    } else {
                        console.log('No locations found.');
                    }

                    // Retrieve local_search_query
                    if (res.hasOwnProperty('local_search_query')) {
                        console.log('Local search query extracted: ' + res.local_search_query[0].value);
                        display += 'Local search query extracted: ' + res.local_search_query[0].value + "\n";
                        location = res.local_search_query[0].value;
                    }

                    // Retrieve datetime
                    if (res.hasOwnProperty('datetime')) {
                        var dateSplit = res.datetime[0].value.split("T");

                        console.log('Date parsed: ' + dateSplit[0] + " " + dateSplit[1].substring(0, 5));

                        date = new Date(Date.parse(dateSplit[0] + " " + dateSplit[1].substring(0, 5)));
                        dateString = formatDateTime(date);
                        display += "Time: " + dateString + "\n";
                    } else {
                        console.log('No datetimes found.');
                    }

                    // Retrieve participants
                    if (res.hasOwnProperty('contact')) {
                        // Check for mutiple contacts in one value
                        for (var i = 0; i < res.contact.length; i++) {
                            if (res.contact[i].value.lastIndexOf("@") == 0) {
                                contacts.push(res.contact[i].value);
                            }
                            else {
                                var splitContacts = res.contact[i].value.split(" ");
                                for (var k = 0; k < splitContacts.length; k++) {
                                    contacts.push(splitContacts[k]);
                                }
                            }
                        }

                        // Print out contacts
                        for (var i = 0; i < contacts.length; i++) {
                            var c = contacts[i];
                            console.log('Contact(s) extracted: ' + c);
                            display += 'Contact invited: ' + c + "\n";
                            api.getUserID(c.substring(1), function(err, data) {
                                if(err) return callback(err);

                                // Send the message to the best match (best by Facebook's criteria)
                                var threadID = data[0].userID;
                                var message = senderName + " invited you to " + eventName;

                                if(location)    message = message + " at " + location;
                                if(date) {
                                    message = message + " on " + dateString;
                                }

                                message = message.replace("my", genderPos);

                                api.sendMessage(message, threadID);
                                api.sendMessage("Can you make it?", threadID);
                            });
                        }
                    } else {
                        console.log('No contacts found.');
                    }

                    console.log('returning: ' + HEADER + display + FOOTER);

                    //create Timeout of 2 seconds where the API sends a typing indicator
                    //before it prints the message
                    setTimeout(function() {
                        api.sendTypingIndicator(event.threadID, function(err) {
                            if (err)
                                console.error("Typing indicator error");
                            sendMessage(api, HEADER + display + FOOTER, event.threadID);

                        });
                    }, 0);

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

function sendMessage(api, message, threadID){
    api.sendTypingIndicator(threadID, function(err) {
        if (err)
            console.error("removing typing indicator error");
         api.sendMessage(message, threadID);
    })
}

function displayEvents() {
    return "Your group's events go here";
}
