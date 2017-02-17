// server.js Test
// where your node app starts

// init project
var express = require('express');
// setup a new database

var app = express();
app.set('json spaces', 4);
var bodyParser = require("body-parser");
//app.use(express.static('public'));


var Datastore = require('nedb'), 
    // Security note: the database is saved to the file `datafile` on the local filesystem. It's deliberately placed in the `.data` directory
    // which doesn't get copied if someone remixes the project.
db = new Datastore({ filename: '.data/datafile', autoload: true, timestampData: true });

var texte = require('node-yaml').read('texte.yml', (err,data) => {app.texte = data});


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.db = db;

var routes = require("./routesForDogs.js")(app, db);

let port = process.env.PORT || 3000;

// listen for requests :) TEST 6
var listener = app.listen(port, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});


 
