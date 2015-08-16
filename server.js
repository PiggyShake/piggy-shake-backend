var WebSocketServer = require('ws').Server
    , http = require('http')
    , server = http.createServer(app, function() {})
    , wss = new WebSocketServer({server: server})
    , express = require('express')
    , app = express()
    , redis = require('redis')
    , redisCli = redis.createClient();

/**
 * key: channel name
 * value: array of client keys
 * @type {Array}
 */
var CHANNEL_LIST = [];

/**
 * key: device id
 * value: user session
 * @type {Array}
 */
var CLIENT_LIST = [];


redisCli.on('connect', function() {
    console.log('connected to redis');
});

app.use(express.static(__dirname + '/public'));

server.listen(8080);

wss.on('connection', function(ws, req) {
    console.log('started client interval');

    /**
     * On user session closed
     */
    ws.on('close', function close() {
        console.log('stopping client interval');
    });

    /**
     * On user session error
     */
    ws.on('error', function () {
        console.log('ERROR');
    });

    /**
     * On user message sent
     */
    ws.on('message', function incoming(message) {
        console.log("On message: " + message);
        var sentObject = JSON.parse(message);
        var isShake = sentObject.shake == "true";
        var username = sentObject.username;
        console.log("Username: " + username);
        var channel = "channel:" + sentObject.groupID;
        channel = channel.toLowerCase().substr(0, 20);

        var user = "user:" + sentObject.devID;
        var isUserNew = false;

        var userDeviceID = sentObject.devID;

        /**
         * Add user ref
         */
        if(CLIENT_LIST[userDeviceID] == null)
        {
            /**
             * Init User Score in redis
             */
            if(redisCli.get(user) == null)
            {
                redisCli.set(user, 0);
            }

            isUserNew = true;
        }

        CLIENT_LIST[userDeviceID] = ws;
        redisCli.incr(user);

        /**
         * Add channel ref
         */
        if(CHANNEL_LIST[channel] == null)
        {
            /**
             * Init Channel Score in redis
             */
            if(redisCli.get(channel) == null)
            {
                redisCli.set(channel, 0);
            }

            isUserNew = true;

            CHANNEL_LIST[channel] = [];

        } else {
            if(isShake)
            {
                /**
                 * Shake all channel users
                 */
                CHANNEL_LIST[channel].forEach(function each(clientID) {
                    if(userDeviceID == clientID)
                    {
                        console.log("Found identical id : " + userDeviceID + ", " + clientID);
                        isUserNew = false;
                    }

                    /**
                     * Attempt sending message to user
                     */
                    try {
                        var message =
                        {
                            name : username
                        }
                        CLIENT_LIST[clientID].send(JSON.stringify(message));

                        console.log(message.name + " is shaking user: " + clientID);
                    }
                    catch (err) {
                        /**
                         * If session errors, clean the session
                         */

                        console.log("Removing user: " + clientID);
                        delete CLIENT_LIST[clientID];

                        var index = CHANNEL_LIST[channel].indexOf(clientID);
                        delete CHANNEL_LIST[channel][index];
                        CHANNEL_LIST[channel].clean(undefined);
                    }
                });
            }
        }

        redisCli.incr(channel);

        if(isUserNew)
        {
            console.log("isUserNew");
            console.log("CHANNEL_LIST size - " + CHANNEL_LIST.length);
            /**
             * Check if user was in a different channel
             */
            console.log("CHANNEL_LIST: " + JSON.stringify(CHANNEL_LIST));
            var size = 0, key;
            for (key in CHANNEL_LIST) {
                if (CHANNEL_LIST.hasOwnProperty(key))
                    size++;
            }

            console.log("Channel List size: " + size);

            /**
             * Add user to this channel
             * */
            console.log("Adding new user: " + userDeviceID);
            CHANNEL_LIST[channel].push(userDeviceID);

            if(isShake)
            {
                CLIENT_LIST[userDeviceID].send("SHAKE: # users: " + CHANNEL_LIST[channel].length + ", " + redisCli.get(channel));
            }
        }

        console.log("CHANNEL_LIST: " + channel + " - " + JSON.stringify(CHANNEL_LIST[channel]));
    });
});

Array.prototype.clean = function(deleteValue) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] == deleteValue) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
};
