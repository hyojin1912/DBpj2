var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

// for rendering
app.set('/views', './views');
app.set('view engine', 'pug');

var mysql = require('mysql'); // ����

// database connection
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'hyojin',
    password: 'Bluesky@007',
    port: 3306,
    database: 'pj2_db'
});

connection.connect(); // MySQL�� �����ϱ�

var router = require('./router/main.js')(app);


app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
