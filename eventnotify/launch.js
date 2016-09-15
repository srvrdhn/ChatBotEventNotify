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
const HEADER =      '~~~~~~~~ EventNotify ~~~~~~~\n';
const NEW_EVENT =   '        NEW EVENT CREATED!';
const CUR_EVENTS =  '          CURRENT EVENTS';
const FOOTER =      '~~~~~~~~~~~~~~~~~~~~~~~~~';


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



            // Get message body
            var text = event.body;

            var display = '';

            /**************************************************************
            * -------------------- PARSE USER INPUT -------------------- *
            **************************************************************/

            if (!text) break;

            var ind = text.indexOf("color");

            if(ind != -1) {

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

                api.changeThreadEmoji(change, event.threadID, function callback(err) {
                    if(err) return console.error(err);
                });
            }

            // Display current events UI upon "EventNotify" or "EN"
            if (text.toLowerCase() === "eventnotify" || text === "EN") {
                var retval = HEADER + displayEvents() + "\n" + FOOTER;
                api.sendMessage(retval, event.threadID);
                break;
            }

            if (text.toLowerCase() === "eventnotify help") {
                api.sendMessage(HEADER + displayHelp() + "\n" + FOOTER,
                event.threadID);
                break;
            }

            // Run wit.ai upon "EventNotify ..."
            if (text) {
                var invoked = (text.startsWith("EventNotify ") || text.startsWith("EN "));
            }
            if(invoked) {
                var toSend;
                // Handle both long and short invocations
                if (text.startsWith("EventNotify")) {
                    toSend = text.substring(12);
                } else {
                    toSend = text.substring(3);
                }
                client.message(toSend, sessions[sessionId].context)
                .then((data) => {
                    // console.log(JSON.stringify(data, null, 4));

                    // Get entities, which include events, times, etc.
                    var res = data.entities;

                    var contacts = [];  // Holds all found participants
                    var contactString = ''; // Formatted string of contacts
                    var printContactString = true;  // Whether or not to print contact string
                    var addAllMembers = false;

                    var date;           // Datetime for the event
                    var dateString;     // Formatted date

                    var eventName;      // Event name
                    var location;       // Event location

                    // Retrieve event name
                    if (res.hasOwnProperty('event')) {

                        display += NEW_EVENT + "\n";

                        console.log('Event extracted: ' + res.event[0].value);
                        display += 'What: ' + res.event[0].value + "\n";
                        eventName = res.event[0].value;
                    } else {
                        console.log('No events found.');
                    }

                    // Retrieve location
                    if (res.hasOwnProperty('location')) {
                        console.log('Location extracted: ' + res.location[0].value);
                        display += 'Where: ' + res.location[0].value + "\n";
                        location = res.location.value;
                    } else {
                        console.log('No locations found.');
                    }

                    // Retrieve local_search_query
                    if (res.hasOwnProperty('local_search_query')) {
                        console.log('Local search query extracted: ' + res.local_search_query[0].value);
                        display += 'Where: ' + res.local_search_query[0].value + "\n";
                        location = res.local_search_query[0].value;
                    }

                    // Retrieve datetime
                    if (res.hasOwnProperty('datetime')) {
                        var ds = res.datetime[0].value.substring(0, 19).split(/T|:|-/)
                        console.log(ds);

                        var date = new Date(ds[0], --ds[1], ds[2], ds[3], ds[4], ds[5]);
                        console.log('Parsed date object: ' + date);
                        dateString = formatDateTime(date);
                        display += "When: " + dateString + "\n";
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

                                    //add contact to contacts array
                                    contacts.push(splitContacts[k]);
                                }
                            }
                        }

                        // Print out contacts
                        for (var i = 0; i < contacts.length; i++) {
                            var c = contacts[i];
                            console.log('Contact(s) extracted: ' + c);

                            // If "all" detected, skip to addAllMembers
                            if (c.substring(1).toLowerCase() === 'all') {
                                addAllMembers = true;
                                break;
                            }

                            if (i == contacts.length - 2) {
                                if (contacts.length == 2) {
                                    contactString += c.substring(1) + ' and ';
                                } else {
                                    contactString += c.substring(1) + ', and ';
                                }
                            }
                            else if (i < contacts.length - 2) {
                                contactString += c.substring(1) + ', ';
                            } else {
                                contactString += c.substring(1) + '.';
                            }
                        }
                    } else {
                        console.log('No contacts found.');
                        if (event.isGroup) {
                            addAllMembers = true;
                        } else {
                            printContactString = false;
                        }
                    }

                    //create the message to be shown to invitees. 
                    var message = senderName + " invited you to " + eventName;
                    if(location)    
                        message = message + " at " + location;
                    if(date) 
                        message = message + " on " + dateString;
                    message = message.replace("my", genderPos);

                    // if all group members are to be included, search through group members
                    //and then PM them. If not, PM the current extracted contacts. 
                    if (addAllMembers) {
                        console.log("adding all members first");
                        contacts = [];  // Clear contacts array
                        api.getThreadInfo(event.threadID, function(err, info) {
                            if (err) return console.error(err);

                            var members = info.participantIDs;
                            contacts = contacts.concat(members);
                            console.log(members);

                            //send PMS
                            sendMessages(contacts, api, message);
                        });
                        contactString = 'Everybody in this chat.';
                    } else {
                        //send PMS
                        sendMessages(contacts, api, message);
                    }


                    if (printContactString) display += "Who: " + contactString + "\n";

                    console.log(HEADER + display + FOOTER);

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

function sendMessages(contacts, api, message){
    console.log("sending message");
    for (var i = 0; i < contacts.length; i++) {
        var c = contacts[i];
        if (isNaN(c)){//c is a name
            console.log("sending message based on NAME");
            console.log(c);
            if (c.charAt(0) === '@') c = c.substring(1);

            api.getUserID(c, function(err, data) {
                if(err) return callback(err);

                console.log("Sending PM to: " + c);

                // Send the message to the best match (best by Facebook's criteria)
                var threadID = data[0].userID;
                

                sendMessage(api, message, threadID, function (){
                   sendMessage(api, "Can you make it?", threadID);
                });
            });
        } else { //c is a user id
            console.log("sending message based on USERID");
            console.log(c);
            sendMessage(api, message, c);
            sendMessage(api, "Can you make it?", c);
        }
    }
}



function formatDateTime(date) {
    // Format month
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var daysOfTheWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var dateString = daysOfTheWeek[date.getDay() - 1] + ", " + monthNames[date.getMonth()] + " " + date.getDate();

    // Format hours
    var hour = date.getHours();
    var timePostfix = "AM";
    var suppressTime = false;
    if (hour > 12) {
        hour -= 12;
        timePostfix = "PM";
    } else if (hour == 0) {
        hour = 12;
    }

    // Format minutes
    var minString = "" + date.getMinutes();
    if (minString.length == 1) minString = "0" + minString;

    // Suppress time output if at midnight
    if (date.getMinutes() == 0 && hour == 12) {
        suppressTime = true;
    }

    if (!suppressTime) dateString += " at " + hour + ":" + minString + " " + timePostfix;
    return dateString;
}

function sendMessage(api, message, threadID, whendone){
    api.sendTypingIndicator(threadID, function(err) {
        if (err)
        console.error("removing typing indicator error");
        api.sendMessage(message, threadID, function() {
            if (whendone)
                whendone();
        });
    })
}

function displayEvents() {
    var msg = CUR_EVENTS + "\n" + "No events." + "\nTry \"EventNotify help\" for more info.";
    return msg;
}

function displayHelp() {
    var msg = "Welcome to EventNotify!\nThis is a bot that helps you and your"
    + "\ngroup chat create quick, imprompu events.\n\n"
    + "To create an event, just start your sentence with 'EventNotify' and talk naturally."
    + "\nTo invite specific people rather than the whole group chat, "
    + "tag them with their first name using the @ symbol."
    + "\nHere are some examples:\n\n"
    + '"EventNotify basketball next Friday at 9 pm"\n'
    + '"EventNotify invite @John and @Jane to brunch at my place tomorrow morning"\n'
    + "\nTry it out!";
    return msg;

}
