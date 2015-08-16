var express = require('express');
var app = express();
app.use(express.static('public'));
var path = require('path');

function getPath(filename)
{
    return path.join(__dirname, '/public', filename)
}

app.get('/', function (req, res) {
    res.sendFile(getPath('index.html'));
});


var server = app.listen(80, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});