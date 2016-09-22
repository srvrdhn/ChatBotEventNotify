# EventNotify

## Synopsis

This is a Facebook Messenger chatbot intended for group chats that supports creating small, impromptu events. Once an event is created with EventNotify, the participants will receive reminders through Messenger private messages. The bot supports Natural Language Processing through Wit.ai, so you can talk to it in plain English. See usage examples below!

## Usage

To use this bot with your Messenger group, you must add the bot’s Facebook profile as a friend: <https://www.facebook.com/eventnotify>
Then simply add the bot to your group chat. To ensure your friends get event notifications properly, they should add the bot as a friend as well.


To invoke the bot, use the prefix “EventNotify” followed by your event and participants. If no participants are specified, all members of the group chat will be auto-added.
Examples:
```
“EventNotify Invite @aakash @sai to hackathon Sunday 7pm at my place”
“EventNotify Basketball in Warren at 8 pm”
```

Just say ```EventNotify``` to the bot to see your current group events and ```EventNotify help``` for further assistance.

## Installation for Development

To configure EventNotify for development, clone this repository and install the required npm packages with ```npm install```.

You then need to create a ```credentials.json``` file in the ```eventnotify``` folder. See the ```eventnotify/sample-credentials.json``` file for a template. This file includes the login for your target Facebook account and the Wit.ai server token you can get from your Wit account.

You need PostgreSQL installed locally to run the database in your development environment. If you are on UNIX, you can run the ```mac-install.sh``` shell script to install and configure PostgreSQL. You must now change the name in ```postgres/pgquery.js``` to your name in your Postgres settings.

Now code away (start at ```eventnotify/launch.js```), pull requests are welcomed! If you have any questions or comments you can contact chatboteventnotify@gmail.com.

## Built With

 * Node.js
 * Postgres
 * [Facebook Chat API by Schmavery](https://github.com/Schmavery/facebook-chat-api)
 * Wit.ai

## Contributors
Made at UCSD with ❤️

Contributors alphabetically:

 * Sai Annam
 * Tejas Badadare
 * Pramukh Govindaraju
 * Aakash Kesavarapu
 * Archit Mishra
 * Chirag Toprani
