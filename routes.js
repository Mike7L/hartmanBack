//
// This defines three routes that our API is going to use.
//

var routes = function (app, db) {


    app.get("/", function (req, res) {
        res.send("Oh, hi! There's not much to see here - view the code instead<br><br><br><hr><p><a href=\"https://gomix.com/#!/remix/rest-api/546c8e41-ca39-481c-837f-ea830661c315\"><img src=\"https://gomix.com/images/background-light/remix-on-gomix.svg\"></a></p><p><a href=\"https://gomix.com/#!/project/rest-api\">View Code</a></p>");
        console.log("Received GET 1");

    });

    app.get("/deleteTheFuckingDatabase", function (req, res) {
        db.remove({}, {multi: true}, function (err, numRemoved) {
            res.send("OMG! What have YOU done !!! Removed: " + numRemoved);
            console.log("Everything is lost ! Removed: " + numRemoved);
        });
    });

    app.post("/reset", function (req, res) {
        if (!req.body.fb_id) {
            console.log("Received incomplete POST: " + JSON.stringify(req.body));
            return res.send({"status": "error", "message": "missing parameter(s)"});
        }
      
       db.remove({user_id: req.body.fb_id}, {multi: true}, function (err, numRemoved) {
            let message = {
                "messages": [
                    {"text": "Removing visits, " + numRemoved},
                ]
            };

            res.json(message);
            console.log("User removed: " + numRemoved);
        });

        db.remove({_id: req.body.fb_id}, {multi: false}, function (err) {
            let message = {
                "messages": [
                    {"text": "Good bye!"},
                ]
            };

            res.json(message);
            console.log("User removed");
        });
    });


    app.post("/showStats", function (req, res) {
        console.log("showStats Received POST: " + JSON.stringify(req.body));
        if (!req.body.fb_id) {
            console.log("incomplete POST: " + JSON.stringify(req.body));
            return res.send({"status": "error", "message": "missing parameter(s)"});
        }

        var json = req.body;
        

        db.findOne({_id: json.fb_id}, function (err, user) {
            //console.log(err);
          
                  var text = JSON.stringify(user, null, 4);
          
                    db.find({user_id: json.fb_id, type: 'visit'}, function (err, visits) {
                      let userText = " USER: " + JSON.stringify(user, null, 4);
                      let visitText = " VISIT: " + JSON.stringify(visits, null, 4);
                                
                      let answer = {
                              "messages": [
      
                                 {
                                      
                                      "attachment": {
                                          "type": "template",
                                          "payload": {
                                              "template_type": "button",
                                              "text": userText + visitText,
                                              "buttons": [
                                                  {
                                                      "type": "json_plugin_url",
                                                      "url": "https://hartmanback.gomix.me/showStats?visits=1",
                                                      "title": "visits"
                                                  },
                                                  {
                                                      "type": "show_block",
                                                      "block_name": json.last_processed_block_name,
                                                      "title": "zurück"
                                                  },
                                            ]
                                        }
                                    }
                                }
                                  
                                ]
                      };
                        
                        
                       

                      log(answer);
                      return res.json(answer);      

                      });

         
            


            
        });
      
  
      
        
    });


    app.post("/start", function (req, res) {
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
            user.programm = 1;
            user.muscle_top = 1;
            user.muscle_middle = 2;
            user.muscle_bottom = 10;

            user.visit_first = new Date();
            user.visit_last = new Date();

            console.log("Created user: " + JSON.stringify(user))

            db.insert(user);
            return user;
        }
      
      function newVisit(user) {
         let visit = {
           type : 'visit',
           user_id : user._id,
           programm : user.programm,
           start : new Date(),
           finished: false,
           exercises: {}
         }
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

            return calculateReps(user, json);
        });


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
      
        function logExercise(user, json) {
          //find unfinished visit
            db.findOne({user_id: json.fb_id, type: 'visit', finished: false}, function (err, visit) {
            //console.log(err);

            log(visit, 'visit');
          });
        }

        function react(user, json) {

            if ((json.repsDone < 0) || (json.repsDone > 10 * json.repsTodo)) {
                return sendReaction("ugly");
            }

          let multiplier = 1;

            //division by 0
            if (json.repsTodo > 0) {
                log(json, "test1");
                multiplier = json.repsDone / json.repsTodo;
            }

            log(multiplier);

            let group_strength = 1;
            switch (json.exercise_group) {
                case "top":
                    user.muscle_top = multiplier;
                    break;
                case "middle":
                    user.muscle_middle = multiplier;
                    break;
                case "bottom":
                    user.muscle_bottom = multiplier;
                    break;
                default:
                    //bottom
            }

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

            if ((json.repsDone < 0) || (json.repsDone > 10 * json.repsTodo)) {
                return sendReaction("ugly");
            }

          let multiplier = 1;

            //division by 0
            if (json.repsTodo > 0) {
                log(json, "test1");
                multiplier = json.repsDone / json.repsTodo;
            }

            log(multiplier);

            let group_strength = 1;
            switch (json.exercise_group) {
                case "top":
                    user.muscle_top = multiplier;
                    break;
                case "middle":
                    user.muscle_middle = multiplier;
                    break;
                case "bottom":
                    user.muscle_bottom = multiplier;
                    break;
                default:
                    //bottom
            }

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
  



};


class User {
    constructor(json, db) {
        db.findOne({_id: json.fb_id}, function (err, user) {
            //console.log(err);
            if (user == null) {
                //new user  
                user = User.newUser(json, db);
                log(user, "Created");
            } else {
                log(user, "Found");
            }


            for (var field in user) {
                //this.field = user.field;
            }

            log(this, "sdasda");
        });

        //log(this, "sdasda");

    }

    update() {

    }

    startDay() {


    }

    static fromDb(fb_id, db) {
        db.findOne({_id: fb_id}, function (err, user) {
            return user;
        });

    }

    static newUser(user, db) {

        user._id = user.fb_id;

        user.score = 0;
        user.programm = 1;
        user.exercise = 1;
        user.muscle_top = 1;
        user.muscle_middle = 1;
        user.muscle_bottom = 1;

        user.visits = {};
        user.visit_first = Date.now();
        user.visit_last = Date.now();

        db.insert(user);
        return user;
    }


}

class Visit {
    constructor(user) {
        this.user_id = user._id;
        this.date = Date.now();

    }

}


function log(user, hint = "") {
    console.log(hint + ": " + JSON.stringify(user));
}

module.exports = routes;