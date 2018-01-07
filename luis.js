var restify           = require('restify');
var builder           = require('botbuilder');
var cognitiveServices = require('botbuilder-cognitiveServices');
var Spotify           = require('node-spotify-api');
var request           = require('request');
var debug             = false;
var promptType        = "";
var intentResult      = "";

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

var   spotifyApplicationId    = "90bf77f8b53749faa5a3902f9827b333";
var   spotifyApplicationToken = "db2a341beff945c480f9066b6549ec9f";
var   spotifyEndpoint         = "https://api.spotify.com/v1/";
var   defaultType             = ["track"];
var   token                   = "";
var   choices                 = {};
var   playlists               = {};
var   yesno                   = {};
yesno['oui']                  = true;
yesno['non']                  = false;
var   authUrl                 = "http://localhost/spotify_login2/";
var   connected               = false;
var   callbackIntent          = "";
var   user                    = {};
var   spotify                 = new Spotify({
    id    : spotifyApplicationId,
    secret: spotifyApplicationToken
  });


//Option pour le request
var options = {
  url    : "",
  headers: {'Authorization': ''},
  json   : true,
  methode : "GET"
};

var inMemoryStorage = new builder.MemoryBotStorage();

bot.recognizer(luisRecognizer);

bot.dialog("songify", [
    function(session, args, next){

        intentResult = args.intent;

        function callback(error, response, body) {
            if (response.statusCode == "200") {
                if (callbackIntent == "connect"){
                    session.send('Bonjour, '+ body.display_name +', vous êtes maintenant connecté, vous pouvez continuer.');
                    user = body;
                    connected = true;
                }else if (callbackIntent == "getPlaylist"){
                    playlists = {};
                    if(debug){
                        session.send(JSON.stringify(body['items']));
                    }
                    for(var elmt in body['items']){
                        if(body['items'][elmt]['owner']['display_name'] == user.display_name){
                            playlists[body['items'][elmt]['name']] = {
                                "url":   body['items'][elmt]['external_urls']['spotify'],
                                "owner": body['items'][elmt]['owner']['display_name']
                            };
                        }
                    }
                    session.replaceDialog('getPlaylist');
                }
            }else if(response.statusCode == "401") {
                session.send('votre token a expiré ou est invalide');
                connected = false;
            }else{
                if(debug){
                    session.send(JSON.stringify(response));
                }
            }
        }

        if(session.message.text.toLowerCase() == 'debug'){
            session.beginDialog('debug');
            return true;
        }


        if(debug){
            session.send(JSON.stringify(intentResult));
        }

        //promptType == 'connect' quand l'intent est user
        if(promptType == 'connect'){
            token                         = session.message.text;
            options.headers.Authorization = "Bearer " + token;
            options.url                   = spotifyEndpoint + "me" ;

            session.send('Vérification du token ...');
            callbackIntent = "connect";
            request(options, callback);
            promptType = "";
            return true;
        }

        if(session.message.text.toLowerCase() == 'disconnect'){
            token                         = '';
            options.headers.Authorization = "Bearer " + token;
            options.url                   = spotifyEndpoint + "me" ;
            connected = false;

            session.send('Vous êtes maintenant déconnecté');
            return true;
        }

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
                session.send("Une erreur est survenue, veuillez recommencer.");
            }else{
                var search = spotifyEndpoint + 'search?limit=5&offset=0&q=' + encodeURIComponent(query.join('&')) + '&type=' + type.join(',');

                if(debug){
                    session.send(search);
                }
                spotify.request(search)
                    .then(function(data) {
                        for(var element in data){
                            choices = {};

                            for(var elmt in data[element]['items']){
                                choices[data[element]['items'][elmt]['name']] = { "url": data[element]['items'][elmt]['external_urls']['spotify'] };
                            }

                            session.beginDialog('askMusic');
                        }
                    })
                    .catch(function(err) {
                        session.send('Error occurred: ' + err);
                        console.error('Error occurred: ' + err);
                    });
            }

        // user actions
        }else if (intentResult.intent == "user"){
            if (!connected){
                // session.beginDialog('connect');
                promptType = "connect";
                session.send("Veuillez vous rendre sur l'addresse suivante afin de nous communiqué votre token d'authentification: " + authUrl);
                return true;
            }

        // user playlist
        }else if(intentResult.intent == "getPlaylist"){
            options.url = spotifyEndpoint + "me/playlists" ;
            callbackIntent = 'getPlaylist';
            request(options, callback);
        // no intent found
        }else{
            session.send("Une erreur est survenue, veuillez recommencer.");
        }
    }
]).triggerAction({
    matches: ["search", 'user', "None", "debug", "disconnect", "getPlaylist"]
});

bot.dialog('askMusic', [
    function (session) {
        builder.Prompts.choice(session, "Quel musique voulez vous écouter?", choices, { listStyle: builder.ListStyle.button});
    },
    function (session, results){
        var choice = choices[results.response.entity];
        session.send('%s', choice.url);
    }
]);

bot.dialog('debug', [
    function(session, args, next){
        builder.Prompts.choice(session, "activer le mode debug?", yesno, { listStyle: builder.ListStyle.button});
    },
    function (session, results){
        debug = yesno[results.response.entity];

        if(debug){
            session.send("debug activé");
        }else{
            session.send("debug desactivé");
        }
    }
]);

bot.dialog('connect', [
    function(session, args, next){
        builder.Prompts.text(session, "Veuillez vous rendre sur l'addresse suivante afin de nous communiqué votre token d'authentification: " + authUrl);
    },
    function (session, results){
        token                         = results.response;
        options.headers.Authorization = "Bearer " + token;
        connected                     = true;
        options.url                   = spotifyEndpoint + "me" ;
        callbackIntent = 'connect';
        request(options, callback); //Ajouter un parametre pour l'intent
    }
]);

bot.dialog('getPlaylist', [
    function(session,args, next){
        builder.Prompts.choice(session, "Choisissez votre playlist", playlists, { listStyle: builder.ListStyle.button});
    },
    function (session, results){
        var choice = playlists[results.response.entity];
        session.send(choice.url);
    }
]);
