var restify = require('restify');
var builder           = require('botbuilder');
var cognitiveServices = require('botbuilder-cognitiveServices');

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


var recognizer = new cognitiveServices.QnAMakerRecognizer({
    knowledgeBaseId: '55f6a7f1-4737-471b-ae10-d952b234f495',
    subscriptionKey: '1c1a4ee6388e48d3b50b02f727cc093c'
});
 
var BasicQnAMakerDialog = new cognitiveServices.QnAMakerDialog({ 
    recognizers   : [recognizer],
    defaultMessage: 'No good match in FAQ.',
    qnaThreshold  : 0.5
});
    
//bot.dialog('/', BasicQnAMakerDialog);

var luisEndpoint   = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/911d4b3c-a637-4a32-8c03-0fa464e99a0f?subscription-key=70926928e31e4c0fa593b937ec0d17aa&verbose=true&timezoneOffset=0&q=";
var luisRecognizer = new builder.LuisRecognizer(luisEndpoint);
bot.recognizer(luisRecognizer);

bot.dialog("HomePilot", [
    function(session, args, next){
        var intentResult = args.intent;
        session.send((JSON.stringify(intentResult.entities)));
        var entities = builder.EntityRecognizer.findEntity(intentResult.entities, 'HomeAutomation.Device');
        intentResult.entities.forEach(function(element){
            session.send('Entity: '+element.entity + ' Type: '+ element.type);
            session.send();
        }, this);
    }
]).triggerAction({
    matches: ["configure","None","alarm"]
});