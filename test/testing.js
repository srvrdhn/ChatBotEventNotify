var login = require('../index.js');
var fs = require('fs');
var assert = require('assert');


login({email: "USERNAME", password: "PASS"}, function callback (err, api) {
    if(err) return console.error(err);

    api.setOptions({listenEvents: true});

    var stopListening = api.listen(function(err, event) {
        if(err) return console.error(err);

        switch(event.type) {
          case "message":
            if(event.body === '/stop') {
              api.sendMessage("Goodbye...", event.threadID);
              return stopListening();
            }
            api.markAsRead(event.threadID, function(err) {
              if(err) console.log(err);
            });

            console.log(event.body);
            var n = event.body.search("harambe");
            if(n != -1) {
              api.sendMessage("#DicksOut", event.threadID);
            }
            var n = event.body.search("suh");
            if(n != -1) {
              api.sendMessage("Suh dude", event.threadID);

              api.getUserID("USER NAME", function(err, data) {
                console.log(data);
                if(err) return callback(err);

                // Send the message to the best match (best by Facebook's criteria)
                var threadID = data[0].userID;
                api.sendMessage("if you're reading this its too late", threadID);
              });
            }
            break;
          case "event":
            console.log(event);
            break;
        }
    });
});
