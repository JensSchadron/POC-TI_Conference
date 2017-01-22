(function () {

    // Defaults
    var CONTENT_TYPE = "content-type=audio/x-raw,+layout=(string)interleaved,+rate=(int)16000,+format=(string)S16LE,+channels=(int)1";
    // Send blocks 4 x per second as recommended in the server doc.
    var INTERVAL = 250;
    var TAG_END_OF_SENTENCE = "EOS";
    var VERSION = "20150910";

    // Error codes (mostly following Android error names and codes)
    var ERR_NETWORK = 2;
    var ERR_AUDIO = 3;
    var ERR_SERVER = 4;
    var ERR_CLIENT = 5;

    // Event codes
    var MSG_WAITING_MICROPHONE = 1;
    var MSG_MEDIA_STREAM_CREATED = 2;
    var MSG_INIT_RECORDER = 3;
    var MSG_RECORDING = 4;
    var MSG_SEND = 5;
    var MSG_SEND_EMPTY = 6;
    var MSG_SEND_EOS_OR_JSON = 7;
    var MSG_WEB_SOCKET = 8;
    var MSG_WEB_SOCKET_OPEN = 9;
    var MSG_WEB_SOCKET_CLOSE = 10;
    var MSG_STOP = 11;
    var MSG_CONFIG_CHANGED = 12;


    function ApiAi(cfg) {
        var config = cfg || {};
        var _this = this;

        _this.server = config.server || '';
        _this.token = config.token || '';
        _this.sessionId = config.sessionId || ApiAi.generateRandomId();
        _this.lang = config.lang || 'en';
        _this.contentType = config.contentType || CONTENT_TYPE;
        _this.readingInterval = config.readingInterval || INTERVAL;
        _this.serverVersion = (typeof config.serverVersion === 'undefined') ? VERSION : config.serverVersion;

        _this.onOpen = config.onOpen && config.onOpen.bind(_this) || _noop;
        _this.onClose = config.onClose && config.onClose.bind(_this) || _noop;
        _this.onInit = config.onInit && config.onInit.bind(_this) || _noop;
        _this.onResults = config.onResults && config.onResults.bind(_this) || _noop;
        _this.onEvent = config.onEvent && config.onEvent.bind(_this) || _noop;
        _this.onError = config.onError && config.onError.bind(_this) || _noop;

        function _noop() {
        }
    }

    ApiAi.generateRandomId = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }

        return s4() + s4() + "-" + s4() + "-" + s4() + "-" +
            s4() + "-" + s4() + s4() + s4();
    };

    /**
     * Initializes audioContext
     * Set up the recorder (incl. asking permission)
     * Can be called multiple times.
     */
    ApiAi.prototype.init = function () {
        var _this = this;
    };

    /**
     * Chck if recorder is initialise.
     * @returns {boolean}
     */
    ApiAi.prototype.isInitialise = function () {
        return !!this.recorder;
    };

    /**
     * Send object as json
     * @param json - javascript map.
     */
    ApiAi.prototype.sendJson = function (json) {
        if (!json.sessionId) {
            if (!this.sessionId) {
                this.sessionId = this.generateRandomId();
            }
            json.sessionId = this.sessionId;
        }
        this._socketSend(JSON.stringify(json));
        this._socketSend(TAG_END_OF_SENTENCE);
    };

    /**
     * Check if websocket is open
     */
    ApiAi.prototype.isOpen = function () {
        return !!this.ws;
    };
    /**
     * Open websocket
     */
    ApiAi.prototype.open = function () {
        var _this = this;

        if (_this.ws) _this.close();

        try {
            _this.ws = _createWebSocket();
        } catch (e) {
            _this.onError(ERR_CLIENT, "No web socket support in this browser!");
        }

        function _createWebSocket() {
            var url = '';
            if (_this.serverVersion) {
                url = _this.server + '?v=' + _this.serverVersion + '&' + _this.contentType + '&access_token=' + _this.token + '&sessionId=' + _this.sessionId;
            } else {
                url = _this.server + '?' + _this.contentType + '&access_token=' + _this.token + '&sessionId=' + _this.sessionId;
            }
            var ws = new WebSocket(url);

            ws.onmessage = function (e) {
                var data = e.data;
                _this.onEvent(MSG_WEB_SOCKET, data);

                if (data instanceof Object && !(data instanceof Blob)) {
                    _this.onError(ERR_SERVER, 'WebSocket: onEvent: got Object that is not a Blob');
                } else if (data instanceof Blob) {
                    _this.onError(ERR_SERVER, 'WebSocket: got Blob');
                } else {
                    _this.onResults(JSON.parse(data));// call interface method
                }
            };

            // Start recording only if the socket becomes open
            ws.onopen = function (e) {
                // send first request for initialisation dialogue
                //ws.send("{'timezone':'America/New_York', 'lang':'en'}");
                _this.onOpen();// call interface method
                _this.onEvent(MSG_WEB_SOCKET_OPEN, e);
            };

            // This can happen if the blob was too big
            // E.g. "Frame size of 65580 bytes exceeds maximum accepted frame size"
            // Status codes
            // http://tools.ietf.org/html/rfc6455#section-7.4.1
            // 1005:
            // 1006:
            ws.onclose = function (e) {
                // The server closes the connection (only?)
                // when its endpointer triggers.
                _this.onClose();// call interface method
                _this.onEvent(MSG_WEB_SOCKET_CLOSE, e.code + "/" + e.reason + "/" + e.wasClean);
            };

            ws.onerror = function (e) {
                _this.onError(ERR_NETWORK, JSON.stringify(e.data));
            };

            return ws;
        }
    };

    /**
     * Cancel everything without waiting on the server
     */
    ApiAi.prototype.close = function () {
        var _this = this;
        // Stop the regular sending of audio (if present)
        clearInterval(_this.intervalKey);
        if (_this.ws) {
            _this.ws.close();
            _this.ws = null;
        }
    };


    ApiAi.prototype._socketSend = function (item) {
        var _this = this;
        if (!_this.ws) {
            _this.onError(ERR_CLIENT, 'No web socket connection: failed to send: ' + item);
            return;
        }

        var state = _this.ws.readyState;
        if (state != 1) {
            var errorMsg = 'WebSocket: ';
            switch (state) {
                case 0: // CONNECTING
                    errorMsg += 'The connection is not yet open.';
                    break;
                //case 1:break;// OPEN
                case 2:// CLOSING
                    errorMsg += 'The connection is in the process of closing.';
                    break;
                case 3:// CLOSED
                    errorMsg += 'The connection is closed or couldn\'t be opened.';
                    break;
            }
            errorMsg += ' readyState=' + state + ' (!=1) failed to send: ' + item;
            _this.onError(ERR_NETWORK, errorMsg);
        }

        // If item isn't an audio blob it's the EOS tag or json data (string)
        if (!(item instanceof Blob)) {
            _this.ws.send(item);
            _this.onEvent(MSG_SEND_EOS_OR_JSON, 'Send string: ' + item);
        } else if (item.size > 0) {
            _this.ws.send(item);
            _this.onEvent(MSG_SEND, 'Send: blob: ' + item.type + ', ' + item.size);
        } else {
            _this.onEvent(MSG_SEND_EMPTY, 'Send: blob: ' + item.type + ', EMPTY');
        }
    };


    window.ApiAi = ApiAi;

})();
