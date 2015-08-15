var WebSocketServer = require('ws').Server
    , http = require('http')
    , express = require('express')
    , app = express()
    , md5 = require('md5');


var CHANNELS = [];
var CLIENTS = [];

var redis = require('redis');
var r_client = redis.createClient();


r_client.on('connect', function() {
    console.log('connected to redis');
    //id = r_client.get("lastId");
});

app.use(express.static(__dirname + '/public'));

var server = http.createServer(app);
server.listen(8080);

var wss = new WebSocketServer({server: server});
wss.on('connection', function(ws) {

    ws.send("NEW USER JOINED");

    console.log('started client interval');
    ws.on('close', function() {
        console.log('stopping client interval');
        //clearInterval(id);
    });

    ws.on('message', function incoming(message) {
        console.log("Message: " + message);
        var sentObject = JSON.parse(message);
        var channel = "channel:" + sentObject.groupID;
        var user = "user:" + sentObject.devID;
        console.log("Users: " + CHANNELS[channel]);
        var isNew = false;

        var shaker = sentObject.devID;

        if(CLIENTS[shaker] == null)
        {
            if(r_client.get(user) == null)
            {
                r_client.set(user, 0);
            }
            console.log("Adding client");
            CLIENTS[shaker] = ws;
        }
        r_client.incr(user);
        console.log("clients: " + CLIENTS.length)

        if(CHANNELS[channel] == null)
        {
            if(r_client.get(channel) == null)
            {
                r_client.set(channel, 0);
            }

            console.log("Adding channel");

            isNew = true;

            CHANNELS[channel] = [];

        } else {
            console.log("size: " + CHANNELS.length)

            console.log("Channels: " + CHANNELS);
            CHANNELS[channel].forEach(function each(client) {
                console.log("client: " + client);
                console.log("shaker: " + shaker);
                if(shaker == client)
                {
                    isNew = false;
                }

                CLIENTS[client].send("SHAKE: # users: " + CHANNELS[channel].length + ", " + r_client.get(channel));
            });

        }

        r_client.incr(channel);

        if(isNew)
        {
            console.log("New user");
            CHANNELS[channel].push(shaker);
            CLIENTS[shaker].send("SHAKE: # users: " + CHANNELS[channel].length + ", " + r_client.get(channel));
        }
    });

});

function objectEquals(x, y) {
    'use strict';

    if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
    // after this just checking type of one would be enough
    if (x.constructor !== y.constructor) { return false; }
    // if they are functions, they should exactly refer to same one (because of closures)
    if (x instanceof Function) { return x === y; }
    // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
    if (x instanceof RegExp) { return x === y; }
    if (x === y || x.valueOf() === y.valueOf()) { return true; }
    if (Array.isArray(x) && x.length !== y.length) { return false; }

    // if they are dates, they must had equal valueOf
    if (x instanceof Date) { return false; }

    // if they are strictly equal, they both need to be object at least
    if (!(x instanceof Object)) { return false; }
    if (!(y instanceof Object)) { return false; }

    // recursive object equality check
    var p = Object.keys(x);
    return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
        p.every(function (i) { return objectEquals(x[i], y[i]); });
}