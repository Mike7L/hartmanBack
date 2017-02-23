//
// This defines three routes that our API is going to use.
// TEST 22


var routes = function (app, db) {


    var moment = require('moment');
    moment.locale('de');

    app.get("/", function (request, response) {
        response.sendFile(__dirname + '/views/index.html');
    });


    app.get("/randomPhrase", function (request, response) {
        //https://hartmanback.gomix.me/randomPhrase?event=default
        let messagePool = app.texte[request.query.event];

        let message = messagePool[Math.floor(Math.random() * messagePool.length)];

        let answer = {
            "messages": [
                {"text": message},
            ]
        };

        return sendJsonBack(response, answer);
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

    app.get("/showDatabase", function (req, res) {
        let fs = require('fs');
        fs.readFile('.data/datafile', 'utf8', (err, data) => {
            return res.send(data);
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
            //TODO: Do all res.json from one funtion
            return sendJsonBack(res, message);
        });


    });


    app.get("/setdev", function (req, res) {
        console.log("setdev Received Post: " + JSON.stringify(req.query));
        if (!req.query.fb_id) {
            console.log("Received incomplete POST: " + JSON.stringify(req.query));
            return res.send({"status": "error", "message": "missing parameter(s)"});
        }

        var is_dev = req.query.is_dev === "true";

        db.update({_id: req.query.fb_id}, {$set: {"is_dev": is_dev}}, function (err) {
            let message = {
                "messages": [
                    {"text": is_dev ? "You are GOD now!" : "You are NOTHING now!"},
                ]
            };

            console.log((is_dev ? "You are GOD now!" : "You are NOTHING now!") + req.query.fb_id);
            return sendJsonBack(res, message);
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

            cancelUnfinishedVisits(user, isTheVisitOnTime);
        });


        function newUser(user) {
            user._id = user.fb_id;
            user.type = 'user';

            user.is_dev = (user.fb_id == "5893cd55e4b082e100db6986" || user.fb_id == "5893c694e4b082e100c072d4");


            user.score = 0;
            user.achievements = [];

            user.programm = 0;
            user.muscle_top = 1;
            user.muscle_middle = 1;
            user.muscle_bottom = 1;

            user.visit_first = new Date();
            user.visit_last = new Date();

            console.log("Created user: " + JSON.stringify(user));

            db.insert(user);
            return user;
        }

        function newVisit(user, tooLate = false) {
            let visit = {
                type: 'visit',
                user_id: user._id,
                programm: user.programm,
                start: new Date(),
                finish: new Date(),
                finished: false,
                canceled: false,
                punished: tooLate,
                exercises: []
            };

            db.insert(visit);
        }


        function cancelUnfinishedVisits(user, callback) {

            //TODO: if user accidentally starts the visit over again... try to find the current visit?

            //set all unfinished visits to finished but canceled
            db.update({type: 'visit', user_id: user._id, finished: false}, {
                $set: {
                    finished: true,
                    canceled: true
                }
            }, {multi: true}, (err, numReplaced) => {
                callback(user);
            });
        }

        function dateAdd24(oldDate) {
            let newDate = new Date(oldDate);
            newDate.setHours(newDate.getHours() + 24);
            return (new Date(newDate));
        }


        function isTheVisitOnTime(user, callback) {
            //Find the last visit, that not cancelled is
            db.findOne({user_id: user.fb_id, type: 'visit', canceled: false})
                .sort({finish: -1}).exec(function (err, lastVisit) {
                //console.log("His last visit was: " + JSON.stringify(docs));

                let tooEarly = false;
                let tooLate = false;

                if (lastVisit !== null) {
                    let currentDate = new Date();
                    //Test Current Date
                    //currentDate.setHours(currentDate.getHours() + 56);

                    let lastVisitDate = new Date((new Date(lastVisit.finish)).setHours(0, 0, 0, 0));
                    let lastVisitMidnight = dateAdd24(lastVisitDate);
                    let dayAfterLastVisitMidnight = dateAdd24(dateAdd24(lastVisitDate));
                    //---(lastVisit)--(tooEarly)--(lastVisitMidnight)|-------(inTime)-----(dayAfterLastVisitMidnight)|(tooLate)----....
                    tooEarly = (currentDate < lastVisitMidnight);
                    tooLate = (currentDate > dayAfterLastVisitMidnight);

                    //log
                    //console.log(currentDate.toUTCString(),(new Date(lastVisit.finish)).toUTCString(), lastVisitMidnight.toUTCString(), dayAfterLastVisitMidnight.toUTCString(), tooEarly, tooLate);
                }

                // it's never too Early for us
                tooEarly = user.is_dev ? false : tooEarly;

                if (!tooEarly) {
                    newVisit(user, tooLate);
                }

                return redirect(user, tooEarly, tooLate);
                //redirect(user);
            });
        }


        function redirect(user, too_early = false, tooLate = false) {

            console.log("redirecting " + user.fb_first_name + " to " + user.programm);

            let answer = {
                "set_attributes": {
                    "too_early": too_early ? "true" : "false",
                    "programm": too_early ? "null" : user.programm.toString(),
                    "punishment": tooLate ? "true" : "false",
                }
            };

            return sendJsonBack(res, answer);
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

            return sendJsonBack(res, answer);
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

            logExercise(user, json);
        });

        //returns FALSE, if it is too late
        function logExercise(user, json) {
            //find unfinished visit
            //TODO: visit null ?
            let inTime = 'x';
            db.findOne({user_id: json.fb_id, type: 'visit', finished: false}, inTime = function (err, visit) {
                //console.log(err);

                if (isDateExpired(visit.finish, secondsExpiredInput)) {
                    //Visit is EXPIRED !!! Cancel it! Finish it!
                    db.update({_id: visit._id},
                        {$set: {canceled: true, finished: true}},
                        {multi: false},
                        function (err, numReplaced) {
                            console.log("Too Late!");
                            return sendReaction('too_late');
                        });
                    return;
                }

                console.log("in Time! ");
                visit.exercises.push({
                    exercise: json.exercise,
                    exercise_group: json.exercise_group,
                    repsTodo: parseInt(json.repsTodo),
                    repsDone: normalizeRepsDone(json),
                    repsDoneOriginal: json.repsDone,
                    completeTime: (new Date())
                });


                db.update({_id: visit._id}, visit);
                // log(visit, 'visit');

                react(user, json);

            });


            return inTime;
        }

        function normalizeRepsDone(json) {
            let original = json.repsDone;
            let repsTodo = parseInt(json.repsTodo);
            let numbers = original.match(/\d+/);

            if (numbers !== null) {
                let number = parseInt(numbers[0]);
                if (number > 0) {
                    return number;
                }
            }

            if (original.includes('...')) {
                return Math.min(Math.round(repsTodo * 0.9), repsTodo - 1);

            } else if (original.includes('.')) {
                return repsTodo;

            } else if (original.includes('!')) {
                return Math.max(Math.round(repsTodo * 1.1), repsTodo + 1);
            } else {
                return -1;
            }

        }


        function react(user, json) {

            let repsTodo = parseInt(json.repsTodo);
            let repsDone = normalizeRepsDone(json);

            if ((repsDone < (repsTodo * 0.1)) || (repsDone > 10 * repsTodo)) {
                return sendReaction("ugly");
            }


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
                    console.log("unknown muscle group!");
            }


            let score = parseInt(json.score_per_exercise);
            if (multiplier > 1) {
                score = Math.round(score * 1.3);
            } else if (multiplier < 1) {
                score = Math.round(score * 0.8);
            }
            user.score = parseInt(user.score) + parseInt(score);

            db.update({_id: json.fb_id}, user);

            let reaction = multiplier === 1 ? "fine"
                : multiplier < 1 ? "bad"
                    : "good";

            return sendReaction(reaction);
        }


        function sendReaction(reaction) {

            let answer = {
                "set_attributes": {
                    "reaction": reaction,
                },
            };

            let messagePool = app.texte.reactions[reaction];

            if (messagePool !== undefined) {
                let message = messagePool[Math.floor(Math.random() * messagePool.length)];
                answer["messages"] = [
                    {"text": message},
                ];
            }


            return sendJsonBack(res, answer);
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

            giveAchievements(user, day_summary, sendDaySummary);

        }

        function sendDaySummary(day_summary) {
            let answer = {
                "set_attributes": {
                    "day_summary": day_summary,
                }
            };

            return sendJsonBack(res, answer);
        }
    });


    function sendJsonBack(res, json) {
        console.log("sendJsonBack" + JSON.stringify(json));
        return res.json(json);
    }

    function findStreak(streakLengthWanted, user, visits) {
        var streakLength = 0;
        for (let i = 1; i < visits.length; i++) {
            let lastMoment = moment(visits[i - 1].start);
            let currentMoment = moment(visits[i].start);
            log([lastMoment, currentMoment, Math.abs(currentMoment.diff(lastMoment, 'days'))], 'findStreak');
            if (Math.abs(currentMoment.diff(lastMoment, 'days')) === 0) {
                streakLength += 1;
            } else {
                streakLength = 0;
            }
            log(streakLength, "streakLength");

            if (streakLength === streakLengthWanted) {
                return true;
            }
        }
        return false;
    }

    function testAchievement(user, visits, achievementName, testFunction) {
        //check if user have this achievement already
        let already = user.achievements.find((achievement) => {
            return achievement.name === achievementName;
        });

        return !already && testFunction(user, visits);
    }


    function giveAchievements(user, day_summary, callback) {
        //get all, not cancelled visits
        db.find({user_id: user.fb_id, type: 'visit', canceled: false}).sort({start: -1}).exec(
            function (err, visits) {
                let earnedAchievements = [];
                let achievements = [
                    {name: "streak3", func: findStreak.bind(null, 3)},
                    {name: "streak7", func: findStreak.bind(null, 7)},
                    {name: "streak14", func: findStreak.bind(null, 14)},
                ];

                for (let i = 0; i < achievements.length; i++) {
                    let achievement = achievements[i];
                    earnedAchievements.push(
                        testAchievement(user, visits, achievement.name, achievement.func) ?
                            achievement.name : false
                    );
                }

                log(earnedAchievements, "earnedAchievements");

                return callback(day_summary, achievements);

            });


    }
};


function isDateExpired(date, secondsToExpire = (3600)) {


    let expireDate = new Date(date.getTime() + secondsToExpire * 1000);

    console.log(date, expireDate);
    return ((new Date()) > expireDate);
}

function log(object, hint = "") {
    console.log(hint + ": " + JSON.stringify(object, null, '\t'));
}


let secondsExpiredInput = 3600;


module.exports = routes;
