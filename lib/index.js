var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/papaparse/papaparse.js
var require_papaparse = __commonJS({
  "node_modules/papaparse/papaparse.js"(exports, module) {
    (function(root, factory) {
      if (typeof define === "function" && define.amd) {
        define([], factory);
      } else if (typeof module === "object" && typeof exports !== "undefined") {
        module.exports = factory();
      } else {
        root.Papa = factory();
      }
    })(exports, function moduleFactory() {
      "use strict";
      var global = (function() {
        if (typeof self !== "undefined") {
          return self;
        }
        if (typeof window !== "undefined") {
          return window;
        }
        if (typeof global !== "undefined") {
          return global;
        }
        return {};
      })();
      function getWorkerBlob() {
        var URL = global.URL || global.webkitURL || null;
        var code = moduleFactory.toString();
        return Papa2.BLOB_URL || (Papa2.BLOB_URL = URL.createObjectURL(new Blob(["var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ", "(", code, ")();"], { type: "text/javascript" })));
      }
      var IS_WORKER = !global.document && !!global.postMessage, IS_PAPA_WORKER = global.IS_PAPA_WORKER || false;
      var workers = {}, workerIdCounter = 0;
      var Papa2 = {};
      Papa2.parse = CsvToJson;
      Papa2.unparse = JsonToCsv;
      Papa2.RECORD_SEP = String.fromCharCode(30);
      Papa2.UNIT_SEP = String.fromCharCode(31);
      Papa2.BYTE_ORDER_MARK = "\uFEFF";
      Papa2.BAD_DELIMITERS = ["\r", "\n", '"', Papa2.BYTE_ORDER_MARK];
      Papa2.WORKERS_SUPPORTED = !IS_WORKER && !!global.Worker;
      Papa2.NODE_STREAM_INPUT = 1;
      Papa2.LocalChunkSize = 1024 * 1024 * 10;
      Papa2.RemoteChunkSize = 1024 * 1024 * 5;
      Papa2.DefaultDelimiter = ",";
      Papa2.Parser = Parser;
      Papa2.ParserHandle = ParserHandle;
      Papa2.NetworkStreamer = NetworkStreamer;
      Papa2.FileStreamer = FileStreamer;
      Papa2.StringStreamer = StringStreamer;
      Papa2.ReadableStreamStreamer = ReadableStreamStreamer;
      if (typeof PAPA_BROWSER_CONTEXT === "undefined") {
        Papa2.DuplexStreamStreamer = DuplexStreamStreamer;
      }
      if (IS_PAPA_WORKER) {
        global.onmessage = workerThreadReceivedMessage;
      }
      function stripBom(string) {
        if (string.charCodeAt(0) === 65279) {
          return string.slice(1);
        }
        return string;
      }
      function CsvToJson(_input, _config) {
        _config = _config || {};
        var dynamicTyping = _config.dynamicTyping || false;
        if (isFunction(dynamicTyping)) {
          _config.dynamicTypingFunction = dynamicTyping;
          dynamicTyping = {};
        }
        _config.dynamicTyping = dynamicTyping;
        _config.transform = isFunction(_config.transform) ? _config.transform : false;
        if (_config.downloadTimeout !== void 0) {
          var downloadTimeout = parseInt(_config.downloadTimeout);
          if (isNaN(downloadTimeout)) {
            throw new Error("Config downloadTimeout value (" + _config.downloadTimeout + ") not parsable by parseInt(val).");
          }
          _config.downloadTimeout = downloadTimeout;
        }
        if (_config.worker && Papa2.WORKERS_SUPPORTED) {
          var w = newWorker();
          w.userStep = _config.step;
          w.userChunk = _config.chunk;
          w.userComplete = _config.complete;
          w.userError = _config.error;
          _config.step = isFunction(_config.step);
          _config.chunk = isFunction(_config.chunk);
          _config.complete = isFunction(_config.complete);
          _config.error = isFunction(_config.error);
          delete _config.worker;
          w.postMessage({
            input: _input,
            config: _config,
            workerId: w.id
          });
          return;
        }
        var streamer = null;
        if (_input === Papa2.NODE_STREAM_INPUT && typeof PAPA_BROWSER_CONTEXT === "undefined") {
          streamer = new DuplexStreamStreamer(_config);
          return streamer.getStream();
        } else if (typeof _input === "string") {
          _input = stripBom(_input);
          if (_config.download)
            streamer = new NetworkStreamer(_config);
          else
            streamer = new StringStreamer(_config);
        } else if (_input.readable === true && isFunction(_input.read) && isFunction(_input.on)) {
          streamer = new ReadableStreamStreamer(_config);
        } else if (global.File && _input instanceof File || _input instanceof Object)
          streamer = new FileStreamer(_config);
        return streamer.stream(_input);
      }
      function JsonToCsv(_input, _config) {
        var _quotes = false;
        var _writeHeader = true;
        var _delimiter = ",";
        var _newline = "\r\n";
        var _quoteChar = '"';
        var _escapedQuote = _quoteChar + _quoteChar;
        var _skipEmptyLines = false;
        var _columns = null;
        var _escapeFormulae = false;
        unpackConfig();
        var quoteCharRegex = new RegExp(escapeRegExp(_quoteChar), "g");
        if (typeof _input === "string")
          _input = JSON.parse(_input);
        if (Array.isArray(_input)) {
          if (!_input.length || Array.isArray(_input[0]))
            return serialize(null, _input, _skipEmptyLines);
          else if (typeof _input[0] === "object")
            return serialize(_columns || Object.keys(_input[0]), _input, _skipEmptyLines);
        } else if (typeof _input === "object") {
          if (typeof _input.data === "string")
            _input.data = JSON.parse(_input.data);
          if (Array.isArray(_input.data)) {
            if (!_input.fields)
              _input.fields = _input.meta && _input.meta.fields || _columns;
            if (!_input.fields)
              _input.fields = Array.isArray(_input.data[0]) ? _input.fields : typeof _input.data[0] === "object" ? Object.keys(_input.data[0]) : [];
            if (!Array.isArray(_input.data[0]) && typeof _input.data[0] !== "object")
              _input.data = [_input.data];
          }
          return serialize(_input.fields || [], _input.data || [], _skipEmptyLines);
        }
        throw new Error("Unable to serialize unrecognized input");
        function unpackConfig() {
          if (typeof _config !== "object")
            return;
          if (typeof _config.delimiter === "string" && !Papa2.BAD_DELIMITERS.filter(function(value) {
            return _config.delimiter.indexOf(value) !== -1;
          }).length) {
            _delimiter = _config.delimiter;
          }
          if (typeof _config.quotes === "boolean" || typeof _config.quotes === "function" || Array.isArray(_config.quotes))
            _quotes = _config.quotes;
          if (typeof _config.skipEmptyLines === "boolean" || typeof _config.skipEmptyLines === "string")
            _skipEmptyLines = _config.skipEmptyLines;
          if (typeof _config.newline === "string")
            _newline = _config.newline;
          if (typeof _config.quoteChar === "string") {
            _quoteChar = _config.quoteChar;
            _escapedQuote = _quoteChar + _quoteChar;
          }
          if (typeof _config.header === "boolean")
            _writeHeader = _config.header;
          if (Array.isArray(_config.columns)) {
            if (_config.columns.length === 0) throw new Error("Option columns is empty");
            _columns = _config.columns;
          }
          if (_config.escapeChar !== void 0) {
            _escapedQuote = _config.escapeChar + _quoteChar;
          }
          if (_config.escapeFormulae instanceof RegExp) {
            _escapeFormulae = _config.escapeFormulae;
          } else if (typeof _config.escapeFormulae === "boolean" && _config.escapeFormulae) {
            _escapeFormulae = /^[=+\-@\t\r].*$/;
          }
        }
        function serialize(fields, data, skipEmptyLines) {
          var csv = "";
          if (typeof fields === "string")
            fields = JSON.parse(fields);
          if (typeof data === "string")
            data = JSON.parse(data);
          var hasHeader = Array.isArray(fields) && fields.length > 0;
          var dataKeyedByField = !Array.isArray(data[0]);
          if (hasHeader && _writeHeader) {
            for (var i = 0; i < fields.length; i++) {
              if (i > 0)
                csv += _delimiter;
              csv += safe(fields[i], i);
            }
            if (data.length > 0)
              csv += _newline;
          }
          for (var row = 0; row < data.length; row++) {
            var maxCol = hasHeader ? fields.length : data[row].length;
            var emptyLine = false;
            var nullLine = hasHeader ? Object.keys(data[row]).length === 0 : data[row].length === 0;
            if (skipEmptyLines && !hasHeader) {
              emptyLine = skipEmptyLines === "greedy" ? data[row].join("").trim() === "" : data[row].length === 1 && data[row][0].length === 0;
            }
            if (skipEmptyLines === "greedy" && hasHeader) {
              var line = [];
              for (var c = 0; c < maxCol; c++) {
                var cx = dataKeyedByField ? fields[c] : c;
                line.push(data[row][cx]);
              }
              emptyLine = line.join("").trim() === "";
            }
            if (!emptyLine) {
              for (var col = 0; col < maxCol; col++) {
                if (col > 0 && !nullLine)
                  csv += _delimiter;
                var colIdx = hasHeader && dataKeyedByField ? fields[col] : col;
                csv += safe(data[row][colIdx], col);
              }
              if (row < data.length - 1 && (!skipEmptyLines || maxCol > 0 && !nullLine)) {
                csv += _newline;
              }
            }
          }
          return csv;
        }
        function safe(str, col) {
          if (typeof str === "undefined" || str === null)
            return "";
          if (str.constructor === Date) {
            if (isNaN(str.getTime()))
              return "";
            return str.toISOString();
          }
          var needsQuotes = false;
          if (_escapeFormulae && typeof str === "string" && _escapeFormulae.test(str)) {
            str = "'" + str;
            needsQuotes = true;
          }
          var strValue = str.toString();
          var escapedQuoteStr = strValue.replace(quoteCharRegex, _escapedQuote);
          needsQuotes = needsQuotes || _quotes === true || typeof _quotes === "function" && _quotes(str, col) || Array.isArray(_quotes) && _quotes[col] || hasAny(escapedQuoteStr, Papa2.BAD_DELIMITERS) || escapedQuoteStr.indexOf(_delimiter) > -1 || strValue.indexOf(_quoteChar) > -1 || escapedQuoteStr.charAt(0) === " " || escapedQuoteStr.charAt(escapedQuoteStr.length - 1) === " ";
          return needsQuotes ? _quoteChar + escapedQuoteStr + _quoteChar : escapedQuoteStr;
        }
        function hasAny(str, substrings) {
          for (var i = 0; i < substrings.length; i++)
            if (str.indexOf(substrings[i]) > -1)
              return true;
          return false;
        }
      }
      function ChunkStreamer(config) {
        this._handle = null;
        this._finished = false;
        this._completed = false;
        this._halted = false;
        this._input = null;
        this._baseIndex = 0;
        this._partialLine = "";
        this._rowCount = 0;
        this._start = 0;
        this._nextChunk = null;
        this.isFirstChunk = true;
        this._completeResults = {
          data: [],
          errors: [],
          meta: {}
        };
        replaceConfig.call(this, config);
        this.parseChunk = function(chunk, isFakeChunk) {
          const skipFirstNLines = parseInt(this._config.skipFirstNLines) || 0;
          if (this.isFirstChunk && skipFirstNLines > 0) {
            let _newline = this._config.newline;
            if (!_newline) {
              const quoteChar = this._config.quoteChar || '"';
              _newline = this._handle.guessLineEndings(chunk, quoteChar);
            }
            const splitChunk = chunk.split(_newline);
            chunk = [...splitChunk.slice(skipFirstNLines)].join(_newline);
          }
          if (this.isFirstChunk && isFunction(this._config.beforeFirstChunk)) {
            var modifiedChunk = this._config.beforeFirstChunk(chunk);
            if (modifiedChunk !== void 0)
              chunk = modifiedChunk;
          }
          this.isFirstChunk = false;
          this._halted = false;
          var aggregate = this._partialLine + chunk;
          this._partialLine = "";
          var results = this._handle.parse(aggregate, this._baseIndex, !this._finished);
          if (this._handle.paused() || this._handle.aborted()) {
            this._halted = true;
            return;
          }
          var lastIndex = results.meta.cursor;
          if (!this._finished) {
            this._partialLine = aggregate.substring(lastIndex - this._baseIndex);
            this._baseIndex = lastIndex;
          }
          if (results && results.data)
            this._rowCount += results.data.length;
          var finishedIncludingPreview = this._finished || this._config.preview && this._rowCount >= this._config.preview;
          if (IS_PAPA_WORKER) {
            global.postMessage({
              results,
              workerId: Papa2.WORKER_ID,
              finished: finishedIncludingPreview
            });
          } else if (isFunction(this._config.chunk) && !isFakeChunk) {
            this._config.chunk(results, this._handle);
            if (this._handle.paused() || this._handle.aborted()) {
              this._halted = true;
              return;
            }
            results = void 0;
            this._completeResults = void 0;
          }
          if (!this._config.step && !this._config.chunk) {
            this._completeResults.data = this._completeResults.data.concat(results.data);
            this._completeResults.errors = this._completeResults.errors.concat(results.errors);
            this._completeResults.meta = results.meta;
          }
          if (!this._completed && finishedIncludingPreview && isFunction(this._config.complete) && (!results || !results.meta.aborted)) {
            this._config.complete(this._completeResults, this._input);
            this._completed = true;
          }
          if (!finishedIncludingPreview && (!results || !results.meta.paused))
            this._nextChunk();
          return results;
        };
        this._sendError = function(error) {
          if (isFunction(this._config.error))
            this._config.error(error);
          else if (IS_PAPA_WORKER && this._config.error) {
            global.postMessage({
              workerId: Papa2.WORKER_ID,
              error,
              finished: false
            });
          }
        };
        function replaceConfig(config2) {
          var configCopy = copy(config2);
          configCopy.chunkSize = parseInt(configCopy.chunkSize);
          if (!config2.step && !config2.chunk)
            configCopy.chunkSize = null;
          this._handle = new ParserHandle(configCopy);
          this._handle.streamer = this;
          this._config = configCopy;
        }
      }
      function NetworkStreamer(config) {
        config = config || {};
        if (!config.chunkSize)
          config.chunkSize = Papa2.RemoteChunkSize;
        ChunkStreamer.call(this, config);
        var xhr;
        if (IS_WORKER) {
          this._nextChunk = function() {
            this._readChunk();
            this._chunkLoaded();
          };
        } else {
          this._nextChunk = function() {
            this._readChunk();
          };
        }
        this.stream = function(url) {
          this._input = url;
          this._nextChunk();
        };
        this._readChunk = function() {
          if (this._finished) {
            this._chunkLoaded();
            return;
          }
          xhr = new XMLHttpRequest();
          if (this._config.withCredentials) {
            xhr.withCredentials = this._config.withCredentials;
          }
          if (!IS_WORKER) {
            xhr.onload = bindFunction(this._chunkLoaded, this);
            xhr.onerror = bindFunction(this._chunkError, this);
          }
          xhr.ontimeout = bindFunction(this._chunkTimeout, this);
          xhr.open(this._config.downloadRequestBody ? "POST" : "GET", this._input, !IS_WORKER);
          if (this._config.downloadTimeout && !IS_WORKER) {
            xhr.timeout = this._config.downloadTimeout;
          }
          if (this._config.downloadRequestHeaders) {
            var headers = this._config.downloadRequestHeaders;
            for (var headerName in headers) {
              xhr.setRequestHeader(headerName, headers[headerName]);
            }
          }
          if (this._config.chunkSize) {
            var end = this._start + this._config.chunkSize - 1;
            xhr.setRequestHeader("Range", "bytes=" + this._start + "-" + end);
          }
          try {
            xhr.send(this._config.downloadRequestBody);
          } catch (err) {
            this._chunkError(err.message);
          }
          if (IS_WORKER && xhr.status === 0)
            this._chunkError();
        };
        this._chunkLoaded = function() {
          if (xhr.readyState !== 4)
            return;
          if (xhr.status < 200 || xhr.status >= 400) {
            this._chunkError();
            return;
          }
          this._start += this._config.chunkSize ? this._config.chunkSize : xhr.responseText.length;
          this._finished = !this._config.chunkSize || this._start >= getFileSize(xhr);
          this.parseChunk(xhr.responseText);
        };
        this._chunkError = function(errorMessage) {
          var errorText = xhr.statusText || errorMessage;
          this._sendError(new Error(errorText));
        };
        this._chunkTimeout = function() {
          this._chunkError("Request timed out after " + this._config.downloadTimeout + "ms");
        };
        function getFileSize(xhr2) {
          var contentRange = xhr2.getResponseHeader("Content-Range");
          if (contentRange === null) {
            return -1;
          }
          return parseInt(contentRange.substring(contentRange.lastIndexOf("/") + 1));
        }
      }
      NetworkStreamer.prototype = Object.create(ChunkStreamer.prototype);
      NetworkStreamer.prototype.constructor = NetworkStreamer;
      function FileStreamer(config) {
        config = config || {};
        if (!config.chunkSize)
          config.chunkSize = Papa2.LocalChunkSize;
        ChunkStreamer.call(this, config);
        var reader, slice;
        var usingAsyncReader = typeof FileReader !== "undefined";
        this.stream = function(file) {
          this._input = file;
          slice = file.slice || file.webkitSlice || file.mozSlice;
          if (usingAsyncReader) {
            reader = new FileReader();
            reader.onload = bindFunction(this._chunkLoaded, this);
            reader.onerror = bindFunction(this._chunkError, this);
          } else
            reader = new FileReaderSync();
          this._nextChunk();
        };
        this._nextChunk = function() {
          if (!this._finished && (!this._config.preview || this._rowCount < this._config.preview))
            this._readChunk();
        };
        this._readChunk = function() {
          var input = this._input;
          if (this._config.chunkSize) {
            var end = Math.min(this._start + this._config.chunkSize, this._input.size);
            input = slice.call(input, this._start, end);
          }
          var txt = reader.readAsText(input, this._config.encoding);
          if (!usingAsyncReader)
            this._chunkLoaded({ target: { result: txt } });
        };
        this._chunkLoaded = function(event) {
          this._start += this._config.chunkSize;
          this._finished = !this._config.chunkSize || this._start >= this._input.size;
          this.parseChunk(event.target.result);
        };
        this._chunkError = function() {
          this._sendError(reader.error);
        };
      }
      FileStreamer.prototype = Object.create(ChunkStreamer.prototype);
      FileStreamer.prototype.constructor = FileStreamer;
      function StringStreamer(config) {
        config = config || {};
        ChunkStreamer.call(this, config);
        var remaining;
        this.stream = function(s) {
          remaining = s;
          return this._nextChunk();
        };
        this._nextChunk = function() {
          if (this._finished) return;
          var size = this._config.chunkSize;
          var chunk;
          if (size) {
            chunk = remaining.substring(0, size);
            remaining = remaining.substring(size);
          } else {
            chunk = remaining;
            remaining = "";
          }
          this._finished = !remaining;
          return this.parseChunk(chunk);
        };
      }
      StringStreamer.prototype = Object.create(StringStreamer.prototype);
      StringStreamer.prototype.constructor = StringStreamer;
      function ReadableStreamStreamer(config) {
        config = config || {};
        ChunkStreamer.call(this, config);
        var queue = [];
        var parseOnData = true;
        var streamHasEnded = false;
        this.pause = function() {
          ChunkStreamer.prototype.pause.apply(this, arguments);
          this._input.pause();
        };
        this.resume = function() {
          ChunkStreamer.prototype.resume.apply(this, arguments);
          this._input.resume();
        };
        this.stream = function(stream) {
          this._input = stream;
          this._input.on("data", this._streamData);
          this._input.on("end", this._streamEnd);
          this._input.on("error", this._streamError);
        };
        this._checkIsFinished = function() {
          if (streamHasEnded && queue.length === 1) {
            this._finished = true;
          }
        };
        this._nextChunk = function() {
          this._checkIsFinished();
          if (queue.length) {
            this.parseChunk(queue.shift());
          } else {
            parseOnData = true;
          }
        };
        this._streamData = bindFunction(function(chunk) {
          try {
            queue.push(typeof chunk === "string" ? chunk : chunk.toString(this._config.encoding));
            if (parseOnData) {
              parseOnData = false;
              this._checkIsFinished();
              this.parseChunk(queue.shift());
            }
          } catch (error) {
            this._streamError(error);
          }
        }, this);
        this._streamError = bindFunction(function(error) {
          this._streamCleanUp();
          this._sendError(error);
        }, this);
        this._streamEnd = bindFunction(function() {
          this._streamCleanUp();
          streamHasEnded = true;
          this._streamData("");
        }, this);
        this._streamCleanUp = bindFunction(function() {
          this._input.removeListener("data", this._streamData);
          this._input.removeListener("end", this._streamEnd);
          this._input.removeListener("error", this._streamError);
        }, this);
      }
      ReadableStreamStreamer.prototype = Object.create(ChunkStreamer.prototype);
      ReadableStreamStreamer.prototype.constructor = ReadableStreamStreamer;
      function DuplexStreamStreamer(_config) {
        var Duplex = __require("stream").Duplex;
        var config = copy(_config);
        var parseOnWrite = true;
        var writeStreamHasFinished = false;
        var parseCallbackQueue = [];
        var stream = null;
        this._onCsvData = function(results) {
          var data = results.data;
          if (!stream.push(data) && !this._handle.paused()) {
            this._handle.pause();
          }
        };
        this._onCsvComplete = function() {
          stream.push(null);
        };
        config.step = bindFunction(this._onCsvData, this);
        config.complete = bindFunction(this._onCsvComplete, this);
        ChunkStreamer.call(this, config);
        this._nextChunk = function() {
          if (writeStreamHasFinished && parseCallbackQueue.length === 1) {
            this._finished = true;
          }
          if (parseCallbackQueue.length) {
            parseCallbackQueue.shift()();
          } else {
            parseOnWrite = true;
          }
        };
        this._addToParseQueue = function(chunk, callback) {
          parseCallbackQueue.push(bindFunction(function() {
            this.parseChunk(typeof chunk === "string" ? chunk : chunk.toString(config.encoding));
            if (isFunction(callback)) {
              return callback();
            }
          }, this));
          if (parseOnWrite) {
            parseOnWrite = false;
            this._nextChunk();
          }
        };
        this._onRead = function() {
          if (this._handle.paused()) {
            this._handle.resume();
          }
        };
        this._onWrite = function(chunk, encoding, callback) {
          this._addToParseQueue(chunk, callback);
        };
        this._onWriteComplete = function() {
          writeStreamHasFinished = true;
          this._addToParseQueue("");
        };
        this.getStream = function() {
          return stream;
        };
        stream = new Duplex({
          readableObjectMode: true,
          decodeStrings: false,
          read: bindFunction(this._onRead, this),
          write: bindFunction(this._onWrite, this)
        });
        stream.once("finish", bindFunction(this._onWriteComplete, this));
      }
      if (typeof PAPA_BROWSER_CONTEXT === "undefined") {
        DuplexStreamStreamer.prototype = Object.create(ChunkStreamer.prototype);
        DuplexStreamStreamer.prototype.constructor = DuplexStreamStreamer;
      }
      function ParserHandle(_config) {
        var MAX_FLOAT = Math.pow(2, 53);
        var MIN_FLOAT = -MAX_FLOAT;
        var FLOAT = /^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/;
        var ISO_DATE = /^((\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)))$/;
        var self2 = this;
        var _stepCounter = 0;
        var _rowCounter = 0;
        var _input;
        var _parser;
        var _paused = false;
        var _aborted = false;
        var _delimiterError;
        var _fields = [];
        var _results = {
          // The last results returned from the parser
          data: [],
          errors: [],
          meta: {}
        };
        if (isFunction(_config.step)) {
          var userStep = _config.step;
          _config.step = function(results) {
            _results = results;
            if (needsHeaderRow())
              processResults();
            else {
              processResults();
              if (_results.data.length === 0)
                return;
              _stepCounter += results.data.length;
              if (_config.preview && _stepCounter > _config.preview)
                _parser.abort();
              else {
                _results.data = _results.data[0];
                userStep(_results, self2);
              }
            }
          };
        }
        this.parse = function(input, baseIndex, ignoreLastRow) {
          var quoteChar = _config.quoteChar || '"';
          if (!_config.newline)
            _config.newline = this.guessLineEndings(input, quoteChar);
          _delimiterError = false;
          if (!_config.delimiter) {
            var delimGuess = guessDelimiter(input, _config.newline, _config.skipEmptyLines, _config.comments, _config.delimitersToGuess);
            if (delimGuess.successful)
              _config.delimiter = delimGuess.bestDelimiter;
            else {
              _delimiterError = true;
              _config.delimiter = Papa2.DefaultDelimiter;
            }
            _results.meta.delimiter = _config.delimiter;
          } else if (isFunction(_config.delimiter)) {
            _config.delimiter = _config.delimiter(input);
            _results.meta.delimiter = _config.delimiter;
          }
          var parserConfig = copy(_config);
          parserConfig.header = needsHeaderRow();
          if (_config.preview && _config.header)
            parserConfig.preview++;
          _input = input;
          _parser = new Parser(parserConfig);
          _results = _parser.parse(_input, baseIndex, ignoreLastRow);
          processResults();
          return _paused ? { meta: { paused: true } } : _results || { meta: { paused: false } };
        };
        this.paused = function() {
          return _paused;
        };
        this.pause = function() {
          _paused = true;
          _parser.abort();
          _input = isFunction(_config.chunk) ? "" : _input.substring(_parser.getCharIndex());
        };
        this.resume = function() {
          if (self2.streamer._halted) {
            _paused = false;
            self2.streamer.parseChunk(_input, true);
          } else {
            setTimeout(self2.resume, 3);
          }
        };
        this.aborted = function() {
          return _aborted;
        };
        this.abort = function() {
          _aborted = true;
          _parser.abort();
          _results.meta.aborted = true;
          if (isFunction(_config.complete))
            _config.complete(_results);
          _input = "";
        };
        this.guessLineEndings = function(input, quoteChar) {
          input = input.substring(0, 1024 * 1024);
          var re = new RegExp(escapeRegExp(quoteChar) + "([^]*?)" + escapeRegExp(quoteChar), "gm");
          input = input.replace(re, "");
          var r = input.split("\r");
          var n = input.split("\n");
          var nAppearsFirst = n.length > 1 && n[0].length < r[0].length;
          if (r.length === 1 || nAppearsFirst)
            return "\n";
          var numWithN = 0;
          for (var i = 0; i < r.length; i++) {
            if (r[i][0] === "\n")
              numWithN++;
          }
          return numWithN >= r.length / 2 ? "\r\n" : "\r";
        };
        function testEmptyLine(s) {
          return _config.skipEmptyLines === "greedy" ? s.join("").trim() === "" : s.length === 1 && s[0].length === 0;
        }
        function testFloat(s) {
          if (FLOAT.test(s)) {
            var floatValue = parseFloat(s);
            if (floatValue > MIN_FLOAT && floatValue < MAX_FLOAT) {
              return true;
            }
          }
          return false;
        }
        function processResults() {
          if (_results && _delimiterError) {
            addError("Delimiter", "UndetectableDelimiter", "Unable to auto-detect delimiting character; defaulted to '" + Papa2.DefaultDelimiter + "'");
            _delimiterError = false;
          }
          if (_config.skipEmptyLines) {
            _results.data = _results.data.filter(function(d) {
              return !testEmptyLine(d);
            });
          }
          if (needsHeaderRow())
            fillHeaderFields();
          return applyHeaderAndDynamicTypingAndTransformation();
        }
        function needsHeaderRow() {
          return _config.header && _fields.length === 0;
        }
        function fillHeaderFields() {
          if (!_results)
            return;
          function addHeader(header) {
            _fields.push(header);
          }
          if (Array.isArray(_results.data[0])) {
            for (var i = 0; needsHeaderRow() && i < _results.data.length; i++)
              _results.data[i].forEach(addHeader);
            _results.data.splice(0, 1);
          } else
            _results.data.forEach(addHeader);
        }
        function shouldApplyDynamicTyping(field) {
          if (_config.dynamicTypingFunction && _config.dynamicTyping[field] === void 0) {
            _config.dynamicTyping[field] = _config.dynamicTypingFunction(field);
          }
          return (_config.dynamicTyping[field] || _config.dynamicTyping) === true;
        }
        function parseDynamic(field, value) {
          if (shouldApplyDynamicTyping(field)) {
            if (value === "true" || value === "TRUE")
              return true;
            else if (value === "false" || value === "FALSE")
              return false;
            else if (testFloat(value))
              return parseFloat(value);
            else if (ISO_DATE.test(value))
              return new Date(value);
            else
              return value === "" ? null : value;
          }
          return value;
        }
        function applyHeaderAndDynamicTypingAndTransformation() {
          if (!_results || !_config.header && !_config.dynamicTyping && !_config.transform)
            return _results;
          function processRow(rowSource, i) {
            var row = _config.header ? {} : [];
            var j;
            for (j = 0; j < rowSource.length; j++) {
              var field = j;
              var value = rowSource[j];
              if (_config.header)
                field = j >= _fields.length ? "__parsed_extra" : _fields[j];
              if (_config.transform)
                value = _config.transform(value, field);
              value = parseDynamic(field, value);
              if (field === "__parsed_extra") {
                row[field] = row[field] || [];
                row[field].push(value);
              } else
                row[field] = value;
            }
            if (_config.header) {
              if (j > _fields.length)
                addError("FieldMismatch", "TooManyFields", "Too many fields: expected " + _fields.length + " fields but parsed " + j, _rowCounter + i);
              else if (j < _fields.length)
                addError("FieldMismatch", "TooFewFields", "Too few fields: expected " + _fields.length + " fields but parsed " + j, _rowCounter + i);
            }
            return row;
          }
          var incrementBy = 1;
          if (!_results.data.length || Array.isArray(_results.data[0])) {
            _results.data = _results.data.map(processRow);
            incrementBy = _results.data.length;
          } else
            _results.data = processRow(_results.data, 0);
          if (_config.header && _results.meta)
            _results.meta.fields = _fields;
          _rowCounter += incrementBy;
          return _results;
        }
        function guessDelimiter(input, newline, skipEmptyLines, comments, delimitersToGuess) {
          var bestDelim, bestDelta, fieldCountPrevRow, maxFieldCount;
          delimitersToGuess = delimitersToGuess || [",", "	", "|", ";", Papa2.RECORD_SEP, Papa2.UNIT_SEP];
          for (var i = 0; i < delimitersToGuess.length; i++) {
            var delim = delimitersToGuess[i];
            var delta = 0, avgFieldCount = 0, emptyLinesCount = 0;
            fieldCountPrevRow = void 0;
            var preview = new Parser({
              comments,
              delimiter: delim,
              newline,
              preview: 10
            }).parse(input);
            for (var j = 0; j < preview.data.length; j++) {
              if (skipEmptyLines && testEmptyLine(preview.data[j])) {
                emptyLinesCount++;
                continue;
              }
              var fieldCount = preview.data[j].length;
              avgFieldCount += fieldCount;
              if (typeof fieldCountPrevRow === "undefined") {
                fieldCountPrevRow = fieldCount;
                continue;
              } else if (fieldCount > 0) {
                delta += Math.abs(fieldCount - fieldCountPrevRow);
                fieldCountPrevRow = fieldCount;
              }
            }
            if (preview.data.length > 0)
              avgFieldCount /= preview.data.length - emptyLinesCount;
            if (avgFieldCount > 1.99 && (typeof bestDelta === "undefined" || delta < bestDelta || delta === bestDelta && avgFieldCount > maxFieldCount)) {
              bestDelta = delta;
              bestDelim = delim;
              maxFieldCount = avgFieldCount;
            }
          }
          _config.delimiter = bestDelim;
          return {
            successful: !!bestDelim,
            bestDelimiter: bestDelim
          };
        }
        function addError(type, code, msg, row) {
          var error = {
            type,
            code,
            message: msg
          };
          if (row !== void 0) {
            error.row = row;
          }
          _results.errors.push(error);
        }
      }
      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function Parser(config) {
        config = config || {};
        var delim = config.delimiter;
        var newline = config.newline;
        var comments = config.comments;
        var step = config.step;
        var preview = config.preview;
        var fastMode = config.fastMode;
        var quoteChar;
        var renamedHeaders = null;
        var headerParsed = false;
        if (config.quoteChar === void 0 || config.quoteChar === null) {
          quoteChar = '"';
        } else {
          quoteChar = config.quoteChar;
        }
        var escapeChar = quoteChar;
        if (config.escapeChar !== void 0) {
          escapeChar = config.escapeChar;
        }
        if (typeof delim !== "string" || Papa2.BAD_DELIMITERS.indexOf(delim) > -1)
          delim = ",";
        if (comments === delim)
          throw new Error("Comment character same as delimiter");
        else if (comments === true)
          comments = "#";
        else if (typeof comments !== "string" || Papa2.BAD_DELIMITERS.indexOf(comments) > -1)
          comments = false;
        if (newline !== "\n" && newline !== "\r" && newline !== "\r\n")
          newline = "\n";
        var cursor = 0;
        var aborted = false;
        this.parse = function(input, baseIndex, ignoreLastRow) {
          if (typeof input !== "string")
            throw new Error("Input must be a string");
          var inputLen = input.length, delimLen = delim.length, newlineLen = newline.length, commentsLen = comments.length;
          var stepIsFunction = isFunction(step);
          cursor = 0;
          var data = [], errors = [], row = [], lastCursor = 0;
          if (!input)
            return returnable();
          if (fastMode || fastMode !== false && input.indexOf(quoteChar) === -1) {
            var rows = input.split(newline);
            for (var i = 0; i < rows.length; i++) {
              row = rows[i];
              cursor += row.length;
              if (i !== rows.length - 1)
                cursor += newline.length;
              else if (ignoreLastRow)
                return returnable();
              if (comments && row.substring(0, commentsLen) === comments)
                continue;
              if (stepIsFunction) {
                data = [];
                pushRow(row.split(delim));
                doStep();
                if (aborted)
                  return returnable();
              } else
                pushRow(row.split(delim));
              if (preview && i >= preview) {
                data = data.slice(0, preview);
                return returnable(true);
              }
            }
            return returnable();
          }
          var nextDelim = input.indexOf(delim, cursor);
          var nextNewline = input.indexOf(newline, cursor);
          var quoteCharRegex = new RegExp(escapeRegExp(escapeChar) + escapeRegExp(quoteChar), "g");
          var quoteSearch = input.indexOf(quoteChar, cursor);
          for (; ; ) {
            if (input[cursor] === quoteChar) {
              quoteSearch = cursor;
              cursor++;
              for (; ; ) {
                quoteSearch = input.indexOf(quoteChar, quoteSearch + 1);
                if (quoteSearch === -1) {
                  if (!ignoreLastRow) {
                    errors.push({
                      type: "Quotes",
                      code: "MissingQuotes",
                      message: "Quoted field unterminated",
                      row: data.length,
                      // row has yet to be inserted
                      index: cursor
                    });
                  }
                  return finish();
                }
                if (quoteSearch === inputLen - 1) {
                  var value = input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar);
                  return finish(value);
                }
                if (quoteChar === escapeChar && input[quoteSearch + 1] === escapeChar) {
                  quoteSearch++;
                  continue;
                }
                if (quoteChar !== escapeChar && quoteSearch !== 0 && input[quoteSearch - 1] === escapeChar) {
                  continue;
                }
                if (nextDelim !== -1 && nextDelim < quoteSearch + 1) {
                  nextDelim = input.indexOf(delim, quoteSearch + 1);
                }
                if (nextNewline !== -1 && nextNewline < quoteSearch + 1) {
                  nextNewline = input.indexOf(newline, quoteSearch + 1);
                }
                var checkUpTo = nextNewline === -1 ? nextDelim : Math.min(nextDelim, nextNewline);
                var spacesBetweenQuoteAndDelimiter = extraSpaces(checkUpTo);
                if (input.substr(quoteSearch + 1 + spacesBetweenQuoteAndDelimiter, delimLen) === delim) {
                  row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar));
                  cursor = quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen;
                  if (input[quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen] !== quoteChar) {
                    quoteSearch = input.indexOf(quoteChar, cursor);
                  }
                  nextDelim = input.indexOf(delim, cursor);
                  nextNewline = input.indexOf(newline, cursor);
                  break;
                }
                var spacesBetweenQuoteAndNewLine = extraSpaces(nextNewline);
                if (input.substring(quoteSearch + 1 + spacesBetweenQuoteAndNewLine, quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen) === newline) {
                  row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar));
                  saveRow(quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen);
                  nextDelim = input.indexOf(delim, cursor);
                  quoteSearch = input.indexOf(quoteChar, cursor);
                  if (stepIsFunction) {
                    doStep();
                    if (aborted)
                      return returnable();
                  }
                  if (preview && data.length >= preview)
                    return returnable(true);
                  break;
                }
                errors.push({
                  type: "Quotes",
                  code: "InvalidQuotes",
                  message: "Trailing quote on quoted field is malformed",
                  row: data.length,
                  // row has yet to be inserted
                  index: cursor
                });
                quoteSearch++;
                continue;
              }
              continue;
            }
            if (comments && row.length === 0 && input.substring(cursor, cursor + commentsLen) === comments) {
              if (nextNewline === -1)
                return returnable();
              cursor = nextNewline + newlineLen;
              nextNewline = input.indexOf(newline, cursor);
              nextDelim = input.indexOf(delim, cursor);
              continue;
            }
            if (nextDelim !== -1 && (nextDelim < nextNewline || nextNewline === -1)) {
              row.push(input.substring(cursor, nextDelim));
              cursor = nextDelim + delimLen;
              nextDelim = input.indexOf(delim, cursor);
              continue;
            }
            if (nextNewline !== -1) {
              row.push(input.substring(cursor, nextNewline));
              saveRow(nextNewline + newlineLen);
              if (stepIsFunction) {
                doStep();
                if (aborted)
                  return returnable();
              }
              if (preview && data.length >= preview)
                return returnable(true);
              continue;
            }
            break;
          }
          return finish();
          function pushRow(row2) {
            data.push(row2);
            lastCursor = cursor;
          }
          function extraSpaces(index) {
            var spaceLength = 0;
            if (index !== -1) {
              var textBetweenClosingQuoteAndIndex = input.substring(quoteSearch + 1, index);
              if (textBetweenClosingQuoteAndIndex && textBetweenClosingQuoteAndIndex.trim() === "") {
                spaceLength = textBetweenClosingQuoteAndIndex.length;
              }
            }
            return spaceLength;
          }
          function finish(value2) {
            if (ignoreLastRow)
              return returnable();
            if (typeof value2 === "undefined")
              value2 = input.substring(cursor);
            row.push(value2);
            cursor = inputLen;
            pushRow(row);
            if (stepIsFunction)
              doStep();
            return returnable();
          }
          function saveRow(newCursor) {
            cursor = newCursor;
            pushRow(row);
            row = [];
            nextNewline = input.indexOf(newline, cursor);
          }
          function returnable(stopped) {
            if (config.header && !baseIndex && data.length && !headerParsed) {
              const result = data[0];
              const headerCount = /* @__PURE__ */ Object.create(null);
              const usedHeaders = new Set(result);
              let duplicateHeaders = false;
              for (let i2 = 0; i2 < result.length; i2++) {
                let header = stripBom(result[i2]);
                if (isFunction(config.transformHeader))
                  header = config.transformHeader(header, i2);
                if (!headerCount[header]) {
                  headerCount[header] = 1;
                  result[i2] = header;
                } else {
                  let newHeader;
                  let suffixCount = headerCount[header];
                  do {
                    newHeader = `${header}_${suffixCount}`;
                    suffixCount++;
                  } while (usedHeaders.has(newHeader));
                  usedHeaders.add(newHeader);
                  result[i2] = newHeader;
                  headerCount[header]++;
                  duplicateHeaders = true;
                  if (renamedHeaders === null) {
                    renamedHeaders = {};
                  }
                  renamedHeaders[newHeader] = header;
                }
                usedHeaders.add(header);
              }
              if (duplicateHeaders) {
                console.warn("Duplicate headers found and renamed.");
              }
              headerParsed = true;
            }
            return {
              data,
              errors,
              meta: {
                delimiter: delim,
                linebreak: newline,
                aborted,
                truncated: !!stopped,
                cursor: lastCursor + (baseIndex || 0),
                renamedHeaders
              }
            };
          }
          function doStep() {
            step(returnable());
            data = [];
            errors = [];
          }
        };
        this.abort = function() {
          aborted = true;
        };
        this.getCharIndex = function() {
          return cursor;
        };
      }
      function newWorker() {
        if (!Papa2.WORKERS_SUPPORTED)
          return false;
        var workerUrl = getWorkerBlob();
        var w = new global.Worker(workerUrl);
        w.onmessage = mainThreadReceivedMessage;
        w.id = workerIdCounter++;
        workers[w.id] = w;
        return w;
      }
      function mainThreadReceivedMessage(e) {
        var msg = e.data;
        var worker = workers[msg.workerId];
        var aborted = false;
        if (msg.error)
          worker.userError(msg.error, msg.file);
        else if (msg.results && msg.results.data) {
          var abort = function() {
            aborted = true;
            completeWorker(msg.workerId, { data: [], errors: [], meta: { aborted: true } });
          };
          var handle = {
            abort,
            pause: notImplemented,
            resume: notImplemented
          };
          if (isFunction(worker.userStep)) {
            for (var i = 0; i < msg.results.data.length; i++) {
              worker.userStep({
                data: msg.results.data[i],
                errors: msg.results.errors,
                meta: msg.results.meta
              }, handle);
              if (aborted)
                break;
            }
            delete msg.results;
          } else if (isFunction(worker.userChunk)) {
            worker.userChunk(msg.results, handle, msg.file);
            delete msg.results;
          }
        }
        if (msg.finished && !aborted)
          completeWorker(msg.workerId, msg.results);
      }
      function completeWorker(workerId, results) {
        var worker = workers[workerId];
        if (isFunction(worker.userComplete))
          worker.userComplete(results);
        worker.terminate();
        delete workers[workerId];
      }
      function notImplemented() {
        throw new Error("Not implemented.");
      }
      function workerThreadReceivedMessage(e) {
        var msg = e.data;
        if (typeof Papa2.WORKER_ID === "undefined" && msg)
          Papa2.WORKER_ID = msg.workerId;
        if (typeof msg.input === "string") {
          global.postMessage({
            workerId: Papa2.WORKER_ID,
            results: Papa2.parse(msg.input, msg.config),
            finished: true
          });
        } else if (global.File && msg.input instanceof File || msg.input instanceof Object) {
          var results = Papa2.parse(msg.input, msg.config);
          if (results)
            global.postMessage({
              workerId: Papa2.WORKER_ID,
              results,
              finished: true
            });
        }
      }
      function copy(obj) {
        if (typeof obj !== "object" || obj === null)
          return obj;
        var cpy = Array.isArray(obj) ? [] : {};
        for (var key in obj)
          cpy[key] = copy(obj[key]);
        return cpy;
      }
      function bindFunction(f, self2) {
        return function() {
          f.apply(self2, arguments);
        };
      }
      function isFunction(func) {
        return typeof func === "function";
      }
      return Papa2;
    });
  }
});

// src/jobs.ts
function createJobRunner() {
  let chain = Promise.resolve();
  let running = false;
  let currentOp;
  const failed = [];
  return {
    enqueue(op, work) {
      const run = chain.then(async () => {
        running = true;
        currentOp = op;
        try {
          return await work();
        } catch (error) {
          failed.push({
            op,
            message: error instanceof Error ? error.message : String(error),
            at: Date.now()
          });
          if (failed.length > 20) failed.shift();
          throw error;
        } finally {
          running = false;
          currentOp = void 0;
        }
      });
      chain = run.then(() => void 0, () => void 0);
      return run;
    },
    status() {
      return { running, op: currentOp, failed: failed.slice(-20) };
    }
  };
}

// src/identity.ts
var PACKAGE_NAME = "dsh-zhiyuan";
var DATA_DIR_NAME = "dsh-zhiyuan";
var COMMAND_NAME = "kb";
var DEFAULT_MAX_FILE_BYTES = 5242880;
var DEFAULT_MAX_BASE_BYTES = 10737418240;
var MAX_ALIASES = 8;
var SEARCH_CONTEXT = 8;
var SEARCH_LIST_CONTEXT = 2;
var SEARCH_PAGE_MAX_CHARS = 4e3;
var SEARCH_REST_FILES_LIMIT = 8;
var CSV_MAX_PHYSICAL_LINE_BYTES = 64 * 1024;
var CSV_MAX_IMPORT_BYTES = 20 * 1024 * 1024;
var CSV_PREVIEW_MAX_CHARS = 2e5;
var CSV_PREVIEW_MAX_BYTES = CSV_MAX_IMPORT_BYTES;
var CSV_PREVIEW_MAX_ROWS = 500;
var TABLE_EDITOR_PAGE_SIZE = 200;
var CSV_MAX_PATCH_CHANGES = 1e4;
var MARK_USED_THROTTLE_MS = 6e4;
var SEARCH_RG_MAX_COUNT_PER_FILE = 200;
var SEARCH_RG_MAX_FILESIZE = "20M";
var SEARCH_RG_MAX_STDOUT_BYTES = 2 * 1024 * 1024;
var SEARCH_RG_TIMEOUT_MS = 2e4;
var CATEGORY_WARN_DEPTH = 4;

// src/catalog.ts
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join as join3 } from "node:path";

// src/paths.ts
import { existsSync as existsSync2, lstatSync, realpathSync } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { isAbsolute, join as join2, normalize, relative, resolve, sep } from "node:path";

// src/host-resolve.ts
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
function existingFile(...parts) {
  const path = join(...parts);
  return existsSync(path) ? path : void 0;
}
function dshModuleRoots() {
  const roots = [];
  const home = process.env.DSH_HOME || join(homedir(), ".dsh");
  roots.push(join(home, "profiles", "node_modules"));
  roots.push(join(home, "node_modules"));
  if (process.platform === "darwin") {
    const launcher = join(
      homedir(),
      "Library/Application Support/io.deepseek.DeepSeek.deepseek-harness-launcher/dsh"
    );
    if (existsSync(launcher)) {
      try {
        for (const name2 of readdirSync(launcher)) {
          roots.push(join(launcher, name2, "node_modules"));
        }
      } catch {
      }
    }
  }
  return roots;
}
function resolveDshPackage(pkg, file) {
  for (const root of dshModuleRoots()) {
    const path = existingFile(root, pkg, file);
    if (path) return pathToFileURL(path).href;
  }
  return void 0;
}
async function importDsh(pkg, file) {
  const href = resolveDshPackage(pkg, file);
  if (!href) return void 0;
  return await import(href);
}

// src/types.ts
var KbError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "KbError";
    this.code = code;
  }
};

// src/paths.ts
var cachedDataRoot;
function fallbackDataRoot() {
  const home = process.env.DSH_HOME || join2(homedir2(), ".dsh");
  return join2(home, "data", DATA_DIR_NAME);
}
async function resolveDataRoot() {
  if (cachedDataRoot) return cachedDataRoot;
  const homePaths = await importDsh(
    "@deepseek-ai/dsh-home-paths",
    "lib/index.js"
  );
  cachedDataRoot = homePaths?.dshHomePath ? homePaths.dshHomePath("data", DATA_DIR_NAME) : fallbackDataRoot();
  return cachedDataRoot;
}
function clearDataRootCache() {
  cachedDataRoot = void 0;
}
function basesRoot(dataRoot) {
  return join2(dataRoot, "bases");
}
function baseDir(dataRoot, baseId) {
  return join2(basesRoot(dataRoot), baseId);
}
function catalogPath(dataRoot) {
  return join2(dataRoot, "catalog.json");
}
function splitCategory(destinationCategory) {
  return destinationCategory.replaceAll("\\", "/").split("/").map((part) => part.trim()).filter(Boolean);
}
function assertInside(baseRoot, candidatePath) {
  const absoluteRoot = resolve(baseRoot);
  const absoluteCandidate = resolve(candidatePath);
  const relativePath = relative(absoluteRoot, absoluteCandidate);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new KbError("path_escape", `\u8DEF\u5F84\u5FC5\u987B\u4ECD\u5728 ${absoluteRoot} \u4E0B`);
  }
  return absoluteCandidate;
}
function rejectEscapeTokens(segments) {
  for (const part of segments) {
    if (part === ".." || part === "." || part.includes("\0")) {
      throw new KbError("path_escape", "\u7C7B\u76EE\u4E0D\u80FD\u5305\u542B .. \u6216\u7EDD\u5BF9\u8DEF\u5F84");
    }
    if (part.includes(":") && part.length <= 2) {
      throw new KbError("path_escape", "\u7C7B\u76EE\u4E0D\u80FD\u5305\u542B\u7EDD\u5BF9\u8DEF\u5F84");
    }
  }
}
function resolveDest(dataRoot, baseId, destinationCategory) {
  if (isAbsolute(destinationCategory) || destinationCategory.startsWith("~")) {
    throw new KbError("path_escape", "\u7C7B\u76EE\u5FC5\u987B\u662F\u5E93\u5185\u76F8\u5BF9\u8DEF\u5F84");
  }
  const categorySegments = splitCategory(destinationCategory);
  rejectEscapeTokens(categorySegments);
  const baseRoot = baseDir(dataRoot, baseId);
  const absoluteDestination = assertInside(baseRoot, join2(baseRoot, ...categorySegments));
  const normalizedRelativePath = relative(baseRoot, absoluteDestination).split(sep).join("/");
  if (normalizedRelativePath === ".." || normalizedRelativePath.startsWith("../")) {
    throw new KbError("path_escape", "\u89E3\u6790\u540E\u7684\u8DEF\u5F84\u9003\u51FA\u4E86\u5F53\u524D\u5E93");
  }
  return {
    relative: normalizedRelativePath === "." ? "" : normalizedRelativePath,
    absolute: absoluteDestination,
    segments: categorySegments,
    deep: categorySegments.length > 4
  };
}
function assertNoSymlinkEscape(baseRoot, candidatePath) {
  const absoluteRoot = resolve(baseRoot);
  let currentPath = candidatePath;
  while (true) {
    if (existsSync2(currentPath)) {
      const stat5 = lstatSync(currentPath);
      if (stat5.isSymbolicLink()) {
        const realPath = realpathSync(currentPath);
        const relativeRealPath = relative(absoluteRoot, realPath);
        if (relativeRealPath.startsWith("..") || isAbsolute(relativeRealPath)) {
          throw new KbError("path_escape", "\u7B26\u53F7\u94FE\u63A5\u4E0D\u80FD\u9003\u51FA\u77E5\u8BC6\u5E93\u76EE\u5F55");
        }
      }
    }
    const parentPath = resolve(currentPath, "..");
    if (parentPath === currentPath || relative(absoluteRoot, parentPath).startsWith("..")) break;
    currentPath = parentPath;
  }
}
function expandUserPath(sourcePath) {
  if (sourcePath === "~") return homedir2();
  if (sourcePath.startsWith("~/") || sourcePath.startsWith("~\\")) {
    return join2(homedir2(), sourcePath.slice(2));
  }
  return normalize(sourcePath);
}

// src/catalog.ts
var catalogChain = Promise.resolve();
var catalogWarningSink;
function setCatalogWarningSink(sink) {
  catalogWarningSink = sink;
}
function warnOnUnknownVersion(raw) {
  const record = raw && typeof raw === "object" ? raw : {};
  if (record.version !== void 0 && record.version !== 1) {
    catalogWarningSink?.(`catalog.json version \u4E3A ${String(record.version)}\uFF0C\u5DF2\u6309 version 1 \u89E3\u6790`);
  }
}
function emptyCatalog() {
  return {
    version: 1,
    lastUsedBaseId: "",
    prefs: {
      defaultBaseId: "",
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxBaseBytes: DEFAULT_MAX_BASE_BYTES
    },
    bases: []
  };
}
function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function asNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function parseCard(value) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  const id = asString(record.id);
  const title = asString(record.title).trim();
  if (!id) return null;
  const aliases = Array.isArray(record.aliases) ? record.aliases.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
  const card = {
    id,
    title,
    description: asString(record.description),
    aliases,
    createdAt: asNumber(record.createdAt, 0),
    lastUsedAt: asNumber(record.lastUsedAt, 0)
  };
  if (typeof record.lastDestCategory === "string") card.lastDestCategory = record.lastDestCategory;
  return card;
}
function parsePrefs(value) {
  const record = value && typeof value === "object" ? value : {};
  return {
    defaultBaseId: asString(record.defaultBaseId),
    maxFileBytes: asNumber(record.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxBaseBytes: asNumber(record.maxBaseBytes, DEFAULT_MAX_BASE_BYTES)
  };
}
function parseCatalog(raw) {
  const record = raw && typeof raw === "object" ? raw : {};
  const bases = Array.isArray(record.bases) ? record.bases.map(parseCard).filter((card) => Boolean(card)) : [];
  return {
    version: 1,
    lastUsedBaseId: asString(record.lastUsedBaseId),
    prefs: parsePrefs(record.prefs),
    bases
  };
}
async function readCatalog(dataRoot) {
  try {
    const text2 = await readFile(catalogPath(dataRoot), "utf8");
    const raw = JSON.parse(text2);
    warnOnUnknownVersion(raw);
    return parseCatalog(raw);
  } catch (error) {
    const code = error.code;
    if (code === "ENOENT") return emptyCatalog();
    throw error;
  }
}
async function withCatalogLock(work) {
  const run = catalogChain.then(work, work);
  catalogChain = run.then(() => void 0, () => void 0);
  return run;
}
async function withCatalogTx(dataRoot, work) {
  return withCatalogLock(async () => {
    const catalog = await readCatalog(dataRoot);
    const outcome = await work({ dataRoot, catalog });
    if (outcome.catalog) await writeCatalog(dataRoot, outcome.catalog);
    return outcome.result;
  });
}
async function writeCatalog(dataRoot, catalog) {
  const file = catalogPath(dataRoot);
  await mkdir(dirname(file), { recursive: true });
  const temporaryPath = join3(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}
`, { flag: "wx" });
    await rename(temporaryPath, file);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => void 0);
    throw error;
  }
}
function upsertBase(catalog, card) {
  const remainingCards = catalog.bases.filter((item) => item.id !== card.id);
  return { ...catalog, bases: [...remainingCards, card] };
}
function removeBase(catalog, id) {
  return {
    ...catalog,
    bases: catalog.bases.filter((item) => item.id !== id),
    lastUsedBaseId: catalog.lastUsedBaseId === id ? "" : catalog.lastUsedBaseId,
    prefs: {
      ...catalog.prefs,
      defaultBaseId: catalog.prefs.defaultBaseId === id ? "" : catalog.prefs.defaultBaseId
    }
  };
}
async function lastDestCategory(dataRoot, baseId) {
  const catalog = await readCatalog(dataRoot);
  return catalog.bases.find((card) => card.id === baseId)?.lastDestCategory;
}
async function rememberLastDest(dataRoot, baseId, destCategory) {
  await withCatalogTx(dataRoot, ({ catalog }) => {
    const currentCard = catalog.bases.find((card) => card.id === baseId);
    if (!currentCard || currentCard.lastDestCategory === destCategory) return { result: void 0 };
    currentCard.lastDestCategory = destCategory;
    return { result: void 0, catalog };
  });
}
function cleanAliases(aliases) {
  if (!aliases) return [];
  const seen = /* @__PURE__ */ new Set();
  const cleanedAliases = [];
  for (const rawAlias of aliases) {
    const value = rawAlias.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    cleanedAliases.push(value);
  }
  return cleanedAliases;
}

// src/ingest.ts
import { existsSync as existsSync3 } from "node:fs";
import { mkdir as mkdir5, readdir as readdir2, stat as stat4 } from "node:fs/promises";
import { basename as basename3, dirname as dirname4, extname as extname2, isAbsolute as isAbsolute2, join as join6, relative as relative3, sep as sep3 } from "node:path";

// src/bases.ts
import { mkdir as mkdir4, readdir, rm as rm3, stat as stat2 } from "node:fs/promises";
import { randomUUID as randomUUID3 } from "node:crypto";
import { join as join5, relative as relative2, sep as sep2 } from "node:path";

// src/content/host-registry.ts
import { extname } from "node:path";

// src/content/api.ts
var SourceFormat = {
  Markdown: "markdown",
  PlainText: "plain-text",
  Csv: "csv",
  Xlsx: "xlsx"
};
var EntryFormat = {
  Markdown: "markdown",
  Csv: "csv"
};
var EntryContentKind = {
  Text: "text",
  Table: "table"
};
var EntryPreviewView = {
  Tree: "tree",
  SearchHit: "search-hit"
};
var EntryReadMode = {
  Preview: "preview",
  Edit: "edit"
};
function isEntryPreviewView(value) {
  return value === EntryPreviewView.Tree || value === EntryPreviewView.SearchHit;
}
function isEntryReadMode(value) {
  return value === EntryReadMode.Preview || value === EntryReadMode.Edit;
}

// src/content/csv/server/import.ts
import { createHash } from "node:crypto";

// src/content/csv/server/encoding.ts
import { open } from "node:fs/promises";

// src/content/shared/utf8.ts
var UTF8_BOM = Buffer.from([239, 187, 191]);
function stripUtf8Bom(text2) {
  return text2.startsWith("\uFEFF") ? text2.slice(1) : text2;
}
function normalizeCsvNewlines(text2) {
  return text2.replace(/\r\n|\r/g, "\n");
}
function encodeUtf8CsvWithBom(text2) {
  return Buffer.concat([UTF8_BOM, Buffer.from(stripUtf8Bom(text2), "utf8")]);
}

// src/content/csv/server/decode.ts
var gb18030Available;
function isGb18030Available() {
  if (gb18030Available !== void 0) return gb18030Available;
  try {
    void new TextDecoder("gb18030", { fatal: true });
    gb18030Available = true;
  } catch {
    gb18030Available = false;
  }
  return gb18030Available;
}
function decodeWith(encoding, bytes) {
  try {
    return stripUtf8Bom(new TextDecoder(encoding, { fatal: true }).decode(bytes));
  } catch {
    return void 0;
  }
}
function startsWith(bytes, signature) {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}
function decodeCsvBytes(bytes) {
  if (startsWith(bytes, [239, 187, 191])) {
    const text2 = decodeWith("utf-8", bytes);
    if (text2 === void 0) return { ok: false, code: "csv_encoding_invalid", message: "CSV \u4E0D\u662F\u6709\u6548\u7684 UTF-8 \u6587\u4EF6" };
    return { ok: true, text: text2, encoding: "utf-8", warnings: [] };
  }
  if (startsWith(bytes, [255, 254])) {
    const text2 = decodeWith("utf-16le", bytes);
    if (text2 === void 0) return { ok: false, code: "csv_encoding_invalid", message: "CSV \u4E0D\u662F\u6709\u6548\u7684 UTF-16 \u6587\u4EF6" };
    return { ok: true, text: text2, encoding: "utf-16le", warnings: [] };
  }
  if (startsWith(bytes, [254, 255])) {
    const text2 = decodeWith("utf-16be", bytes);
    if (text2 === void 0) return { ok: false, code: "csv_encoding_invalid", message: "CSV \u4E0D\u662F\u6709\u6548\u7684 UTF-16 \u6587\u4EF6" };
    return { ok: true, text: text2, encoding: "utf-16be", warnings: [] };
  }
  const utf8 = decodeWith("utf-8", bytes);
  if (utf8 !== void 0) return { ok: true, text: utf8, encoding: "utf-8", warnings: [] };
  if (!isGb18030Available()) {
    return { ok: false, code: "encoding_unsupported", message: "\u5F53\u524D\u8FD0\u884C\u73AF\u5883\u65E0\u6CD5\u89E3\u7801 GB18030 CSV" };
  }
  const gb18030 = decodeWith("gb18030", bytes);
  if (gb18030 === void 0) {
    return { ok: false, code: "csv_encoding_invalid", message: "\u65E0\u6CD5\u6309 UTF-8 / UTF-16 / GB18030 \u89E3\u7801\u8BE5 CSV" };
  }
  return {
    ok: true,
    text: gb18030,
    encoding: "gb18030",
    warnings: ["encoding_assumed_gb18030\uFF1A\u5DF2\u6309 GB18030 \u89E3\u7801\uFF0C\u5E76\u5199\u6210 UTF-8"]
  };
}

// src/content/csv/server/encoding.ts
var READ_CHUNK_BYTES = 64 * 1024;
var CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F]/u;
async function readBoundedBuffer(sourcePath, maxBytes) {
  const limit = Math.floor(maxBytes);
  if (!Number.isSafeInteger(limit) || limit < 0) return null;
  const handle = await open(sourcePath, "r");
  try {
    const chunks = [];
    let total = 0;
    while (total <= limit) {
      const remaining = limit + 1 - total;
      const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, remaining));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (!bytesRead) break;
      chunks.push(chunk.subarray(0, bytesRead));
      total += bytesRead;
    }
    if (total > limit) return null;
    return Buffer.concat(chunks, total);
  } finally {
    await handle.close();
  }
}
function hasInvalidControlCharacter(text2) {
  return CONTROL_CHARACTER_PATTERN.test(text2);
}
function lineContentBytes(bytes, start, end, lineNumber) {
  let length = end - start;
  if (length > 0 && bytes[end - 1] === 13) length -= 1;
  if (lineNumber === 1 && bytes.subarray(start, Math.min(end, start + 3)).equals(Buffer.from([239, 187, 191]))) {
    length -= 3;
  }
  return Math.max(0, length);
}
function hasOverlongPhysicalLine(bytes) {
  let lineStart = 0;
  let lineNumber = 1;
  for (let index = 0; index < bytes.length; index += 1) {
    const isLineFeed = bytes[index] === 10;
    const isStandaloneCarriageReturn = bytes[index] === 13 && bytes[index + 1] !== 10;
    if (!isLineFeed && !isStandaloneCarriageReturn) continue;
    if (lineContentBytes(bytes, lineStart, index, lineNumber) > CSV_MAX_PHYSICAL_LINE_BYTES) return true;
    lineStart = index + 1;
    lineNumber += 1;
  }
  return lineContentBytes(bytes, lineStart, bytes.length, lineNumber) > CSV_MAX_PHYSICAL_LINE_BYTES;
}
async function readValidatedUtf8Csv(sourcePath, maxBytes) {
  const bytes = await readBoundedBuffer(sourcePath, maxBytes);
  if (!bytes) {
    return { ok: false, code: "file_too_large", message: "\u6587\u4EF6\u8D85\u8FC7\u5927\u5C0F\u4E0A\u9650\uFF0C\u672A\u5BFC\u5165" };
  }
  return validateUtf8CsvBytes(bytes, maxBytes);
}
async function readNormalizedImportCsv(sourcePath, maxBytes) {
  const sourceBytes = await readBoundedBuffer(sourcePath, maxBytes);
  if (!sourceBytes) {
    return { ok: false, code: "file_too_large", message: "\u6587\u4EF6\u8D85\u8FC7\u5927\u5C0F\u4E0A\u9650\uFF0C\u672A\u5BFC\u5165" };
  }
  const decoded = decodeCsvBytes(sourceBytes);
  if (!decoded.ok) return decoded;
  const text2 = normalizeCsvNewlines(decoded.text);
  if (!text2) return { ok: false, code: "csv_encoding_invalid", message: "CSV \u89E3\u7801\u540E\u4E3A\u7A7A\uFF0C\u672A\u5BFC\u5165" };
  const normalized = validateUtf8CsvBytes(encodeUtf8CsvWithBom(text2), maxBytes);
  if (!normalized.ok) return normalized;
  return { ok: true, value: normalized.value, warnings: decoded.warnings };
}
function validateUtf8CsvBytes(bytes, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || bytes.length > maxBytes) {
    return { ok: false, code: "file_too_large", message: "\u6587\u4EF6\u8D85\u8FC7\u5927\u5C0F\u4E0A\u9650\uFF0C\u672A\u5BFC\u5165" };
  }
  let text2;
  try {
    text2 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, code: "csv_encoding_invalid", message: "CSV \u4E0D\u662F\u6709\u6548\u7684 UTF-8 \u6587\u4EF6" };
  }
  if (hasInvalidControlCharacter(text2)) {
    return { ok: false, code: "csv_control_character", message: "CSV \u542B\u4E0D\u5141\u8BB8\u7684\u63A7\u5236\u5B57\u7B26" };
  }
  if (hasOverlongPhysicalLine(bytes)) {
    return { ok: false, code: "csv_line_too_long", message: `CSV \u5355\u884C\u4E0D\u80FD\u8D85\u8FC7 ${CSV_MAX_PHYSICAL_LINE_BYTES} \u5B57\u8282` };
  }
  return { ok: true, value: { bytes, text: text2, byteLength: bytes.length } };
}

// src/content/csv/server/import.ts
async function prepareCsvImport(context) {
  const validation = await readNormalizedImportCsv(context.sourcePath, Math.min(context.maxFileBytes, CSV_MAX_IMPORT_BYTES));
  if (!validation.ok) throw new KbError(validation.code, validation.message);
  return {
    format: EntryFormat.Csv,
    outputName: context.sourceName,
    byteLength: validation.value.byteLength,
    digest: createHash("sha256").update(validation.value.bytes).digest("hex"),
    content: { kind: "bytes", bytes: validation.value.bytes },
    ...validation.warnings?.length ? { warnings: validation.warnings } : {}
  };
}

// src/content/csv/server/editor.ts
import { createHash as createHash2 } from "node:crypto";

// src/content/csv/server/csv-document.ts
var import_papaparse = __toESM(require_papaparse(), 1);
var DELIMITER_CANDIDATES = [",", ";", "	", "|"];
function parseCsvDocument(text2) {
  const ranges = scanRecordRanges(text2);
  const parsed = import_papaparse.default.parse(text2, {
    delimiter: detectDelimiter(text2),
    dynamicTyping: false,
    skipEmptyLines: false
  });
  if (parsed.errors.length || parsed.data.length !== ranges.length) {
    throw new KbError("csv_parse_invalid", "CSV \u683C\u5F0F\u65E0\u6548\uFF0C\u65E0\u6CD5\u5B89\u5168\u89E3\u6790");
  }
  const sourceRows = parsed.data.map((row) => row.map((cell) => String(cell)));
  trimTerminalEmptyRecord(text2, sourceRows, ranges);
  const width = Math.max(1, ...sourceRows.map((row) => row.length));
  const headers = fillCells(sourceRows[0] ?? [], width);
  const header = ranges[0] ?? emptyRange();
  const records = sourceRows.slice(1).map((cells, index) => ({
    ...ranges[index + 1] ?? emptyRange(),
    cells: fillCells(cells, width)
  }));
  return { header, headers, records };
}
function serializeCsvDocument(document) {
  return import_papaparse.default.unparse([document.headers, ...document.records.map((record) => record.cells)], { newline: "\n" });
}
function createCsvPreviewWindow(document, includeAllRows, focusLine) {
  const focusedIndex = focusRecordIndex(document.records, focusLine);
  const selection = selectRecordRange(document.records, includeAllRows, focusedIndex);
  const firstRecord = selection.start === 0 ? document.header : document.records[selection.start] ?? document.header;
  const lastRecord = selection.end >= selection.start ? document.records[selection.end] ?? document.header : document.header;
  const totalRows = document.records.length;
  const focusedRow = focusedIndex !== void 0 && focusedIndex >= selection.start && focusedIndex <= selection.end ? focusedIndex + 1 : void 0;
  const hasRows = selection.end >= selection.start;
  return {
    csv: {
      headers: document.headers,
      rows: hasRows ? document.records.slice(selection.start, selection.end + 1).map((record) => record.cells) : [],
      totalRows,
      windowStartRow: hasRows ? selection.start + 1 : 0,
      windowEndRow: hasRows ? selection.end + 1 : 0,
      complete: includeAllRows,
      ...focusedRow === void 0 ? {} : { focusedRow }
    },
    textStartOffset: firstRecord.startOffset,
    textEndOffset: lastRecord.endOffset,
    windowStartLine: firstRecord.startLine,
    windowEndLine: lastRecord.endLine,
    truncation: truncationForRows(selection, totalRows)
  };
}
function createCsvEditorPage(document, requestedStartRow, requestedPageSize, revision) {
  const totalRows = document.records.length;
  const pageSize2 = Math.max(1, requestedPageSize);
  const startIndex = totalRows ? Math.min(Math.max(0, requestedStartRow - 1), totalRows - 1) : 0;
  const rows = document.records.slice(startIndex, startIndex + pageSize2).map((record) => [...record.cells]);
  const windowStartRow = rows.length ? startIndex + 1 : 0;
  const windowEndRow = rows.length ? startIndex + rows.length : 0;
  return {
    headers: [...document.headers],
    rows,
    totalRows,
    windowStartRow,
    windowEndRow,
    complete: windowEndRow === totalRows,
    revision
  };
}
function scanRecordRanges(text2) {
  const ranges = [];
  let startOffset = 0;
  let startLine = 1;
  let line = 1;
  let inQuotes = false;
  for (let index = 0; index < text2.length; index += 1) {
    const char = text2[index];
    if (char === '"') {
      if (inQuotes && text2[index + 1] === '"') index += 1;
      else inQuotes = !inQuotes;
      continue;
    }
    const isLineFeed = char === "\n";
    const isStandaloneCarriageReturn = char === "\r" && text2[index + 1] !== "\n";
    if (!isLineFeed && !isStandaloneCarriageReturn) continue;
    if (!inQuotes) {
      ranges.push({ startOffset, endOffset: index + 1, startLine, endLine: line });
      startOffset = index + 1;
      startLine = line + 1;
    }
    line += 1;
  }
  ranges.push({ startOffset, endOffset: text2.length, startLine, endLine: line });
  return ranges;
}
function detectDelimiter(text2) {
  const counts = new Map(DELIMITER_CANDIDATES.map((delimiter) => [delimiter, 0]));
  let inQuotes = false;
  for (let index = 0; index < text2.length; index += 1) {
    const char = text2[index];
    if (char === '"') {
      if (inQuotes && text2[index + 1] === '"') index += 1;
      else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (char === "\n" || char === "\r" && text2[index + 1] !== "\n")) break;
    if (!inQuotes && counts.has(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  return DELIMITER_CANDIDATES.reduce((best, delimiter) => (counts.get(delimiter) ?? 0) > (counts.get(best) ?? 0) ? delimiter : best, ",");
}
function fillCells(cells, width) {
  return Array.from({ length: width }, (_, index) => cells[index] ?? "");
}
function trimTerminalEmptyRecord(text2, rows, ranges) {
  const lastRange = ranges[ranges.length - 1];
  const lastRow = rows[rows.length - 1];
  if (!/\r?\n$|\r$/u.test(text2) || !lastRange || !lastRow || lastRange.startOffset !== text2.length) return;
  if (!lastRow.every((cell) => cell === "")) return;
  ranges.pop();
  rows.pop();
}
function emptyRange() {
  return { startOffset: 0, endOffset: 0, startLine: 1, endLine: 1 };
}
function focusRecordIndex(records, focusLine) {
  if (!focusLine || focusLine < 1) return void 0;
  const index = records.findIndex((record) => record.startLine <= focusLine && focusLine <= record.endLine);
  return index < 0 ? void 0 : index;
}
function selectRecordRange(records, includeAllRows, focusedIndex) {
  if (!records.length) return { start: 0, end: -1 };
  if (includeAllRows) return { start: 0, end: records.length - 1 };
  let start = focusedIndex === void 0 ? 0 : Math.max(0, focusedIndex - SEARCH_CONTEXT);
  let end = focusedIndex === void 0 ? records.length - 1 : Math.min(records.length - 1, focusedIndex + SEARCH_CONTEXT);
  while (start < end && (selectionLength(records, start, end) > CSV_PREVIEW_MAX_CHARS || end - start + 1 > CSV_PREVIEW_MAX_ROWS)) {
    if (focusedIndex === void 0 || end - focusedIndex >= focusedIndex - start) end -= 1;
    else start += 1;
  }
  return { start, end };
}
function selectionLength(records, start, end) {
  return records.slice(start, end + 1).reduce((total, record) => total + record.endOffset - record.startOffset, 0);
}
function truncationForRows(selection, totalRows) {
  const before = selection.start > 0;
  const after = selection.end < totalRows - 1;
  if (before && after) return "both";
  if (before) return "before";
  if (after) return "after";
  return "none";
}

// src/content/csv/server/editor.ts
async function readCsvDocument(absolutePath, maxBytes) {
  const validation = await readValidatedUtf8Csv(absolutePath, maxBytes);
  if (!validation.ok) throw new KbError(validation.code, validation.message);
  const text2 = stripUtf8Bom(validation.value.text);
  return {
    document: parseCsvDocument(text2),
    revision: createHash2("sha256").update(validation.value.bytes).digest("hex"),
    text: text2
  };
}
async function readCsvPage(context) {
  const { document, revision } = await readCsvDocument(context.absolutePath, CSV_MAX_IMPORT_BYTES);
  return createCsvEditorPage(document, positive(context.startRow, "\u9875\u7801"), pageSize(context.pageSize), revision);
}
function positive(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new KbError("csv_patch_invalid", `${label}\u5FC5\u987B\u662F\u6B63\u6574\u6570`);
  return value;
}
function pageSize(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > TABLE_EDITOR_PAGE_SIZE) {
    throw new KbError("csv_patch_invalid", `\u6BCF\u9875\u6700\u591A ${TABLE_EDITOR_PAGE_SIZE} \u884C`);
  }
  return value;
}

// src/content/shared/line-window.ts
function splitPhysicalLines(text2) {
  const lines = [];
  let lineStart = 0;
  for (let index = 0; index < text2.length; index += 1) {
    const isLineFeed = text2[index] === "\n";
    const isStandaloneCarriageReturn = text2[index] === "\r" && text2[index + 1] !== "\n";
    if (!isLineFeed && !isStandaloneCarriageReturn) continue;
    const line = text2.slice(lineStart, index);
    lines.push(isLineFeed && line.endsWith("\r") ? line.slice(0, -1) : line);
    lineStart = index + 1;
  }
  if (lineStart < text2.length || lines.length === 0) lines.push(text2.slice(lineStart));
  return lines;
}
function truncationFor(window2, lineCount) {
  const before = window2.start > 1;
  const after = window2.end < lineCount;
  if (before && after) return "both";
  if (before) return "before";
  if (after) return "after";
  return "none";
}

// src/content/shared/preview-focus.ts
function isPositiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}
function isUtf8Boundary(line, columnByte) {
  const bytes = Buffer.from(line, "utf8");
  const offset = columnByte - 1;
  return offset >= 0 && offset < bytes.length && (bytes[offset] & 192) !== 128;
}
function safeFocusColumn(line, columnByte) {
  return isPositiveInteger(columnByte) && isUtf8Boundary(line, columnByte) ? columnByte : void 0;
}
function resolvePreviewFocus(lines, actualFingerprint, options) {
  const view = options.view ?? EntryPreviewView.Tree;
  const requestedLine = options.matchLine;
  const hasRequestedFocus = view === EntryPreviewView.SearchHit && isPositiveInteger(requestedLine);
  const fingerprintMatches = !options.sourceFingerprint || options.sourceFingerprint === actualFingerprint;
  let previewStatus = hasRequestedFocus && !fingerprintMatches ? "stale" : "ready";
  const requestedLineInFile = hasRequestedFocus && requestedLine <= lines.length;
  const lineForFocus = requestedLineInFile ? lines[requestedLine - 1] : void 0;
  const focusColumnByte = lineForFocus === void 0 ? void 0 : safeFocusColumn(lineForFocus, options.matchColumnByte);
  const columnIsValid = lineForFocus !== void 0 && (options.matchColumnByte === void 0 || focusColumnByte !== void 0);
  if (previewStatus === "ready" && hasRequestedFocus && (!requestedLineInFile || !columnIsValid)) {
    previewStatus = "fallback";
  }
  return {
    view,
    ...hasRequestedFocus ? { requestedLine } : {},
    hasRequestedFocus,
    previewStatus,
    ...previewStatus === "ready" && requestedLineInFile ? { focusLine: requestedLine } : {},
    ...previewStatus === "ready" && columnIsValid && focusColumnByte !== void 0 ? { focusColumnByte } : {}
  };
}

// src/content/csv/server/preview.ts
async function readCsvPreview(context) {
  let loaded;
  try {
    loaded = await readCsvDocument(context.absolutePath, CSV_PREVIEW_MAX_BYTES);
  } catch (error) {
    throw remapPreviewReadError(error);
  }
  if (context.options.readMode === EntryReadMode.Edit) {
    return csvEditPreview(context, loaded);
  }
  return csvReadPreview(context, loaded);
}
function csvEditPreview(context, loaded) {
  const table = createCsvEditorPage(loaded.document, 1, TABLE_EDITOR_PAGE_SIZE, loaded.revision);
  const lastRecord = table.windowEndRow ? loaded.document.records[table.windowEndRow - 1] : loaded.document.header;
  return {
    path: context.relativePath,
    kind: EntryContentKind.Table,
    text: "",
    table,
    format: EntryFormat.Csv,
    view: context.options.view ?? EntryPreviewView.Tree,
    windowStartLine: loaded.document.header.startLine,
    windowEndLine: lastRecord?.endLine ?? loaded.document.header.endLine,
    truncation: table.complete ? "none" : "after",
    totalChars: loaded.text.length,
    previewStatus: "ready"
  };
}
function csvReadPreview(context, loaded) {
  const lines = splitPhysicalLines(loaded.text);
  const focus = resolvePreviewFocus(lines, loaded.revision, context.options);
  const window2 = createCsvPreviewWindow(
    loaded.document,
    false,
    focus.hasRequestedFocus ? focus.requestedLine : void 0
  );
  const previewTable = focus.previewStatus === "ready" || window2.csv.focusedRow === void 0 ? window2.csv : { ...window2.csv, focusedRow: void 0 };
  return {
    path: context.relativePath,
    kind: EntryContentKind.Table,
    text: loaded.text.slice(window2.textStartOffset, window2.textEndOffset),
    table: { ...previewTable, revision: loaded.revision },
    format: EntryFormat.Csv,
    view: focus.view,
    windowStartLine: window2.windowStartLine,
    windowEndLine: window2.windowEndLine,
    truncation: window2.truncation,
    totalChars: loaded.text.length,
    previewStatus: focus.previewStatus,
    ...focus.focusLine === void 0 ? {} : { focusLine: focus.focusLine },
    ...focus.focusColumnByte === void 0 ? {} : { focusColumnByte: focus.focusColumnByte }
  };
}
function remapPreviewReadError(error) {
  if (error instanceof KbError && error.code === "file_too_large") {
    return new KbError("preview_too_large", "CSV \u9884\u89C8\u6587\u4EF6\u8D85\u8FC7\u8BFB\u53D6\u4E0A\u9650");
  }
  return error;
}

// src/content/shared/search-document.ts
import { createHash as createHash3 } from "node:crypto";
function mergePhysicalExcerpts(first, second, rangeStart, rangeEnd) {
  const firstLines = first.excerpt.split(/\r?\n/);
  const secondLines = second.excerpt.split(/\r?\n/);
  const mergedLines = [];
  for (let line = rangeStart; line <= rangeEnd; line += 1) {
    if (line >= second.startLine && line <= second.endLine) {
      mergedLines.push(secondLines[line - second.startLine] ?? "");
    } else if (line >= first.startLine && line <= first.endLine) {
      mergedLines.push(firstLines[line - first.startLine] ?? "");
    } else {
      mergedLines.push("");
    }
  }
  return mergedLines.join("\n");
}
function createPhysicalLineSearchDocument(bytes, text2) {
  const lines = splitPhysicalLines(text2);
  const fingerprint = createHash3("sha256").update(bytes).digest("hex");
  return {
    fingerprint,
    excerptAt: (matchLine, radius) => {
      const safeLine = Math.min(Math.max(matchLine, 1), Math.max(1, lines.length));
      const startLine = Math.max(1, safeLine - radius);
      const endLine = Math.min(lines.length, safeLine + radius);
      return {
        startLine,
        endLine,
        excerpt: lines.slice(startLine - 1, endLine).join("\n"),
        matchedExcerpt: lines[safeLine - 1] ?? ""
      };
    },
    mergeExcerpt: mergePhysicalExcerpts,
    normalizeColumnByte: (line, columnByte) => normalizeColumnByte(bytes, line, columnByte)
  };
}
function normalizeColumnByte(bytes, line, columnByte) {
  if (!Number.isInteger(columnByte) || columnByte < 1) return void 0;
  const hasBom = bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191]));
  if (line === 1 && hasBom && columnByte > 3) return columnByte - 3;
  return columnByte;
}

// src/content/csv/server/search-excerpt.ts
var FIELD_NEWLINE = /[\r\n]+/g;
function columnLabel(header, index) {
  return header ? header : `\u5217${index + 1}`;
}
function formatHeaderLine(headers) {
  return `\u5217: ${headers.map((header, index) => columnLabel(header, index)).join(" | ")}`;
}
function formatRecord(headers, cells) {
  const width = Math.max(headers.length, cells.length);
  return Array.from({ length: width }, (_, index) => {
    const label = columnLabel(headers[index] ?? "", index);
    const value = (cells[index] ?? "").replace(FIELD_NEWLINE, "\u21A9");
    return `${label}: ${value}`;
  }).join(" | ");
}
function isHeaderHit(document, matchLine) {
  if (matchLine >= document.header.startLine && matchLine <= document.header.endLine) {
    return !document.records.some((record) => record.startLine <= matchLine && matchLine <= record.endLine);
  }
  return document.records.length === 0;
}
function windowRecords(records, focusIndex, radius) {
  const start = Math.max(0, focusIndex - radius);
  const end = Math.min(records.length - 1, focusIndex + radius);
  return records.slice(start, end + 1);
}
function headerExcerpt(document, headerLine) {
  return {
    startLine: document.header.startLine,
    endLine: document.header.endLine,
    excerpt: headerLine,
    matchedExcerpt: headerLine
  };
}
function csvColumnExcerpt(document, matchLine, radius) {
  const headerLine = formatHeaderLine(document.headers);
  if (isHeaderHit(document, matchLine)) return headerExcerpt(document, headerLine);
  const focusIndex = document.records.findIndex((record) => record.startLine <= matchLine && matchLine <= record.endLine);
  const focus = document.records[focusIndex];
  if (focusIndex < 0 || !focus) return headerExcerpt(document, headerLine);
  const records = windowRecords(document.records, focusIndex, radius);
  if (!records.length) return headerExcerpt(document, headerLine);
  return {
    startLine: focus.startLine,
    endLine: focus.endLine,
    excerpt: records.map((record) => formatRecord(document.headers, record.cells)).join("\n"),
    matchedExcerpt: formatRecord(document.headers, focus.cells)
  };
}
function isCsvColumnExcerpt(excerpt) {
  return excerpt.startsWith("\u5217: ");
}
function mergeCsvColumnExcerpts(firstExcerpt, secondExcerpt) {
  const seen = /* @__PURE__ */ new Set();
  const rows = [];
  for (const line of [...firstExcerpt.split(/\r?\n/), ...secondExcerpt.split(/\r?\n/)]) {
    if (!line || isCsvColumnExcerpt(line) || seen.has(line)) continue;
    seen.add(line);
    rows.push(line);
  }
  if (!rows.length) return firstExcerpt;
  return rows.join("\n");
}
function createCsvSearchDocument(bytes, text2) {
  const physical = createPhysicalLineSearchDocument(bytes, text2);
  try {
    const document = parseCsvDocument(text2);
    return {
      fingerprint: physical.fingerprint,
      normalizeColumnByte: physical.normalizeColumnByte,
      excerptAt: (matchLine, radius) => csvColumnExcerpt(document, matchLine, radius),
      mergeExcerpt: (first, second) => mergeCsvColumnExcerpts(first.excerpt, second.excerpt),
      mergeNeighbors: false,
      groupHeader: formatHeaderLine(document.headers)
    };
  } catch {
    return { ...physical, warnings: ["csv_parse_fallback\uFF1ACSV \u65E0\u6CD5\u6309\u5217\u89E3\u6790\uFF0C\u5DF2\u4FDD\u7559\u539F\u6587 excerpt"] };
  }
}

// src/content/csv/server/search.ts
async function readCsvForSearch(context) {
  const validation = await readValidatedUtf8Csv(context.absolutePath, CSV_PREVIEW_MAX_BYTES);
  if (!validation.ok) throw new KbError(validation.code, validation.message);
  return createCsvSearchDocument(validation.value.bytes, stripUtf8Bom(validation.value.text));
}

// src/content/csv/server/write.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import { mkdir as mkdir2, rename as rename2, rm as rm2, writeFile as writeFile2 } from "node:fs/promises";
import { basename as basename2, dirname as dirname2, join as join4 } from "node:path";

// src/content/shared/table-patch.ts
var REVISION_PATTERN = /^[a-f0-9]{64}$/u;
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new KbError("csv_patch_invalid", "\u8868\u683C\u4FEE\u6539\u6570\u636E\u65E0\u6548");
  }
  return value;
}
function requireNonNegativeInteger(data, field) {
  const value = data[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new KbError("csv_patch_invalid", `${field} \u5FC5\u987B\u662F\u975E\u8D1F\u6574\u6570`);
  }
  return value;
}
function requirePositiveInteger(data, field) {
  const value = data[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new KbError("csv_patch_invalid", `${field}\u5FC5\u987B\u662F\u6B63\u6574\u6570`);
  }
  return value;
}
function requireTableCellValue(data) {
  const value = data.value;
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > CSV_MAX_PHYSICAL_LINE_BYTES) {
    throw new KbError("csv_patch_invalid", "\u5355\u5143\u683C\u5185\u5BB9\u8FC7\u957F");
  }
  return value;
}
function requireChangeArray(data, field) {
  const value = data[field];
  if (!Array.isArray(value)) throw new KbError("csv_patch_invalid", `${field} \u5FC5\u987B\u662F\u6570\u7EC4`);
  return value.map(asRecord);
}
function assertTableCellValue(value) {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > CSV_MAX_PHYSICAL_LINE_BYTES) {
    throw new KbError("csv_patch_invalid", "\u5355\u5143\u683C\u5185\u5BB9\u8FC7\u957F");
  }
}
function assertTablePatchShape(patch) {
  if (!REVISION_PATTERN.test(patch.revision)) throw new KbError("csv_patch_invalid", "\u8868\u683C\u7248\u672C\u6807\u8BC6\u65E0\u6548");
  if (!Array.isArray(patch.headerChanges) || !Array.isArray(patch.cellChanges)) {
    throw new KbError("csv_patch_invalid", "\u8868\u683C\u4FEE\u6539\u6570\u636E\u65E0\u6548");
  }
  if (patch.headerChanges.length + patch.cellChanges.length > CSV_MAX_PATCH_CHANGES) {
    throw new KbError("csv_patch_invalid", `\u4E00\u6B21\u6700\u591A\u4FEE\u6539 ${CSV_MAX_PATCH_CHANGES} \u4E2A\u5355\u5143\u683C`);
  }
  for (const change of patch.headerChanges) assertTableCellValue(change.value);
  for (const change of patch.cellChanges) assertTableCellValue(change.value);
}
function parseTablePatch(value) {
  const patch = asRecord(value);
  const revision = patch.revision;
  if (typeof revision !== "string") throw new KbError("csv_patch_invalid", "\u8868\u683C\u7248\u672C\u6807\u8BC6\u65E0\u6548");
  const headerChanges = requireChangeArray(patch, "headerChanges").map((change) => ({
    column: requireNonNegativeInteger(change, "column"),
    value: requireTableCellValue(change)
  }));
  const cellChanges = requireChangeArray(patch, "cellChanges").map((change) => ({
    row: requirePositiveInteger(change, "row"),
    column: requireNonNegativeInteger(change, "column"),
    value: requireTableCellValue(change)
  }));
  const parsed = { revision, headerChanges, cellChanges };
  assertTablePatchShape(parsed);
  return parsed;
}
function parseEntryWriteChange(value) {
  const record = asRecord(value);
  if (record.kind === "text") {
    if (typeof record.text !== "string") throw new KbError("invalid_field", "text \u4FEE\u6539\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return { kind: "text", text: record.text };
  }
  if (record.kind === "table-patch") {
    return { kind: "table-patch", patch: parseTablePatch(record.patch) };
  }
  throw new KbError("invalid_field", "change \u5FC5\u987B\u662F text \u6216 table-patch");
}

// src/content/csv/server/write.ts
async function writeCsvContent(context) {
  if (context.change.kind === "text") {
    await writeCsvText(context, context.change.text);
    return;
  }
  const { document, revision } = await readCsvDocument(context.absolutePath, CSV_MAX_IMPORT_BYTES);
  validatePatch(context.change.patch, document, revision);
  await writeCsvDocument(context, applyPatch(document, context.change.patch));
}
async function writeCsvDocument(context, document) {
  const maxFileBytes = Math.min(CSV_MAX_IMPORT_BYTES, context.maxFileBytes);
  const bytes = encodeUtf8CsvWithBom(serializeCsvDocument(document));
  const validation = validateUtf8CsvBytes(bytes, maxFileBytes);
  if (!validation.ok) throw new KbError(validation.code, validation.message);
  if (context.baseBytesWithoutEntry + bytes.length > context.maxBaseBytes) {
    throw new KbError("quota", "\u7F16\u8F91\u540E\u5C06\u8D85\u8FC7\u5355\u5E93\u6587\u5B57\u4E0A\u9650");
  }
  const entryDirectory = dirname2(context.absolutePath);
  const temporaryPath = join4(entryDirectory, `.${basename2(context.absolutePath)}.${randomUUID2()}.tmp`);
  await mkdir2(entryDirectory, { recursive: true });
  try {
    await writeFile2(temporaryPath, bytes, { flag: "wx" });
    await rename2(temporaryPath, context.absolutePath);
  } catch (error) {
    await rm2(temporaryPath, { force: true }).catch(() => void 0);
    throw error;
  }
}
async function writeCsvText(context, text2) {
  const sourceBytes = encodeUtf8CsvWithBom(text2);
  const maxFileBytes = Math.min(CSV_MAX_IMPORT_BYTES, context.maxFileBytes);
  const sourceValidation = validateUtf8CsvBytes(sourceBytes, maxFileBytes);
  if (!sourceValidation.ok) throw new KbError(sourceValidation.code, sourceValidation.message);
  const document = parseCsvDocument(stripUtf8Bom(sourceValidation.value.text));
  await writeCsvDocument(context, document);
}
function validatePatch(patch, document, revision) {
  assertTablePatchShape(patch);
  if (patch.revision !== revision) throw new KbError("csv_revision_conflict", "\u6587\u4EF6\u5DF2\u88AB\u4FEE\u6539\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u540E\u518D\u4FDD\u5B58");
  for (const change of patch.headerChanges) validateHeaderChange(change, document.headers.length);
  for (const change of patch.cellChanges) validateCellChange(change, document);
}
function validateHeaderChange(change, width) {
  if (!Number.isSafeInteger(change.column) || change.column < 0 || change.column >= width) {
    throw new KbError("csv_patch_invalid", "\u8868\u5934\u5217\u53F7\u65E0\u6548");
  }
}
function validateCellChange(change, document) {
  if (!Number.isSafeInteger(change.row) || change.row < 1 || change.row > document.records.length) {
    throw new KbError("csv_patch_invalid", "CSV \u884C\u53F7\u65E0\u6548");
  }
  if (!Number.isSafeInteger(change.column) || change.column < 0 || change.column >= document.headers.length) {
    throw new KbError("csv_patch_invalid", "CSV \u5217\u53F7\u65E0\u6548");
  }
}
function applyPatch(document, patch) {
  const next = {
    header: document.header,
    headers: [...document.headers],
    records: document.records.map((record) => ({ ...record, cells: [...record.cells] }))
  };
  for (const change of patch.headerChanges) next.headers[change.column] = change.value;
  for (const change of patch.cellChanges) next.records[change.row - 1].cells[change.column] = change.value;
  return next;
}

// src/content/csv/index.ts
var csvSourceHandler = {
  sourceFormat: SourceFormat.Csv,
  sourceExtensions: [".csv"],
  prepareImport: async (context) => [await prepareCsvImport(context)]
};
var csvEntryHandler = {
  format: EntryFormat.Csv,
  entryExtensions: [".csv"],
  readContent: readCsvPreview,
  readPage: readCsvPage,
  writeContent: writeCsvContent,
  readForSearch: readCsvForSearch
};
var csvContentFormat = {
  sourceHandlers: [csvSourceHandler],
  entryHandlers: [csvEntryHandler]
};

// src/content/markdown/server/import.ts
import { stat } from "node:fs/promises";

// src/content/shared/file-hash.ts
import { createHash as createHash4 } from "node:crypto";
import { createReadStream } from "node:fs";
async function sha256File(filePath) {
  const hash = createHash4("sha256");
  await new Promise((resolve2, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve2);
  });
  return hash.digest("hex");
}

// src/content/markdown/server/import.ts
async function prepareMarkdownImport(context) {
  const byteLength = (await stat(context.sourcePath)).size;
  if (byteLength > context.maxFileBytes) {
    throw new KbError("file_too_large", `\u5355\u6587\u4EF6\u8D85\u8FC7 ${context.maxFileBytes} \u5B57\u8282`);
  }
  return {
    format: EntryFormat.Markdown,
    outputName: context.sourceName,
    byteLength,
    digest: await sha256File(context.sourcePath),
    content: { kind: "source-file", sourcePath: context.sourcePath }
  };
}

// src/content/markdown/server/preview.ts
import { createHash as createHash5 } from "node:crypto";
import { readFile as readFile2 } from "node:fs/promises";
async function readMarkdownPreview(context) {
  const bytes = await readFile2(context.absolutePath);
  const text2 = bytes.toString("utf8");
  const lines = splitPhysicalLines(text2);
  const focus = resolvePreviewFocus(lines, createHash5("sha256").update(bytes).digest("hex"), context.options);
  return {
    path: context.relativePath,
    kind: EntryContentKind.Text,
    text: text2,
    format: EntryFormat.Markdown,
    view: focus.view,
    windowStartLine: 1,
    windowEndLine: lines.length,
    truncation: truncationFor({ start: 1, end: lines.length }, lines.length),
    totalChars: text2.length,
    previewStatus: focus.previewStatus,
    ...focus.focusLine === void 0 ? {} : { focusLine: focus.focusLine },
    ...focus.focusColumnByte === void 0 ? {} : { focusColumnByte: focus.focusColumnByte }
  };
}

// src/content/markdown/server/search.ts
import { readFile as readFile3 } from "node:fs/promises";
async function readMarkdownForSearch(context) {
  const bytes = await readFile3(context.absolutePath);
  return createPhysicalLineSearchDocument(bytes, stripUtf8Bom(bytes.toString("utf8")));
}

// src/content/markdown/server/write.ts
import { mkdir as mkdir3, writeFile as writeFile3 } from "node:fs/promises";
import { dirname as dirname3 } from "node:path";
async function writeMarkdownContent(context) {
  if (context.change.kind !== "text") throw new KbError("read_only_format", "\u8BE5\u6587\u4EF6\u4E0D\u652F\u6301\u8868\u683C\u4FEE\u6539");
  await mkdir3(dirname3(context.absolutePath), { recursive: true });
  await writeFile3(context.absolutePath, context.change.text, "utf8");
}
async function readMarkdownPage(context) {
  void context;
  throw new KbError("read_only_format", "\u8BE5\u6587\u4EF6\u4E0D\u652F\u6301\u8868\u683C\u5206\u9875\u8BFB\u53D6");
}

// src/content/markdown/index.ts
var markdownSourceHandler = {
  sourceFormat: SourceFormat.Markdown,
  sourceExtensions: [".md", ".markdown"],
  prepareImport: async (context) => [await prepareMarkdownImport(context)]
};
var plainTextSourceHandler = {
  sourceFormat: SourceFormat.PlainText,
  sourceExtensions: [".txt"],
  prepareImport: async (context) => [await prepareMarkdownImport(context)]
};
var markdownEntryHandler = {
  format: EntryFormat.Markdown,
  entryExtensions: [".md", ".txt", ".markdown"],
  readContent: readMarkdownPreview,
  readPage: readMarkdownPage,
  writeContent: writeMarkdownContent,
  readForSearch: readMarkdownForSearch
};
var markdownContentFormat = {
  sourceHandlers: [markdownSourceHandler, plainTextSourceHandler],
  entryHandlers: [markdownEntryHandler]
};

// src/content/host-registry.ts
function extensionOf(filePath) {
  return extname(filePath).toLowerCase();
}
function registerSourceHandlers(handlers) {
  const routes = /* @__PURE__ */ new Map();
  for (const handler of handlers) {
    for (const extension of handler.sourceExtensions) {
      if (routes.has(extension)) throw new Error(`\u91CD\u590D\u7684\u5BFC\u5165\u683C\u5F0F\u540E\u7F00\uFF1A${extension}`);
      routes.set(extension, { format: handler.sourceFormat, handler });
    }
  }
  return routes;
}
function registerEntryHandlers(handlers) {
  const routes = /* @__PURE__ */ new Map();
  for (const handler of handlers) {
    for (const extension of handler.entryExtensions) {
      if (routes.has(extension)) throw new Error(`\u91CD\u590D\u7684\u5E93\u5185\u683C\u5F0F\u540E\u7F00\uFF1A${extension}`);
      routes.set(extension, handler);
    }
  }
  return routes;
}
var CONTENT_FORMAT_MODULES = [markdownContentFormat, csvContentFormat];
var SOURCE_HANDLERS = CONTENT_FORMAT_MODULES.flatMap((module) => module.sourceHandlers);
var ENTRY_HANDLERS = CONTENT_FORMAT_MODULES.flatMap((module) => module.entryHandlers);
var SOURCE_ROUTES = registerSourceHandlers(SOURCE_HANDLERS);
var ENTRY_ROUTES = registerEntryHandlers(ENTRY_HANDLERS);
var SOURCE_EXTENSIONS = [...SOURCE_ROUTES.keys()];
var ENTRY_EXTENSIONS = [...ENTRY_ROUTES.keys()];
function sourceHandlerForPath(sourcePath) {
  const route = SOURCE_ROUTES.get(extensionOf(sourcePath));
  if (!route) throw new KbError("ext_denied", `\u53EA\u652F\u6301 ${SOURCE_EXTENSIONS.join(" / ")}`);
  return route.handler;
}
function entryHandlerForPath(relativePath) {
  const handler = ENTRY_ROUTES.get(extensionOf(relativePath));
  if (!handler) throw new KbError("ext_denied", "\u53EA\u652F\u6301\u5E93\u5185\u767D\u540D\u5355\u6587\u4EF6");
  return handler;
}
var contentRegistry = {
  sourceExtensions: () => [...SOURCE_EXTENSIONS],
  entryExtensions: () => [...ENTRY_EXTENSIONS],
  searchGlobs: () => ENTRY_EXTENSIONS.map((extension) => `*${extension}`),
  sourceFormatForPath: (sourcePath) => SOURCE_ROUTES.get(extensionOf(sourcePath))?.format,
  entryFormatForPath: (relativePath) => ENTRY_ROUTES.get(extensionOf(relativePath))?.format,
  isStoredEntryPath: (relativePath) => ENTRY_ROUTES.has(extensionOf(relativePath)),
  prepareImport: (context) => sourceHandlerForPath(context.sourcePath).prepareImport(context),
  readContent: (context) => entryHandlerForPath(context.relativePath).readContent(context),
  readPage: (context) => entryHandlerForPath(context.relativePath).readPage(context),
  writeContent: (context) => entryHandlerForPath(context.relativePath).writeContent(context),
  readForSearch: (context) => entryHandlerForPath(context.relativePath).readForSearch(context)
};

// src/bases.ts
function requireNonEmptyText(value, field) {
  const text2 = value?.trim() ?? "";
  if (!text2) throw new KbError("missing_field", `${field} \u5FC5\u586B`);
  return text2;
}
async function directoryExists(directoryPath) {
  try {
    return (await stat2(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}
async function scanBaseIds(dataRoot) {
  const basesDirectory = basesRoot(dataRoot);
  if (!await directoryExists(basesDirectory)) return [];
  const entries = await readdir(basesDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
}
async function walkTextDocuments(directoryPath) {
  const documentPaths = [];
  let entries;
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch {
    return documentPaths;
  }
  for (const entry of entries) {
    const entryPath = join5(directoryPath, entry.name);
    if (entry.isDirectory()) documentPaths.push(...await walkTextDocuments(entryPath));
    else if (entry.isFile() && contentRegistry.isStoredEntryPath(entry.name)) documentPaths.push(entryPath);
  }
  return documentPaths;
}
async function countDocs(dataRoot, baseId) {
  return (await walkTextDocuments(baseDir(dataRoot, baseId))).length;
}
async function textDocumentBytes(baseRoot) {
  const paths = await walkTextDocuments(baseRoot);
  let total = 0;
  for (const documentPath of paths) total += (await stat2(documentPath)).size;
  return total;
}
async function fileBytes(filePath) {
  try {
    return (await stat2(filePath)).size;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}
async function listBaseCategories(dataRoot, baseId) {
  const baseDirectory = baseDir(dataRoot, baseId);
  if (!await directoryExists(baseDirectory)) return [];
  const entries = await readdir(baseDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
}
function createBaseCardFromDirectory(id) {
  return { id, title: id, description: "", aliases: [], createdAt: 0, lastUsedAt: 0 };
}
async function listBases(dataRoot) {
  const catalog = await readCatalog(dataRoot);
  const onDiskBaseIds = await scanBaseIds(dataRoot);
  const cardsById = new Map(catalog.bases.map((card) => [card.id, card]));
  const baseIds = [.../* @__PURE__ */ new Set([...onDiskBaseIds, ...catalog.bases.map((card) => card.id)])];
  const summaries = [];
  for (const id of baseIds.sort()) {
    const card = cardsById.get(id) ?? createBaseCardFromDirectory(id);
    summaries.push({
      ...card,
      categories: await listBaseCategories(dataRoot, id),
      approxDocs: await countDocs(dataRoot, id),
      lastUsed: catalog.lastUsedBaseId === id
    });
  }
  return summaries;
}
async function hasBaseTitle(dataRoot, catalog, title, excludeId) {
  if (catalog.bases.some((card) => card.id !== excludeId && card.title === title)) return true;
  const catalogIds = new Set(catalog.bases.map((card) => card.id));
  return (await scanBaseIds(dataRoot)).some((id) => id !== excludeId && !catalogIds.has(id) && id.trim() === title);
}
async function generateBaseId(dataRoot, catalog) {
  const existingIds = /* @__PURE__ */ new Set([...catalog.bases.map((card) => card.id), ...await scanBaseIds(dataRoot)]);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomUUID3();
    if (!existingIds.has(id)) return id;
  }
  throw new KbError("base_exists", "\u65E0\u6CD5\u751F\u6210\u552F\u4E00\u77E5\u8BC6\u5E93 ID\uFF0C\u8BF7\u91CD\u8BD5");
}
async function createBase(dataRoot, input) {
  const title = requireNonEmptyText(input.title, "title");
  const description = requireNonEmptyText(input.description, "description");
  return withCatalogTx(dataRoot, async ({ catalog }) => {
    if (await hasBaseTitle(dataRoot, catalog, title)) {
      throw new KbError("title_exists", `\u77E5\u8BC6\u5E93\u6807\u9898\u300C${title}\u300D\u5DF2\u5B58\u5728`);
    }
    const id = await generateBaseId(dataRoot, catalog);
    const now = Date.now();
    const card = { id, title, description, aliases: cleanAliases(input.aliases), createdAt: now, lastUsedAt: now };
    await mkdir4(baseDir(dataRoot, id), { recursive: true });
    const nextCatalog = upsertBase(catalog, card);
    if (!nextCatalog.lastUsedBaseId) nextCatalog.lastUsedBaseId = id;
    if (!nextCatalog.prefs.defaultBaseId) nextCatalog.prefs.defaultBaseId = id;
    return { result: card, catalog: nextCatalog };
  });
}
async function updateBase(dataRoot, id, patch) {
  return withCatalogTx(dataRoot, async ({ catalog }) => {
    const currentCard = catalog.bases.find((card2) => card2.id === id);
    if (!currentCard) throw new KbError("base_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
    const title = patch.title !== void 0 ? requireNonEmptyText(patch.title, "title") : currentCard.title;
    if (await hasBaseTitle(dataRoot, catalog, title, id)) {
      throw new KbError("title_exists", `\u77E5\u8BC6\u5E93\u6807\u9898\u300C${title}\u300D\u5DF2\u5B58\u5728`);
    }
    const card = {
      ...currentCard,
      title,
      description: patch.description !== void 0 ? requireNonEmptyText(patch.description, "description") : currentCard.description,
      aliases: patch.aliases !== void 0 ? cleanAliases(patch.aliases) : currentCard.aliases
    };
    return { result: card, catalog: upsertBase(catalog, card) };
  });
}
async function deleteBase(dataRoot, id, confirm) {
  if (!confirm) throw new KbError("confirm_required", "\u5220\u9664\u77E5\u8BC6\u5E93\u9700\u8981\u786E\u8BA4");
  await withCatalogTx(dataRoot, async ({ catalog }) => {
    const knownBaseIds = /* @__PURE__ */ new Set([...catalog.bases.map((card) => card.id), ...await scanBaseIds(dataRoot)]);
    if (!knownBaseIds.has(id)) throw new KbError("base_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
    const basesDirectory = basesRoot(dataRoot);
    const targetBaseDirectory = assertInside(basesDirectory, baseDir(dataRoot, id));
    assertNoSymlinkEscape(basesDirectory, targetBaseDirectory);
    await rm3(targetBaseDirectory, { recursive: true, force: true });
    return { result: void 0, catalog: removeBase(catalog, id) };
  });
}
async function markUsed(dataRoot, id) {
  await withCatalogTx(dataRoot, ({ catalog }) => {
    const currentCard = catalog.bases.find((card) => card.id === id);
    if (!currentCard) return { result: void 0 };
    const now = Date.now();
    if (catalog.lastUsedBaseId === id && now - currentCard.lastUsedAt < MARK_USED_THROTTLE_MS) {
      return { result: void 0 };
    }
    currentCard.lastUsedAt = now;
    catalog.lastUsedBaseId = id;
    return { result: void 0, catalog };
  });
}
async function requireBase(dataRoot, id) {
  const catalog = await readCatalog(dataRoot);
  if (catalog.bases.some((card) => card.id === id) || await directoryExists(baseDir(dataRoot, id))) return;
  throw new KbError("base_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
}
async function walkTree(baseRoot, directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "zh"))) {
    const absolutePath = join5(directoryPath, entry.name);
    const relativePath = relative2(baseRoot, absolutePath).split(sep2).join("/");
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, kind: "dir", path: relativePath, children: await walkTree(baseRoot, absolutePath) });
      continue;
    }
    if (!entry.isFile() || !contentRegistry.isStoredEntryPath(entry.name)) continue;
    const info = await stat2(absolutePath);
    nodes.push({ name: entry.name, kind: "file", path: relativePath, size: info.size, mtime: info.mtimeMs });
  }
  return nodes;
}
async function listTree(dataRoot, baseId) {
  await requireBase(dataRoot, baseId);
  const baseRoot = baseDir(dataRoot, baseId);
  if (!await directoryExists(baseRoot)) return [];
  return walkTree(baseRoot, baseRoot);
}
async function readEntry(dataRoot, baseId, relativePath, options = {}) {
  await requireBase(dataRoot, baseId);
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute;
  const baseRoot = baseDir(dataRoot, baseId);
  assertNoSymlinkEscape(baseRoot, absolutePath);
  try {
    return await contentRegistry.readContent({ absolutePath, relativePath, options });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new KbError("not_found", `\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${relativePath}`);
    }
    throw error;
  }
}
async function writeEntryContent(dataRoot, baseId, relativePath, change) {
  await requireBase(dataRoot, baseId);
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute;
  const baseRoot = baseDir(dataRoot, baseId);
  assertInside(baseRoot, absolutePath);
  assertNoSymlinkEscape(baseRoot, absolutePath);
  const catalog = await readCatalog(dataRoot);
  const [baseBytes, entryBytes] = await Promise.all([textDocumentBytes(baseRoot), fileBytes(absolutePath)]);
  await contentRegistry.writeContent({
    absolutePath,
    relativePath,
    change,
    maxFileBytes: catalog.prefs.maxFileBytes,
    maxBaseBytes: catalog.prefs.maxBaseBytes,
    baseBytesWithoutEntry: Math.max(0, baseBytes - entryBytes)
  });
}
async function readEntryPage(dataRoot, baseId, relativePath, startRow, pageSize2) {
  await requireBase(dataRoot, baseId);
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute;
  const baseRoot = baseDir(dataRoot, baseId);
  assertInside(baseRoot, absolutePath);
  assertNoSymlinkEscape(baseRoot, absolutePath);
  return contentRegistry.readPage({ absolutePath, relativePath, startRow, pageSize: pageSize2 });
}
async function deleteEntry(dataRoot, baseId, relativePath, confirm) {
  if (!confirm) throw new KbError("confirm_required", "\u5220\u9664\u6587\u4EF6\u6216\u7C7B\u76EE\u9700\u8981\u786E\u8BA4");
  await requireBase(dataRoot, baseId);
  const absolutePath = resolveDest(dataRoot, baseId, relativePath).absolute;
  assertInside(baseDir(dataRoot, baseId), absolutePath);
  assertNoSymlinkEscape(baseDir(dataRoot, baseId), absolutePath);
  await rm3(absolutePath, { recursive: true, force: true });
}

// src/content/shared/ingest-output.ts
import { randomUUID as randomUUID4 } from "node:crypto";
import { copyFile, rename as rename3, rm as rm4, stat as stat3, writeFile as writeFile4 } from "node:fs/promises";
async function writePreparedEntry(destinationPath, entry) {
  const temporaryPath = `${destinationPath}.${randomUUID4()}.tmp`;
  try {
    if (entry.content.kind === "bytes") {
      await writeFile4(temporaryPath, entry.content.bytes, { flag: "wx" });
    } else {
      await copyFile(entry.content.sourcePath, temporaryPath, 0);
    }
    const writtenBytes = (await stat3(temporaryPath)).size;
    const writtenDigest = await sha256File(temporaryPath);
    if (writtenBytes !== entry.byteLength || writtenDigest !== entry.digest) {
      throw new Error("\u5BFC\u5165\u671F\u95F4\u6E90\u6587\u4EF6\u5DF2\u53D8\u5316");
    }
    await rename3(temporaryPath, destinationPath);
    return writtenBytes;
  } catch (error) {
    await rm4(temporaryPath, { force: true }).catch(() => void 0);
    throw error;
  }
}

// src/ingest.ts
function buildIngestInput(input) {
  return {
    baseId: input.baseId,
    sourcePath: input.sourcePath,
    destCategory: input.destCategory,
    preserveTree: input.preserveTree ?? false,
    createMissing: input.createMissing ?? true,
    onConflict: "skip"
  };
}
function isTextFile(name2) {
  return contentRegistry.isStoredEntryPath(name2);
}
async function walkSource(source) {
  const info = await stat4(source);
  if (info.isFile()) return [source];
  const files = [];
  const entries = await readdir2(source, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join6(source, entry.name);
    if (entry.isDirectory()) files.push(...await walkSource(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}
async function existingHashes(baseRoot) {
  const map = /* @__PURE__ */ new Map();
  const files = await walkSource(baseRoot).catch(() => []);
  for (const file of files) {
    if (!isTextFile(file)) continue;
    map.set(await sha256File(file), relative3(baseRoot, file).split(sep3).join("/"));
  }
  return map;
}
async function dirSize(baseRoot) {
  let total = 0;
  const files = await walkSource(baseRoot).catch(() => []);
  for (const file of files) {
    if (!isTextFile(file)) continue;
    total += (await stat4(file)).size;
  }
  return total;
}
function uniqueName(dir, name2) {
  const ext = extname2(name2);
  const stem = basename3(name2, ext);
  let next = name2;
  let n = 2;
  while (existsSync3(join6(dir, next))) {
    next = `${stem}-${n}${ext}`;
    n += 1;
  }
  return next;
}
function looksBareName(sourcePath) {
  const value = sourcePath.trim();
  return Boolean(value) && !value.includes("/") && !value.includes("\\") && !value.startsWith("~") && !isAbsolute2(value);
}
function missingSourceMessage(sourcePath) {
  if (looksBareName(sourcePath)) {
    return `\u6E90\u8DEF\u5F84\u4E0D\u5B58\u5728\uFF1A${sourcePath}\u3002\u6D4F\u89C8\u5668\u53EA\u7ED9\u51FA\u4E86\u6587\u4EF6\u540D\uFF0C\u8BF7\u4F7F\u7528\u5BFC\u5165\u5F39\u6846\u4E2D\u7684\u62D6\u62FD\u533A\u57DF\uFF0C\u6216\u70B9\u51FB\u9009\u62E9\u6309\u94AE\u6253\u5F00\u7CFB\u7EDF\u5BF9\u8BDD\u6846`;
  }
  return `\u6E90\u8DEF\u5F84\u4E0D\u5B58\u5728\uFF1A${sourcePath}`;
}
function relativeSourcePath(sourceRoot, file, preserveTree) {
  if (!preserveTree) return basename3(file);
  return relative3(sourceRoot, file).split(sep3).join("/");
}
function outputRelativePath(sourceRelativePath, sourceName, outputName) {
  if (sourceRelativePath === sourceName) return outputName;
  return join6(dirname4(sourceRelativePath), outputName).split(sep3).join("/");
}
function isIngestFailureCode(code) {
  return code === "ext_denied" || code === "file_too_large" || code === "quota" || code === "path_escape" || code === "csv_encoding_invalid" || code === "csv_control_character" || code === "csv_line_too_long" || code === "encoding_unsupported" || code === "io_failed";
}
async function ingest(dataRoot, input) {
  await requireBase(dataRoot, input.baseId);
  const catalog = await readCatalog(dataRoot);
  const source = expandUserPath(input.sourcePath);
  if (!existsSync3(source)) throw new KbError("not_found", missingSourceMessage(input.sourcePath));
  const destination = resolveDest(dataRoot, input.baseId, input.destCategory);
  const baseRoot = baseDir(dataRoot, input.baseId);
  assertInside(baseRoot, destination.absolute);
  const createMissing = input.createMissing !== false;
  const preserveTree = Boolean(input.preserveTree);
  if (createMissing) await mkdir5(destination.absolute, { recursive: true });
  else if (!existsSync3(destination.absolute)) {
    throw new KbError("not_found", `\u7C7B\u76EE\u4E0D\u5B58\u5728\uFF1A${destination.relative || "(\u5E93\u6839)"}`);
  }
  const hashes = await existingHashes(baseRoot);
  const currentBytes = await dirSize(baseRoot);
  const createdDirs = /* @__PURE__ */ new Set();
  if (createMissing && destination.relative) createdDirs.add(destination.relative);
  const sourceInfo = await stat4(source);
  const sourceRoot = sourceInfo.isDirectory() ? source : dirname4(source);
  const files = await walkSource(source);
  const result = {
    baseId: input.baseId,
    copied: [],
    renamed: [],
    skipped: 0,
    failed: 0,
    createdDirs: [],
    files: [],
    warnings: destination.deep ? [`\u7C7B\u76EE\u6DF1\u5EA6\u8D85\u8FC7 ${CATEGORY_WARN_DEPTH}\uFF0C\u4ECD\u5DF2\u5199\u5165`] : []
  };
  let addedBytes = 0;
  for (const file of files) {
    const fileResults = await ingestOne({
      file,
      sourceRoot,
      destinationAbsolute: destination.absolute,
      preserveTree,
      baseRoot,
      hashes,
      maxFileBytes: catalog.prefs.maxFileBytes,
      maxBaseBytes: catalog.prefs.maxBaseBytes,
      currentBytes: currentBytes + addedBytes
    });
    for (const fileResult of fileResults) {
      result.files.push(fileResult);
      if (fileResult.warnings?.length) result.warnings.push(...fileResult.warnings);
      if (fileResult.status === "skipped") result.skipped += 1;
      else if (fileResult.status === "failed") result.failed += 1;
      else {
        result.copied.push(fileResult.relPath);
        if (fileResult.status === "renamed") result.renamed.push(fileResult.relPath);
        if (fileResult.relPath.includes("/")) createdDirs.add(dirname4(fileResult.relPath).split(sep3).join("/"));
        addedBytes += fileResult.writtenBytes ?? 0;
      }
    }
  }
  result.createdDirs = [...createdDirs].filter(Boolean);
  await rememberLastDest(dataRoot, input.baseId, destination.relative);
  return result;
}
async function ingestOne(args) {
  const name2 = basename3(args.file);
  const sourceRelativePath = relativeSourcePath(args.sourceRoot, args.file, args.preserveTree);
  const failed = (code, reason) => ({
    relPath: sourceRelativePath,
    sourceRelPath: sourceRelativePath,
    status: "failed",
    code,
    reason
  });
  try {
    return await ingestOneUnsafe(args, name2, sourceRelativePath, failed);
  } catch (error) {
    if (error instanceof KbError) {
      if (isIngestFailureCode(error.code)) return [failed(error.code, error.message)];
      return [failed("io_failed", "\u6587\u4EF6\u5904\u7406\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u6743\u9650\u6216\u78C1\u76D8\u7A7A\u95F4")];
    }
    return [failed("io_failed", "\u6587\u4EF6\u5904\u7406\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u6743\u9650\u6216\u78C1\u76D8\u7A7A\u95F4")];
  }
}
async function ingestOneUnsafe(args, name2, sourceRelativePath, failed) {
  if (!contentRegistry.sourceFormatForPath(name2)) {
    return [failed("ext_denied", `\u53EA\u652F\u6301 ${contentRegistry.sourceExtensions().join(" / ")}`)];
  }
  const preparedEntries = await contentRegistry.prepareImport({
    sourcePath: args.file,
    sourceName: name2,
    maxFileBytes: args.maxFileBytes
  });
  if (!preparedEntries.length) return [failed("io_failed", "\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u5185\u5BB9")];
  const results = [];
  let extraBytes = 0;
  for (const prepared of preparedEntries) {
    const written = await ingestPrepared(args, name2, sourceRelativePath, failed, prepared, args.currentBytes + extraBytes);
    results.push(written);
    if (written.status === "copied" || written.status === "renamed") extraBytes += written.writtenBytes ?? 0;
  }
  return results;
}
async function ingestPrepared(args, name2, sourceRelativePath, failed, prepared, currentBytes) {
  if (prepared.byteLength > args.maxFileBytes) {
    return failed("file_too_large", `\u5355\u6587\u4EF6\u8D85\u8FC7 ${args.maxFileBytes} \u5B57\u8282`);
  }
  if (currentBytes + prepared.byteLength > args.maxBaseBytes) {
    return failed("quota", "\u672C\u6279\u5BFC\u5165\u5C06\u8D85\u8FC7\u5355\u5E93\u6587\u5B57\u4E0A\u9650");
  }
  if (args.hashes.has(prepared.digest)) {
    return {
      relPath: args.hashes.get(prepared.digest) ?? sourceRelativePath,
      sourceRelPath: sourceRelativePath,
      status: "skipped",
      reason: "\u540C\u6307\u7EB9\u5DF2\u5728\u5E93\u4E2D",
      warnings: prepared.warnings
    };
  }
  if (!prepared.outputName || basename3(prepared.outputName) !== prepared.outputName) {
    return failed("io_failed", "\u8F6C\u6362\u4EA7\u7269\u540D\u65E0\u6548");
  }
  const intendedPath = join6(args.destinationAbsolute, outputRelativePath(sourceRelativePath, name2, prepared.outputName));
  assertInside(args.baseRoot, intendedPath);
  assertNoSymlinkEscape(args.baseRoot, dirname4(intendedPath));
  await mkdir5(dirname4(intendedPath), { recursive: true });
  let destinationPath = intendedPath;
  let status = "copied";
  if (existsSync3(destinationPath)) {
    destinationPath = join6(dirname4(intendedPath), uniqueName(dirname4(intendedPath), basename3(intendedPath)));
    status = "renamed";
  }
  const writtenBytes = await writePreparedEntry(destinationPath, prepared);
  const relativeDestinationPath = relative3(args.baseRoot, destinationPath).split(sep3).join("/");
  args.hashes.set(prepared.digest, relativeDestinationPath);
  return {
    relPath: relativeDestinationPath,
    sourceRelPath: sourceRelativePath,
    destinationPath: relativeDestinationPath,
    status,
    writtenBytes: writtenBytes || prepared.byteLength,
    warnings: prepared.warnings
  };
}

// src/search.ts
import { existsSync as existsSync5 } from "node:fs";
import { isAbsolute as isAbsolute4, join as join8, relative as relative5, sep as sep5 } from "node:path";

// src/search-groups.ts
function groupMatchesByFile(positions) {
  const byFile = /* @__PURE__ */ new Map();
  for (const position of positions) {
    const group = byFile.get(position.path);
    if (group) group.push({ line: position.line, columnByte: position.columnByte });
    else byFile.set(position.path, [{ line: position.line, columnByte: position.columnByte }]);
  }
  const groups = [...byFile.entries()].map(([path, matches]) => ({ path, matches }));
  groups.sort((left, right) => right.matches.length - left.matches.length || left.path.localeCompare(right.path));
  for (const group of groups) {
    group.matches.sort((left, right) => left.line - right.line || left.columnByte - right.columnByte);
  }
  return groups;
}
function canMergeWindows(previous, next, allowNeighbors) {
  return next.startLine <= previous.endLine + (allowNeighbors ? 1 : 0);
}
function restFileList(groups, lastTouchedIndex, limit) {
  const firstUntouched = lastTouchedIndex < 0 ? 0 : lastTouchedIndex + 1;
  return groups.slice(firstUntouched, firstUntouched + limit).map((group) => ({ path: group.path, count: group.matches.length }));
}
function prefixRawCounts(groups) {
  const prefix = new Array(groups.length);
  let total = 0;
  for (let index = 0; index < groups.length; index += 1) {
    prefix[index] = total;
    total += groups[index].matches.length;
  }
  return prefix;
}

// src/search-rg.ts
import { spawn } from "node:child_process";
import { existsSync as existsSync4 } from "node:fs";
import { isAbsolute as isAbsolute3, join as join7, relative as relative4, sep as sep4 } from "node:path";
function asRecord2(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function parseRg(stdout, rootDir) {
  const matches = [];
  for (const raw of stdout.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      continue;
    }
    const record = asRecord2(value);
    if (record?.type !== "match") continue;
    const data = asRecord2(record.data);
    const pathData = asRecord2(data?.path);
    const printedPath = typeof pathData?.text === "string" ? pathData.text : "";
    const line = data && typeof data.line_number === "number" ? data.line_number : 0;
    const submatches = data && Array.isArray(data.submatches) ? data.submatches : [];
    const firstSubmatch = asRecord2(submatches[0]);
    const start = typeof firstSubmatch?.start === "number" ? firstSubmatch.start : 0;
    if (!printedPath || !Number.isInteger(line) || line < 1 || !Number.isInteger(start) || start < 0) continue;
    const absolutePath = isAbsolute3(printedPath) ? printedPath : join7(rootDir, printedPath);
    const relativePath = relative4(rootDir, absolutePath).split(sep4).join("/");
    if (relativePath && !relativePath.startsWith("../") && relativePath !== "..") {
      matches.push({ path: relativePath, line, columnByte: start + 1 });
    }
  }
  return matches;
}
async function resolveRg() {
  const mod = await import("@vscode/ripgrep");
  const ripgrepPath = mod.rgPath;
  if (!ripgrepPath || !existsSync4(ripgrepPath)) throw new Error("\u627E\u4E0D\u5230\u6253\u5305\u7684 ripgrep");
  return ripgrepPath;
}
function runRg(binaryPath, rgArgs, workingDirectory) {
  return new Promise((resolve2, reject) => {
    const child = spawn(binaryPath, rgArgs, { cwd: workingDirectory, windowsHide: true });
    const stdoutChunks = [];
    let stdoutBytes = 0;
    let stderr = "";
    let timedOut = false;
    let truncated = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, SEARCH_RG_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stdoutChunks.push(buffer);
      stdoutBytes += buffer.length;
      if (stdoutBytes > SEARCH_RG_MAX_STDOUT_BYTES) {
        truncated = true;
        child.kill("SIGKILL");
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const warnings = [];
      if (timedOut) warnings.push("\u68C0\u7D22\u8D85\u65F6\uFF0C\u5DF2\u8FD4\u56DE\u90E8\u5206\u7ED3\u679C");
      if (truncated) warnings.push("\u68C0\u7D22\u7ED3\u679C\u8FC7\u591A\uFF0C\u5DF2\u622A\u65AD");
      const stdout = Buffer.concat(stdoutChunks, stdoutBytes).toString("utf8");
      if (code === 0 || code === 1 || timedOut || truncated) {
        resolve2({ stdout, warnings, scanComplete: !timedOut && !truncated });
      } else reject(new Error(stderr.trim() || `rg \u9000\u51FA ${code}`));
    });
  });
}
async function scanWithRipgrep(terms, rootDir) {
  const ripgrepBinary = await resolveRg();
  const rgArgs = [
    "--json",
    "--column",
    "--glob-case-insensitive",
    "--max-count",
    String(SEARCH_RG_MAX_COUNT_PER_FILE + 1),
    "--max-filesize",
    SEARCH_RG_MAX_FILESIZE
  ];
  for (const glob of contentRegistry.searchGlobs()) rgArgs.push("--glob", glob);
  for (const term of terms) rgArgs.push("-e", term);
  rgArgs.push(".");
  const run = await runRg(ripgrepBinary, rgArgs, rootDir);
  const matches = parseRg(run.stdout, rootDir);
  const matchCounts = /* @__PURE__ */ new Map();
  for (const match of matches) {
    matchCounts.set(match.path, (matchCounts.get(match.path) ?? 0) + 1);
  }
  const warnings = [...run.warnings];
  const perFileTruncated = [...matchCounts.values()].some((count) => count > SEARCH_RG_MAX_COUNT_PER_FILE);
  if (perFileTruncated) warnings.push("\u5355\u4E2A\u6587\u4EF6\u547D\u4E2D\u8D85\u8FC7\u626B\u63CF\u4E0A\u9650\uFF0C\u7ED3\u679C\u53EF\u80FD\u4E0D\u5B8C\u6574");
  return { matches, warnings, scanComplete: run.scanComplete && !perFileTruncated };
}

// src/search-cursor.ts
import { createHash as createHash6 } from "node:crypto";
function asRecord3(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function searchQueryKey(input) {
  return createHash6("sha256").update(JSON.stringify({ baseId: input.baseId, rootDir: input.rootDir, terms: input.terms, path: input.path ?? null })).digest("hex");
}
function encodeSearchCursor(position, queryKey) {
  if (!Number.isSafeInteger(position.fileIndex) || position.fileIndex < 0 || !Number.isSafeInteger(position.hitIndex) || position.hitIndex < 0) {
    throw new Error("\u641C\u7D22\u6E38\u6807\u4F4D\u7F6E\u65E0\u6548");
  }
  const payload = { version: 2, fileIndex: position.fileIndex, hitIndex: position.hitIndex, queryKey };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}
function decodeSearchCursor(cursor, queryKey) {
  if (cursor.length > 512) throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u65E0\u6548\u6216\u5DF2\u8FC7\u671F");
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const payload = asRecord3(value);
    const fileIndex = typeof payload?.fileIndex === "number" ? payload.fileIndex : -1;
    const hitIndex = typeof payload?.hitIndex === "number" ? payload.hitIndex : -1;
    if (payload?.version !== 2 || payload.queryKey !== queryKey || !Number.isSafeInteger(fileIndex) || fileIndex < 0 || !Number.isSafeInteger(hitIndex) || hitIndex < 0) {
      throw new Error("\u641C\u7D22\u6E38\u6807\u65E0\u6548");
    }
    return { fileIndex, hitIndex };
  } catch {
    throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u65E0\u6548\u6216\u5DF2\u8FC7\u671F");
  }
}

// src/search.ts
function mergeTerms(query, aliases) {
  const warnings = [];
  let aliasList = (aliases ?? []).map((item) => item.trim()).filter(Boolean);
  if (aliasList.length > MAX_ALIASES) {
    warnings.push(`aliases \u8D85\u8FC7 ${MAX_ALIASES} \u4E2A\uFF0C\u5DF2\u622A\u65AD`);
    aliasList = aliasList.slice(0, MAX_ALIASES);
  }
  const seen = /* @__PURE__ */ new Set();
  const terms = [];
  for (const term of [query.trim(), ...aliasList]) {
    if (!term || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
  }
  return { terms, warnings };
}
var HIT_LABEL_OVERHEAD_CHARS = 60;
function buildMergedHits(group, startIndex, document, radius, allowNeighbors) {
  const built = [];
  for (let rawIndex = startIndex; rawIndex < group.matches.length; rawIndex += 1) {
    const match = group.matches[rawIndex];
    const clip = document.excerptAt(match.line, radius);
    const previous = built.at(-1);
    if (previous && canMergeWindows(previous.hit, clip, allowNeighbors)) {
      const startLine = Math.min(previous.hit.startLine, clip.startLine);
      const endLine = Math.max(previous.hit.endLine, clip.endLine);
      previous.hit.excerpt = document.mergeExcerpt(
        { startLine: previous.hit.startLine, endLine: previous.hit.endLine, excerpt: previous.hit.excerpt },
        { startLine: clip.startLine, endLine: clip.endLine, excerpt: clip.excerpt },
        startLine,
        endLine
      );
      previous.hit.startLine = startLine;
      previous.hit.endLine = endLine;
      continue;
    }
    built.push({
      hit: {
        n: 0,
        path: group.path,
        startLine: clip.startLine,
        endLine: clip.endLine,
        matchLine: Math.min(Math.max(match.line, clip.startLine), clip.endLine),
        excerpt: clip.excerpt,
        ...clip.matchedExcerpt === void 0 ? {} : { matchedExcerpt: clip.matchedExcerpt },
        matchColumnByte: document.normalizeColumnByte(match.line, match.columnByte),
        sourceFingerprint: document.fingerprint
      },
      firstRawIndex: rawIndex
    });
  }
  return built;
}
var RipgrepSearchEngine = class {
  lastWarnings = [];
  async search(input) {
    this.lastWarnings = [];
    if (!existsSync5(input.rootDir)) {
      return { files: [], totalFiles: 0, totalHits: 0, restFiles: [], hasMore: false, endPosition: { fileIndex: 0, hitIndex: 0 }, scanComplete: true };
    }
    const scan = await scanWithRipgrep(input.terms, input.rootDir);
    this.lastWarnings = scan.warnings;
    const allGroups = groupMatchesByFile(scan.matches);
    const groups = input.path ? allGroups.filter((group) => group.path === input.path) : allGroups;
    const page = await this.buildPage(input, groups);
    return {
      files: page.files,
      totalFiles: groups.length,
      totalHits: groups.reduce((sum, group) => sum + group.matches.length, 0),
      restFiles: page.restFiles,
      hasMore: page.hasMore,
      endPosition: page.endPosition,
      scanComplete: scan.scanComplete
    };
  }
  async readDocument(rootDir, relativePath, cache) {
    const cached = cache.get(relativePath);
    if (cached) return cached;
    const absolutePath = join8(rootDir, relativePath);
    const safePath = assertInside(rootDir, absolutePath);
    assertNoSymlinkEscape(rootDir, safePath);
    const document = await contentRegistry.readForSearch({ absolutePath: safePath, relativePath });
    cache.set(relativePath, document);
    for (const warning of document.warnings ?? []) {
      if (!this.lastWarnings.includes(warning)) this.lastWarnings.push(warning);
    }
    return document;
  }
  /** 从游标断点起按字符预算切页：只读本页触碰到的文件。 */
  async buildPage(input, groups) {
    const files = [];
    const fileCache = /* @__PURE__ */ new Map();
    const prefixes = prefixRawCounts(groups);
    let usedChars = 0;
    let pageHits = 0;
    let lastTouchedIndex = -1;
    let hasMore = false;
    let endPosition = { fileIndex: groups.length, hitIndex: 0 };
    let fileIndex = Math.min(Math.max(input.fileIndex, 0), groups.length);
    let startIndex = fileIndex === groups.length ? 0 : Math.max(input.hitIndex, 0);
    while (fileIndex < groups.length) {
      const group = groups[fileIndex];
      const rawStart = Math.min(startIndex, group.matches.length);
      startIndex = 0;
      if (rawStart >= group.matches.length) {
        fileIndex += 1;
        continue;
      }
      const document = await this.readDocument(input.rootDir, group.path, fileCache);
      const format = contentRegistry.entryFormatForPath(group.path) ?? EntryFormat.Markdown;
      const detailMode = input.path !== void 0;
      const radius = detailMode ? format === EntryFormat.Csv ? SEARCH_LIST_CONTEXT : SEARCH_CONTEXT : format === EntryFormat.Csv ? 0 : SEARCH_LIST_CONTEXT;
      const allowNeighbors = detailMode ? document.mergeNeighbors !== false : false;
      const built = buildMergedHits(group, rawStart, document, radius, allowNeighbors);
      const headerCost = HIT_LABEL_OVERHEAD_CHARS + group.path.length + (document.groupHeader?.length ?? 0);
      let included = 0;
      for (let index = 0; index < built.length; index += 1) {
        const cost = HIT_LABEL_OVERHEAD_CHARS + built[index].hit.excerpt.length + (index === 0 ? headerCost : 0);
        if (pageHits > 0 && usedChars + cost > SEARCH_PAGE_MAX_CHARS) break;
        usedChars += cost;
        included += 1;
        pageHits += 1;
      }
      if (included > 0) {
        lastTouchedIndex = fileIndex;
        files.push({
          path: group.path,
          format,
          totalHits: group.matches.length,
          ...document.groupHeader === void 0 ? {} : { groupHeader: document.groupHeader },
          hits: built.slice(0, included).map((item) => ({ ...item.hit, n: prefixes[fileIndex] + item.firstRawIndex + 1 }))
        });
      }
      if (included < built.length) {
        hasMore = true;
        endPosition = { fileIndex, hitIndex: built[included].firstRawIndex };
        break;
      }
      fileIndex += 1;
    }
    return {
      files,
      restFiles: hasMore ? restFileList(groups, lastTouchedIndex, SEARCH_REST_FILES_LIMIT) : [],
      hasMore,
      endPosition
    };
  }
};
function normalizeSearchPath(inputPath, rootDir) {
  const trimmed = inputPath?.trim();
  if (!trimmed) return void 0;
  if (isAbsolute4(trimmed)) throw new KbError("invalid_field", "path \u5FC5\u987B\u662F\u68C0\u7D22\u8303\u56F4\u5185\u7684\u76F8\u5BF9\u8DEF\u5F84");
  const absolute = assertInside(rootDir, join8(rootDir, trimmed));
  return relative5(rootDir, absolute).split(sep5).join("/");
}
async function searchBase(dataRoot, input, engine = new RipgrepSearchEngine()) {
  if (!input.baseId?.trim()) throw new KbError("missing_field", "kb_search \u5FC5\u987B\u5E26 baseId");
  if (!input.query?.trim()) throw new KbError("missing_field", "query \u5FC5\u586B");
  await requireBase(dataRoot, input.baseId);
  const { terms, warnings } = mergeTerms(input.query, input.aliases);
  let rootDir = baseDir(dataRoot, input.baseId);
  if (input.category?.trim()) {
    try {
      const destination = resolveDest(dataRoot, input.baseId, input.category);
      if (existsSync5(destination.absolute)) rootDir = destination.absolute;
    } catch {
    }
  }
  const searchPath = normalizeSearchPath(input.path, rootDir);
  const queryKey = searchQueryKey({ baseId: input.baseId, rootDir, terms, path: searchPath });
  const cursor = input.cursor?.trim();
  const position = cursor ? decodeSearchCursor(cursor, queryKey) : { fileIndex: 0, hitIndex: 0 };
  const page = await engine.search({ baseId: input.baseId, rootDir, terms, path: searchPath, fileIndex: position.fileIndex, hitIndex: position.hitIndex });
  const extraWarnings = engine instanceof RipgrepSearchEngine ? engine.lastWarnings : [];
  await markUsed(dataRoot, input.baseId);
  return {
    files: page.files,
    totalFiles: page.totalFiles,
    totalHits: page.totalHits,
    ...page.restFiles.length ? { restFiles: page.restFiles } : {},
    warnings: [...warnings, ...extraWarnings],
    scanComplete: page.scanComplete,
    hasMore: page.hasMore,
    ...page.hasMore ? { nextCursor: encodeSearchCursor(page.endPosition, queryKey) } : {}
  };
}

// src/command-parse.ts
function parseFlags(tokens) {
  const rest = [];
  const flags = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith("--")) {
      rest.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = tokens[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return { sub: rest[0] ?? "", rest: rest.slice(1), flags };
}
function flagString(flags, key) {
  const value = flags[key];
  return typeof value === "string" ? value : void 0;
}
function flagBool(flags, key, fallback = false) {
  const value = flags[key];
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}
function splitAliases(value) {
  if (!value) return [];
  return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}
function tokenize(rawInput) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let tokenMatch;
  while (tokenMatch = re.exec(rawInput)) tokens.push(tokenMatch[1] ?? tokenMatch[2] ?? tokenMatch[3]);
  return tokens;
}

// src/ingest-dropped.ts
import { mkdtemp, rm as rm5, writeFile as writeFile5 } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as join9 } from "node:path";
function sanitizeDroppedFileName(name2) {
  const base = name2.trim().split(/[\\/]/).pop() ?? "";
  if (!base || base === "." || base === ".." || base.includes("\0")) {
    throw new KbError("invalid_field", "\u62D6\u5165\u6587\u4EF6\u540D\u65E0\u6548");
  }
  return base;
}
async function ingestDroppedBytes(dataRoot, input) {
  const fileName = sanitizeDroppedFileName(input.fileName);
  if (input.bytes.length === 0) throw new KbError("invalid_field", "\u62D6\u5165\u6587\u4EF6\u662F\u7A7A\u7684");
  const tempDir = await mkdtemp(join9(tmpdir(), "zy-drop-"));
  const sourcePath = join9(tempDir, fileName);
  try {
    await writeFile5(sourcePath, input.bytes, { flag: "wx" });
    return await ingest(dataRoot, buildIngestInput({
      baseId: input.baseId,
      sourcePath,
      destCategory: input.destCategory,
      preserveTree: input.preserveTree,
      createMissing: input.createMissing
    }));
  } finally {
    await rm5(tempDir, { recursive: true, force: true });
  }
}

// src/pick-source.ts
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
var defaultExec = (file, args) => promisify(execFileCb)(file, args, { windowsHide: true, encoding: "utf8" });
function normalizePickedPath(raw) {
  let path = raw.replace(/\r?\n$/g, "").trim();
  const isWindowsDriveRoot = /^[A-Za-z]:[\\/]$/.test(path);
  if (path.length > 1 && !isWindowsDriveRoot && (path.endsWith("/") || path.endsWith("\\"))) path = path.slice(0, -1);
  return path;
}
function macArgs(kind) {
  const prompt = kind === "dir" ? "\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6\u5939" : "\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6";
  const choose = kind === "dir" ? "choose folder" : "choose file";
  return ["-e", `try
POSIX path of (${choose} with prompt "${prompt}")
on error number -128
""
end try`];
}
function winArgs(kind) {
  const utf8 = "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ";
  const sourceFilter = `\u53EF\u5BFC\u5165\u6587\u4EF6|${contentRegistry.sourceExtensions().map((extension) => `*${extension}`).join(";")}|All|*.*`;
  const script = kind === "dir" ? `${utf8}Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6\u5939'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $d.SelectedPath }` : `${utf8}Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = '${sourceFilter}'; $d.Title = '\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $d.FileName }`;
  return ["-NoProfile", "-STA", "-Command", script];
}
function linuxArgs(kind) {
  return kind === "dir" ? ["--file-selection", "--directory", "--title=\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6\u5939"] : ["--file-selection", "--title=\u9009\u62E9\u8981\u5BFC\u5165\u7684\u6587\u4EF6"];
}
function invokeArgs(kind, platform) {
  if (platform === "darwin") return { file: "osascript", args: macArgs(kind) };
  if (platform === "win32") return { file: "powershell.exe", args: winArgs(kind) };
  if (platform === "linux") return { file: "zenity", args: linuxArgs(kind) };
  throw new KbError("not_found", `\u5F53\u524D\u5E73\u53F0 ${platform} \u6682\u4E0D\u652F\u6301\u7CFB\u7EDF\u6587\u4EF6\u9009\u62E9\u5668\uFF0C\u8BF7\u4F7F\u7528\u62D6\u62FD\u5BFC\u5165`);
}
function isMissingBin(error) {
  return Boolean(error && typeof error === "object" && error.code === "ENOENT");
}
function isCancelExit(error) {
  const code = error && typeof error === "object" ? error.code : void 0;
  return code === 1 || code === 128;
}
async function pickSource(kind, opts) {
  const exec = opts?.exec ?? defaultExec;
  const platform = opts?.platform ?? process.platform;
  const { file, args } = invokeArgs(kind, platform);
  try {
    const { stdout } = await exec(file, args);
    const path = normalizePickedPath(stdout);
    if (!path) return { cancelled: true };
    return { path };
  } catch (error) {
    if (isMissingBin(error)) {
      throw new KbError("not_found", "\u672C\u673A\u6CA1\u6709\u53EF\u7528\u7684\u9009\u6587\u4EF6\u5BF9\u8BDD\u6846\uFF0C\u8BF7\u4F7F\u7528\u62D6\u62FD\u533A\u57DF\uFF0C\u6216\u68C0\u67E5\u7CFB\u7EDF\u6587\u4EF6\u9009\u62E9\u5668");
    }
    if (isCancelExit(error)) return { cancelled: true };
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// src/ui-operations.ts
var MAX_PREF_FILE_BYTES = 1024 * 1024 * 1024;
var MAX_PREF_BASE_BYTES = 10 * 1024 * 1024 * 1024 * 1024;
function asRecord4(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new KbError("invalid_field", "\u8BF7\u6C42\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61");
  }
  return value;
}
function hasField(data, field) {
  return Object.prototype.hasOwnProperty.call(data, field);
}
function requireString(data, field) {
  const value = data[field];
  if (value === void 0) throw new KbError("missing_field", `${field} \u5FC5\u586B`);
  if (typeof value !== "string") throw new KbError("invalid_field", `${field} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32`);
  return value;
}
function optionalString(data, field) {
  if (!hasField(data, field)) return void 0;
  return requireString(data, field);
}
function optionalStringArray(data, field) {
  if (!hasField(data, field)) return void 0;
  const value = data[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new KbError("invalid_field", `${field} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4`);
  }
  return value;
}
function optionalBoolean(data, field, fallback) {
  if (!hasField(data, field)) return fallback;
  const value = data[field];
  if (typeof value !== "boolean") throw new KbError("invalid_field", `${field} \u5FC5\u987B\u662F\u5E03\u5C14\u503C`);
  return value;
}
function optionalPositiveInteger(data, field) {
  if (!hasField(data, field)) return void 0;
  const value = data[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new KbError("invalid_field", `${field} \u5FC5\u987B\u662F\u6B63\u6574\u6570`);
  }
  return value;
}
function readPreviewOptions(data) {
  const readMode = hasField(data, "readMode") ? data.readMode : EntryReadMode.Preview;
  if (!isEntryReadMode(readMode)) throw new KbError("invalid_preview", "\u8BFB\u53D6\u6A21\u5F0F\u65E0\u6548");
  if (!hasField(data, "view")) return { readMode };
  if (!isEntryPreviewView(data.view)) throw new KbError("invalid_preview", "\u9884\u89C8\u6A21\u5F0F\u65E0\u6548");
  if (data.view === EntryPreviewView.Tree) return { view: data.view, readMode };
  if (readMode === EntryReadMode.Edit) throw new KbError("invalid_preview", "\u641C\u7D22\u547D\u4E2D\u4E0D\u80FD\u8FDB\u5165\u7F16\u8F91\u6A21\u5F0F");
  const matchLine = optionalPositiveInteger(data, "matchLine");
  if (matchLine === void 0) throw new KbError("invalid_preview", "\u641C\u7D22\u9884\u89C8\u7F3A\u5C11\u6709\u6548\u547D\u4E2D\u884C");
  const matchColumnByte = optionalPositiveInteger(data, "matchColumnByte");
  const sourceFingerprint = optionalString(data, "sourceFingerprint");
  if (sourceFingerprint !== void 0 && sourceFingerprint.length > 128) {
    throw new KbError("invalid_preview", "\u641C\u7D22\u9884\u89C8\u6587\u4EF6\u6307\u7EB9\u65E0\u6548");
  }
  return { view: data.view, readMode, matchLine, matchColumnByte, sourceFingerprint };
}
async function setPrefs(dataRoot, data) {
  return withCatalogTx(dataRoot, async ({ catalog }) => {
    const defaultBaseId = optionalString(data, "defaultBaseId");
    const maxFileBytes = optionalPositiveInteger(data, "maxFileBytes");
    const maxBaseBytes = optionalPositiveInteger(data, "maxBaseBytes");
    const nextPrefs = {
      defaultBaseId: defaultBaseId ?? catalog.prefs.defaultBaseId,
      maxFileBytes: maxFileBytes ?? catalog.prefs.maxFileBytes,
      maxBaseBytes: maxBaseBytes ?? catalog.prefs.maxBaseBytes
    };
    if (nextPrefs.maxFileBytes > MAX_PREF_FILE_BYTES || nextPrefs.maxBaseBytes > MAX_PREF_BASE_BYTES) {
      throw new KbError("quota", "\u504F\u597D\u989D\u5EA6\u8D85\u51FA\u5141\u8BB8\u8303\u56F4");
    }
    if (nextPrefs.maxFileBytes > nextPrefs.maxBaseBytes) {
      throw new KbError("quota", "\u5355\u6587\u4EF6\u4E0A\u9650\u4E0D\u80FD\u5927\u4E8E\u5355\u5E93\u4E0A\u9650");
    }
    if (nextPrefs.defaultBaseId) await requireBase(dataRoot, nextPrefs.defaultBaseId);
    catalog.prefs = nextPrefs;
    return { result: catalog.prefs, catalog };
  });
}
async function executeKnowledgeOperation(payload, jobs) {
  const data = asRecord4(payload);
  const operation = requireString(data, "op");
  const dataRoot = await resolveDataRoot();
  switch (operation) {
    case "list":
      return listBases(dataRoot);
    case "create":
      return createBase(dataRoot, {
        title: requireString(data, "title"),
        description: requireString(data, "description"),
        aliases: optionalStringArray(data, "aliases") ?? []
      });
    case "update":
      return updateBase(dataRoot, requireString(data, "id"), {
        title: optionalString(data, "title"),
        description: optionalString(data, "description"),
        aliases: optionalStringArray(data, "aliases")
      });
    case "deleteBase":
      await deleteBase(dataRoot, requireString(data, "id"), optionalBoolean(data, "confirm", false));
      return { ok: true };
    case "tree":
      return listTree(dataRoot, requireString(data, "id"));
    case "read":
      return readEntry(dataRoot, requireString(data, "id"), requireString(data, "path"), readPreviewOptions(data));
    case "readPage":
      return readEntryPage(
        dataRoot,
        requireString(data, "id"),
        requireString(data, "path"),
        optionalPositiveInteger(data, "startRow") ?? 1,
        optionalPositiveInteger(data, "pageSize") ?? TABLE_EDITOR_PAGE_SIZE
      );
    case "write":
      await writeEntryContent(dataRoot, requireString(data, "id"), requireString(data, "path"), parseEntryWriteChange(data.change));
      return { ok: true };
    case "deleteEntry":
      await deleteEntry(dataRoot, requireString(data, "id"), requireString(data, "path"), optionalBoolean(data, "confirm", false));
      return { ok: true };
    case "pick": {
      const kind = requireString(data, "kind");
      if (kind !== "file" && kind !== "dir") throw new KbError("invalid_field", "kind \u5FC5\u987B\u662F file \u6216 dir");
      return pickSource(kind);
    }
    case "ingest": {
      const sourceBase64 = optionalString(data, "sourceBase64");
      if (sourceBase64 !== void 0) {
        return jobs.enqueue("ingest", () => ingestDroppedBytes(dataRoot, {
          baseId: requireString(data, "baseId"),
          destCategory: requireString(data, "destCategory"),
          fileName: requireString(data, "sourceName"),
          bytes: Buffer.from(sourceBase64, "base64"),
          preserveTree: optionalBoolean(data, "preserveTree", false),
          createMissing: optionalBoolean(data, "createMissing", true)
        }));
      }
      return jobs.enqueue("ingest", () => ingest(dataRoot, buildIngestInput({
        baseId: requireString(data, "baseId"),
        sourcePath: requireString(data, "sourcePath"),
        destCategory: requireString(data, "destCategory"),
        preserveTree: optionalBoolean(data, "preserveTree", false),
        createMissing: optionalBoolean(data, "createMissing", true)
      })));
    }
    case "search":
      return searchBase(dataRoot, {
        baseId: requireString(data, "baseId"),
        query: requireString(data, "query"),
        aliases: optionalStringArray(data, "aliases"),
        category: optionalString(data, "category"),
        path: optionalString(data, "path"),
        cursor: optionalString(data, "cursor")
      });
    case "prefs":
      return (await readCatalog(dataRoot)).prefs;
    case "setPrefs":
      return setPrefs(dataRoot, data);
    default:
      throw new KbError("unknown_op", `\u672A\u77E5\u64CD\u4F5C ${operation}`);
  }
}

// src/commands.ts
function ok(value) {
  return { kind: "success", text: typeof value === "string" ? value : JSON.stringify(value) };
}
function fail(error) {
  return { kind: "error", text: error instanceof Error ? error.message : String(error) };
}
async function handleCall(payload, jobs) {
  return executeKnowledgeOperation(JSON.parse(payload), jobs);
}
async function resolveIngestTo(dataRoot, baseId, destinationCategoryFlag, importToBaseRoot) {
  if (destinationCategoryFlag !== void 0) return destinationCategoryFlag;
  if (importToBaseRoot) return "";
  const lastDestinationCategory = await lastDestCategory(dataRoot, baseId);
  if (lastDestinationCategory === void 0) {
    throw new KbError("missing_field", "\u8BF7\u6307\u5B9A --to <\u7C7B\u76EE>\uFF0C\u6216 --root \u5BFC\u5165\u5230\u5E93\u6839");
  }
  return lastDestinationCategory;
}
async function handleIngest(rest, flags, jobs) {
  const sourcePath = rest[0] ?? flagString(flags, "path");
  const baseId = flagString(flags, "base");
  if (!sourcePath) throw new KbError("missing_field", "\u7528\u6CD5\uFF1A/kb ingest <path> --base <id> --to <\u7C7B\u76EE>");
  if (!baseId) throw new KbError("missing_field", "\u5BFC\u5165\u5FC5\u987B\u6307\u5B9A --base");
  const dataRoot = await resolveDataRoot();
  const destCategory = await resolveIngestTo(dataRoot, baseId, flagString(flags, "to"), flagBool(flags, "root", false));
  return jobs.enqueue("ingest", () => ingest(dataRoot, buildIngestInput({
    baseId,
    sourcePath,
    destCategory,
    preserveTree: flagBool(flags, "preserve-tree"),
    createMissing: !flagBool(flags, "no-create")
  })));
}
function registerKbCommands(ctx, jobs) {
  return ctx.commands.register({
    name: COMMAND_NAME,
    description: "\u77E5\u6E90\u77E5\u8BC6\u5E93\uFF1Aingest / status / call",
    input: { hint: "ingest <path> --base <id> --to <\u7C7B\u76EE> | status | call {json}" },
    recordInput: false,
    handler: async ({ rawInput }) => {
      const tokens = tokenize(rawInput.trim());
      const parsed = parseFlags(tokens);
      try {
        if (parsed.sub === "status" || !parsed.sub) return ok(jobs.status());
        if (parsed.sub === "ingest") return ok(await handleIngest(parsed.rest, parsed.flags, jobs));
        if (parsed.sub === "call") return ok(await handleCall(parsed.rest.join(" "), jobs));
        if (parsed.sub === "search") {
          const dataRoot = await resolveDataRoot();
          return ok(await searchBase(dataRoot, {
            baseId: flagString(parsed.flags, "base") ?? "",
            query: parsed.rest.join(" ") || flagString(parsed.flags, "query") || "",
            aliases: splitAliases(flagString(parsed.flags, "aliases")),
            category: flagString(parsed.flags, "to") ?? flagString(parsed.flags, "category"),
            path: flagString(parsed.flags, "path"),
            cursor: flagString(parsed.flags, "cursor")
          }));
        }
        return { kind: "error", text: "\u7528\u6CD5\uFF1A/kb ingest <path> --base <id> --to <\u7C7B\u76EE> \u6216 /kb status" };
      } catch (error) {
        return fail(error);
      }
    }
  }) ?? (() => void 0);
}

// src/render-search.ts
function asRecord5(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && Boolean(item.trim())) : [];
}
function text(value) {
  return [{ type: "text", text: value }];
}
function renderIngestResult(value) {
  const result = asRecord5(value);
  const copied = Array.isArray(result?.copied) ? result.copied.filter((item) => typeof item === "string") : [];
  const skipped = typeof result?.skipped === "number" ? result.skipped : 0;
  const failed = typeof result?.failed === "number" ? result.failed : 0;
  const files = Array.isArray(result?.files) ? result.files : [];
  const failedFiles = files.map((item) => asRecord5(item)).filter((item) => item !== null && item.status === "failed").slice(0, 5).map((item) => `${typeof item.sourceRelPath === "string" ? item.sourceRelPath : String(item.relPath ?? "\u6587\u4EF6")}\uFF1A${typeof item.reason === "string" ? item.reason : "\u5904\u7406\u5931\u8D25"}`);
  const summary = `\u5BFC\u5165 ${copied.length} \xB7 \u8DF3\u8FC7 ${skipped} \xB7 \u5931\u8D25 ${failed}`;
  return text(failedFiles.length ? `${summary}
${failedFiles.join("\n")}` : summary);
}
function isFileGroup(value) {
  const group = asRecord5(value);
  if (!group) return false;
  return typeof group.path === "string" && Array.isArray(group.hits) && (group.groupHeader === void 0 || typeof group.groupHeader === "string");
}
function renderHit(hit) {
  const lineRange = hit.startLine === hit.endLine ? `${hit.startLine}` : `${hit.startLine}\u2013${hit.endLine}`;
  return `\`${hit.n}\` ${hit.path}:${lineRange}\uFF08\u547D\u4E2D\u884C ${hit.matchLine}\uFF09
${hit.excerpt}`;
}
function renderGroup(group) {
  const countLabel = group.totalHits > group.hits.length ? `${group.hits.length}/${group.totalHits} \u6761` : `${group.hits.length} \u6761`;
  const headerLines = [
    `${group.path}\uFF08${countLabel}\uFF09`,
    ...group.groupHeader ? [group.groupHeader] : []
  ];
  return `${headerLines.join("\n")}
${group.hits.map(renderHit).join("\n")}`;
}
function renderSearchResult(args, value) {
  const result = asRecord5(value);
  const files = Array.isArray(result?.files) ? result.files.filter(isFileGroup) : [];
  const pageHitCount = files.reduce((sum, group) => sum + group.hits.length, 0);
  const warnings = asStringArray(result?.warnings);
  const scanComplete = result?.scanComplete !== false;
  const hasMore = result?.hasMore === true;
  const restFiles = Array.isArray(result?.restFiles) ? result.restFiles.filter((item) => {
    const rest = asRecord5(item);
    return rest ? typeof rest.path === "string" && typeof rest.count === "number" : false;
  }) : [];
  const pathFilter = typeof asRecord5(args)?.path === "string" ? String(asRecord5(args)?.path) : "";
  const bodyParts = [];
  if (result && typeof result.totalFiles === "number" && typeof result.totalHits === "number" && result.totalHits > 0) {
    bodyParts.push(`\u3010\u547D\u4E2D\u6982\u89C8\u3011${result.totalFiles} \u4E2A\u6587\u4EF6 \xB7 ${result.totalHits} \u6761\u547D\u4E2D \xB7 \u672C\u9875 ${pageHitCount} \u6761`);
  }
  bodyParts.push(...files.map(renderGroup));
  if (restFiles.length) {
    bodyParts.push(`\u3010\u672A\u5C55\u793A\u3011${restFiles.map((item) => `${item.path}\uFF08${item.count} \u6761\uFF09`).join("\u3001")}`);
  }
  const body = bodyParts.length ? bodyParts.join("\n\n") : pathFilter ? `\u6307\u5B9A\u6587\u4EF6 ${pathFilter} \u65E0\u547D\u4E2D` : scanComplete ? "\u65E0\u547D\u4E2D" : "\u5F53\u524D\u626B\u63CF\u672A\u5B8C\u6210\uFF0C\u6682\u672A\u627E\u5230\u53EF\u8FD4\u56DE\u7684\u547D\u4E2D";
  const notes = [];
  if (hasMore) {
    notes.push(result?.nextCursor ? `\u5F53\u524D\u4EC5\u5C55\u793A\u672C\u9875\u5185\u5BB9\uFF0C\u4ECD\u6709\u66F4\u591A\u547D\u4E2D\uFF1B\u4E0B\u4E00\u9875\u6E38\u6807\uFF1A${result.nextCursor}` : "\u5F53\u524D\u4EC5\u5C55\u793A\u672C\u9875\u5185\u5BB9\uFF0C\u4ECD\u6709\u66F4\u591A\u547D\u4E2D\u3002");
  }
  if (!scanComplete) notes.push("\u672C\u6B21\u626B\u63CF\u672A\u5B8C\u6210\uFF0C\u5F53\u524D\u7ED3\u679C\u4E0D\u80FD\u4EE3\u8868\u6574\u4E2A\u77E5\u8BC6\u5E93\u3002");
  if (result && typeof result.totalHits === "number" && !scanComplete) notes.push("\u547D\u4E2D\u603B\u6570\u4E3A\u4E0B\u9650\u3002");
  if (warnings.length) notes.push(`\u63D0\u793A\uFF1A${warnings.join("\uFF1B")}`);
  return text(notes.length ? `${body}

${notes.join("\n")}` : body);
}

// src/tools.ts
function asRecord6(args) {
  return args && typeof args === "object" && !Array.isArray(args) ? args : {};
}
function requireString2(args, key) {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) throw new KbError("missing_field", `${key} \u5FC5\u586B`);
  return value;
}
function asString2(value) {
  return typeof value === "string" ? value : void 0;
}
function asBool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}
function asStringArray2(value) {
  if (!Array.isArray(value)) return void 0;
  return value.filter((item) => typeof item === "string");
}
function fail2(error) {
  if (error instanceof KbError) throw new Error(error.message);
  throw error;
}
function registerKbTools(ctx, jobs = createJobRunner()) {
  const offs = [
    ctx.tools.register({
      name: "kb_list_bases",
      description: "\u5217\u51FA\u5DF2\u521B\u5EFA\u7684\u77E5\u8BC6\u5E93\u5361\u7247\uFF1Aid\u3001\u6807\u9898\u3001\u63CF\u8FF0\u3001\u522B\u540D\u3001\u7C7B\u76EE\u540D\u3001\u7EA6\u591A\u5C11\u7BC7\u3002\u4E0D\u542B\u6587\u4EF6\u540D\u548C\u6B63\u6587\u3002\u9009\u5E93\u65F6\u5148\u8C03\u7528\u672C\u5DE5\u5177\u3002",
      parameters: { type: "object" },
      output: {
        schema: { type: "object", properties: { bases: { type: "array" } } },
        render: (_args, value) => {
          const bases = value?.bases ?? [];
          return [{ type: "text", text: bases.map((item) => `${item.id} ${item.title}`).join(" \xB7 ") || "\u8FD8\u6CA1\u6709\u77E5\u8BC6\u5E93" }];
        }
      },
      isConcurrencySafe: () => true,
      execute: async () => {
        try {
          const dataRoot = await resolveDataRoot();
          return { bases: await listBases(dataRoot) };
        } catch (error) {
          fail2(error);
        }
      }
    }),
    ctx.tools.register({
      name: "kb_ingest",
      description: "\u628A\u672C\u673A md/txt/csv \u5BFC\u5165\u5DF2\u6709\u77E5\u8BC6\u5E93\u7684\u6307\u5B9A\u7C7B\u76EE\u3002CSV \u4F1A\u8F6C\u6210 UTF-8 \u540E\u5165\u5E93\uFF0C\u53EF\u5728\u77E5\u6E90\u4E2D\u8868\u683C\u7F16\u8F91\u3002\u5E93\u5FC5\u987B\u5DF2\u5B58\u5728\u3002\u4E0D\u8981\u731C\u6D4B\u65B0\u5E93\u3002destCategory \u4E3A\u7A7A\u8868\u793A\u5E93\u6839\u3002",
      parameters: {
        type: "object",
        required: ["baseId", "sourcePath"],
        properties: {
          baseId: { type: "string", description: "\u5DF2\u5B58\u5728\u7684\u77E5\u8BC6\u5E93 id" },
          sourcePath: { type: "string", description: "\u672C\u673A\u6587\u4EF6\u6216\u6587\u4EF6\u5939\u8DEF\u5F84\uFF0C\u53EA\u8BFB\u6E90" },
          destCategory: { type: "string", description: "\u5E93\u5185\u76F8\u5BF9\u7C7B\u76EE\uFF0C\u5982 \u5408\u540C/2024\uFF1B\u7A7A=\u5E93\u6839" },
          preserveTree: { type: "boolean", description: "\u6E90\u662F\u6587\u4EF6\u5939\u65F6\u662F\u5426\u4FDD\u7559\u76F8\u5BF9\u5B50\u76EE\u5F55\uFF0C\u9ED8\u8BA4 false" },
          createMissing: { type: "boolean", description: "\u7C7B\u76EE\u4E0D\u5B58\u5728\u5219\u521B\u5EFA\uFF0C\u9ED8\u8BA4 true\u3002\u4E0D\u5EFA\u65B0\u5E93" },
          onConflict: { type: "string", enum: ["skip"], description: "\u9ED8\u8BA4 skip\u3002\u540C\u6307\u7EB9\u8DF3\u8FC7\uFF1B\u540C\u540D\u4E0D\u540C\u5185\u5BB9\u6539\u540D\uFF0C\u4E0D\u8986\u76D6" }
        }
      },
      output: {
        schema: {
          type: "object",
          properties: {
            copied: { type: "array", items: { type: "string" } },
            renamed: { type: "array", items: { type: "string" } },
            skipped: { type: "integer" },
            failed: { type: "integer" },
            files: { type: "array" },
            warnings: { type: "array", items: { type: "string" } }
          }
        },
        render: (_args, value) => renderIngestResult(value)
      },
      execute: async (args) => {
        const input = asRecord6(args);
        try {
          const dataRoot = await resolveDataRoot();
          return await jobs.enqueue("ingest", () => ingest(dataRoot, buildIngestInput({
            baseId: requireString2(input, "baseId"),
            sourcePath: requireString2(input, "sourcePath"),
            destCategory: asString2(input.destCategory) ?? "",
            preserveTree: asBool(input.preserveTree, false),
            createMissing: asBool(input.createMissing, true)
          })));
        } catch (error) {
          fail2(error);
        }
      }
    }),
    ctx.tools.register({
      name: "kb_search",
      description: "\u5728\u6307\u5B9A\u77E5\u8BC6\u5E93\u91CC\u4E00\u6B21\u591A\u8BCD grep\uFF0C\u7ED3\u679C\u6309\u6587\u4EF6\u5206\u7EC4\u8FD4\u56DE\uFF1A\u6BCF\u9875\u4E0D\u8DE8\u6587\u4EF6\uFF0C\u5148\u7ED9\u547D\u4E2D\u6982\u89C8\uFF08\u6587\u4EF6\u6570\u3001\u547D\u4E2D\u6570\u3001\u672A\u5C55\u793A\u6E05\u5355\uFF09\uFF0C\u6BCF\u6761\u547D\u4E2D\u5E26\u539F\u6587 excerpt\u3001\u8DEF\u5F84\u548C\u7269\u7406\u884C\u53F7\uFF1BCSV \u547D\u4E2D excerpt \u5E26\u5217\u540D\uFF0C\u8868\u5934\u5728\u7EC4\u5934\u53EA\u51FA\u73B0\u4E00\u6B21\u3002\u5FC5\u987B\u5E26 baseId\u3002\u6362\u8BCD\u653E\u8FDB aliases\uFF083\uFF5E8\uFF09\u3002\u7ED3\u679C\u6309\u5B57\u7B26\u9884\u7B97\u5206\u9875\uFF0CscanComplete=false \u6216 hasMore=true \u65F6\u4E0D\u80FD\u628A\u5F53\u524D\u9875\u5F53\u6210\u5168\u91CF\uFF1B\u9700\u6DF1\u8BFB\u67D0\u4E2A\u6587\u4EF6\u7684\u5168\u90E8\u547D\u4E2D\u65F6\u4F20 path\uFF08\u6765\u81EA\u547D\u4E2D\u8DEF\u5F84\u6216\u672A\u5C55\u793A\u6E05\u5355\uFF09\u3002",
      parameters: {
        type: "object",
        required: ["baseId", "query"],
        properties: {
          baseId: { type: "string", description: "\u5FC5\u586B\u3002\u7981\u6B62\u7701\u7565\u540E\u626B\u5168\u90E8\u5E93" },
          query: { type: "string", description: "\u4E3B\u5173\u952E\u8BCD" },
          aliases: { type: "array", items: { type: "string" }, description: "3\uFF5E8 \u4E2A\u540C\u4E49\u8BCD\uFF0C\u4E0E query \u5408\u5E76\u4E00\u6B21 OR" },
          category: { type: "string", description: "\u5BF9\u4E0A\u5B50\u6587\u4EF6\u5939\u5219\u53EA\u626B\u90A3\u4E00\u5C42\uFF1B\u5BF9\u4E0D\u4E0A\u5219\u672C\u5E93\u5168\u626B" },
          path: { type: "string", description: "\u660E\u7EC6\u6863\uFF1A\u53EA\u8FD4\u56DE\u8BE5\u6587\u4EF6\u7684\u547D\u4E2D\uFF08\u7C7B\u76EE\u5185\u76F8\u5BF9\u8DEF\u5F84\uFF09\uFF0Cexcerpt \u5E26\u66F4\u5BBD\u4E0A\u4E0B\u6587" },
          cursor: { type: "string", description: "\u4E0A\u4E00\u9875\u8FD4\u56DE\u7684 nextCursor\uFF1B\u53EA\u7528\u4E8E\u7EE7\u7EED\u540C\u4E00\u67E5\u8BE2" }
        }
      },
      output: {
        schema: {
          type: "object",
          properties: {
            files: {
              type: "array",
              description: "\u672C\u9875\u6587\u4EF6\u7EC4\uFF0C\u4E00\u9875\u4E0D\u8DE8\u6587\u4EF6",
              items: {
                type: "object",
                required: ["path", "format", "totalHits", "hits"],
                properties: {
                  path: { type: "string" },
                  format: { type: "string", description: "markdown \u6216 csv" },
                  totalHits: { type: "integer", description: "\u8BE5\u6587\u4EF6 rg \u539F\u59CB\u547D\u4E2D\u6570" },
                  groupHeader: { type: "string", description: "CSV \u8868\u5934\u884C\uFF0C\u7EC4\u5185\u53EA\u6E32\u67D3\u4E00\u6B21" },
                  hits: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["n", "path", "startLine", "endLine", "matchLine", "excerpt"],
                      properties: {
                        n: { type: "integer", description: "\u8DE8\u9875\u8FDE\u7EED\u7684\u5168\u5C40\u547D\u4E2D\u7F16\u53F7" },
                        path: { type: "string" },
                        startLine: { type: "integer" },
                        endLine: { type: "integer" },
                        matchLine: { type: "integer" },
                        excerpt: { type: "string" },
                        matchedExcerpt: { type: "string", description: "\u547D\u4E2D\u884C\u5C55\u793A\u6587\u672C\uFF0C\u7531\u683C\u5F0F\u6A21\u5757\u7ED9\u51FA" },
                        matchColumnByte: { type: "integer", description: "UI \u9884\u89C8\u4F7F\u7528\u7684 UTF-8 \u5B57\u8282\u5217" },
                        sourceFingerprint: { type: "string", description: "UI \u9884\u89C8\u7528\u7684\u6E90\u6587\u4EF6\u6307\u7EB9" }
                      }
                    }
                  }
                }
              }
            },
            totalFiles: { type: "integer", description: "\u547D\u4E2D\u6587\u4EF6\u603B\u6570" },
            totalHits: { type: "integer", description: "\u547D\u4E2D\u603B\u6570\uFF1BscanComplete=false \u65F6\u4E3A\u4E0B\u9650" },
            restFiles: { type: "array", description: "\u672C\u9875\u672A\u5C55\u793A\u7684\u6587\u4EF6\u4E0E\u547D\u4E2D\u6570", items: { type: "object", properties: { path: { type: "string" }, count: { type: "integer" } } } },
            warnings: { type: "array", items: { type: "string" } },
            scanComplete: { type: "boolean", description: "\u662F\u5426\u5B8C\u6210\u4E86\u672C\u6B21\u53EF\u641C\u7D22\u8303\u56F4\u7684\u626B\u63CF" },
            hasMore: { type: "boolean", description: "\u5F53\u524D\u9875\u4E4B\u540E\u662F\u5426\u8FD8\u6709\u5DF2\u53D1\u73B0\u7684\u547D\u4E2D" },
            nextCursor: { type: "string", description: "\u7EE7\u7EED\u4E0B\u4E00\u9875\u7684\u6E38\u6807" }
          },
          required: ["files", "totalFiles", "totalHits", "warnings", "scanComplete", "hasMore"]
        },
        render: (args, value) => renderSearchResult(args, value),
        presentationMeta: (args, value) => {
          const baseId = asString2(asRecord6(args)?.baseId)?.trim();
          const result = asRecord6(value);
          if (!result) return value;
          const safeResult = {
            files: Array.isArray(result.files) ? result.files : [],
            totalFiles: typeof result.totalFiles === "number" ? result.totalFiles : 0,
            totalHits: typeof result.totalHits === "number" ? result.totalHits : 0,
            warnings: Array.isArray(result.warnings) ? result.warnings : []
          };
          if (Array.isArray(result.restFiles)) safeResult.restFiles = result.restFiles;
          if (typeof result.scanComplete === "boolean") safeResult.scanComplete = result.scanComplete;
          if (typeof result.hasMore === "boolean") safeResult.hasMore = result.hasMore;
          if (typeof result.nextCursor === "string") safeResult.nextCursor = result.nextCursor;
          if (baseId) safeResult.baseId = baseId;
          return safeResult;
        }
      },
      presentCall: () => ({ card: "generic", title: "\u77E5\u8BC6\u5E93\u68C0\u7D22" }),
      presentResult: (_args, result) => result.isError ? { card: "generic", title: "\u68C0\u7D22\u5931\u8D25" } : { card: "generic", title: "\u77E5\u8BC6\u5E93\u547D\u4E2D" },
      execute: async (args) => {
        const input = asRecord6(args);
        if (typeof input.baseId !== "string" || !input.baseId.trim()) {
          throw new Error("kb_search \u5FC5\u987B\u5E26 baseId");
        }
        try {
          const dataRoot = await resolveDataRoot();
          return await searchBase(dataRoot, {
            baseId: input.baseId,
            query: requireString2(input, "query"),
            aliases: asStringArray2(input.aliases),
            category: asString2(input.category),
            path: asString2(input.path),
            cursor: asString2(input.cursor)
          });
        } catch (error) {
          fail2(error);
        }
      }
    })
  ];
  return () => {
    for (const off of offs.reverse()) {
      if (typeof off === "function") off();
    }
  };
}

// src/skill.ts
var SKILL_BODY = [
  "# \u77E5\u6E90 \xB7 \u77E5\u8BC6\u5E93\u68C0\u7D22",
  "",
  "\u4F60\u901A\u8FC7\u672C\u63D2\u4EF6\u67E5\u8BE2\u7528\u6237\u663E\u5F0F\u5BFC\u5165\u7684\u77E5\u8BC6\u5E93\u3002\u539F\u6587\u5728\u672C\u673A\u6587\u4EF6\u5939\u91CC\u3002",
  "",
  "## \u4F55\u65F6\u4F7F\u7528",
  "\u7528\u6237\u95EE\u5DF2\u5BFC\u5165\u8D44\u6599\u91CC\u7684\u4E8B\u5B9E\u3001\u6761\u6B3E\u3001\u7EAA\u8981\u3001\u8BF4\u660E\u65F6\u4F7F\u7528\u3002\u4E0D\u8981\u7528\u5F53\u524D\u9879\u76EE\u7684 grep / glob / read \u5192\u5145\u77E5\u8BC6\u5E93\u68C0\u7D22\u3002",
  "",
  "## \u9009\u5E93\uFF08\u5FC5\u987B\uFF09",
  "1. \u7528\u6237\u6CA1\u70B9\u540D\u5E93\uFF1A\u5FC5\u987B\u5148\u8C03\u7528 `kb_list_bases`\uFF0C\u7528\u5404\u5E93\u7684 description \u548C aliases \u9009\u4E00\u4E2A `baseId`\u3002",
  "2. \u4E24\u4E2A\u5E93\u90FD\u50CF\uFF1A\u95EE\u4EBA\uFF0C\u4E0D\u8981\u4E24\u4E2A\u90FD\u641C\uFF0C\u4E0D\u8981\u9ED8\u8BA4\u626B\u5168\u90E8 bases\u3002",
  "3. \u7528\u6237\u5DF2\u7ECF\u70B9\u540D\u5E93\u6216\u7ED9\u51FA id\uFF1A\u76F4\u63A5\u7528\u90A3\u4E2A `baseId`\u3002",
  "",
  "## \u68C0\u7D22",
  "- \u6362\u8BCD\u53EA\u505A\u4E00\u6B21\uFF0C\u653E\u8FDB\u540C\u4E00\u6B21 `kb_search` \u7684 `aliases`\uFF083\uFF5E8 \u4E2A\uFF09\u3002\u7981\u6B62\u8FDE\u8C03\u4E09\u5341\u8F6E\u3002",
  "- `kb_search` \u5FC5\u987B\u5E26 `baseId`\u3002\u6CA1\u6709 baseId \u4E0D\u8981\u8C03\u7528\u3002",
  "- \u53EF\u9009 `category`\uFF1A\u53EA\u6709\u5BF9\u4E0A\u5B50\u6587\u4EF6\u5939\u540D\u65F6\u624D\u6536\u7A84\uFF1B\u5BF9\u4E0D\u4E0A\u5C31\u672C\u5E93\u5168\u626B\uFF0C\u4E0D\u8981\u731C\u3002",
  "- \u7ED3\u679C\u6309\u6587\u4EF6\u5206\u7EC4\u3001\u6309\u5B57\u7B26\u9884\u7B97\u5206\u9875\uFF1A`hasMore=true` \u65F6\u7528 `nextCursor` \u7EE7\u7EED\u540C\u4E00\u67E5\u8BE2\u3002",
  "- \u9996\u9875\u5E26\u547D\u4E2D\u6982\u89C8\u548C\u672A\u5C55\u793A\u6587\u4EF6\u6E05\u5355\uFF1A\u4F18\u5148\u7528\u6E05\u5355\u51B3\u7B56\uFF08\u7FFB\u9875 / \u6362\u66F4\u51C6\u7684\u8BCD / \u4F20 `path` \u6DF1\u8BFB\u5355\u6587\u4EF6\uFF09\uFF0C\u4E0D\u8981\u76F2\u76EE\u7FFB\u5B8C\u6240\u6709\u9875\u3002",
  "- `scanComplete=false` \u6216 `hasMore=true` \u65F6\uFF0C\u4E0D\u80FD\u628A\u5F53\u524D\u8FD4\u56DE\u5185\u5BB9\u5F53\u6210\u5168\u5E93\u5168\u91CF\uFF1B\u7528\u6237\u8981\u6C42\u5168\u90E8\u3001\u8BA1\u6570\u6216\u6C47\u603B\u65F6\u5FC5\u987B\u7EE7\u7EED\u5206\u9875\uFF0C\u65E0\u6CD5\u5B8C\u6210\u5219\u660E\u786E\u8BF4\u660E\u8303\u56F4\u3002",
  "",
  "## \u51FA\u5904",
  "- \u6CA1\u547D\u4E2D\uFF1A\u4E0D\u5F97\u8BF4\u300C\u6839\u636E\u77E5\u8BC6\u5E93\u300D\u3002\u4E0D\u8981\u7F16\u4E00\u6BB5\u53EF\u80FD\u76F8\u5173\u7684\u6761\u6B3E\u3002",
  "- \u547D\u4E2D\uFF1A\u5FC5\u987B\u57FA\u4E8E\u8FD4\u56DE\u7684 excerpt \u56DE\u7B54\uFF0C\u5E76\u5E26\u6587\u4EF6\u8DEF\u5F84\u3001\u884C\u53F7\u548C\u7247\u6BB5\u7F16\u53F7\uFF1B\u5F15\u7528\u7F16\u53F7\u4F7F\u7528 Markdown \u884C\u5185\u4EE3\u7801\u5305\u88F9\uFF0C\u4F8B\u5982\u547D\u4E2D\u4E86 `1` \u5904\uFF0C\u4E0D\u52A0\u65B9\u62EC\u53F7\uFF1B\u4E0D\u80FD\u53EA\u62A5\u8DEF\u5F84\u3002",
  "",
  "## \u5BFC\u5165",
  "- \u5F53\u524D\u652F\u6301 md / txt / markdown / csv\u3002CSV \u5BFC\u5165\u65F6\u8F6C\u6210 UTF-8\uFF08\u542B GBK\u3001UTF-16\uFF09\uFF0C\u53EF\u5728\u77E5\u6E90\u4E2D\u8868\u683C\u7F16\u8F91\u3002XLSX \u8F6C\u6362\u5C5E\u4E8E\u540E\u7EED\u9636\u6BB5\u3002",
  "- \u7528\u6237\u8BDD\u91CC\u6CA1\u6709\u5E93\u540D\u5C31\u5148\u95EE\u3002\u7981\u6B62\u731C\u4E00\u4E2A\u65B0\u5E93\u3002\u7981\u6B62\u65E0 destCategory \u5C31\u6563\u843D\u3002",
  "- \u5BFC\u5165\u4E0D\u4F1A\u81EA\u52A8\u5EFA\u5E93\u3002\u5E93\u4E0D\u5B58\u5728\u65F6\u63D0\u793A\u5148\u5EFA\u5E93\u3002"
].join("\n");
var ZHIYUAN_SKILL = {
  name: "zhiyuan-kb",
  description: "\u4ECE\u7528\u6237\u6307\u5B9A\u7684\u77E5\u8BC6\u5E93\u91CC\u67E5\u627E\u539F\u6587\u7247\u6BB5\u3002\u6CA1\u70B9\u540D\u5E93\u65F6\u5148 kb_list_bases\uFF1B\u6CA1\u547D\u4E2D\u4E0D\u5F97\u8BF4\u6839\u636E\u77E5\u8BC6\u5E93\u3002",
  whenToUse: "\u7528\u6237\u8BE2\u95EE\u5DF2\u5BFC\u5165\u77E5\u8BC6\u5E93\u4E2D\u7684\u4E8B\u5B9E\u3001\u6761\u6B3E\u3001\u7EAA\u8981\uFF0C\u6216\u8981\u6C42\u5BFC\u5165\u672C\u673A md/txt/csv\u3002",
  source: "runtime",
  content: SKILL_BODY
};
var ZHIYUAN_PROMPT_SECTION = {
  name: "zhiyuan:identity",
  order: 170,
  text: [
    "\u77E5\u6E90\uFF08\u77E5\u8BC6\u5E93\uFF09\uFF1A\u67E5\u8BE2\u5DF2\u5BFC\u5165\u8D44\u6599\u5FC5\u987B\u5148\u9009\u5B9A\u4E00\u4E2A baseId\u3002",
    "\u7528\u6237\u6CA1\u70B9\u540D\u5E93\u65F6\u5148 kb_list_bases\uFF0C\u7528\u63CF\u8FF0\u548C\u522B\u540D\u9009\u4E00\u4E2A\u5E93\uFF1B\u4E24\u4E2A\u90FD\u50CF\u5C31\u95EE\u4EBA\u3002",
    "\u7981\u6B62\u626B\u5168\u90E8 bases\u3002\u6362\u8BCD\u53EA\u505A\u4E00\u6B21\uFF0C\u653E\u8FDB\u540C\u4E00\u6B21 kb_search \u7684 aliases\u3002",
    "kb_search \u53EF\u80FD\u5206\u9875\uFF1BhasMore=true \u65F6\u7528 nextCursor \u7EE7\u7EED\uFF0CscanComplete=false \u65F6\u4E0D\u5F97\u5BA3\u79F0\u5168\u91CF\u3002",
    "\u6CA1\u547D\u4E2D\u4E0D\u5F97\u8BF4\u300C\u6839\u636E\u77E5\u8BC6\u5E93\u300D\u3002\u547D\u4E2D\u65F6\u5FC5\u987B\u57FA\u4E8E\u8FD4\u56DE\u7684 excerpt \u56DE\u7B54\uFF0C\u5E26\u6587\u4EF6\u8DEF\u5F84\u3001\u884C\u53F7\u548C\u7247\u6BB5\u7F16\u53F7\uFF1B\u5F15\u7528\u7F16\u53F7\u4F7F\u7528 Markdown \u884C\u5185\u4EE3\u7801\u5305\u88F9\uFF0C\u4F8B\u5982\u547D\u4E2D\u4E86 `1` \u5904\uFF0C\u4E0D\u52A0\u65B9\u62EC\u53F7\uFF1B\u5F53\u524D\u9879\u76EE\u7684 grep / glob \u4E0D\u7B97\u77E5\u8BC6\u5E93\u68C0\u7D22\u3002"
  ].join("")
};
function registerZhiyuanSkill(ctx) {
  return ctx.skills?.register(ZHIYUAN_SKILL) ?? (() => void 0);
}
function registerZhiyuanPrompt(ctx) {
  return ctx.systemPrompt?.section(ZHIYUAN_PROMPT_SECTION) ?? (() => void 0);
}

// src/private-rpc-contract.ts
var KNOWLEDGE_RPC_CHANNEL = "/zhiyuan";
var KNOWLEDGE_OPERATION_ENDPOINT = "operation";
var KNOWLEDGE_STATUS_ENDPOINT = "status";

// src/private-rpc.ts
function failure(error) {
  const message = error instanceof Error ? error.message : "\u77E5\u6E90\u8BF7\u6C42\u5931\u8D25";
  return { ok: false, error: { code: "internal", message, details: {} } };
}
function registerKnowledgePrivateRpc(ctx, jobs) {
  return ctx.connection.rpc.handle(KNOWLEDGE_RPC_CHANNEL, async (endpoint, payload, signal) => {
    if (signal.aborted) return failure(new Error("\u8BF7\u6C42\u5DF2\u53D6\u6D88"));
    try {
      if (endpoint === KNOWLEDGE_OPERATION_ENDPOINT) {
        return { ok: true, value: await executeKnowledgeOperation(payload, jobs) };
      }
      if (endpoint === KNOWLEDGE_STATUS_ENDPOINT) return { ok: true, value: jobs.status() };
      return failure(new Error("\u672A\u77E5\u77E5\u6E90 RPC \u7AEF\u70B9"));
    } catch (error) {
      return failure(error);
    }
  }, { authority: "loopback" });
}

// src/index.ts
var name = PACKAGE_NAME;
function apply(ctx) {
  const jobs = createJobRunner();
  const disposers = [];
  let alive = true;
  const track = (off) => {
    if (typeof off !== "function") return;
    if (!alive) {
      off();
      return;
    }
    disposers.push(off);
  };
  ctx.logger?.info("[zhiyuan] host loaded");
  setCatalogWarningSink((message) => ctx.logger?.warn?.(`[zhiyuan] ${message}`));
  ctx.inject(["commands"], (scoped) => {
    track(registerKbCommands(scoped, jobs));
  });
  ctx.inject(["connection"], (scoped) => {
    void registerKnowledgePrivateRpc(scoped, jobs);
  });
  ctx.inject(["tools"], (scoped) => {
    track(registerKbTools(scoped, jobs));
  });
  ctx.inject(["skills"], (scoped) => {
    track(registerZhiyuanSkill(scoped));
  });
  ctx.inject(["systemPrompt"], (scoped) => {
    track(registerZhiyuanPrompt(scoped));
  });
  ctx.effect?.(() => {
    void resolveDataRoot().then((root) => ctx.logger?.info(`[zhiyuan] data root ${root}`));
    return () => {
      alive = false;
      for (const off of disposers.splice(0).reverse()) off();
      clearDataRootCache();
    };
  });
}
export {
  apply,
  name
};
/*! Bundled license information:

papaparse/papaparse.js:
  (* @license
  Papa Parse
  v5.7.0
  https://github.com/mholt/PapaParse
  License: MIT
  *)
*/
