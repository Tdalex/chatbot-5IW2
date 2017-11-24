var restify           = require('restify');
var builder           = require('botbuilder');
var cognitiveServices = require('botbuilder-cognitiveServices');
var Spotify           = require('node-spotify-api');
var SpotifyWebApi     = require('spotify-web-api-node');

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
var defaultType             = ["track"];
var token                   = "BQAEuolKFw0652GA2eMOqDYftQfjNCyeuugrqUaEIlPFbjYHWDEABfrY1C0mhLlF88GFd-ZTFIkdNdo-mS1iDLOb8AHHLj6jK4UwpUqx0AmvNnbPgUtQs2HPVIFKjJtEfLjEvw39";

var spotify = new Spotify({
    id    : spotifyApplicationId,
    secret: spotifyApplicationToken
  });
  
var spotifyApi = new SpotifyWebApi({
    clientId    : spotifyApplicationId,
    clientSecret: spotifyApplicationToken,
    redirectUri : 'localhost'
});

bot.recognizer(luisRecognizer);

bot.dialog("songify", [
    function(session, args, next){
        var intentResult = args.intent;
        
        session.send(JSON.stringify(intentResult));

        // search action
        if (intentResult.intent == "search"){
            var queryBuilder = [];
            var type         = [];
            var query        = [];
            var name         = [];
            // entities
            intentResult.entities.forEach(function(element){
                if(element.type != "type"){
                    if(element.type == "builtin.encyclopedia.music.artist"){
                        type.push("artist");
                        name.push(element.entity);
                    }else if(element.type == "builtin.encyclopedia.film.film"){
                        type.push("track");
                        name.push(element.entity);
                    }else if(!element.type.startsWith('Music.') && !element.type.startsWith("builtin.encyclopedia.")){
                        if(!queryBuilder[element.type]){
                            queryBuilder[element.type] = [];
                        }
                        queryBuilder[element.type].push(element.entity);
                    }
                }else{
                    type.push(element.entity);
                }
            }, this);  
            // join title and artist name to query
            if (name.length != 0) {
                query.push(name.join(','));
            }
            // assemble query
            for(var q in queryBuilder){
                query.push(q + ':' + queryBuilder[q].join(','));
            } 
            // if not specific search use default type  
            if (type.length == 0) {
                type = defaultType;
            }
            
            // send error or search if query not null
            if (query.length == 0) {
                session.send("sorry, couldn't find what your were talking about");
            }else{
                var search = spotifyEndpoint + 'search?limit=5&offset=0&q=' + encodeURIComponent(query.join('&')) + '&type=' + type.join(',');
                session.send(search);
                spotify.request(search)
                    .then(function(data) {
                        for(var element in data){
                            session.send(element +':');
                            response = data[element]['items']
                            for(var elmt in response){
                                session.send(response[elmt]['name'] + ': ' + response[elmt]['external_urls']['spotify']);
                            }
                        }
                    })
                    .catch(function(err) {
                        session.send('Error occurred: ' + err);
                        console.error('Error occurred: ' + err); 
                    });
            }

        // user actions
        }else if (intentResult.intent == "user"){
           
            // First retrieve an access token
            spotifyApi.authorizationCodeGrant(token)
            .then(function(data) {
            console.log('Retrieved access token', data.body['access_token']);

            // Set the access token
            spotifyApi.setAccessToken(data.body['access_token']);

            // Use the access token to retrieve information about the user connected to it
            return spotifyApi.getMe();
            })
            .then(function(data) {
            // "Retrieved data for Faruk Sahin"
            console.log('Retrieved data for ' + data.body['display_name']);

            // "Email is farukemresahin@gmail.com"
            console.log('Email is ' + data.body.email);

            // "Image URL is http://media.giphy.com/media/Aab07O5PYOmQ/giphy.gif"
            console.log('Image URL is ' + data.body.images[0].url);

            // "This user has a premium account"
            console.log('This user has a ' + data.body.product + ' account');
            })
            .catch(function(err) {
            console.log('Something went wrong', err.message);
            });
        // no intent found
        }else{  
            session.send("sorry, couldn't find what you wanted");
        }
    }
]).triggerAction({
    matches: ["search", 'user', "None"]
});