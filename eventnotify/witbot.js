'use strict';

// Weather Example
// See https://wit.ai/sungkim/weather/stories and https://wit.ai/docs/quickstart
const Wit = require('node-wit').Wit;
const Config = require('../const.js');

var token = 'V3CQ6KG2MP63RCR4SOEVF67IUTVZ3QUP';

const firstEntityValue = (entities, entity) => {
    const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value;
    if (!val) {
        return null;
    }
    return typeof val === 'object' ? val.value : val;
};

// Bot actions
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

    /*
    createEvent(request) {
        return new Promise(function(resolve, reject) {
            console.log('In createEvent');
            return resolve(context);
        });
    },
    say(sessionId, context, message, cb) {
        console.log(message);

        // Bot testing mode, run cb() and return
        if (require.main === module) {
            cb();
            return;
        }
    },
    merge(sessionId, context, entities, message, cb) {
        // Retrieve the location entity and store it into a context field
        const loc = firstEntityValue(entities, 'location');
        if (loc) {
            context.loc = loc; // store it in context
        }

        cb(context);
    },

    error(sessionId, context, error) {
        console.log(error.message);
    },
    send(request, response) {

    }*/
};


const getWit = () => {
    return new Wit({token, actions});
};

exports.getWit = getWit;

// bot testing mode
// http://stackoverflow.com/questions/6398196
if (require.main === module) {
    console.log("Bot testing mode.");
    const client = getWit();
    client.interactive();
}
