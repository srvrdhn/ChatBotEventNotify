'use strict';

const Wit = require('node-wit').Wit;

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
        return resolve();
      });
    },
    createEvent({sessionId, context, text, entities}) {
      console.log('Session ' + sessionId + ' recieved ' + text);
      console.log('The current context is ' + JSON.stringify(context, null, 4));
      console.log('Wit extracted ' + JSON.stringify(entities, null, 4));
      return Promise.resolve(context);
    }
};


const getWit = (token) => {
    return new Wit({accessToken: token, actions});
};

exports.getWit = getWit;

// bot testing mode
// http://stackoverflow.com/questions/6398196
if (require.main === module) {
    console.log("Bot testing mode.");
    const client = getWit();
    client.interactive();
}
