'use strict';
const Alexa = require('alexa-sdk');
const https = require('https');
const fs = require('fs');

const APP_ID = "amzn1.ask.skill.9e4c8774-3ed6-4c20-85f5-79d74c22fec1";
const HELP_MESSAGE = 'I can help you in booking flight';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';

const handlers = {
    'LaunchNativeAppIntent': function () {
        this.emit('Greetings');
    },

    'LaunchRequest': function () {
        var speechOutput = "Hi, What can i do for you";
        var repromptSpeech = speechOutput;
        var cardTitle = "Flight Assistant";
        var cardContent = "Welcome to Flight Booking Assistant.\n Get Cheapest rate using our Service. "
        this.emit(':askWithCard', speechOutput, repromptSpeech, cardTitle, cardContent);
    },

    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');

    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'Greetings': function () {
        if (this.event.session.user.accessToken === undefined) {
            this.emit(':ask', "Hi, what can i do for you");
        }
        else {
            //name=username.split(" ");
            console.log("Account Linking");
            let url = 'https://api.amazon.com/user/profile?access_token=' + this.event.session.user.accessToken;
            https.get(url, res => {
                res.setEncoding("utf8");
                let body = "";
                res.on("data", data => {
                    body += data;
                });
                res.on("end", () => {
                    let data = JSON.parse(body);
                    console.log(data);
                    var username = data.name;
                    var name = username.split(" ");
                    this.emit(':ask', "Hi " + name[0] + ", what can i do for you");
                });
            });
        }
    },
    'BookFlight': function () {

        console.log(this.event.request.intent.name);
        console.log(this.event.request.dialogState);

        var updatedIntent = this.event.request.Intent;

        if (this.event.request.dialogState === 'STARTED') {
            this.emit(':delegate', updatedIntent);
        }
        else if (this.event.request.dialogState === 'IN_PROGRESS') {
            this.emit(':delegate');
        }
        else {
            this.attributes['date'] = this.event.request.intent.slots.date.value;
            this.attributes['fromcity'] = this.event.request.intent.slots.fromcity.value;
            this.attributes['tocity'] = this.event.request.intent.slots.tocity.value;
            this.attributes['class'] = this.event.request.intent.slots.class.resolutions.resolutionsPerAuthority[0].values[0].value.name

            console.log(this.attributes['fromcity']);
            console.log(this.attributes['tocity']);

            var rawdata = fs.readFileSync('airport.json');
            var json = JSON.parse(rawdata);
            for (var i = 0; i < json.length; i++) {
                if (json[i].city == this.attributes['fromcity'])
                    this.attributes['fromcity'] = json[i].code;
                if (json[i].city == this.attributes['tocity'])
                    this.attributes['tocity'] = json[i].code;
            }

            console.log(this.attributes['fromcity']);
            console.log(this.attributes['tocity']);
            var date = this.event.request.intent.slots.date.value;
            var details = {
                "date": this.attributes.date,
                "fromcity": this.attributes.fromcity,
                "tocity": this.attributes.tocity,
                "class": this.attributes.class
            }
            var result = "<say-as interpret-as=\"date\">" + date + "</say-as>";
            // //             console.log(result.toDateString());
            var promise = service(details);
            promise.then((response) => {
                console.log(response);
                var speechOutput = 'Flight Details. Airline: ' + response.airline + '. Fare: Rupees ' + response.fare.grossamount + '. Date of journey is ' + date + '. Do you want to change search parameters.';
                var repromptSpeech = "Do you want to change search parameters.";
                var cardTitle = "Flight Details";
                var cardContent = "Flight: " + response.airline + "\n Fare: Rs " + response.fare.grossamount + "/\-\n Departure Time: " + response.deptime + "\n Duration: " + response.duration;
                cardContent += "\n Date: " + date + "\n Origin: " + this.attributes.fromcity + "   Destination: " + this.attributes.tocity;
                this.handler.state = "SEARCH";
                this.emit(':askWithCard', speechOutput, repromptSpeech, cardTitle, cardContent);

                //this.emitWithState('')  
            });
        }
    },


    'SessionEndedRequest': function () {
        // Use this function to clear up and save any data needed between sessions
        this.emit('AMAZON.StopIntent');
    },
    'LinkAccount': function () {
        if (this.event.session.user.accessToken === undefined) {
            var title = "Link Account";
            var content = "Please link your account to have a better experience.";
            this.emit(':tellWithLinkAccountCard', content, title, content);
        }
        else {
            // let url = 'https://api.amazon.com/user/profile?access_token=' + this.event.session.user.accessToken;
            // request(url,(error, response, body) => {
            //   if (!error && response.statusCode === 200){

            //       let data = JSON.parse(body);
            //       console.log(data);
            //       var username=data.name;
            //       this.emit(':tell', 'Hi '+data.name);
            //   }
            // });
        }
    },
    "FinishIntent": function () {
        this.emit(":tell", "Thank you");
    },
    'Unhandled': function () {
        this.emit(':ask', 'Sorry I can\'t understand what you say');
    }

};
const searchhandlers = Alexa.CreateStateHandler("SEARCH", {
    'AMAZON.YesIntent': function () {
        this.emit(':ask', "What do you want to change");
        //this.emitWithState('ChangeDate');

    },
    'AMAZON.NoIntent': function () {
        this.emit(':tell', "Thank you");
    },
    'ChangeDate': function () {
        console.log(this.event.request.intent.name);
        console.log(this.event.request.dialogState);

        var updatedIntent = this.event.request.Intent;

        if (this.event.request.dialogState === 'STARTED') {
            this.emit(':delegate', updatedIntent);
        }
        else if (this.event.request.dialogState === 'IN_PROGRESS') {
            this.emit(':delegate');
        }
        else {
            this.attributes['date'] = this.event.request.intent.slots.date.value;

            var date = this.event.request.intent.slots.date.value;
            var details = {
                "date": this.attributes.date,
                "fromcity": this.attributes.fromcity,
                "tocity": this.attributes.tocity,
                "class": this.attributes.class
            }
            var result = "<say-as interpret-as=\"date\">" + date + "</say-as>";
            var promise = service(details);
            promise.then((response) => {
                console.log(response);
                var speechOutput = 'Flight Details. Airline: ' + response.airline + '. Fare: Rupees ' + response.fare.grossamount + '. Date of journey is ' + date + '. Do you want to change search parameters.';
                var repromptSpeech = "Do you want to change search parameters.";
                var cardTitle = "Flight Details";
                var cardContent = "Flight: " + response.airline + "\n Fare: Rs " + response.fare.grossamount + "/\-\n Departure Time: " + response.deptime + "\n Duration: " + response.duration;
                cardContent += "\n Date: " + date + "\n Origin: " + this.attributes.fromcity + "   Destination: " + this.attributes.tocity;
                this.handler.state = "SEARCH";
                this.emit(':askWithCard', speechOutput, repromptSpeech, cardTitle, cardContent);

                //this.emitWithState('')  
            });
        }
    },
    'Unhandled': function () {
        this.emit(':ask', 'Sorry I can\'t understand what you say');
    }
});


exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers, searchhandlers);
    alexa.execute();
};

function service(details) {
    return new Promise(function (resolve, reject) {
        console.log(details);
        var date = details.date.split("-");
        var datestring = date[0] + date[1] + date[2];
        console.log(datestring);
        var hostname = "https://developer.goibibo.com/api/search/?app_id=cd210f76&app_key=e89bc76371b6b75066edb6fb1437088e&format=json&";
        var url = hostname + "source=" + details.fromcity + "&destination=" + details.tocity + "&dateofdeparture=" + datestring + "&seatingclass=" + details.class + "&adults=1&children=0&infants=0&counter=100";
        console.log(url);

        https.get(url, res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
                body += data;
            });
            res.on("end", () => {
                body = JSON.parse(body);
                var data = body.data.onwardflights;
                //console.log(data.data.onwardflights[0]); 
                var length = data.length;
                console.log(length);
                var min = data[0].fare.grossamount;
                var index = 0;
                for (var i = 0; i < length; i++) {
                    if (data[i].fare.grossamount < min && data[i].onwardflights.length == 0) {
                        index = i;
                    }
                }
                resolve(data[index]);

            });
        });


    });
}