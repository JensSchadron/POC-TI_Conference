var app, userInput, dialogue, response;
var SERVER_PROTO, SERVER_DOMAIN, SERVER_PORT, ACCESS_TOKEN, SERVER_VERSION;

SERVER_PROTO = 'wss';
SERVER_DOMAIN = 'api-ws.api.ai';
SERVER_PORT = '4435';
ACCESS_TOKEN = 'c5443bc8e4c445518846a5b60e094e06';
SERVER_VERSION = '20150910';

window.onload = function () {
    userInput = $('#userQuery');
    dialogue = $('#dialogue');
    $('#server').text(SERVER_DOMAIN);
    $('#token').text(ACCESS_TOKEN);

    SpeechSetup();

    app = new App();
    app.open();

    addResponseNode("How can I be of any help?");
};

function App() {
    var apiAi;
    var sessionId = ApiAi.generateRandomId();

    this.sendJson = function () {
        var query = userInput.val(),
            queryJson = {
                "v": SERVER_VERSION,
                "query": query,
                "timezone": "GMT+1",
                "lang": "en",

                "sessionId": sessionId
            };
        userInput.val(''); //Userinput terug leegmaken
        console.log('sendJson', queryJson);
        apiAi.sendJson(queryJson);
    };

    this.open = function () {
        console.log('open');
        apiAi.open();
    };

    this.close = function () {
        console.log('close');
    };

    init();

    function init() {
        var config = {
            server: SERVER_PROTO + '://' + SERVER_DOMAIN + ':' + SERVER_PORT + '/api/ws/query',
            serverVersion: SERVER_VERSION,
            token: ACCESS_TOKEN, // Use Client access token there (see agent keys).
            sessionId: sessionId,
            lang: 'en',
            onInit: function () {
                console.log("> ON INIT use config");
            }
        };
        apiAi = new ApiAi(config);

        apiAi.sessionId = "1234";

        apiAi.onInit = function () {
            console.log("> ON INIT use direct assignment property");
            apiAi.open();
        };

        apiAi.onOpen = function () {
            console.log("> ON OPEN SESSION");
        };

        apiAi.onClose = function () {
            console.log("> ON CLOSE");
        };

        apiAi.onResults = function (data) {
            console.log("Result received.", data);

            var status = data.status, code = status.code;

            addQueryNode(data.result.resolvedQuery);
            addResponseNode((data.result.fulfillment) ? data.result.fulfillment.speech : data.result.speech);
        };

        apiAi.onError = function (code, data) {
            apiAi.close();
            console.log("> ON ERROR", code, data);
        };

        apiAi.onEvent = function (code, data) {
            console.log("> ON EVENT", code, data);
        };
    }
}

function addQueryNode(text) {
    var userQueryContainer = document.createElement("div"),
        userQuery = document.createElement("p");
    userQueryContainer.className = "userQueryContainer";
    userQuery.className = "dialogueMessage userQuery";
    userQuery.innerHTML = text;

    userQueryContainer.appendChild(userQuery);
    dialogue.append(userQueryContainer);
}

function addResponseNode(text) {
    var apiResponseContainer = document.createElement("div"),
        apiResponse = document.createElement("p");
    apiResponseContainer.className = "apiResponseContainer";
    apiResponse.className = "dialogueMessage apiResponse";
    apiResponse.innerHTML = text;

    apiResponseContainer.appendChild(apiResponse);
    dialogue.append(apiResponseContainer);
    $("html, body").animate({scrollTop: $(document).height()}, "slow");

    if ('speechSynthesis' in window) {
        speech.text = text;
        speechSynthesis.speak(speech);
    }
}

var recognition,
    speech,
    recognizing = false;

function SpeechSetup() {
    if (!('webkitSpeechRecognition' in window)) {
        console.log("not supported or something like that");
    } else {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = function () {
            console.log("Starting recog");
            recognizing = true;
        };
        recognition.onresult = function (event) {
            userInput.val('');

            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    userInput.val(userInput.val() + event.results[i][0].transcript);
                    console.log("final transcript: " + event.results[i][0].transcript);
                } else {
                    userInput.val(userInput.val() + event.results[i][0].transcript);
                    console.log("interim transcript: " + event.results[i][0].transcript);
                }
            }
        };
        recognition.onerror = function (event) {
            console.log("Recog errorred");
            recognizing = false;
        };
        recognition.onend = function () {
            console.log("Ending recog");
            recognizing = false;
            app.sendJson();
        }
    }

    if ('speechSynthesis' in window) {
        speech = new SpeechSynthesisUtterance();
        var voices = window.speechSynthesis.getVoices();
        speech.voice = voices[2]; // Note: some voices don't support altering params
        speech.lang = 'en-US';

        speech.onend = function (e) {
            console.log("Finished speaking, enabling speech recognition again");
            recognition.start();
        };
    }
}

var hotels = TAFFY([

]);