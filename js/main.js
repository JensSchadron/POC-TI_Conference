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

    $('#micEnabled').click(function () {
        micEnabled = !micEnabled;
        if (micEnabled) {
            recognition.start();
        } else {
            $('#micEnabled').attr('src', '../assets/mic-slash.gif');
            recognition.stop();
        }
    });

    app = new App();
    app.open();

    addResponseNode("How can I be of any help?", true);
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
            addResponseNode((data.result.fulfillment) ? data.result.fulfillment.speech : data.result.speech, true);

            var actionComplete = !data.result.actionIncomplete;
            if (actionComplete) {
                processResponseQuery(data);
            }
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

function addResponseNode(text, speak) {
    var apiResponseContainer = document.createElement("div"),
        apiResponse = document.createElement("p");
    apiResponseContainer.className = "apiResponseContainer";
    apiResponse.className = "dialogueMessage apiResponse";
    apiResponse.innerHTML = text;

    apiResponseContainer.appendChild(apiResponse);
    dialogue.append(apiResponseContainer);
    $("html, body").animate({scrollTop: $(document).height()}, "slow");

    if (speak && 'speechSynthesis' in window) {
        speech.text = text;
        isSpeaking = true;
        speechSynthesis.speak(speech);
    }
}

var recognition,
    speech,
    recognizing = false,
    isSpeaking = false,
    micEnabled = true;

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
            setRecognizing(true);
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
            setRecognizing(false);
        };
        recognition.onend = function () {
            console.log("Ending recog");
            if (!micEnabled) return;
            if (userInput.val() === '') {
                console.log('Recog ended too early. re-initializing.');
                recognition.start();
                return;
            }
            setRecognizing(false);
            if (needToBookHotel()) {
                console.log(query.get());
                var hotel = query.get()[selectedHotel];
                addResponseNode("Ok, I'll try to book a room in the " + hotel.name + " in " + hotel.city, true)
            } else {
                app.sendJson();
            }
        }
    }

    if ('speechSynthesis' in window) {
        speech = new SpeechSynthesisUtterance();
        var voices = window.speechSynthesis.getVoices();
        speech.voice = voices[2]; // Note: some voices don't support altering params
        speech.lang = 'en-US';

        speech.onend = function (e) {
            isSpeaking = false;
            if (micEnabled && !recognizing && !isSpeaking) {
                console.log("Finished speaking, enabling speech recognition again");
                recognition.start();
            }
        };
    }
}

function setRecognizing(enabled) {
    recognizing = enabled;
    $('#micEnabled').attr('src', (enabled ? '../assets/mic-animate.gif' : '../assets/mic.gif'));
}

var hotels = TAFFY([
    {
        "id": 1,
        "city": "London",
        "name": "Premier Inn",
        "classification": 4,
        "price": 123,
        "wifi": "false",
        "maxGuests": 4,
        "pool": "false",
        "rating": 9
    },
    {
        "id": 2,
        "city": "London",
        "name": "Apex Temple court",
        "classification": 3,
        "price": 80,
        "wifi": "false",
        "maxGuests": 4,
        "pool": "false",
        "rating": 3
    },
    {
        "id": 3,
        "city": "London",
        "name": "Ibis Whitechapel",
        "classification": 2,
        "price": 50,
        "wifi": "false",
        "maxGuests": 4,
        "pool": "false",
        "rating": 6
    },
    {
        "id": 4,
        "city": "London",
        "name": "NH London Kensington",
        "classification": 1,
        "price": 25,
        "wifi": "false",
        "maxGuests": 2,
        "pool": "false",
        "rating": 8
    },
    {
        "id": 5,
        "city": "London",
        "name": "The tower",
        "classification": 5,
        "price": 280,
        "wifi": "false",
        "maxGuests": 2,
        "pool": "false",
        "rating": 6
    },
    {
        "id": 6,
        "city": "London",
        "name": "The golden tullip",
        "classification": 4,
        "price": 142,
        "wifi": "false",
        "maxGuests": 8,
        "pool": "false",
        "rating": 9
    },
    {
        "id": 7,
        "city": "London",
        "name": "London city hotel",
        "classification": 3,
        "price": 99,
        "wifi": "false",
        "maxGuests": 8,
        "pool": "false",
        "rating": 3
    },
    {
        "id": 8,
        "city": "Rome",
        "name": "Casa di mama",
        "classification": 4,
        "price": 44,
        "wifi": "false",
        "maxGuests": 5,
        "pool": "true",
        "rating": 5
    },
    {
        "id": 9,
        "city": "Rome",
        "name": "La vita e bella",
        "classification": 3,
        "price": 88,
        "wifi": "false",
        "maxGuests": 5,
        "pool": "true",
        "rating": 5
    },
    {
        "id": 10,
        "city": "Rome",
        "name": "Ibis Rome",
        "classification": 2,
        "price": 77,
        "wifi": "false",
        "maxGuests": 2,
        "pool": "true",
        "rating": 9
    },
    {
        "id": 11,
        "city": "Rome",
        "name": "H10 Rome",
        "classification": 1,
        "price": 12,
        "wifi": "false",
        "maxGuests": 2,
        "pool": "true",
        "rating": 9
    },
    {
        "id": 12,
        "city": "Rome",
        "name": "Rome palace",
        "classification": 5,
        "price": 300,
        "wifi": "false",
        "maxGuests": 5,
        "pool": "true",
        "rating": 8
    },
    {
        "id": 13,
        "city": "Rome",
        "name": "The golden tullip",
        "classification": 4,
        "price": 142,
        "wifi": "false",
        "maxGuests": 7,
        "pool": "true",
        "rating": 7
    },
    {
        "id": 15,
        "city": "Barcelona",
        "name": "Barcelona city hotel",
        "classification": 3,
        "price": 99,
        "wifi": "true",
        "maxGuests": 7,
        "pool": "true",
        "rating": 5
    },
    {
        "id": 16,
        "city": "Barcelona",
        "name": "Barcelona palace",
        "classification": 5,
        "price": 280,
        "wifi": "true",
        "maxGuests": 5,
        "pool": "true",
        "rating": 8
    },
    {
        "id": 17,
        "city": "Barcelona",
        "name": "The golden tullip",
        "classification": 4,
        "price": 118,
        "wifi": "true",
        "maxGuests": 4,
        "pool": "true",
        "rating": 10
    },
    {
        "id": 18,
        "city": "Madrid",
        "name": "Madrid city hotel",
        "classification": 3,
        "price": 99,
        "wifi": "true",
        "maxGuests": 4,
        "pool": "true",
        "rating": 8
    },
    {
        "id": 19,
        "city": "Madrid",
        "name": "Madrid palace",
        "classification": 5,
        "price": 400,
        "wifi": "true",
        "maxGuests": 4,
        "pool": "true",
        "rating": 6
    },
    {
        "id": 20,
        "city": "Madrid",
        "name": "The golden tullip",
        "classification": 4,
        "price": 86,
        "wifi": "true",
        "maxGuests": 4,
        "pool": "true",
        "rating": 9
    },
    {
        "id": 21,
        "city": "Madrid",
        "name": "Madrid city hotel",
        "classification": 3,
        "price": 99,
        "wifi": "true",
        "maxGuests": 8,
        "pool": "false",
        "rating": 6
    },
    {
        "id": 22,
        "city": "Brussels",
        "name": "The golden tullip",
        "classification": 4,
        "price": 189,
        "wifi": "true",
        "maxGuests": 8,
        "pool": "false",
        "rating": 5
    },
    {
        "id": 23,
        "city": "Brussels",
        "name": "Brussels city hotel",
        "classification": 3,
        "price": 99,
        "wifi": "true",
        "maxGuests": 5,
        "pool": "false",
        "rating": 5
    },
    {
        "id": 24,
        "city": "Antwerp",
        "name": "Hilton Antwerp",
        "classification": 4,
        "price": 121,
        "wifi": "true",
        "maxGuests": 5,
        "pool": "false",
        "rating": 8
    },
    {
        "id": 25,
        "city": "Antwerp",
        "name": "Antwerp city hotel",
        "classification": 3,
        "price": 99,
        "wifi": "true",
        "maxGuests": 3,
        "pool": "false",
        "rating": 6
    }
]);

var query;

function processResponseQuery(data) {
    var responseStringHasNoAnswers = "I'm sorry, I didn't find any hotels matching your criteria";

    var queryInfoObject = data.result.contexts[0].parameters;

    query = hotels({city: queryInfoObject.destination});

    if (query.count() > 0) {
        var hotelString = '';
        if (queryInfoObject.sort !== undefined && queryInfoObject.sort.length > 0) {
            query = query.order(queryInfoObject.sort[0]);
        }
        var i = 1;
        query.limit(9).each(function (hotel) {
            console.log(hotel);
            hotelString += i++ + ") " + hotel.name + " in " + hotel.city + " which costs " + hotel.price + "<br>";
        });

        addResponseNode(hotelString, false);
    } else {
        addResponseNode(responseStringHasNoAnswers, true);
    }
}

var selectedHotel;

function needToBookHotel() {
    var strNumbers = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

    var reg = new RegExp('.*(number) ([1-9]+).*');
    var inputToTest = userInput.val();
    if (reg.test(inputToTest)) {
        userInput.val('');
        addQueryNode(inputToTest);

        selectedHotel = parseInt(inputToTest.replace(/[^1-9\.]/g, ''), 10) - 1;
        return true;
    } else {
        for (var i = 0; i < strNumbers.length; i++) {
            var regex = new RegExp('.*(number) (' + strNumbers[i] + '){1}.*');
            if (regex.test(inputToTest)) {
                userInput.val('');
                addQueryNode(inputToTest);

                selectedHotel = i;
                return true;
            }
        }
        return false;
    }
}