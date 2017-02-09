//
// This defines three routes that our API is going to use.
// TEST 22


var routes = function (app, db) {

    app.get("/", function (request, response) {
        response.sendFile(__dirname + '/views/index.html');
    });

    app.get("/users", function (request, response) {
        var dbUsers = [];
        db.find({}, function (err, users) { // Find all users in the collection
            users.forEach(function (user) {
                dbUsers.push([user.firstName, user.lastName]); // adds their info to the dbUsers value
            });
            response.send(dbUsers); // sends dbUsers back to the page
        });
    });


    app.get("/deleteTheFuckingDatabase", function (req, res) {
        db.remove({}, {multi: true}, function (err, numRemoved) {
            res.send("OMG! What have YOU done !!! Removed: " + numRemoved);
            console.log("Everything is lost ! Removed: " + numRemoved);
        });
    });

    app.post("/reset", function (req, res) {
        console.log("reset Received Post: " + JSON.stringify(req.body));
        if (!req.body.fb_id) {
            console.log("Received incomplete POST: " + JSON.stringify(req.body));
            return res.send({"status": "error", "message": "missing parameter(s)"});
        }


        db.remove({user_id: req.body.fb_id}, {multi: true}, function (err, numRemoved) {
            console.log("Removing visits: " + numRemoved);
        });

        db.remove({_id: req.body.fb_id}, {multi: false}, function (err) {
            let message = {
                "messages": [
                    {"text": "Good bye!"},
                ]
            };

            console.log("User removed:" + req.body.fb_id);
            return res.json(message);
        });


    });


    app.get("/showStats", function (req, res) {
        //https://hartmanback.gomix.me/showStats?fb_id=5849c9f1e4b05a2c162d9b9a
        console.log("showStats Received Get: " + JSON.stringify(req.query));
        if (!req.query.fb_id) {
            console.log("incomplete Get: " + JSON.stringify(req.query));
            return res.send({"status": "error", "message": "missing parameter(s)"});
        }

        var fb_id = req.query.fb_id;


        db.findOne({_id: fb_id}, function (err, user) {
            //console.log(err);

            var text = JSON.stringify(user, null, 4);

            db.find({user_id: fb_id, type: 'visit'}).sort({start: -1}).exec(
                function (err, visits) {
                    let userText = " USER: " + JSON.stringify(user, null, 4);
                    let visitText = " VISIT: " + JSON.stringify(visits, null, 4);
                    let answer = userText + visitText;

                    return res.send("<pre>" + answer + "</pre>");

                });

        });

    });


    app.post("/start", function (req, res) {
        //{"fb_id":"5893c694e4b082e100c072d4","fb_gender":"male","fb_first_name":"Micha","fb_last_name":"Volin","fb_locale":"de_DE","fb_timezone":"1"}
        console.log("start Received POST: " + JSON.stringify(req.body));

        if (!req.body.fb_id) {
            console.log("incomplete POST: " + JSON.stringify(req.body));
            return res.send({"status": "error", "message": "missing parameter(s)"});
        }


        var json = req.body;

        db.findOne({_id: json.fb_id}, function (err, user) {
            //console.log(err);
            if (user == null) {
                //new user
                user = newUser(json);
            }

            newVisit(user);
            return redirect(user);
        });


        function newUser(user) {
            user._id = user.fb_id;
            user.type = 'user',
                user.score = 0;
            user.programm = 0;
            user.muscle_top = 1;
            user.muscle_middle = 1;
            user.muscle_bottom = 1;

            user.visit_first = new Date();
            user.visit_last = new Date();

            //Davidovsy
            if (user.fb_id == "588a6503e4b012460e93828b" || user.fb_id == "5849c9f1e4b05a2c162d9b9a") {
                user.programm = 0;

                user.muscle_top = 1;
                user.muscle_middle = 1;
                user.muscle_bottom = 1;
            }


            console.log("Created user: " + JSON.stringify(user))

            db.insert(user);
            return user;
        }

        function newVisit(user) {
            let visit = {
                type: 'visit',
                user_id: user._id,
                programm: user.programm,
                start: new Date(),
                finish: new Date(),
                finished: false,
                canceled: false,
                exercises: []
            }

            //set all other visits to finished but canceled
            db.update({type: 'visit', user_id: user._id, finished: false}, {
                $set: {
                    finished: true,
                    canceled: true
                }
            }, {multi: true}, function (err, numReplaced) {

            });


            db.insert(visit);
        }


        function redirect(user) {

            console.log("redirecting " + user.fb_first_name + " to " + user.programm);


            let answer = {
                "set_attributes": {
                    "timing": "in_time",
                    "programm": user.programm
                }
            };

            return res.json(answer);
        }


    });


    app.post("/getReps", function (req, res) {
        console.log("getReps Received POST: " + JSON.stringify(req.body));
        if (!req.body.fb_id) {
            console.log("incomplete POST: " + JSON.stringify(req.body));
            return res.send({"status": "error", "message": "missing parameter(s)"});
        }

        var json = req.body;

        db.findOne({_id: json.fb_id}, function (err, user) {
            //console.log(err);
            updateLastVisit(user._id);

            return calculateReps(user, json);
        });

        function updateLastVisit(fb_id) {
            db.findOne({user_id: fb_id, type: 'visit', finished: false}, function (err, visit) {
                //console.log(err);
                visit.finish = new Date();
                db.update({_id: visit._id}, visit);
                // log(visit, 'visit');

            });
        }


        function calculateReps(user, json) {

            let group_strength = 1;
            switch (json.exercise_group) {
                case "top":
                    group_strength = user.muscle_top;
                    break;
                case "middle":
                    group_strength = user.muscle_middle;
                    break;
                case "bottom":
                    group_strength = user.muscle_bottom;
                    break;
                default:
                //bottom
            }

            let repsTodo = Math.round(group_strength * json.exercise_norm);

            let answer = {
                "set_attributes": {
                    "repsTodo": repsTodo,
                }
            };

            return res.json(answer);
        }
    });


    app.post("/input", function (req, res) {
        //{"fb_id":"5849c9f1e4b05a2c162d9b9a","exercise":"1","exercise_group":"top","exercise_norm":"10","repsTodo":"10","repsDone":"6"}
        console.log("input Received POST: " + JSON.stringify(req.body));
        if (!req.body.fb_id) {
            console.log("incomplete POST: " + JSON.stringify(req.body));
            return res.send({"status": "error", "message": "missing parameter(s)"});
        }

        var json = req.body;

        db.findOne({_id: json.fb_id}, function (err, user) {
            //console.log(err);

            return react(user, json);
        });

        //returns FALSE, if it is too late
        function logExercise(user, json) {
            //find unfinished visit
            let inTime = 'x';
            db.findOne({user_id: json.fb_id, type: 'visit', finished: false}, inTime = function (err, visit) {
                //console.log(err);
                let expireDate = new Date(visit.finish);
                expireDate.setSeconds(expireDate.getSeconds() + 15);

                if ((new Date()) > expireDate) {
                    //hoursExpiredInput
                    //Too Late!
                    //console.log("Too Late!");
                    inTime = false;
                    return false;
                }
                visit.exercises.push({
                    exercise: json.exercise,
                    exercise_group: json.exercise_group,
                    repsTodo: json.repsTodo,
                    repsDone: json.repsDone
                });
                //console.log("in Time!");

                //log(visit, "Exercise log");

                db.update({_id: visit._id}, visit);
                // log(visit, 'visit');
                inTime = true;
                return true;

            });


            return inTime;
        }

        function react(user, json) {

            if ((json.repsDone < 0) || (json.repsDone > 10 * json.repsTodo)) {
                return sendReaction("ugly");
            }

            let inTime = logExercise(user, json);
            if (!inTime) {
                console.log("Too Late!");
                return sendReaction('too_late');
            }
            console.log("In time!");

            let repsTodo = parseInt(json.repsTodo);
            let repsDone = parseInt(json.repsDone);

            let multiplier = 1;
            if (user.programm == 0) {
                console.log()
                //division by 0
                if (repsTodo > 0) {
                    multiplier = repsDone / repsTodo;
                }
            } else {
                if (repsDone > repsTodo) {
                    multiplier = 1.1;
                } else if (repsDone < repsTodo) {
                    multiplier = 0.9;
                } else {
                    multiplier = 1;
                }


            }


            let group_strength = 1;
            switch (json.exercise_group) {
                case "top":
                    user.muscle_top *= multiplier;
                    break;
                case "middle":
                    user.muscle_middle *= multiplier;
                    break;
                case "bottom":
                    user.muscle_bottom *= multiplier;
                    break;
                default:
                //bottom
            }


            let score = parseInt(json.score_per_exercise);
            if (multiplier > 1) {
                score = Math.round(score * 1.3);
            } else if (multiplier < 1) {
                score = Math.round(score * 0.8);
            }
            user.score = parseInt(user.score) + parseInt(score);

            db.update({_id: json.fb_id}, user);

            let reaction = multiplier < 1 ? "bad" : "good";

            return sendReaction(reaction);
        }

        function sendReaction(reaction) {
            let answer = {
                "set_attributes": {
                    "reaction": reaction,
                }
            };

            return res.json(answer);
        }
    });

    app.post("/finish", function (req, res) {
        //{"fb_id":"5849c9f1e4b05a2c162d9b9a","exercise":"1","exercise_group":"top","exercise_norm":"10","repsTodo":"10","repsDone":"6"}
        console.log("finish Received POST: " + JSON.stringify(req.body));
        if (!req.body.fb_id) {
            console.log("incomplete POST: " + JSON.stringify(req.body));
            return res.send({"status": "error", "message": "missing parameter(s)"});
        }

        var json = req.body;

        db.findOne({_id: json.fb_id}, function (err, user) {
            //console.log(err);

            return finish(user, json);
        });

        function finish(user, json) {

            let day_summary = "normal";
            if (user.score >= json.score_finish) {
                user.programm += 1;
                day_summary = "levelup";
                // If levelup set score to 0
                user.score = 0;
            }
            db.update({_id: json.fb_id}, user);

            //Finish current visit
            db.update({
                type: 'visit',
                user_id: user._id,
                finished: false
            }, {$set: {finished: true}}, {multi: false}, function (err, numReplaced) {

            });


            return sendDaySummary(day_summary);
        }

        function sendDaySummary(day_summary) {
            let answer = {
                "set_attributes": {
                    "day_summary": day_summary,
                }
            };

            return res.json(answer);
        }
    });


};


function log(user, hint = "") {
    console.log(hint + ": " + JSON.stringify(user));
}

let hoursExpiredInput = 2;
let hoursExpiredVisit = 20;

module.exports = routes;