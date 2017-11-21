var restify           = require('restify');
var builder           = require('botbuilder');
var cognitiveServices = require('botbuilder-cognitiveServices');
var Spotify           = require('node-spotify-api');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId      : process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector);

var luisEndpoint   = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/640b1c98-4745-4df6-a3d3-9a2fc4b2c1e9?subscription-key=70926928e31e4c0fa593b937ec0d17aa&verbose=true&timezoneOffset=0&q=";
var luisRecognizer = new builder.LuisRecognizer(luisEndpoint);

var spotifyApplicationId    = "90bf77f8b53749faa5a3902f9827b333";
var spotifyApplicationToken = "db2a341beff945c480f9066b6549ec9f";
var spotifyEndpoint         = "https://api.spotify.com/v1/";
var defaultType             = "track";

var spotify = new Spotify({
    id    : spotifyApplicationId,
    secret: spotifyApplicationToken
  });

bot.recognizer(luisRecognizer);

bot.dialog("songify", [
    function(session, args, next){
        var intentResult = args.intent;

        var query = [];
        var type  = defaultType;
        intentResult.entities.forEach(function(element){
            session.send('Entity: '+element.entity + ' Type: '+ element.type);
            if(element.type != "type"){
                query.push(element.type + ':'+ element.entity);
            }else{
                type = element.entity;
            }
        }, this);  
        var search = spotifyEndpoint + 'search?limit=5&offset=0&q=' + query.join('&') + '&type=' + type;
        session.send(search);
        spotify.request(search)
            .then(function(data) {
                for(var element in data){
                    session.send(element +':');
                    if(element = "tracks"){
                        response = data[element]['items']
                        for(var elmt in response){
                            session.send(response[elmt]['name'] + ': ' + response[elmt]['external_urls']['spotify']);
                            //session.send(JSON.stringify(response[elmt]));
                        }
                    }
                }
                //session.send(JSON.stringify(data));
                //console.log(data); 
            })
            .catch(function(err) {
                session.send('Error occurred: ' + err);
                console.error('Error occurred: ' + err); 
            });
    }
]).triggerAction({
    matches: ["search"]
});


bot.dialog("none", [
    function(session, args, next){
        session.send("sorry, couldn't find what you wanted");
    }
]).triggerAction({
    matches: ["None"]
});