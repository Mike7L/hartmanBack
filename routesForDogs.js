//
// This defines three routes that our API is going to use.
// TEST 22


var routes = function (app, db) {


    var moment = require('moment');
    moment.locale('de');


    app.post("/webhook", function (req, res) {
        console.log("webhook Received Post: " + JSON.stringify(req.body));

        let answer = {
            "messages": [
                {"text": "Good bye!"},
            ]
        };

        let fbCardsMessage = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: 'Kitten',
                            image_url: 'https://example.com/cat.jpg',
                            subtitle: 'Cat',
                            buttons: [{type: 'postback', title: 'Buy', payload: 'buy'}]
                        },
                        {
                            title: 'Gnome',
                            image_url: 'https://example.com/gnome.png',
                            buttons: [
                                {type: 'postback', title: 'Info', payload: 'info'},
                                {type: 'web_url', title: 'Gnome info', url: 'https://example.com/gnome'}
                            ]
                        }
                    ]
                }
            }
        };


        let message = req.body;
        message.result.fulfillment.messages = [
            fbCardsMessage
        ] ;


        return sendJsonBack(res, message);


    });


    function responseToFB(response) {
        if (this.isDefined(response.result) && this.isDefined(response.result.fulfillment)) {
            let responseText = response.result.fulfillment.speech;
            let responseData = response.result.fulfillment.data;
            let responseMessages = response.result.fulfillment.messages;

            let action = response.result.action;

            if (this.isDefined(responseData) && this.isDefined(responseData.facebook)) {
                let facebookResponseData = responseData.facebook;
                this.doDataResponse(sender, facebookResponseData);
            } else if (this.isDefined(responseMessages) && responseMessages.length > 0) {
                this.doRichContentResponse(sender, responseMessages);
            }
            else if (this.isDefined(responseText)) {
                this.doTextResponse(sender, responseText);
            }

        }
    }



    function  doRichContentResponse(sender, messages) {
        let facebookMessages = []; // array with result messages

        for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
            let message = messages[messageIndex];

            switch (message.type) {
                case 0:
                    // speech: ["hi"]
                    // we have to get value from fulfillment.speech, because of here is raw speech
                    if (message.speech) {

                        let splittedText = this.splitResponse(message.speech);

                        splittedText.forEach(s => {
                            facebookMessages.push({text: s});
                        });
                    }

                    break;

                case 1: {
                    let carousel = [message];

                    for (messageIndex++; messageIndex < messages.length; messageIndex++) {
                        if (messages[messageIndex].type == 1) {
                            carousel.push(messages[messageIndex]);
                        } else {
                            messageIndex--;
                            break;
                        }
                    }

                    let facebookMessage = {};
                    carousel.forEach((c) => {
                        // buttons: [ {text: "hi", postback: "postback"} ], imageUrl: "", title: "", subtitle: ""

                        let card = {};

                        card.title = c.title;
                        card.image_url = c.imageUrl;
                        if (this.isDefined(c.subtitle)) {
                            card.subtitle = c.subtitle;
                        }

                        if (c.buttons.length > 0) {
                            let buttons = [];
                            for (let buttonIndex = 0; buttonIndex < c.buttons.length; buttonIndex++) {
                                let button = c.buttons[buttonIndex];

                                if (button.text) {
                                    let postback = button.postback;
                                    if (!postback) {
                                        postback = button.text;
                                    }

                                    let buttonDescription = {
                                        title: button.text
                                    };

                                    if (postback.startsWith("http")) {
                                        buttonDescription.type = "web_url";
                                        buttonDescription.url = postback;
                                    } else {
                                        buttonDescription.type = "postback";
                                        buttonDescription.payload = postback;
                                    }

                                    buttons.push(buttonDescription);
                                }
                            }

                            if (buttons.length > 0) {
                                card.buttons = buttons;
                            }
                        }

                        if (!facebookMessage.attachment) {
                            facebookMessage.attachment = {type: "template"};
                        }

                        if (!facebookMessage.attachment.payload) {
                            facebookMessage.attachment.payload = {template_type: "generic", elements: []};
                        }

                        facebookMessage.attachment.payload.elements.push(card);
                    });

                    facebookMessages.push(facebookMessage);
                }

                    break;

                case 2: {
                    if (message.replies && message.replies.length > 0) {
                        let facebookMessage = {};

                        facebookMessage.text = message.title ? message.title : 'Choose an item';
                        facebookMessage.quick_replies = [];

                        message.replies.forEach((r) => {
                            facebookMessage.quick_replies.push({
                                content_type: "text",
                                title: r,
                                payload: r
                            });
                        });

                        facebookMessages.push(facebookMessage);
                    }
                }

                    break;

                case 3:

                    if (message.imageUrl) {
                        let facebookMessage = {};

                        // "imageUrl": "http://example.com/image.jpg"
                        facebookMessage.attachment = {type: "image"};
                        facebookMessage.attachment.payload = {url: message.imageUrl};

                        facebookMessages.push(facebookMessage);
                    }

                    break;

                case 4:
                    if (message.payload && message.payload.facebook) {
                        facebookMessages.push(message.payload.facebook);
                    }
                    break;

                default:
                    break;
            }
        }

        return new Promise((resolve, reject) => {
            async.eachSeries(facebookMessages, (msg, callback) => {
                    this.sendFBSenderAction(sender, "typing_on")
                        .then(() => this.sleep(this.messagesDelay))
                        .then(() => this.sendFBMessage(sender, msg))
                        .then(() => callback())
                        .catch(callback);
                },
                (err) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        console.log('Messages sent');
                        resolve();
                    }
                });
        });

    }



    function sendJsonBack(res, json) {
        console.log("sendJsonBack" + JSON.stringify(json));
        return res.json(json);
    }


};



function log(object, hint = "") {
    console.log(hint + ": " + JSON.stringify(object, null, '\t'));
}


let secondsExpiredInput = 3600;


module.exports = routes;