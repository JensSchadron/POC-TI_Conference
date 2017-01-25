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

    app = new App();
    app.open();
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
                "lang": "nl",

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
        // apiAi.close();
    };

    init();

    function init() {
        var config = {
            server: SERVER_PROTO + '://' + SERVER_DOMAIN + ':' + SERVER_PORT + '/api/ws/query',
            serverVersion: SERVER_VERSION,
            token: ACCESS_TOKEN, // Use Client access token there (see agent keys).
            sessionId: sessionId,
            lang: 'nl',
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

            var userQueryContainer = document.createElement("div"),
                userQuery = document.createElement("p");
            userQueryContainer.className = "userQueryContainer";
            userQuery.className = "dialogueMessage userQuery";
            userQuery.innerHTML = data.result.resolvedQuery;

            userQueryContainer.appendChild(userQuery);
            dialogue.append(userQueryContainer);

            var apiResponseContainer = document.createElement("div"),
                apiResponse = document.createElement("p");
            apiResponseContainer.className = "apiResponseContainer";
            apiResponse.className = "dialogueMessage apiResponse";
            apiResponse.innerHTML = (data.result.fulfillment) ? data.result.fulfillment.speech : data.result.speech;

            apiResponseContainer.appendChild(apiResponse);
            dialogue.append(apiResponseContainer);
            $("html, body").animate({ scrollTop: $(document).height() }, "slow");
        };

        apiAi.onError = function (code, data) {
            apiAi.close();
            console.log("> ON ERROR", code, data);
        };

        apiAi.onEvent = function (code, data) {
            console.log("> ON EVENT", code, data);
        };

        // apiAi.init();
    }
}