// server.js Test
// where your node app starts

// init project
var express = require('express');
// setup a new database

var app = express();
app.set('json spaces', 4);
var bodyParser = require("body-parser");
app.use(express.static('public'));


var Datastore = require('nedb'), 
    // Security note: the database is saved to the file `datafile` on the local filesystem. It's deliberately placed in the `.data` directory
    // which doesn't get copied if someone remixes the project.
db = new Datastore({ filename: '.data/datafile', autoload: true, timestampData: true });




app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var routes = require("./routes.js")(app, db);


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});


 
