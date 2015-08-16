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
        var channel = "channel:" + sentObject.groupID;

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
            CHANNEL_LIST[channel].forEach(function each(clientID) {
                if(userDeviceID == clientID)
                {
                    console.log("Found identical id");
                    isUserNew = false;
                }

                try {
                    CLIENT_LIST[clientID].send("SHAKE: # users: " + CHANNEL_LIST[channel].length + ", " + redisCli.get(channel));

                    console.log("Shook user: " + clientID);
                }
                catch (err) {
                    /**
                     * If session errors, clear it
                     */
                    console.log("Removing user: " + clientID);
                    delete CLIENT_LIST[clientID];

                    delete CHANNEL_LIST[channel][clientID];
                }
            });

        }

        redisCli.incr(channel);

        if(isUserNew)
        {
            console.log("Adding new user: " + userDeviceID);
            CHANNEL_LIST[channel].push(userDeviceID);
            CLIENT_LIST[userDeviceID].send("SHAKE: # users: " + CHANNEL_LIST[channel].length + ", " + redisCli.get(channel));
        }

        console.log("CHANNEL_LIST: " + JSON.stringify(CHANNEL_LIST[channel]));
    });
});