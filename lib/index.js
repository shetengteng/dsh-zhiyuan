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
        var URL2 = global.URL || global.webkitURL || null;
        var code = moduleFactory.toString();
        return Papa2.BLOB_URL || (Papa2.BLOB_URL = URL2.createObjectURL(new Blob(["var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ", "(", code, ")();"], { type: "text/javascript" })));
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

// package.json
var package_default = {
  name: "dsh-zhiyuan",
  version: "0.1.5",
  description: "A local-first, source-grounded knowledge base plugin for DSH.",
  type: "module",
  main: "./lib/index.js",
  exports: {
    ".": {
      default: "./lib/index.js"
    },
    "./client": {
      default: "./lib/client.js"
    },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  files: [
    "lib/index.js",
    "lib/client.js",
    "lib/skills/zhiyuan-kb/SKILL.md",
    "cordis.patch.yml",
    "README.md",
    "LICENSE"
  ],
  scripts: {
    build: "node scripts/build.mjs",
    prepare: "node scripts/build.mjs",
    test: "node --test --experimental-strip-types test/*.test.ts"
  },
  keywords: [
    "dsh",
    "dsh-plugin",
    "deepseek-harness",
    "knowledge-base",
    "zhiyuan"
  ],
  license: "MIT",
  dsh: {
    targetVersion: "0.1.2-rc.1",
    bundle: {
      patch: "./cordis.patch.yml"
    },
    client: {
      platform: "web",
      inject: [
        "@deepseek-ai/dsh-client-ui-layout",
        "@deepseek-ai/dsh-client-ui-settings",
        "@deepseek-ai/dsh-client-ui-settings-general",
        "@deepseek-ai/dsh-client-ui-primitives",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-tool",
        "@deepseek-ai/dsh-client-ui-conversation"
      ]
    }
  },
  dependencies: {
    "@tiptap/core": "^3.30.6",
    "@tiptap/extension-link": "^3.30.6",
    "@tiptap/markdown": "^3.30.6",
    "@tiptap/pm": "^3.30.6",
    "@tiptap/starter-kit": "^3.30.6",
    "@vscode/ripgrep": "^1.18.0",
    esbuild: "^0.25.0",
    papaparse: "5.7.0",
    "react-virtuoso": "4.18.12"
  },
  devDependencies: {
    "@types/node": "^22.15.0",
    "@types/papaparse": "5.5.2",
    "@types/react": "^18.3.0"
  },
  peerDependencies: {
    "@deepseek-ai/cordis": "^4.0.2",
    "@deepseek-ai/dsh-home-paths": "^0.1.2-rc.1",
    "@deepseek-ai/dsh-settings": "^0.1.2-rc.1",
    "@deepseek-ai/schemastery": "^3.18.2"
  },
  peerDependenciesMeta: {
    "@deepseek-ai/dsh-home-paths": {
      optional: true
    },
    "@deepseek-ai/dsh-settings": {
      optional: true
    },
    "@deepseek-ai/schemastery": {
      optional: true
    }
  }
};

// src/model/constants.ts
var PACKAGE_NAME = "dsh-zhiyuan";
var PACKAGE_VERSION = package_default.version;
var VERSION_LABEL = `v${PACKAGE_VERSION}`;
var SECTION_LABEL = "\u77E5\u6E90";
var DATA_DIR_NAME = "dsh-zhiyuan";
var COMMAND_NAME = "kb";
function formatKbDisplayTitle(title, fallback = "") {
  const displayTitle = title.trim() || fallback.trim() || "\u672A\u547D\u540D\u77E5\u8BC6\u5E93";
  return `${displayTitle} \xB7 ${SECTION_LABEL} ${VERSION_LABEL}`;
}
var DEFAULT_MAX_FILE_BYTES = 5242880;
var DEFAULT_MAX_KB_BYTES = 10737418240;
var MAX_ALIASES = 8;
var SEARCH_CONTEXT = 8;
var SEARCH_DEFAULT_LIMIT = 20;
var SEARCH_MAX_LIMIT = 100;
var SEARCH_MAX_PATTERN_LENGTH = 512;
var SEARCH_MAX_PATTERN_TOTAL_LENGTH = 4096;
var SEARCH_UNSUPPORTED_PATTERN_MESSAGE = "query \u6216 aliases \u4F7F\u7528\u4E86 ripgrep \u4E0D\u652F\u6301\u7684\u6B63\u5219\u8BED\u6CD5\uFF1B\u8BF7\u6539\u7528\u6B63\u5411\u5339\u914D\u6216\u8F6C\u4E49\u7279\u6B8A\u5B57\u7B26";
var SEARCH_CURSOR_MAX_LENGTH = 4096;
var SEARCH_LIST_CONTEXT = 2;
var SEARCH_PAGE_MAX_CHARS = 4e3;
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

// src/model/error/kb-error.ts
var KbError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "KbError";
    this.code = code;
  }
};

// src/model/request/import-request.ts
function createImportFromPathRequest(input) {
  return {
    kbId: input.kbId,
    sourcePath: input.sourcePath,
    destCategory: input.destCategory,
    preserveTree: input.preserveTree ?? false,
    createMissing: input.createMissing ?? true,
    onConflict: "skip"
  };
}

// src/platform/paths.ts
import { existsSync as existsSync2, lstatSync, realpathSync } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { isAbsolute, join as join2, normalize, relative, resolve, sep } from "node:path";

// src/platform/import-dsh.ts
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

// src/platform/paths.ts
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
function kbsRoot(dataRoot) {
  return join2(dataRoot, "kbs");
}
function kbDir(dataRoot, kbId) {
  return join2(kbsRoot(dataRoot), kbId);
}
function catalogPath(dataRoot) {
  return join2(dataRoot, "catalog.json");
}
function splitCategory(destinationCategory) {
  return destinationCategory.replaceAll("\\", "/").split("/").map((part) => part.trim()).filter(Boolean);
}
function assertInside(kbRoot, candidatePath) {
  const absoluteRoot = resolve(kbRoot);
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
function resolveDest(dataRoot, kbId, destinationCategory) {
  if (isAbsolute(destinationCategory) || destinationCategory.startsWith("~")) {
    throw new KbError("path_escape", "\u7C7B\u76EE\u5FC5\u987B\u662F\u5E93\u5185\u76F8\u5BF9\u8DEF\u5F84");
  }
  const categorySegments = splitCategory(destinationCategory);
  rejectEscapeTokens(categorySegments);
  const kbRoot = kbDir(dataRoot, kbId);
  const absoluteDestination = assertInside(kbRoot, join2(kbRoot, ...categorySegments));
  const normalizedRelativePath = relative(kbRoot, absoluteDestination).split(sep).join("/");
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
function assertNoSymlinkEscape(kbRoot, candidatePath) {
  const absoluteRoot = resolve(kbRoot);
  let currentPath = candidatePath;
  while (true) {
    if (existsSync2(currentPath)) {
      const stat8 = lstatSync(currentPath);
      if (stat8.isSymbolicLink()) {
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

// src/service/kb/pick-file.ts
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

// src/content/host-registry.ts
import { extname } from "node:path";

// src/model/content-contract.ts
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
import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join as join3 } from "node:path";

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
  if (context.kbBytesWithoutEntry + bytes.length > context.maxKbBytes) {
    throw new KbError("quota", "\u7F16\u8F91\u540E\u5C06\u8D85\u8FC7\u5355\u5E93\u6587\u5B57\u4E0A\u9650");
  }
  const entryDirectory = dirname(context.absolutePath);
  const temporaryPath = join3(entryDirectory, `.${basename(context.absolutePath)}.${randomUUID()}.tmp`);
  await mkdir(entryDirectory, { recursive: true });
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx" });
    await rename(temporaryPath, context.absolutePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => void 0);
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
import { readFile } from "node:fs/promises";
async function readMarkdownPreview(context) {
  const bytes = await readFile(context.absolutePath);
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
import { readFile as readFile2 } from "node:fs/promises";
async function readMarkdownForSearch(context) {
  const bytes = await readFile2(context.absolutePath);
  return createPhysicalLineSearchDocument(bytes, stripUtf8Bom(bytes.toString("utf8")));
}

// src/content/markdown/server/write.ts
import { mkdir as mkdir2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname2 } from "node:path";
async function writeMarkdownContent(context) {
  if (context.change.kind !== "text") throw new KbError("read_only_format", "\u8BE5\u6587\u4EF6\u4E0D\u652F\u6301\u8868\u683C\u4FEE\u6539");
  await mkdir2(dirname2(context.absolutePath), { recursive: true });
  await writeFile2(context.absolutePath, context.change.text, "utf8");
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

// src/service/kb/pick-file.ts
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

// src/controller/rpc/knowledge-operation-request-mapper.ts
import { Buffer as Buffer2 } from "node:buffer";
function mapImportOperationToRequest(operation) {
  if ("sourceBase64" in operation) {
    return {
      kbId: operation.kbId,
      destCategory: operation.destCategory,
      fileName: operation.sourceName,
      bytes: Buffer2.from(operation.sourceBase64, "base64"),
      preserveTree: operation.preserveTree,
      createMissing: operation.createMissing
    };
  }
  return createImportFromPathRequest({
    kbId: operation.kbId,
    sourcePath: operation.sourcePath,
    destCategory: operation.destCategory,
    preserveTree: operation.preserveTree,
    createMissing: operation.createMissing
  });
}
function mapSearchOperationToRequest(operation) {
  if ("cursor" in operation) {
    return {
      cursor: operation.cursor,
      ...operation.limit === void 0 ? {} : { limit: operation.limit }
    };
  }
  return {
    kbId: operation.kbId,
    query: operation.query,
    ...operation.aliases === void 0 ? {} : { aliases: operation.aliases },
    ...operation.category === void 0 ? {} : { category: operation.category },
    ...operation.path === void 0 ? {} : { path: operation.path },
    ...operation.limit === void 0 ? {} : { limit: operation.limit }
  };
}
function mapSetPrefsOperationToRequest(operation) {
  return {
    ...operation.defaultKbId === void 0 ? {} : { defaultKbId: operation.defaultKbId },
    ...operation.maxFileBytes === void 0 ? {} : { maxFileBytes: operation.maxFileBytes },
    ...operation.maxKbBytes === void 0 ? {} : { maxKbBytes: operation.maxKbBytes }
  };
}

// src/controller/rpc/knowledge-request-codec.ts
function asRecord2(value) {
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
function decodeImportOperation(data) {
  if (hasField(data, "sourceBase64")) {
    const sourceBase64 = requireString(data, "sourceBase64");
    const kbId2 = requireString(data, "kbId");
    const destCategory2 = requireString(data, "destCategory");
    const sourceName = requireString(data, "sourceName");
    const preserveTree2 = optionalBoolean(data, "preserveTree", false);
    const createMissing2 = optionalBoolean(data, "createMissing", true);
    return { op: "import", kbId: kbId2, destCategory: destCategory2, sourceName, sourceBase64, preserveTree: preserveTree2, createMissing: createMissing2 };
  }
  const kbId = requireString(data, "kbId");
  const sourcePath = requireString(data, "sourcePath");
  const destCategory = requireString(data, "destCategory");
  const preserveTree = optionalBoolean(data, "preserveTree", false);
  const createMissing = optionalBoolean(data, "createMissing", true);
  return { op: "import", kbId, sourcePath, destCategory, preserveTree, createMissing };
}
function decodeSearchOperation(data) {
  if (hasField(data, "cursor")) {
    if (["kbId", "query", "aliases", "category", "path"].some((field) => hasField(data, field))) {
      throw new KbError("invalid_field", "\u7EED\u9875\u8BF7\u6C42\u53EA\u80FD\u5305\u542B cursor \u548C limit");
    }
    const cursor = requireString(data, "cursor");
    const limit2 = optionalPositiveInteger(data, "limit");
    return { op: "search", cursor, ...limit2 === void 0 ? {} : { limit: limit2 } };
  }
  const kbId = requireString(data, "kbId");
  const query = requireString(data, "query");
  const aliases = optionalStringArray(data, "aliases");
  const category = optionalString(data, "category");
  const path = optionalString(data, "path");
  const limit = optionalPositiveInteger(data, "limit");
  return {
    op: "search",
    kbId,
    query,
    ...aliases === void 0 ? {} : { aliases },
    ...category === void 0 ? {} : { category },
    ...path === void 0 ? {} : { path },
    ...limit === void 0 ? {} : { limit }
  };
}
function decodeKnowledgeOperation(payload) {
  const data = asRecord2(payload);
  const operation = requireString(data, "op");
  switch (operation) {
    case "list":
      return { op: "list" };
    case "create":
      return {
        op: "create",
        title: requireString(data, "title"),
        description: requireString(data, "description"),
        aliases: optionalStringArray(data, "aliases") ?? []
      };
    case "update": {
      const id = requireString(data, "id");
      const title = optionalString(data, "title");
      const description = optionalString(data, "description");
      const aliases = optionalStringArray(data, "aliases");
      return {
        op: "update",
        id,
        ...title === void 0 ? {} : { title },
        ...description === void 0 ? {} : { description },
        ...aliases === void 0 ? {} : { aliases }
      };
    }
    case "deleteKb":
      return { op: "deleteKb", id: requireString(data, "id"), confirm: optionalBoolean(data, "confirm", false) };
    case "tree":
      return { op: "tree", id: requireString(data, "id") };
    case "read":
      return {
        op: "read",
        id: requireString(data, "id"),
        path: requireString(data, "path"),
        ...readPreviewOptions(data)
      };
    case "readPage":
      return {
        op: "readPage",
        id: requireString(data, "id"),
        path: requireString(data, "path"),
        startRow: optionalPositiveInteger(data, "startRow") ?? 1,
        pageSize: optionalPositiveInteger(data, "pageSize") ?? TABLE_EDITOR_PAGE_SIZE
      };
    case "write":
      return {
        op: "write",
        id: requireString(data, "id"),
        path: requireString(data, "path"),
        change: parseEntryWriteChange(data.change)
      };
    case "deleteEntry":
      return { op: "deleteEntry", id: requireString(data, "id"), path: requireString(data, "path"), confirm: optionalBoolean(data, "confirm", false) };
    case "pick": {
      const kind = requireString(data, "kind");
      if (kind !== "file" && kind !== "dir") throw new KbError("invalid_field", "kind \u5FC5\u987B\u662F file \u6216 dir");
      return { op: "pick", kind };
    }
    case "import":
      return decodeImportOperation(data);
    case "search":
      return decodeSearchOperation(data);
    case "prefs":
      return { op: "prefs" };
    case "setPrefs": {
      const defaultKbId = optionalString(data, "defaultKbId");
      const maxFileBytes = optionalPositiveInteger(data, "maxFileBytes");
      const maxKbBytes = optionalPositiveInteger(data, "maxKbBytes");
      return {
        op: "setPrefs",
        ...defaultKbId === void 0 ? {} : { defaultKbId },
        ...maxFileBytes === void 0 ? {} : { maxFileBytes },
        ...maxKbBytes === void 0 ? {} : { maxKbBytes }
      };
    }
    default:
      throw new KbError("unknown_op", `\u672A\u77E5\u64CD\u4F5C ${operation}`);
  }
}

// src/controller/rpc/knowledge-operation-controller.ts
async function executeKnowledgeOperation(payload, jobs, knowledgeServices) {
  const data = asRecord2(payload);
  const operation = requireString(data, "op");
  const dataRoot = await resolveDataRoot();
  if (operation === "import") {
    optionalString(data, "sourceBase64");
    return knowledgeServices.enqueueKnowledgeImport(dataRoot, jobs, () => mapImportOperationToRequest(decodeImportOperation(data)));
  }
  const request = decodeKnowledgeOperation(data);
  switch (request.op) {
    case "list":
      return knowledgeServices.listKbs(dataRoot);
    case "create":
      return knowledgeServices.createKb(dataRoot, {
        title: request.title,
        description: request.description,
        aliases: request.aliases ?? []
      });
    case "update":
      return knowledgeServices.updateKb(dataRoot, request.id, {
        title: request.title,
        description: request.description,
        aliases: request.aliases
      });
    case "deleteKb":
      await knowledgeServices.deleteKb(dataRoot, request.id, request.confirm ?? false);
      return { ok: true };
    case "tree":
      return knowledgeServices.listTree(dataRoot, request.id);
    case "read":
      return knowledgeServices.readEntry(dataRoot, request.id, request.path, request);
    case "readPage":
      return knowledgeServices.readEntryPage(dataRoot, request.id, request.path, request.startRow ?? 1, request.pageSize ?? TABLE_EDITOR_PAGE_SIZE);
    case "write":
      await knowledgeServices.writeEntryContent(dataRoot, request.id, request.path, request.change);
      return { ok: true };
    case "deleteEntry":
      await knowledgeServices.deleteEntry(dataRoot, request.id, request.path, request.confirm ?? false);
      return { ok: true };
    case "pick":
      return pickSource(request.kind);
    case "search":
      return knowledgeServices.searchKb(dataRoot, mapSearchOperationToRequest(request));
    case "prefs":
      return knowledgeServices.getPreferences(dataRoot);
    case "setPrefs":
      return knowledgeServices.updatePreferences(dataRoot, mapSetPrefsOperationToRequest(request));
    default:
      throw new KbError("unknown_op", `\u672A\u77E5\u64CD\u4F5C ${operation}`);
  }
}

// src/controller/command/kb-command-parser.ts
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

// src/controller/command/kb-command-controller.ts
function ok(value) {
  return { kind: "success", text: typeof value === "string" ? value : JSON.stringify(value) };
}
function fail(error) {
  return { kind: "error", text: error instanceof Error ? error.message : String(error) };
}
async function handleCall(payload, jobs, knowledgeServices) {
  return executeKnowledgeOperation(JSON.parse(payload), jobs, knowledgeServices);
}
function searchLimit(flags) {
  const value = flagString(flags, "limit");
  if (value === void 0) return void 0;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit)) throw new KbError("invalid_field", "limit \u5FC5\u987B\u662F\u6574\u6570");
  return limit;
}
function buildSearchRequest(rest, flags) {
  const limit = searchLimit(flags);
  const cursor = flagString(flags, "cursor");
  if (cursor) {
    if (rest.length || ["kb", "query", "aliases", "to", "category", "path"].some((key) => flags[key] !== void 0)) {
      throw new KbError("invalid_field", "\u7EED\u9875\u8BF7\u6C42\u53EA\u80FD\u5305\u542B cursor \u548C limit");
    }
    return { cursor, ...limit === void 0 ? {} : { limit } };
  }
  return {
    kbId: flagString(flags, "kb") ?? "",
    query: rest.join(" ") || flagString(flags, "query") || "",
    aliases: splitAliases(flagString(flags, "aliases")),
    category: flagString(flags, "to") ?? flagString(flags, "category"),
    path: flagString(flags, "path"),
    ...limit === void 0 ? {} : { limit }
  };
}
async function handleImport(rest, flags, jobs, knowledgeServices) {
  const sourcePath = rest[0] ?? flagString(flags, "path");
  const kbId = flagString(flags, "kb");
  if (!sourcePath) throw new KbError("missing_field", "\u7528\u6CD5\uFF1A/kb import <path> --kb <id> --to <\u7C7B\u76EE>");
  if (!kbId) throw new KbError("missing_field", "\u5BFC\u5165\u5FC5\u987B\u6307\u5B9A --kb");
  const dataRoot = await resolveDataRoot();
  const destCategory = await knowledgeServices.resolveImportTo(dataRoot, kbId, flagString(flags, "to"), flagBool(flags, "root", false));
  return jobs.enqueue("import", () => knowledgeServices.importFiles(dataRoot, createImportFromPathRequest({
    kbId,
    sourcePath,
    destCategory,
    preserveTree: flagBool(flags, "preserve-tree"),
    createMissing: !flagBool(flags, "no-create")
  })));
}
function registerKbCommands(ctx, jobs, knowledgeServices) {
  return ctx.commands.register({
    name: COMMAND_NAME,
    description: "\u77E5\u6E90\u77E5\u8BC6\u5E93\uFF1Aimport / status / call",
    input: { hint: "import <path> --kb <id> --to <\u7C7B\u76EE> | status | call {json}" },
    recordInput: false,
    handler: async ({ rawInput }) => {
      const tokens = tokenize(rawInput.trim());
      const parsed = parseFlags(tokens);
      try {
        if (parsed.sub === "status" || !parsed.sub) return ok(jobs.status());
        if (parsed.sub === "import") return ok(await handleImport(parsed.rest, parsed.flags, jobs, knowledgeServices));
        if (parsed.sub === "call") return ok(await handleCall(parsed.rest.join(" "), jobs, knowledgeServices));
        if (parsed.sub === "search") {
          const dataRoot = await resolveDataRoot();
          return ok(await knowledgeServices.searchKb(dataRoot, buildSearchRequest(parsed.rest, parsed.flags)));
        }
        return { kind: "error", text: "\u7528\u6CD5\uFF1A/kb import <path> --kb <id> --to <\u7C7B\u76EE> \u6216 /kb status" };
      } catch (error) {
        return fail(error);
      }
    }
  }) ?? (() => void 0);
}

// src/model/wire/knowledge-rpc-contract.ts
var KNOWLEDGE_RPC_CHANNEL = "/zhiyuan";
var KNOWLEDGE_OPERATION_ENDPOINT = "operation";
var KNOWLEDGE_STATUS_ENDPOINT = "status";

// src/controller/rpc/knowledge-rpc-controller.ts
function failure(error) {
  const message = error instanceof Error ? error.message : "\u77E5\u6E90\u8BF7\u6C42\u5931\u8D25";
  return { ok: false, error: { code: "internal", message, details: {} } };
}
function registerKnowledgePrivateRpc(ctx, jobs, knowledgeServices) {
  return ctx.connection.rpc.handle(KNOWLEDGE_RPC_CHANNEL, async (endpoint, payload, signal) => {
    if (signal.aborted) return failure(new Error("\u8BF7\u6C42\u5DF2\u53D6\u6D88"));
    try {
      if (endpoint === KNOWLEDGE_OPERATION_ENDPOINT) {
        return { ok: true, value: await executeKnowledgeOperation(payload, jobs, knowledgeServices) };
      }
      if (endpoint === KNOWLEDGE_STATUS_ENDPOINT) return { ok: true, value: jobs.status() };
      return failure(new Error("\u672A\u77E5\u77E5\u6E90 RPC \u7AEF\u70B9"));
    } catch (error) {
      return failure(error);
    }
  }, { authority: "loopback" });
}

// src/service/search/result/templates/file-detail-template.ts
function renderFileDetailResult(value) {
  const result = asFileDetailResult(value);
  if (!result) return [{ type: "text", text: "\u77E5\u8BC6\u5E93\u68C0\u7D22\u7ED3\u679C\u65E0\u6548" }];
  const hits = result.hits.map((hit) => {
    const lineRange = hit.startLine === hit.endLine ? `${hit.startLine}` : `${hit.startLine}\u2013${hit.endLine}`;
    return `\`${hit.n}\` ${hit.path}:${lineRange}\uFF08\u547D\u4E2D\u884C ${hit.matchLine}\uFF09
${hit.excerpt}`;
  }).join("\n");
  const countLabel = result.scan.complete ? `${result.totalHits} \u6761\u547D\u4E2D` : `\u81F3\u5C11 ${result.totalHits} \u6761\u547D\u4E2D`;
  const body = result.hits.length ? `\u3010\u6587\u4EF6\u8BE6\u60C5\u3011${result.path} \xB7 ${countLabel} \xB7 \u672C\u9875 ${result.hits.length} \u6761
${result.groupHeader ? `${result.groupHeader}
` : ""}${hits}` : result.scan.complete ? `\u6587\u4EF6 ${result.path} \u6CA1\u6709\u627E\u5230\u76F8\u5173\u547D\u4E2D` : `\u6587\u4EF6 ${result.path} \u7684\u626B\u63CF\u672A\u5B8C\u6210\uFF0C\u6682\u672A\u627E\u5230\u53EF\u8FD4\u56DE\u7684\u547D\u4E2D`;
  const notes = [];
  if (result.page.hasMore) notes.push("\u5F53\u524D\u4EC5\u5C55\u793A\u6587\u4EF6\u8BE6\u60C5\u7684\u4E00\u9875\uFF0C\u4ECD\u6709\u66F4\u591A\u547D\u4E2D\u3002");
  if (result.page.hasMore && result.page.nextCursor) {
    notes.push(`\u4E0B\u4E00\u9875 cursor\uFF08\u8BF7\u539F\u6837\u590D\u5236\uFF0C\u53EA\u4F20 cursor \u548C\u53EF\u9009 limit\uFF09\uFF1A\`${result.page.nextCursor}\``);
  }
  if (!result.scan.complete) {
    notes.push("\u672C\u6B21\u626B\u63CF\u672A\u5B8C\u6210\uFF0C\u547D\u4E2D\u6570\u662F\u5F53\u524D\u5DF2\u53D1\u73B0\u7684\u4E0B\u9650\u3002");
    if (result.scan.stopReason) notes.push(`\u505C\u6B62\u539F\u56E0\uFF1A${result.scan.stopReason}`);
  }
  if (result.scan.warnings.length) notes.push(`\u63D0\u793A\uFF1A${result.scan.warnings.join("\uFF1B")}`);
  return [{ type: "text", text: notes.length ? `${body}

${notes.join("\n")}` : body }];
}
function asFileDetailResult(value) {
  const result = value && typeof value === "object" && !Array.isArray(value) ? value : null;
  return result?.kind === "file-detail" && result.scope === "hits" ? value : null;
}

// src/service/search/result/templates/overview-template.ts
function renderOverviewResult(value) {
  const result = asOverviewResult(value);
  if (!result) return [{ type: "text", text: "\u77E5\u8BC6\u5E93\u68C0\u7D22\u7ED3\u679C\u65E0\u6548" }];
  const pageLabel = result.files.length ? result.files.map((file) => `${file.path}\uFF08${file.totalHits} \u6761\uFF09`).join("\n") : "";
  const body = pageLabel ? `\u3010\u6587\u4EF6\u6982\u89C8\u3011${result.totalFiles} \u4E2A\u6587\u4EF6 \xB7 ${result.totalHits} \u6761\u547D\u4E2D \xB7 \u672C\u9875 ${result.files.length} \u4E2A\u6587\u4EF6
${pageLabel}` : result.scan.complete ? "\u77E5\u8BC6\u5E93\u4E2D\u6CA1\u6709\u627E\u5230\u76F8\u5173\u6587\u4EF6" : "\u5F53\u524D\u626B\u63CF\u672A\u5B8C\u6210\uFF0C\u6682\u672A\u627E\u5230\u53EF\u8FD4\u56DE\u7684\u6587\u4EF6";
  const notes = [];
  if (result.page.hasMore) notes.push("\u5F53\u524D\u4EC5\u5C55\u793A\u6587\u4EF6\u6982\u89C8\u7684\u4E00\u9875\uFF0C\u4ECD\u6709\u66F4\u591A\u6587\u4EF6\u3002");
  if (result.page.hasMore && result.page.nextCursor) {
    notes.push(`\u4E0B\u4E00\u9875 cursor\uFF08\u8BF7\u539F\u6837\u590D\u5236\uFF0C\u53EA\u4F20 cursor \u548C\u53EF\u9009 limit\uFF09\uFF1A\`${result.page.nextCursor}\``);
  }
  if (!result.scan.complete) {
    notes.push("\u672C\u6B21\u626B\u63CF\u672A\u5B8C\u6210\uFF0C\u6587\u4EF6\u6570\u548C\u547D\u4E2D\u6570\u90FD\u662F\u5F53\u524D\u5DF2\u53D1\u73B0\u7684\u4E0B\u9650\u3002");
    if (result.scan.stopReason) notes.push(`\u505C\u6B62\u539F\u56E0\uFF1A${result.scan.stopReason}`);
  }
  if (result.scan.warnings.length) notes.push(`\u63D0\u793A\uFF1A${result.scan.warnings.join("\uFF1B")}`);
  return [{ type: "text", text: notes.length ? `${body}

${notes.join("\n")}` : body }];
}
function searchPresentationMeta(value) {
  const result = asRecord3(value);
  if (!result || result.kind !== "overview" && result.kind !== "file-detail") return {};
  const keys = ["kind", "scope", "kbId", "category", "query", "files", "totalFiles", "totalHits", "page", "scan", "path", "format", "groupHeader", "hits", "presentation"];
  const meta = {};
  for (const key of keys) if (Object.prototype.hasOwnProperty.call(result, key)) meta[key] = result[key];
  return meta;
}
function asOverviewResult(value) {
  const result = asRecord3(value);
  return result?.kind === "overview" && result.scope === "files" ? value : null;
}
function asRecord3(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

// src/service/search/result/templates/index.ts
function renderSearchResult(_args, value) {
  const result = value && typeof value === "object" && !Array.isArray(value) ? value : null;
  if (result?.kind === "overview") return renderOverviewResult(value);
  if (result?.kind === "file-detail") return renderFileDetailResult(value);
  return [{ type: "text", text: "\u77E5\u8BC6\u5E93\u68C0\u7D22\u7ED3\u679C\u65E0\u6548" }];
}

// src/controller/tool/kb-tool-request-mapper.ts
function asToolRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function requireToolString(data, field) {
  const value = data[field];
  if (typeof value !== "string" || !value.trim()) throw new KbError("missing_field", `${field} \u5FC5\u586B`);
  return value;
}
function optionalToolString(data, field) {
  const value = data[field];
  if (value === void 0) return void 0;
  if (typeof value !== "string") throw new KbError("invalid_field", `${field} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32`);
  return value;
}
function optionalToolNumber(data, field) {
  const value = data[field];
  if (value === void 0) return void 0;
  if (typeof value !== "number") throw new KbError("invalid_field", `${field} \u5FC5\u987B\u662F\u6570\u5B57`);
  return value;
}
function optionalToolBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}
function optionalToolStringArray(data, field) {
  const value = data[field];
  if (value === void 0) return void 0;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new KbError("invalid_field", `${field} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4`);
  }
  return value;
}
function buildToolImportInput(data) {
  return createImportFromPathRequest({
    kbId: requireToolString(data, "kbId"),
    sourcePath: requireToolString(data, "sourcePath"),
    destCategory: typeof data.destCategory === "string" ? data.destCategory : "",
    preserveTree: optionalToolBoolean(data.preserveTree, false),
    createMissing: optionalToolBoolean(data.createMissing, true)
  });
}
function buildToolSearchRequest(data) {
  const limit = optionalToolNumber(data, "limit");
  if (data.cursor !== void 0) {
    if (["kbId", "query", "aliases", "category", "path"].some((field) => Object.prototype.hasOwnProperty.call(data, field))) {
      throw new KbError("invalid_field", "\u7EED\u9875\u8BF7\u6C42\u53EA\u80FD\u5305\u542B cursor \u548C limit");
    }
    return {
      cursor: requireToolString(data, "cursor"),
      ...limit === void 0 ? {} : { limit }
    };
  }
  return {
    kbId: requireToolString(data, "kbId"),
    query: requireToolString(data, "query"),
    aliases: optionalToolStringArray(data, "aliases"),
    category: optionalToolString(data, "category"),
    path: optionalToolString(data, "path"),
    ...limit === void 0 ? {} : { limit }
  };
}

// src/controller/tool/kb-tool-response-renderer.ts
function asRecord4(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function text(value) {
  return [{ type: "text", text: value }];
}
function renderImportResult(value) {
  const result = asRecord4(value);
  const copied = Array.isArray(result?.copied) ? result.copied.filter((item) => typeof item === "string") : [];
  const skipped = typeof result?.skipped === "number" ? result.skipped : 0;
  const failed = typeof result?.failed === "number" ? result.failed : 0;
  const files = Array.isArray(result?.files) ? result.files : [];
  const failedFiles = files.map((item) => asRecord4(item)).filter((item) => item !== null && item.status === "failed").slice(0, 5).map((item) => `${typeof item.sourceRelPath === "string" ? item.sourceRelPath : String(item.relPath ?? "\u6587\u4EF6")}\uFF1A${typeof item.reason === "string" ? item.reason : "\u5904\u7406\u5931\u8D25"}`);
  const summary = `\u5BFC\u5165 ${copied.length} \xB7 \u8DF3\u8FC7 ${skipped} \xB7 \u5931\u8D25 ${failed}`;
  return text(failedFiles.length ? `${summary}
${failedFiles.join("\n")}` : summary);
}

// src/controller/tool/kb-tool-controller.ts
function fail2(error) {
  if (error instanceof KbError) throw new Error(error.message);
  throw error;
}
var searchOutputSchema = {
  oneOf: [
    {
      type: "object",
      required: ["kind", "scope", "kbId", "query", "files", "totalFiles", "totalHits", "page", "scan", "presentation"],
      properties: {
        kind: { type: "string", enum: ["overview"] },
        scope: { type: "string", enum: ["files"] },
        kbId: { type: "string" },
        category: { type: "string" },
        query: { type: "object", required: ["terms", "aliases"], properties: { terms: { type: "array" }, aliases: { type: "array" } } },
        files: { type: "array", description: "\u672C\u9875\u6587\u4EF6\u6458\u8981\uFF0C\u4E0D\u5305\u542B\u547D\u4E2D\u6B63\u6587", items: { type: "object", required: ["path", "format", "totalHits"], properties: { path: { type: "string" }, format: { type: "string" }, totalHits: { type: "integer" } } } },
        totalFiles: { type: "integer" },
        totalHits: { type: "integer" },
        page: { type: "object", required: ["scope", "returnedFiles", "hasMore"], properties: { scope: { type: "string" }, returnedFiles: { type: "integer" }, hasMore: { type: "boolean" }, nextCursor: { type: "string" } } },
        scan: { type: "object", required: ["complete", "warnings"], properties: { complete: { type: "boolean" }, warnings: { type: "array" }, stopReason: { type: "string" } } },
        presentation: { type: "object", required: ["template", "version"], properties: { template: { type: "string" }, version: { type: "integer" } } }
      }
    },
    {
      type: "object",
      required: ["kind", "scope", "kbId", "query", "path", "format", "totalHits", "hits", "page", "scan", "presentation"],
      properties: {
        kind: { type: "string", enum: ["file-detail"] },
        scope: { type: "string", enum: ["hits"] },
        kbId: { type: "string" },
        category: { type: "string" },
        query: { type: "object", required: ["terms", "aliases"], properties: { terms: { type: "array" }, aliases: { type: "array" } } },
        path: { type: "string" },
        format: { type: "string" },
        totalHits: { type: "integer" },
        groupHeader: { type: "string" },
        hits: { type: "array" },
        page: { type: "object", required: ["scope", "returnedHits", "hasMore"], properties: { scope: { type: "string" }, returnedHits: { type: "integer" }, hasMore: { type: "boolean" }, nextCursor: { type: "string" } } },
        scan: { type: "object", required: ["complete", "warnings"], properties: { complete: { type: "boolean" }, warnings: { type: "array" }, stopReason: { type: "string" } } },
        presentation: { type: "object", required: ["template", "version"], properties: { template: { type: "string" }, version: { type: "integer" } } }
      }
    }
  ]
};
function registerKbTools(ctx, jobs, knowledgeServices) {
  const offs = [
    ctx.tools.register({
      name: "kb_list",
      description: "\u5217\u51FA\u5DF2\u521B\u5EFA\u7684\u77E5\u8BC6\u5E93\u5361\u7247\uFF1Aid\u3001\u6807\u9898\u3001\u63CF\u8FF0\u3001\u522B\u540D\u3001\u7C7B\u76EE\u540D\u3001\u7EA6\u591A\u5C11\u7BC7\u3002\u4E0D\u542B\u6587\u4EF6\u540D\u548C\u6B63\u6587\u3002\u9009\u5E93\u65F6\u5148\u8C03\u7528\u672C\u5DE5\u5177\u3002",
      parameters: { type: "object" },
      output: {
        schema: { type: "object", properties: { kbs: { type: "array" } } },
        render: (_args, value) => {
          const kbs = value?.kbs ?? [];
          return [{ type: "text", text: kbs.map((item) => `${item.id} ${formatKbDisplayTitle(item.title, item.id)}`).join(" \xB7 ") || "\u8FD8\u6CA1\u6709\u77E5\u8BC6\u5E93" }];
        }
      },
      isConcurrencySafe: () => true,
      execute: async () => {
        try {
          const dataRoot = await resolveDataRoot();
          return { kbs: await knowledgeServices.listKbs(dataRoot) };
        } catch (error) {
          fail2(error);
        }
      }
    }),
    ctx.tools.register({
      name: "kb_import",
      description: "\u628A\u672C\u673A md/txt/csv \u5BFC\u5165\u5DF2\u6709\u77E5\u8BC6\u5E93\u7684\u6307\u5B9A\u7C7B\u76EE\u3002CSV \u4F1A\u8F6C\u6210 UTF-8 \u540E\u5165\u5E93\uFF0C\u53EF\u5728\u77E5\u6E90\u4E2D\u8868\u683C\u7F16\u8F91\u3002\u5E93\u5FC5\u987B\u5DF2\u5B58\u5728\u3002\u4E0D\u8981\u731C\u6D4B\u65B0\u5E93\u3002destCategory \u4E3A\u7A7A\u8868\u793A\u5E93\u6839\u3002",
      parameters: {
        type: "object",
        required: ["kbId", "sourcePath"],
        properties: {
          kbId: { type: "string", description: "\u5DF2\u5B58\u5728\u7684\u77E5\u8BC6\u5E93 id" },
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
        render: (_args, value) => renderImportResult(value)
      },
      execute: async (args) => {
        const input = asToolRecord(args);
        try {
          const dataRoot = await resolveDataRoot();
          return await jobs.enqueue("import", () => knowledgeServices.importFiles(dataRoot, buildToolImportInput(input)));
        } catch (error) {
          fail2(error);
        }
      }
    }),
    ctx.tools.register({
      name: "kb_search",
      description: "\u5728\u6307\u5B9A\u77E5\u8BC6\u5E93\u4E2D\u4F7F\u7528 ripgrep Rust \u6B63\u5219\u68C0\u7D22\u3002\u9996\u6B21\u8C03\u7528\u8FD4\u56DE\u6587\u4EF6\u6982\u89C8\uFF1B\u4F20\u5165 path \u540E\u8FD4\u56DE\u5355\u6587\u4EF6\u547D\u4E2D\u8BE6\u60C5\u3002file-detail \u4ECD\u5FC5\u987B\u643A\u5E26 query\uFF0C\u4EE5\u53CA\u539F\u67E5\u8BE2\u4F7F\u7528\u8FC7\u7684 aliases\uFF0C\u4E0D\u80FD\u53EA\u4F20 kbId/path\u3002path \u59CB\u7EC8\u662F\u77E5\u8BC6\u5E93\u6839\u76EE\u5F55\u4E0B\u7684 POSIX \u76F8\u5BF9\u8DEF\u5F84\uFF0C\u4F8B\u5982 aa/bb/cc.md\u3002\u7EED\u9875\u53EA\u4F20\u4E0A\u4E00\u9875\u7684 cursor \u548C\u53EF\u9009 limit\u3002",
      parameters: {
        type: "object",
        oneOf: [
          { required: ["kbId", "query"] },
          { required: ["cursor"] }
        ],
        properties: {
          kbId: { type: "string", description: "\u9996\u6B21\u67E5\u8BE2\u5FC5\u586B\uFF0C\u5FC5\u987B\u662F\u771F\u5B9E\u5B58\u5728\u7684\u77E5\u8BC6\u5E93 id" },
          query: { type: "string", description: "\u9996\u6B21 overview \u6216\u5E26 path \u7684 file-detail \u90FD\u5FC5\u586B\uFF0Cripgrep Rust \u6B63\u5219\u8868\u8FBE\u5F0F" },
          aliases: { type: "array", items: { type: "string" }, description: "\u989D\u5916\u7684 ripgrep \u6B63\u5219\u8868\u8FBE\u5F0F\uFF0C\u6700\u591A 8 \u4E2A\uFF1Bfile-detail \u65F6\u6CBF\u7528\u9996\u6B21\u67E5\u8BE2\u7684 aliases" },
          category: { type: "string", description: "\u5DF2\u5B58\u5728\u7684\u5E93\u5185\u7C7B\u76EE\uFF1B\u7F3A\u7701\u8868\u793A\u6574\u4E2A\u77E5\u8BC6\u5E93" },
          path: { type: "string", description: "\u77E5\u8BC6\u5E93\u6839\u76EE\u5F55\u76F8\u5BF9 POSIX \u6587\u4EF6\u8DEF\u5F84\uFF0C\u4F8B\u5982 aa/bb/cc.md\uFF1B\u5FC5\u987B\u4E0E kbId \u548C query \u4E00\u8D77\u4F20\uFF0C\u4E0D\u80FD\u53EA\u4F20 kbId/path\uFF1B\u4F20\u5165\u540E\u8FDB\u5165 file-detail" },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "overview \u8868\u793A\u6587\u4EF6\u6570\uFF0Cfile-detail \u8868\u793A\u547D\u4E2D\u6570\uFF0C\u9ED8\u8BA4 20" },
          cursor: { type: "string", description: "\u4E0A\u4E00\u9875\u8FD4\u56DE\u7684 v4 \u6E38\u6807\uFF1B\u7EED\u9875\u65F6\u4E0D\u80FD\u540C\u65F6\u4F20 kbId/query/category/path" }
        }
      },
      output: {
        schema: searchOutputSchema,
        render: (_args, value) => renderSearchResult({}, value),
        presentationMeta: (_args, value) => searchPresentationMeta(value)
      },
      presentCall: () => ({ card: "generic", title: "\u77E5\u8BC6\u5E93\u68C0\u7D22" }),
      presentResult: (_args, result) => result.isError ? { card: "generic", title: "\u68C0\u7D22\u5931\u8D25" } : { card: "generic", title: "\u77E5\u8BC6\u5E93\u68C0\u7D22\u7ED3\u679C" },
      execute: async (args) => {
        const input = asToolRecord(args);
        try {
          const dataRoot = await resolveDataRoot();
          return await knowledgeServices.searchKb(dataRoot, buildToolSearchRequest(input));
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

// src/platform/jobs.ts
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

// src/repository/kb/file-catalog-repository.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import { mkdir as mkdir3, rename as rename3, rm as rm2, writeFile as writeFile3, readFile as readFile3 } from "node:fs/promises";
import { basename as basename2, dirname as dirname3, join as join5 } from "node:path";

// src/repository/kb/catalog-codec.ts
function asRecord5(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function asNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function parseCard(value) {
  const record = asRecord5(value);
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
  const record = asRecord5(value);
  return {
    defaultKbId: asString(record.defaultKbId),
    maxFileBytes: asNumber(record.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxKbBytes: asNumber(record.maxKbBytes, DEFAULT_MAX_KB_BYTES)
  };
}
function emptyCatalog() {
  return {
    version: 2,
    lastUsedKbId: "",
    prefs: {
      defaultKbId: "",
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxKbBytes: DEFAULT_MAX_KB_BYTES
    },
    kbs: []
  };
}
function parseCatalog(raw) {
  const record = asRecord5(raw);
  const kbs = Array.isArray(record.kbs) ? record.kbs.map(parseCard).filter((card) => Boolean(card)) : [];
  return {
    version: 2,
    lastUsedKbId: asString(record.lastUsedKbId),
    prefs: parsePrefs(record.prefs),
    kbs
  };
}
function catalogVersionWarning(raw) {
  const version = asRecord5(raw).version;
  if (version === void 0 || version === 2) return void 0;
  return `catalog.json version \u4E3A ${String(version)}\uFF0C\u5DF2\u6309 version 2 \u89E3\u6790`;
}

// src/repository/kb/catalog-migration.ts
import { lstat, rename as rename2 } from "node:fs/promises";
import { join as join4 } from "node:path";
function asRecord6(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function firstString(...values) {
  return values.find((value) => typeof value === "string");
}
function firstDefined(...values) {
  return values.find((value) => value !== void 0);
}
function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}
function hasLegacyFields(record, prefs) {
  return hasOwn(record, "lastUsedBaseId") || hasOwn(record, "bases") || hasOwn(prefs, "defaultBaseId") || hasOwn(prefs, "maxBaseBytes");
}
function migrateCatalog(raw) {
  const record = asRecord6(raw);
  const oldPrefs = asRecord6(record.prefs);
  if (record.version === 2 && !hasLegacyFields(record, oldPrefs)) {
    return { catalog: parseCatalog(raw), migrated: false };
  }
  const canonicalRaw = {
    version: 2,
    lastUsedKbId: firstString(record.lastUsedKbId, record.lastUsedBaseId) ?? "",
    prefs: {
      defaultKbId: firstString(oldPrefs.defaultKbId, oldPrefs.defaultBaseId) ?? "",
      maxFileBytes: oldPrefs.maxFileBytes,
      maxKbBytes: firstDefined(oldPrefs.maxKbBytes, oldPrefs.maxBaseBytes)
    },
    kbs: Array.isArray(record.kbs) ? record.kbs : record.bases
  };
  return { catalog: parseCatalog(canonicalRaw), migrated: true };
}
async function pathKind(path) {
  try {
    const info = await lstat(path);
    return info.isDirectory() ? "directory" : "other";
  } catch (error) {
    if (error !== null && typeof error === "object" && error.code === "ENOENT") return "missing";
    throw error;
  }
}
async function migrateLegacyDirectories(dataRoot) {
  const legacyDirectory = join4(dataRoot, "bases");
  const currentDirectory = join4(dataRoot, "kbs");
  const legacyKind = await pathKind(legacyDirectory);
  const currentKind = await pathKind(currentDirectory);
  if (legacyKind === "other" || currentKind === "other") {
    throw new Error("\u77E5\u8BC6\u5E93\u76EE\u5F55\u8FC1\u79FB\u5931\u8D25\uFF1Abases/ \u6216 kbs/ \u4E0D\u662F\u76EE\u5F55");
  }
  if (legacyKind === "directory" && currentKind === "directory") {
    throw new Error("\u77E5\u8BC6\u5E93\u76EE\u5F55\u8FC1\u79FB\u51B2\u7A81\uFF1Abases/ \u4E0E kbs/ \u540C\u65F6\u5B58\u5728\uFF0C\u8BF7\u5148\u4EBA\u5DE5\u5408\u5E76\u540E\u91CD\u8BD5");
  }
  if (legacyKind === "directory") await rename2(legacyDirectory, currentDirectory);
}

// src/repository/kb/file-catalog-repository.ts
function isMissingCatalogFile(error) {
  if (error === null || typeof error !== "object") return false;
  return error.code === "ENOENT";
}
var catalogTransactionChain = Promise.resolve();
async function withCatalogTransactionLock(work) {
  const run = catalogTransactionChain.then(work, work);
  catalogTransactionChain = run.then(() => void 0, () => void 0);
  return run;
}
var FileCatalogRepository = class {
  options;
  constructor(options = {}) {
    this.options = options;
  }
  async read(dataRoot) {
    return withCatalogTransactionLock(() => this.readUnlocked(dataRoot));
  }
  async save(dataRoot, catalog) {
    return withCatalogTransactionLock(async () => {
      await migrateLegacyDirectories(dataRoot);
      await this.saveUnlocked(dataRoot, catalog);
    });
  }
  async withTransaction(dataRoot, work) {
    return withCatalogTransactionLock(async () => {
      const catalog = await this.readUnlocked(dataRoot);
      const outcome = await work({ dataRoot, catalog });
      if (outcome.catalog) await this.saveUnlocked(dataRoot, outcome.catalog);
      return outcome.result;
    });
  }
  async readUnlocked(dataRoot) {
    await migrateLegacyDirectories(dataRoot);
    try {
      const text2 = await readFile3(catalogPath(dataRoot), "utf8");
      const raw = JSON.parse(text2);
      const warning = catalogVersionWarning(raw);
      if (warning) this.options.onWarning?.(warning);
      const migration = migrateCatalog(raw);
      if (migration.migrated) await this.saveUnlocked(dataRoot, migration.catalog);
      return migration.catalog;
    } catch (error) {
      if (isMissingCatalogFile(error)) return emptyCatalog();
      throw error;
    }
  }
  async saveUnlocked(dataRoot, catalog) {
    const filePath = catalogPath(dataRoot);
    await mkdir3(dirname3(filePath), { recursive: true });
    const temporaryPath = join5(dirname3(filePath), `.${basename2(filePath)}.${randomUUID2()}.tmp`);
    try {
      await writeFile3(temporaryPath, `${JSON.stringify(catalog, null, 2)}
`, { flag: "wx" });
      await rename3(temporaryPath, filePath);
    } catch (error) {
      await rm2(temporaryPath, { force: true }).catch(() => void 0);
      throw error;
    }
  }
};

// src/service/kb/kb-tree.ts
import { readdir as readdir2, stat as stat3 } from "node:fs/promises";
import { join as join6, relative as relative2, sep as sep2 } from "node:path";

// src/service/kb/kb-lifecycle.ts
import { randomUUID as randomUUID3 } from "node:crypto";
import { mkdir as mkdir4, readdir, rm as rm3, stat as stat2 } from "node:fs/promises";

// src/service/kb/catalog-mutation.ts
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
function upsertKb(catalog, card) {
  const remainingCards = catalog.kbs.filter((item) => item.id !== card.id);
  return { ...catalog, kbs: [...remainingCards, card] };
}
function removeKb(catalog, id) {
  return {
    ...catalog,
    kbs: catalog.kbs.filter((item) => item.id !== id),
    lastUsedKbId: catalog.lastUsedKbId === id ? "" : catalog.lastUsedKbId,
    prefs: {
      ...catalog.prefs,
      defaultKbId: catalog.prefs.defaultKbId === id ? "" : catalog.prefs.defaultKbId
    }
  };
}

// src/service/kb/kb-lifecycle.ts
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
async function scanKbIds(dataRoot) {
  const kbsDirectory = kbsRoot(dataRoot);
  if (!await directoryExists(kbsDirectory)) return [];
  const entries = await readdir(kbsDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
}
async function hasKbTitle(dataRoot, catalog, title, excludeId) {
  if (catalog.kbs.some((card) => card.id !== excludeId && card.title === title)) return true;
  const catalogIds = new Set(catalog.kbs.map((card) => card.id));
  return (await scanKbIds(dataRoot)).some((id) => id !== excludeId && !catalogIds.has(id) && id.trim() === title);
}
async function generateKbId(dataRoot, catalog) {
  const existingIds = /* @__PURE__ */ new Set([...catalog.kbs.map((card) => card.id), ...await scanKbIds(dataRoot)]);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomUUID3();
    if (!existingIds.has(id)) return id;
  }
  throw new KbError("kb_exists", "\u65E0\u6CD5\u751F\u6210\u552F\u4E00\u77E5\u8BC6\u5E93 ID\uFF0C\u8BF7\u91CD\u8BD5");
}
async function createKb(catalogRepository, dataRoot, input) {
  const title = requireNonEmptyText(input.title, "title");
  const description = requireNonEmptyText(input.description, "description");
  return catalogRepository.withTransaction(dataRoot, async ({ catalog }) => {
    if (await hasKbTitle(dataRoot, catalog, title)) {
      throw new KbError("title_exists", `\u77E5\u8BC6\u5E93\u6807\u9898\u300C${title}\u300D\u5DF2\u5B58\u5728`);
    }
    const id = await generateKbId(dataRoot, catalog);
    const now = Date.now();
    const card = { id, title, description, aliases: cleanAliases(input.aliases), createdAt: now, lastUsedAt: now };
    await mkdir4(kbDir(dataRoot, id), { recursive: true });
    const nextCatalog = upsertKb(catalog, card);
    if (!nextCatalog.lastUsedKbId) nextCatalog.lastUsedKbId = id;
    if (!nextCatalog.prefs.defaultKbId) nextCatalog.prefs.defaultKbId = id;
    return { result: card, catalog: nextCatalog };
  });
}
async function updateKb(catalogRepository, dataRoot, id, patch) {
  return catalogRepository.withTransaction(dataRoot, async ({ catalog }) => {
    const currentCard = catalog.kbs.find((card2) => card2.id === id);
    if (!currentCard) throw new KbError("kb_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
    const title = patch.title !== void 0 ? requireNonEmptyText(patch.title, "title") : currentCard.title;
    if (await hasKbTitle(dataRoot, catalog, title, id)) {
      throw new KbError("title_exists", `\u77E5\u8BC6\u5E93\u6807\u9898\u300C${title}\u300D\u5DF2\u5B58\u5728`);
    }
    const card = {
      ...currentCard,
      title,
      description: patch.description !== void 0 ? requireNonEmptyText(patch.description, "description") : currentCard.description,
      aliases: patch.aliases !== void 0 ? cleanAliases(patch.aliases) : currentCard.aliases
    };
    return { result: card, catalog: upsertKb(catalog, card) };
  });
}
async function deleteKb(catalogRepository, dataRoot, id, confirm) {
  if (!confirm) throw new KbError("confirm_required", "\u5220\u9664\u77E5\u8BC6\u5E93\u9700\u8981\u786E\u8BA4");
  await catalogRepository.withTransaction(dataRoot, async ({ catalog }) => {
    const knownKbIds = /* @__PURE__ */ new Set([...catalog.kbs.map((card) => card.id), ...await scanKbIds(dataRoot)]);
    if (!knownKbIds.has(id)) throw new KbError("kb_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
    const kbsDirectory = kbsRoot(dataRoot);
    const targetKbDirectory = assertInside(kbsDirectory, kbDir(dataRoot, id));
    assertNoSymlinkEscape(kbsDirectory, targetKbDirectory);
    await rm3(targetKbDirectory, { recursive: true, force: true });
    return { result: void 0, catalog: removeKb(catalog, id) };
  });
}
async function markKbUsed(catalogRepository, dataRoot, id) {
  await catalogRepository.withTransaction(dataRoot, ({ catalog }) => {
    const currentCard = catalog.kbs.find((card) => card.id === id);
    if (!currentCard) return { result: void 0 };
    const now = Date.now();
    if (catalog.lastUsedKbId === id && now - currentCard.lastUsedAt < MARK_USED_THROTTLE_MS) {
      return { result: void 0 };
    }
    currentCard.lastUsedAt = now;
    catalog.lastUsedKbId = id;
    return { result: void 0, catalog };
  });
}
async function requireKb(catalogRepository, dataRoot, id) {
  const catalog = await catalogRepository.read(dataRoot);
  if (catalog.kbs.some((card) => card.id === id) || await directoryExists(kbDir(dataRoot, id))) return;
  throw new KbError("kb_missing", `\u77E5\u8BC6\u5E93 ${id} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
}

// src/service/kb/kb-tree.ts
async function walkTextDocuments(directoryPath) {
  const documentPaths = [];
  let entries;
  try {
    entries = await readdir2(directoryPath, { withFileTypes: true });
  } catch {
    return documentPaths;
  }
  for (const entry of entries) {
    const entryPath = join6(directoryPath, entry.name);
    if (entry.isDirectory()) documentPaths.push(...await walkTextDocuments(entryPath));
    else if (entry.isFile() && contentRegistry.isStoredEntryPath(entry.name)) documentPaths.push(entryPath);
  }
  return documentPaths;
}
async function countDocs(dataRoot, kbId) {
  return (await walkTextDocuments(kbDir(dataRoot, kbId))).length;
}
async function textDocumentBytes(kbRoot) {
  const paths = await walkTextDocuments(kbRoot);
  let total = 0;
  for (const documentPath of paths) total += (await stat3(documentPath)).size;
  return total;
}
async function listKbCategories(dataRoot, kbId) {
  const kbDirectory = kbDir(dataRoot, kbId);
  if (!await directoryExists(kbDirectory)) return [];
  const entries = await readdir2(kbDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
}
function createKbCardFromDirectory(id) {
  return { id, title: id, description: "", aliases: [], createdAt: 0, lastUsedAt: 0 };
}
async function listKbs(catalogRepository, dataRoot) {
  const catalog = await catalogRepository.read(dataRoot);
  const onDiskKbIds = await scanKbIds(dataRoot);
  const cardsById = new Map(catalog.kbs.map((card) => [card.id, card]));
  const kbIds = [.../* @__PURE__ */ new Set([...onDiskKbIds, ...catalog.kbs.map((card) => card.id)])];
  const summaries = [];
  for (const id of kbIds.sort()) {
    const card = cardsById.get(id) ?? createKbCardFromDirectory(id);
    summaries.push({
      ...card,
      categories: await listKbCategories(dataRoot, id),
      approxDocs: await countDocs(dataRoot, id),
      lastUsed: catalog.lastUsedKbId === id
    });
  }
  return summaries;
}
async function walkTree(kbRoot, directoryPath) {
  const entries = await readdir2(directoryPath, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "zh"))) {
    const absolutePath = join6(directoryPath, entry.name);
    const relativePath = relative2(kbRoot, absolutePath).split(sep2).join("/");
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, kind: "dir", path: relativePath, children: await walkTree(kbRoot, absolutePath) });
      continue;
    }
    if (!entry.isFile() || !contentRegistry.isStoredEntryPath(entry.name)) continue;
    const info = await stat3(absolutePath);
    nodes.push({ name: entry.name, kind: "file", path: relativePath, size: info.size, mtime: info.mtimeMs });
  }
  return nodes;
}
async function listTree(catalogRepository, dataRoot, kbId) {
  await requireKb(catalogRepository, dataRoot, kbId);
  const kbRoot = kbDir(dataRoot, kbId);
  if (!await directoryExists(kbRoot)) return [];
  return walkTree(kbRoot, kbRoot);
}

// src/service/kb/entry.ts
import { rm as rm4, stat as stat4 } from "node:fs/promises";
async function fileBytes(filePath) {
  try {
    return (await stat4(filePath)).size;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}
async function readEntry(catalogRepository, dataRoot, kbId, relativePath, options = {}) {
  await requireKb(catalogRepository, dataRoot, kbId);
  const absolutePath = resolveDest(dataRoot, kbId, relativePath).absolute;
  const kbRoot = kbDir(dataRoot, kbId);
  assertNoSymlinkEscape(kbRoot, absolutePath);
  try {
    return await contentRegistry.readContent({ absolutePath, relativePath, options });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new KbError("not_found", `\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${relativePath}`);
    }
    throw error;
  }
}
async function writeEntryContent(catalogRepository, dataRoot, kbId, relativePath, change) {
  await requireKb(catalogRepository, dataRoot, kbId);
  const absolutePath = resolveDest(dataRoot, kbId, relativePath).absolute;
  const kbRoot = kbDir(dataRoot, kbId);
  assertInside(kbRoot, absolutePath);
  assertNoSymlinkEscape(kbRoot, absolutePath);
  const catalog = await catalogRepository.read(dataRoot);
  const [kbBytes, entryBytes] = await Promise.all([textDocumentBytes(kbRoot), fileBytes(absolutePath)]);
  await contentRegistry.writeContent({
    absolutePath,
    relativePath,
    change,
    maxFileBytes: catalog.prefs.maxFileBytes,
    maxKbBytes: catalog.prefs.maxKbBytes,
    kbBytesWithoutEntry: Math.max(0, kbBytes - entryBytes)
  });
}
async function readEntryPage(catalogRepository, dataRoot, kbId, relativePath, startRow, pageSize2) {
  await requireKb(catalogRepository, dataRoot, kbId);
  const absolutePath = resolveDest(dataRoot, kbId, relativePath).absolute;
  const kbRoot = kbDir(dataRoot, kbId);
  assertInside(kbRoot, absolutePath);
  assertNoSymlinkEscape(kbRoot, absolutePath);
  return contentRegistry.readPage({ absolutePath, relativePath, startRow, pageSize: pageSize2 });
}
async function deleteEntry(catalogRepository, dataRoot, kbId, relativePath, confirm) {
  if (!confirm) throw new KbError("confirm_required", "\u5220\u9664\u6587\u4EF6\u6216\u7C7B\u76EE\u9700\u8981\u786E\u8BA4");
  await requireKb(catalogRepository, dataRoot, kbId);
  const absolutePath = resolveDest(dataRoot, kbId, relativePath).absolute;
  assertInside(kbDir(dataRoot, kbId), absolutePath);
  assertNoSymlinkEscape(kbDir(dataRoot, kbId), absolutePath);
  await rm4(absolutePath, { recursive: true, force: true });
}

// src/service/kb/import-drop.ts
import { mkdtemp, rm as rm6, writeFile as writeFile5 } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as join10 } from "node:path";

// src/service/kb/import.ts
import { existsSync as existsSync5 } from "node:fs";
import { mkdir as mkdir6, stat as stat7 } from "node:fs/promises";
import { basename as basename5, dirname as dirname6, sep as sep6 } from "node:path";

// src/service/kb/import-check.ts
import { existsSync as existsSync3 } from "node:fs";
import { basename as basename3, dirname as dirname4, extname as extname2, isAbsolute as isAbsolute2, join as join7, relative as relative3, sep as sep3 } from "node:path";
function uniqueName(dir, name2) {
  const ext = extname2(name2);
  const stem = basename3(name2, ext);
  let next = name2;
  let n = 2;
  while (existsSync3(join7(dir, next))) {
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
  return join7(dirname4(sourceRelativePath), outputName).split(sep3).join("/");
}
function isImportFailureCode(code) {
  return code === "ext_denied" || code === "file_too_large" || code === "quota" || code === "path_escape" || code === "csv_encoding_invalid" || code === "csv_control_character" || code === "csv_line_too_long" || code === "encoding_unsupported" || code === "io_failed";
}

// src/service/kb/import-destination.ts
async function getLastDestinationCategory(catalogRepository, dataRoot, kbId) {
  const catalog = await catalogRepository.read(dataRoot);
  return catalog.kbs.find((card) => card.id === kbId)?.lastDestCategory;
}
async function rememberLastDestinationCategory(catalogRepository, dataRoot, kbId, destinationCategory) {
  await catalogRepository.withTransaction(dataRoot, ({ catalog }) => {
    const currentCard = catalog.kbs.find((card) => card.id === kbId);
    if (!currentCard || currentCard.lastDestCategory === destinationCategory) return { result: void 0 };
    currentCard.lastDestCategory = destinationCategory;
    return { result: void 0, catalog };
  });
}
async function resolveImportDestination(catalogRepository, dataRoot, kbId, destinationCategoryFlag, importToKbRoot) {
  if (destinationCategoryFlag !== void 0) return destinationCategoryFlag;
  if (importToKbRoot) return "";
  const lastDestinationCategory = await getLastDestinationCategory(catalogRepository, dataRoot, kbId);
  if (lastDestinationCategory === void 0) {
    throw new KbError("missing_field", "\u8BF7\u6307\u5B9A --to <\u7C7B\u76EE>\uFF0C\u6216 --root \u5BFC\u5165\u5230\u5E93\u6839");
  }
  return lastDestinationCategory;
}

// src/service/kb/import-read.ts
import { readdir as readdir3, stat as stat5 } from "node:fs/promises";
import { join as join8, relative as relative4, sep as sep4 } from "node:path";
function isTextFile(name2) {
  return contentRegistry.isStoredEntryPath(name2);
}
async function walkSource(source) {
  const info = await stat5(source);
  if (info.isFile()) return [source];
  const files = [];
  const entries = await readdir3(source, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join8(source, entry.name);
    if (entry.isDirectory()) files.push(...await walkSource(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}
async function existingHashes(kbRoot) {
  const map = /* @__PURE__ */ new Map();
  const files = await walkSource(kbRoot).catch(() => []);
  for (const file of files) {
    if (!isTextFile(file)) continue;
    map.set(await sha256File(file), relative4(kbRoot, file).split(sep4).join("/"));
  }
  return map;
}
async function dirSize(kbRoot) {
  let total = 0;
  const files = await walkSource(kbRoot).catch(() => []);
  for (const file of files) {
    if (!isTextFile(file)) continue;
    total += (await stat5(file)).size;
  }
  return total;
}

// src/service/kb/import-write.ts
import { existsSync as existsSync4 } from "node:fs";
import { mkdir as mkdir5 } from "node:fs/promises";
import { basename as basename4, dirname as dirname5, join as join9, relative as relative5, sep as sep5 } from "node:path";

// src/content/shared/ingest-output.ts
import { randomUUID as randomUUID4 } from "node:crypto";
import { copyFile, rename as rename4, rm as rm5, stat as stat6, writeFile as writeFile4 } from "node:fs/promises";
async function writePreparedEntry(destinationPath, entry) {
  const temporaryPath = `${destinationPath}.${randomUUID4()}.tmp`;
  try {
    if (entry.content.kind === "bytes") {
      await writeFile4(temporaryPath, entry.content.bytes, { flag: "wx" });
    } else {
      await copyFile(entry.content.sourcePath, temporaryPath, 0);
    }
    const writtenBytes = (await stat6(temporaryPath)).size;
    const writtenDigest = await sha256File(temporaryPath);
    if (writtenBytes !== entry.byteLength || writtenDigest !== entry.digest) {
      throw new Error("\u5BFC\u5165\u671F\u95F4\u6E90\u6587\u4EF6\u5DF2\u53D8\u5316");
    }
    await rename4(temporaryPath, destinationPath);
    return writtenBytes;
  } catch (error) {
    await rm5(temporaryPath, { force: true }).catch(() => void 0);
    throw error;
  }
}

// src/service/kb/import-write.ts
async function ingestPrepared(args, name2, sourceRelativePath, failed, prepared, currentBytes) {
  if (prepared.byteLength > args.maxFileBytes) {
    return failed("file_too_large", `\u5355\u6587\u4EF6\u8D85\u8FC7 ${args.maxFileBytes} \u5B57\u8282`);
  }
  if (currentBytes + prepared.byteLength > args.maxKbBytes) {
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
  if (!prepared.outputName || basename4(prepared.outputName) !== prepared.outputName) {
    return failed("io_failed", "\u8F6C\u6362\u4EA7\u7269\u540D\u65E0\u6548");
  }
  const intendedPath = join9(args.destinationAbsolute, outputRelativePath(sourceRelativePath, name2, prepared.outputName));
  assertInside(args.kbRoot, intendedPath);
  assertNoSymlinkEscape(args.kbRoot, dirname5(intendedPath));
  await mkdir5(dirname5(intendedPath), { recursive: true });
  let destinationPath = intendedPath;
  let status = "copied";
  if (existsSync4(destinationPath)) {
    destinationPath = join9(dirname5(intendedPath), uniqueName(dirname5(intendedPath), basename4(intendedPath)));
    status = "renamed";
  }
  const writtenBytes = await writePreparedEntry(destinationPath, prepared);
  const relativeDestinationPath = relative5(args.kbRoot, destinationPath).split(sep5).join("/");
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

// src/service/kb/import.ts
async function importFiles(catalogRepository, dataRoot, input) {
  await requireKb(catalogRepository, dataRoot, input.kbId);
  const catalog = await catalogRepository.read(dataRoot);
  const source = expandUserPath(input.sourcePath);
  if (!existsSync5(source)) throw new KbError("not_found", missingSourceMessage(input.sourcePath));
  const destination = resolveDest(dataRoot, input.kbId, input.destCategory);
  const kbRoot = kbDir(dataRoot, input.kbId);
  assertInside(kbRoot, destination.absolute);
  const createMissing = input.createMissing !== false;
  const preserveTree = Boolean(input.preserveTree);
  if (createMissing) await mkdir6(destination.absolute, { recursive: true });
  else if (!existsSync5(destination.absolute)) {
    throw new KbError("not_found", `\u7C7B\u76EE\u4E0D\u5B58\u5728\uFF1A${destination.relative || "(\u5E93\u6839)"}`);
  }
  const hashes = await existingHashes(kbRoot);
  const currentBytes = await dirSize(kbRoot);
  const createdDirs = /* @__PURE__ */ new Set();
  if (createMissing && destination.relative) createdDirs.add(destination.relative);
  const sourceInfo = await stat7(source);
  const sourceRoot = sourceInfo.isDirectory() ? source : dirname6(source);
  const files = await walkSource(source);
  const result = {
    kbId: input.kbId,
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
      kbRoot,
      hashes,
      maxFileBytes: catalog.prefs.maxFileBytes,
      maxKbBytes: catalog.prefs.maxKbBytes,
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
        if (fileResult.relPath.includes("/")) createdDirs.add(dirname6(fileResult.relPath).split(sep6).join("/"));
        addedBytes += fileResult.writtenBytes ?? 0;
      }
    }
  }
  result.createdDirs = [...createdDirs].filter(Boolean);
  await rememberLastDestinationCategory(catalogRepository, dataRoot, input.kbId, destination.relative);
  return result;
}
async function ingestOne(args) {
  const name2 = basename5(args.file);
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
      if (isImportFailureCode(error.code)) return [failed(error.code, error.message)];
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

// src/service/kb/import-drop.ts
function sanitizeDroppedFileName(name2) {
  const base = name2.trim().split(/[\\/]/).pop() ?? "";
  if (!base || base === "." || base === ".." || base.includes("\0")) {
    throw new KbError("invalid_field", "\u62D6\u5165\u6587\u4EF6\u540D\u65E0\u6548");
  }
  return base;
}
async function importDroppedBytes(catalogRepository, dataRoot, input) {
  const fileName = sanitizeDroppedFileName(input.fileName);
  if (input.bytes.length === 0) throw new KbError("invalid_field", "\u62D6\u5165\u6587\u4EF6\u662F\u7A7A\u7684");
  const tempDir = await mkdtemp(join10(tmpdir(), "zy-drop-"));
  const sourcePath = join10(tempDir, fileName);
  try {
    await writeFile5(sourcePath, input.bytes, { flag: "wx" });
    return await importFiles(catalogRepository, dataRoot, createImportFromPathRequest({
      kbId: input.kbId,
      sourcePath,
      destCategory: input.destCategory,
      preserveTree: input.preserveTree,
      createMissing: input.createMissing
    }));
  } finally {
    await rm6(tempDir, { recursive: true, force: true });
  }
}

// src/service/kb/import-service.ts
function enqueueKnowledgeImport(catalogRepository, dataRoot, jobs, requestFactory) {
  return jobs.enqueue("import", () => {
    const request = requestFactory();
    return "bytes" in request ? importDroppedBytes(catalogRepository, dataRoot, request) : importFiles(catalogRepository, dataRoot, request);
  });
}

// src/service/kb/preferences.ts
var MAX_PREF_FILE_BYTES = 1024 * 1024 * 1024;
var MAX_PREF_KB_BYTES = 10 * 1024 * 1024 * 1024 * 1024;
async function getPreferences(catalogRepository, dataRoot) {
  return (await catalogRepository.read(dataRoot)).prefs;
}
async function updatePreferences(catalogRepository, dataRoot, patch) {
  return catalogRepository.withTransaction(dataRoot, async ({ catalog }) => {
    const nextPrefs = {
      defaultKbId: patch.defaultKbId ?? catalog.prefs.defaultKbId,
      maxFileBytes: patch.maxFileBytes ?? catalog.prefs.maxFileBytes,
      maxKbBytes: patch.maxKbBytes ?? catalog.prefs.maxKbBytes
    };
    if (nextPrefs.maxFileBytes > MAX_PREF_FILE_BYTES || nextPrefs.maxKbBytes > MAX_PREF_KB_BYTES) {
      throw new KbError("quota", "\u504F\u597D\u989D\u5EA6\u8D85\u51FA\u5141\u8BB8\u8303\u56F4");
    }
    if (nextPrefs.maxFileBytes > nextPrefs.maxKbBytes) {
      throw new KbError("quota", "\u5355\u6587\u4EF6\u4E0A\u9650\u4E0D\u80FD\u5927\u4E8E\u5355\u5E93\u4E0A\u9650");
    }
    if (nextPrefs.defaultKbId) {
      const hasCatalogKb = catalog.kbs.some((card) => card.id === nextPrefs.defaultKbId);
      const hasKbDirectory = await directoryExists(kbDir(dataRoot, nextPrefs.defaultKbId));
      if (!hasCatalogKb && !hasKbDirectory) {
        throw new KbError("kb_missing", `\u77E5\u8BC6\u5E93 ${nextPrefs.defaultKbId} \u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u5EFA\u5E93`);
      }
    }
    catalog.prefs = nextPrefs;
    return { result: catalog.prefs, catalog };
  });
}

// src/service/search/pagination.ts
function encodeSearchCursor(payload) {
  if (!isValidPayload(payload)) throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u4F4D\u7F6E\u65E0\u6548");
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  if (encoded.length > SEARCH_CURSOR_MAX_LENGTH) throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u8FC7\u957F");
  return encoded;
}
function decodeSearchCursor(cursor) {
  if (!cursor || cursor.length > SEARCH_CURSOR_MAX_LENGTH || !/^[A-Za-z0-9_-]+$/u.test(cursor)) {
    throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u6267\u884C\u9996\u6B21\u68C0\u7D22\u5E76\u539F\u6837\u4F7F\u7528\u8FD4\u56DE\u7684 cursor");
  }
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const value = JSON.parse(decoded);
    if (!isValidPayload(value)) throw new Error("invalid cursor");
    return value;
  } catch {
    throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u65E0\u6548\u6216\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u6267\u884C\u9996\u6B21\u68C0\u7D22\u5E76\u539F\u6837\u4F7F\u7528\u8FD4\u56DE\u7684 cursor");
  }
}
function cursorQueryFromSearch(query, kbId, category, path) {
  return {
    kbId,
    terms: [...query.terms],
    aliases: [...query.aliases],
    ...category ? { category } : {},
    ...path ? { path } : {}
  };
}
function isValidPayload(value) {
  const record = asRecord7(value);
  if (!record || record.version !== 4 || record.scope !== "files" && record.scope !== "hits") return false;
  const query = asRecord7(record.query);
  if (!query || typeof query.kbId !== "string" || !query.kbId.trim() || !isStringArray(query.terms) || !query.terms.length || !isStringArray(query.aliases)) return false;
  if (query.category !== void 0 && (typeof query.category !== "string" || !query.category.trim())) return false;
  if (record.scope === "files") {
    if (query.path !== void 0) return false;
    const position2 = asRecord7(record.position);
    return position2 !== null && isNonNegativeInteger(position2.fileIndex) && Object.keys(position2).every((key) => key === "fileIndex");
  }
  if (typeof query.path !== "string" || !query.path.trim()) return false;
  const position = asRecord7(record.position);
  return position !== null && isNonNegativeInteger(position.hitIndex) && Object.keys(position).every((key) => key === "hitIndex");
}
function asRecord7(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && Boolean(item.trim()));
}
function isNonNegativeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

// src/service/search/file-search.ts
import { join as join11 } from "node:path";

// src/service/search/file-summary.ts
function groupMatchesByFile(positions) {
  const byFile = /* @__PURE__ */ new Map();
  for (const position of positions) {
    const group = byFile.get(position.path);
    const match = { line: position.line, columnByte: position.columnByte };
    if (group) group.push(match);
    else byFile.set(position.path, [match]);
  }
  const groups = [...byFile.entries()].map(([path, matches]) => ({ path, matches }));
  groups.sort((left, right) => right.matches.length - left.matches.length || left.path.localeCompare(right.path));
  for (const group of groups) group.matches.sort((left, right) => left.line - right.line || left.columnByte - right.columnByte);
  return groups;
}
function summarizeFileGroups(groups) {
  return groups.flatMap((group) => {
    const format = contentRegistry.entryFormatForPath(group.path);
    if (!format) return [];
    return [{ path: group.path, format, totalHits: group.matches.length }];
  });
}
function canMergeWindows(previous, next, allowNeighbors) {
  return next.startLine <= previous.endLine + (allowNeighbors ? 1 : 0);
}

// src/service/search/file-search.ts
async function searchFileDetail(scope, hitIndex, limit, scanner) {
  if (!scope.path || !scope.format) throw new Error("\u6587\u4EF6\u8BE6\u60C5\u7F3A\u5C11\u76EE\u6807\u8DEF\u5F84");
  const scan = await scanner.scan({
    rootDir: scope.rootDir,
    terms: scope.query.terms,
    targetPath: scope.path,
    perFileMatchLimit: "unlimited"
  });
  const group = groupMatchesByFile(scan.matches).find((item) => item.path === scope.path);
  const matches = group?.matches ?? [];
  const warnings = [...scan.warnings];
  let document;
  if (matches.length) {
    const absolutePath = assertInside(scope.rootDir, join11(scope.rootDir, ...scope.path.split("/")));
    assertNoSymlinkEscape(scope.rootDir, absolutePath);
    document = await contentRegistry.readForSearch({ absolutePath, relativePath: scope.path });
    for (const warning of document.warnings ?? []) if (!warnings.includes(warning)) warnings.push(warning);
  }
  const built = document && group ? buildHits(group, hitIndex, document, scope.format, limit) : { hits: [], includedCount: 0 };
  const hasMore = scan.complete && built.includedCount < built.hits.length;
  const hits = built.hits.slice(0, built.includedCount).map((item) => item.hit);
  const result = {
    kind: "file-detail",
    scope: "hits",
    kbId: scope.kbId,
    ...scope.category ? { category: scope.category } : {},
    query: scope.query,
    path: scope.path,
    format: scope.format,
    totalHits: matches.length,
    ...document?.groupHeader === void 0 ? {} : { groupHeader: document.groupHeader },
    hits,
    page: { scope: "hits", returnedHits: hits.length, hasMore },
    scan: {
      complete: scan.complete,
      warnings,
      ...scan.stopReason ? { stopReason: scan.stopReason } : {}
    },
    presentation: { template: "search-file-detail-card", version: 1 }
  };
  return {
    result,
    ...hasMore && built.nextRawIndex !== void 0 ? { nextHitIndex: built.nextRawIndex } : {}
  };
}
function buildHits(group, startIndex, document, format, limit) {
  const radius = format === "csv" ? SEARCH_LIST_CONTEXT : SEARCH_CONTEXT;
  const built = [];
  for (let rawIndex = Math.min(Math.max(startIndex, 0), group.matches.length); rawIndex < group.matches.length; rawIndex += 1) {
    const match = group.matches[rawIndex];
    const excerpt = document.excerptAt(match.line, radius);
    const previous = built.at(-1);
    if (previous && canMergeWindows(previous.hit, excerpt, document.mergeNeighbors !== false)) {
      const startLine = Math.min(previous.hit.startLine, excerpt.startLine);
      const endLine = Math.max(previous.hit.endLine, excerpt.endLine);
      previous.hit.excerpt = document.mergeExcerpt(
        { startLine: previous.hit.startLine, endLine: previous.hit.endLine, excerpt: previous.hit.excerpt },
        { startLine: excerpt.startLine, endLine: excerpt.endLine, excerpt: excerpt.excerpt },
        startLine,
        endLine
      );
      previous.hit.startLine = startLine;
      previous.hit.endLine = endLine;
      continue;
    }
    built.push({
      firstRawIndex: rawIndex,
      hit: {
        n: rawIndex + 1,
        path: group.path,
        startLine: excerpt.startLine,
        endLine: excerpt.endLine,
        matchLine: Math.min(Math.max(match.line, excerpt.startLine), excerpt.endLine),
        excerpt: excerpt.excerpt,
        ...excerpt.matchedExcerpt === void 0 ? {} : { matchedExcerpt: excerpt.matchedExcerpt },
        matchColumnByte: document.normalizeColumnByte(match.line, match.columnByte),
        sourceFingerprint: document.fingerprint
      }
    });
  }
  let usedChars = 0;
  let includedCount = 0;
  for (let index = 0; index < built.length && includedCount < limit; index += 1) {
    const item = built[index];
    const cost = 60 + item.hit.excerpt.length + (index === 0 ? group.path.length + (document.groupHeader?.length ?? 0) : 0);
    if (includedCount > 0 && usedChars + cost > SEARCH_PAGE_MAX_CHARS) break;
    usedChars += cost;
    includedCount += 1;
  }
  return {
    hits: built,
    includedCount,
    ...includedCount < built.length ? { nextRawIndex: built[includedCount].firstRawIndex } : {}
  };
}

// src/service/search/overview-search.ts
async function searchOverview(scope, fileIndex, limit, scanner) {
  const scan = await scanner.scan({
    rootDir: scope.rootDir,
    terms: scope.query.terms,
    ...scope.category ? { targetPath: scope.category } : {}
  });
  const groups = groupMatchesByFile(scan.matches);
  const files = summarizeFileGroups(groups);
  const totalHits = files.reduce((sum, file) => sum + file.totalHits, 0);
  const startIndex = Math.min(Math.max(fileIndex, 0), files.length);
  const pageFiles = files.slice(startIndex, startIndex + limit);
  const hasMore = scan.complete && startIndex + pageFiles.length < files.length;
  const result = {
    kind: "overview",
    scope: "files",
    kbId: scope.kbId,
    ...scope.category ? { category: scope.category } : {},
    query: scope.query,
    files: pageFiles,
    totalFiles: files.length,
    totalHits,
    page: { scope: "files", returnedFiles: pageFiles.length, hasMore },
    scan: {
      complete: scan.complete,
      warnings: [...scan.warnings],
      ...scan.stopReason ? { stopReason: scan.stopReason } : {}
    },
    presentation: { template: "search-overview-card", version: 1 }
  };
  return {
    result,
    ...hasMore ? { nextFileIndex: startIndex + pageFiles.length } : {}
  };
}

// src/service/search/search-input.ts
function asRecord8(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function hasOwn2(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}
function requiredString(record, key) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) throw new KbError("missing_field", `${key} \u5FC5\u586B`);
  return value.trim();
}
function optionalString2(record, key) {
  const value = record[key];
  if (!hasOwn2(record, key) || value === void 0) return void 0;
  if (typeof value !== "string") throw new KbError("invalid_field", `${key} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32`);
  return value;
}
function normalizeSearchLimit(value) {
  if (value === void 0) return SEARCH_DEFAULT_LIMIT;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > SEARCH_MAX_LIMIT) {
    throw new KbError("invalid_field", `limit \u5FC5\u987B\u662F 1 \u5230 ${SEARCH_MAX_LIMIT} \u4E4B\u95F4\u7684\u6574\u6570`);
  }
  return value;
}
function normalizeSearchPatterns(query, aliases) {
  if (typeof query !== "string" || !query.trim()) throw new KbError("missing_field", "query \u5FC5\u586B");
  if (aliases !== void 0 && (!Array.isArray(aliases) || aliases.some((item) => typeof item !== "string"))) {
    throw new KbError("invalid_field", "aliases \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
  }
  const normalizedQuery = query.trim();
  const rawAliases = aliases ?? [];
  if (rawAliases.length > MAX_ALIASES) throw new KbError("invalid_field", `aliases \u4E0D\u80FD\u8D85\u8FC7 ${MAX_ALIASES} \u4E2A`);
  const normalizedAliases = [];
  const seen = /* @__PURE__ */ new Set([normalizedQuery]);
  for (const rawAlias of rawAliases) {
    const alias = rawAlias.trim();
    if (!alias) throw new KbError("invalid_field", "aliases \u4E0D\u80FD\u5305\u542B\u7A7A\u6B63\u5219");
    validatePattern(alias);
    if (!seen.has(alias)) {
      seen.add(alias);
      normalizedAliases.push(alias);
    }
  }
  validatePattern(normalizedQuery);
  const terms = [normalizedQuery, ...normalizedAliases];
  const totalLength = terms.reduce((sum, term) => sum + term.length, 0);
  if (totalLength > SEARCH_MAX_PATTERN_TOTAL_LENGTH) {
    throw new KbError("invalid_field", `\u6B63\u5219\u8868\u8FBE\u5F0F\u603B\u957F\u5EA6\u4E0D\u80FD\u8D85\u8FC7 ${SEARCH_MAX_PATTERN_TOTAL_LENGTH}`);
  }
  return { terms, aliases: normalizedAliases };
}
function normalizeCursorQuery(query) {
  if (!query || typeof query !== "object" || !Array.isArray(query.terms) || !Array.isArray(query.aliases)) {
    throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u4E2D\u7684\u67E5\u8BE2\u6761\u4EF6\u65E0\u6548");
  }
  if (!query.terms.length || query.terms.some((term) => typeof term !== "string" || !term.trim())) {
    throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u4E2D\u7684\u6B63\u5219\u8868\u8FBE\u5F0F\u65E0\u6548");
  }
  const normalizedTerms = query.terms.map((term) => term.trim());
  const normalizedAliases = query.aliases.map((alias) => alias.trim());
  if (normalizedTerms.length !== normalizedAliases.length + 1 || normalizedTerms[0] !== normalizedTerms[0].trim()) {
    throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u4E2D\u7684\u67E5\u8BE2\u6761\u4EF6\u65E0\u6548");
  }
  const normalized = normalizeSearchPatterns(normalizedTerms[0], normalizedAliases);
  if (normalized.terms.length !== normalizedTerms.length || normalized.terms.some((term, index) => term !== normalizedTerms[index])) {
    throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u4E2D\u7684\u67E5\u8BE2\u6761\u4EF6\u65E0\u6548");
  }
  return normalized;
}
function normalizeSearchRequest(input) {
  const record = asRecord8(input);
  if (!record) throw new KbError("invalid_field", "\u641C\u7D22\u8BF7\u6C42\u5FC5\u987B\u662F\u5BF9\u8C61");
  const cursorValue = record.cursor;
  if (cursorValue !== void 0) {
    if (typeof cursorValue !== "string" || !cursorValue.trim()) throw new KbError("invalid_field", "cursor \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
    if (["kbId", "query", "aliases", "category", "path"].some((key) => hasOwn2(record, key))) {
      throw new KbError("invalid_field", "\u7EED\u9875\u8BF7\u6C42\u53EA\u80FD\u5305\u542B cursor \u548C limit");
    }
    return { mode: "continue", cursor: cursorValue.trim(), limit: normalizeSearchLimit(record.limit) };
  }
  return {
    mode: "initial",
    kbId: requiredString(record, "kbId"),
    query: normalizeSearchPatterns(record.query, record.aliases),
    category: normalizeOptionalCategory(optionalString2(record, "category")),
    path: normalizeOptionalPath(optionalString2(record, "path")),
    limit: normalizeSearchLimit(record.limit)
  };
}
function normalizeOptionalCategory(category) {
  const normalized = category?.trim();
  return normalized || void 0;
}
function normalizeOptionalPath(path) {
  if (path === void 0) return void 0;
  if (!path.trim()) throw new KbError("invalid_field", "path \u4E0D\u80FD\u662F\u7A7A\u5B57\u7B26\u4E32");
  return path.trim();
}
function validatePattern(pattern) {
  if (pattern.length > SEARCH_MAX_PATTERN_LENGTH) {
    throw new KbError("invalid_field", `\u5355\u4E2A\u6B63\u5219\u8868\u8FBE\u5F0F\u4E0D\u80FD\u8D85\u8FC7 ${SEARCH_MAX_PATTERN_LENGTH} \u4E2A\u5B57\u7B26`);
  }
  const javascriptPattern = pattern.replace(/^\(\?[imsU-]+\)/u, "");
  try {
    new RegExp(javascriptPattern, "u");
  } catch {
    throw new KbError("invalid_field", "query \u6216 aliases \u5305\u542B\u65E0\u6548\u6B63\u5219\u8868\u8FBE\u5F0F");
  }
  if (/\(\?([=!]|<[=!])|\\\d/u.test(pattern)) {
    throw new KbError("invalid_field", SEARCH_UNSUPPORTED_PATTERN_MESSAGE);
  }
}

// src/service/search/search-scope.ts
import { existsSync as existsSync6, statSync } from "node:fs";
import { isAbsolute as isAbsolute3, join as join12, relative as relative6, sep as sep7 } from "node:path";
async function resolveSearchScope(dataRoot, input) {
  const rootDir = kbDir(dataRoot, input.kbId);
  const category = resolveCategory(rootDir, dataRoot, input.kbId, input.category);
  const categoryRoot = category ? resolveDest(dataRoot, input.kbId, category).absolute : rootDir;
  const path = input.path === void 0 ? void 0 : resolveKnowledgePath(rootDir, categoryRoot, input.path);
  const format = path ? contentRegistry.entryFormatForPath(path) : void 0;
  if (path && !format) throw new KbError("ext_denied", "path \u4E0D\u662F\u77E5\u8BC6\u5E93\u652F\u6301\u7684\u6587\u4EF6\u683C\u5F0F");
  return {
    kbId: input.kbId,
    rootDir,
    query: input.query,
    ...category ? { category } : {},
    categoryRoot,
    ...path ? { path } : {},
    ...format ? { format } : {}
  };
}
function resolveCategory(rootDir, dataRoot, kbId, category) {
  if (!category) return void 0;
  const destination = resolveDest(dataRoot, kbId, category);
  assertNoSymlinkEscape(rootDir, destination.absolute);
  if (!existsSync6(destination.absolute) || !statSync(destination.absolute).isDirectory()) {
    throw new KbError("not_found", `\u7C7B\u76EE\u4E0D\u5B58\u5728\uFF1A${destination.relative || category}`);
  }
  return destination.relative;
}
function resolveKnowledgePath(rootDir, categoryRoot, inputPath) {
  const path = inputPath.trim();
  if (!path || path.includes("\\") || path.includes("\0") || path.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(path)) {
    throw new KbError("invalid_field", "path \u5FC5\u987B\u662F\u77E5\u8BC6\u5E93\u6839\u76EE\u5F55\u4E0B\u7684 POSIX \u76F8\u5BF9\u8DEF\u5F84");
  }
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new KbError("path_escape", "path \u4E0D\u80FD\u5305\u542B .\u3001.. \u6216\u7A7A\u8DEF\u5F84\u6BB5");
  }
  if (isAbsolute3(path)) throw new KbError("invalid_field", "path \u5FC5\u987B\u662F\u77E5\u8BC6\u5E93\u6839\u76EE\u5F55\u4E0B\u7684 POSIX \u76F8\u5BF9\u8DEF\u5F84");
  const absolutePath = assertInside(rootDir, join12(rootDir, ...segments));
  const normalizedPath = relative6(rootDir, absolutePath).split(sep7).join("/");
  if (normalizedPath !== path) throw new KbError("invalid_field", "path \u4E0D\u662F\u89C4\u8303\u7684\u77E5\u8BC6\u5E93\u76F8\u5BF9\u8DEF\u5F84");
  assertInside(categoryRoot, absolutePath);
  assertNoSymlinkEscape(rootDir, absolutePath);
  if (!existsSync6(absolutePath)) throw new KbError("not_found", `\u6587\u4EF6\u4E0D\u5B58\u5728\uFF1A${path}`);
  if (!statSync(absolutePath).isFile()) throw new KbError("invalid_field", "path \u5FC5\u987B\u6307\u5411\u6587\u4EF6");
  return normalizedPath;
}

// src/service/search/scanner/ripgrep-scanner.ts
import { spawn } from "node:child_process";
import { existsSync as existsSync7 } from "node:fs";
import { isAbsolute as isAbsolute4, join as join13, relative as relative7, sep as sep8 } from "node:path";
var RipgrepScanner = class {
  async scan(input) {
    const binaryPath = await resolveRg();
    const perFileMatchLimit = input.perFileMatchLimit ?? SEARCH_RG_MAX_COUNT_PER_FILE;
    const run = await runRg(binaryPath, buildArguments(input.terms, input.targetPath, perFileMatchLimit), input.rootDir);
    const matches = parseRg(run.stdout, input.rootDir);
    const matchesByFile = /* @__PURE__ */ new Map();
    for (const match of matches) matchesByFile.set(match.path, (matchesByFile.get(match.path) ?? 0) + 1);
    const perFileTruncated = perFileMatchLimit !== "unlimited" && [...matchesByFile.values()].some((count) => count > perFileMatchLimit);
    if (perFileTruncated) {
      run.warnings.push("\u5355\u4E2A\u6587\u4EF6\u547D\u4E2D\u8D85\u8FC7\u626B\u63CF\u4E0A\u9650\uFF0C\u7ED3\u679C\u53EF\u80FD\u4E0D\u5B8C\u6574");
      run.complete = false;
      run.stopReason = "per-file-match-limit";
    }
    return { matches, warnings: run.warnings, complete: run.complete, ...run.stopReason ? { stopReason: run.stopReason } : {} };
  }
};
function createRipgrepScanner() {
  return new RipgrepScanner();
}
function buildArguments(terms, targetPath, perFileMatchLimit) {
  const matchLimitArguments = perFileMatchLimit === "unlimited" ? [] : ["--max-count", String(perFileMatchLimit + 1)];
  const args = [
    "--json",
    "--column",
    "--glob-case-insensitive",
    ...matchLimitArguments,
    "--max-filesize",
    SEARCH_RG_MAX_FILESIZE
  ];
  for (const glob of contentRegistry.searchGlobs()) args.push("--glob", glob);
  for (const term of terms) args.push("-e", term);
  args.push("--", targetPath ?? ".");
  return args;
}
function runRg(binaryPath, args, workingDirectory) {
  return new Promise((resolve2, reject) => {
    const child = spawn(binaryPath, args, { cwd: workingDirectory, windowsHide: true });
    const stdoutChunks = [];
    let stdoutBytes = 0;
    let stderr = "";
    let stopReason;
    const timer = setTimeout(() => {
      stopReason = "timeout";
      child.kill("SIGKILL");
    }, SEARCH_RG_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stdoutChunks.push(buffer);
      stdoutBytes += buffer.length;
      if (stdoutBytes > SEARCH_RG_MAX_STDOUT_BYTES && !stopReason) {
        stopReason = "stdout-limit";
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
      const stdout = Buffer.concat(stdoutChunks, stdoutBytes).toString("utf8");
      if (stopReason) {
        resolve2({ stdout, warnings: stopReason === "timeout" ? ["\u68C0\u7D22\u8D85\u65F6\uFF0C\u5DF2\u8FD4\u56DE\u90E8\u5206\u7ED3\u679C"] : ["\u68C0\u7D22\u7ED3\u679C\u8FC7\u591A\uFF0C\u5DF2\u622A\u65AD"], complete: false, stopReason });
        return;
      }
      if (code === 0 || code === 1) {
        resolve2({ stdout, warnings: [], complete: true });
        return;
      }
      if (code === 2 && isRipgrepPatternError(stderr)) {
        reject(new KbError("invalid_field", SEARCH_UNSUPPORTED_PATTERN_MESSAGE));
        return;
      }
      const detail = stderr.trim();
      resolve2({ stdout, warnings: [detail ? `\u68C0\u7D22\u5931\u8D25\uFF1A${detail}` : "\u68C0\u7D22\u5931\u8D25"], complete: false, stopReason: "io-error" });
    });
  });
}
function isRipgrepPatternError(stderr) {
  return /regex parse error|look-around|backreference|regular expression/iu.test(stderr);
}
function parseRg(stdout, rootDir) {
  const matches = [];
  for (const rawLine of stdout.split(/\r?\n/u)) {
    if (!rawLine.trim()) continue;
    let value;
    try {
      value = JSON.parse(rawLine);
    } catch {
      continue;
    }
    const record = asRecord9(value);
    if (record?.type !== "match") continue;
    const data = asRecord9(record.data);
    const pathData = asRecord9(data?.path);
    const printedPath = typeof pathData?.text === "string" ? pathData.text : "";
    const line = typeof data?.line_number === "number" ? data.line_number : 0;
    const submatches = Array.isArray(data?.submatches) ? data.submatches : [];
    const firstSubmatch = asRecord9(submatches[0]);
    const columnByte = typeof firstSubmatch?.start === "number" ? firstSubmatch.start + 1 : 0;
    if (!printedPath || !Number.isSafeInteger(line) || line < 1 || !Number.isSafeInteger(columnByte) || columnByte < 1) continue;
    const absolutePath = isAbsolute4(printedPath) ? printedPath : join13(rootDir, printedPath);
    const relativePath = relative7(rootDir, absolutePath).split(sep8).join("/");
    if (relativePath && relativePath !== ".." && !relativePath.startsWith("../")) {
      matches.push({ path: relativePath, line, columnByte });
    }
  }
  return matches;
}
async function resolveRg() {
  const mod = await import("@vscode/ripgrep");
  const ripgrepPath = mod.rgPath;
  if (!ripgrepPath || !existsSync7(ripgrepPath)) throw new Error("\u627E\u4E0D\u5230\u6253\u5305\u7684 ripgrep");
  return ripgrepPath;
}
function asRecord9(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

// src/service/search/index.ts
async function searchKb(dataRoot, input, kbAccess, scanner = createRipgrepScanner()) {
  const request = normalizeSearchRequest(input);
  const result = request.mode === "initial" ? await searchInitial(dataRoot, request, kbAccess, scanner) : await searchContinue(dataRoot, request.cursor, request.limit, kbAccess, scanner);
  await kbAccess.markKbUsed(result.kbId);
  return result;
}
async function searchInitial(dataRoot, request, kbAccess, scanner) {
  await kbAccess.ensureKb(request.kbId);
  const scope = await resolveSearchScope(dataRoot, {
    kbId: request.kbId,
    query: request.query,
    category: request.category,
    path: request.path
  });
  if (scope.path) {
    const output2 = await searchFileDetail(scope, 0, request.limit, scanner);
    return addDetailCursor(output2.result, output2.nextHitIndex);
  }
  const output = await searchOverview(scope, 0, request.limit, scanner);
  return addOverviewCursor(output.result, output.nextFileIndex);
}
async function searchContinue(dataRoot, cursor, limit, kbAccess, scanner) {
  const payload = decodeSearchCursor(cursor);
  await kbAccess.ensureKb(payload.query.kbId);
  const query = normalizeCursorQuery(payload.query);
  if (payload.scope === "files") {
    const scope2 = await resolveSearchScope(dataRoot, { kbId: payload.query.kbId, query, category: payload.query.category });
    const output2 = await searchOverview(scope2, payload.position.fileIndex, limit, scanner);
    return addOverviewCursor(output2.result, output2.nextFileIndex);
  }
  if (!payload.query.path) throw new KbError("invalid_field", "\u641C\u7D22\u6E38\u6807\u7F3A\u5C11\u6587\u4EF6\u8DEF\u5F84");
  const scope = await resolveSearchScope(dataRoot, {
    kbId: payload.query.kbId,
    query,
    category: payload.query.category,
    path: payload.query.path
  });
  const output = await searchFileDetail(scope, payload.position.hitIndex, limit, scanner);
  return addDetailCursor(output.result, output.nextHitIndex);
}
function addOverviewCursor(result, nextFileIndex) {
  if (!result.page.hasMore || nextFileIndex === void 0) return result;
  const cursor = encodeSearchCursor({
    version: 4,
    scope: "files",
    query: cursorQueryFromSearch(result.query, result.kbId, result.category),
    position: { fileIndex: nextFileIndex }
  });
  return { ...result, page: { ...result.page, nextCursor: cursor } };
}
function addDetailCursor(result, nextHitIndex) {
  if (!result.page.hasMore || nextHitIndex === void 0) return result;
  const cursor = encodeSearchCursor({
    version: 4,
    scope: "hits",
    query: cursorQueryFromSearch(result.query, result.kbId, result.category, result.path),
    position: { hitIndex: nextHitIndex }
  });
  return { ...result, page: { ...result.page, nextCursor: cursor } };
}

// src/service/search/knowledge-search.ts
async function searchKb2(dataRoot, input, kbAccess) {
  return searchKb(dataRoot, input, kbAccess);
}

// src/service/kb/knowledge-services.ts
function createSearchKbAccess(catalogRepository, dataRoot) {
  return {
    ensureKb: (kbId) => requireKb(catalogRepository, dataRoot, kbId),
    markKbUsed: (kbId) => markKbUsed(catalogRepository, dataRoot, kbId)
  };
}
function createKnowledgeServices(catalogRepository) {
  return {
    createKb: (dataRoot, input) => createKb(catalogRepository, dataRoot, input),
    updateKb: (dataRoot, kbId, patch) => updateKb(catalogRepository, dataRoot, kbId, patch),
    deleteKb: (dataRoot, kbId, confirm) => deleteKb(catalogRepository, dataRoot, kbId, confirm),
    markKbUsed: (dataRoot, kbId) => markKbUsed(catalogRepository, dataRoot, kbId),
    requireKb: (dataRoot, kbId) => requireKb(catalogRepository, dataRoot, kbId),
    listKbs: (dataRoot) => listKbs(catalogRepository, dataRoot),
    listTree: (dataRoot, kbId) => listTree(catalogRepository, dataRoot, kbId),
    readEntry: (dataRoot, kbId, relativePath, options) => readEntry(catalogRepository, dataRoot, kbId, relativePath, options),
    writeEntryContent: (dataRoot, kbId, relativePath, change) => writeEntryContent(catalogRepository, dataRoot, kbId, relativePath, change),
    readEntryPage: (dataRoot, kbId, relativePath, startRow, pageSize2) => readEntryPage(catalogRepository, dataRoot, kbId, relativePath, startRow, pageSize2),
    deleteEntry: (dataRoot, kbId, relativePath, confirm) => deleteEntry(catalogRepository, dataRoot, kbId, relativePath, confirm),
    importFiles: (dataRoot, input) => importFiles(catalogRepository, dataRoot, input),
    importDroppedBytes: (dataRoot, input) => importDroppedBytes(catalogRepository, dataRoot, input),
    enqueueKnowledgeImport: (dataRoot, jobs, requestFactory) => enqueueKnowledgeImport(catalogRepository, dataRoot, jobs, requestFactory),
    getLastDestinationCategory: (dataRoot, kbId) => getLastDestinationCategory(catalogRepository, dataRoot, kbId),
    resolveImportTo: (dataRoot, kbId, destinationCategoryFlag, importToKbRoot) => resolveImportDestination(catalogRepository, dataRoot, kbId, destinationCategoryFlag, importToKbRoot),
    getPreferences: (dataRoot) => getPreferences(catalogRepository, dataRoot),
    updatePreferences: (dataRoot, patch) => updatePreferences(catalogRepository, dataRoot, patch),
    searchKb: (dataRoot, input) => searchKb2(dataRoot, input, createSearchKbAccess(catalogRepository, dataRoot))
  };
}

// src/skills/skill.ts
import { readFileSync } from "node:fs";
var SKILL_RESOURCE_PATH = "skills/zhiyuan-kb/SKILL.md";
var SKILL_RESOURCE_URLS = [
  new URL("./zhiyuan-kb/SKILL.md", import.meta.url),
  new URL("./skills/zhiyuan-kb/SKILL.md", import.meta.url)
];
var SYSTEM_PROMPT_START = "<!-- dsh:system-prompt:start -->";
var SYSTEM_PROMPT_END = "<!-- dsh:system-prompt:end -->";
function loadSkillContent() {
  for (const resourceUrl of SKILL_RESOURCE_URLS) {
    const content = readSkillResource(resourceUrl);
    if (content === void 0) continue;
    if (!content.trim()) throw new Error(`\u77E5\u6E90 Skill \u6587\u4EF6\u4E3A\u7A7A\uFF1A${SKILL_RESOURCE_PATH}`);
    return content;
  }
  throw new Error(`\u65E0\u6CD5\u8BFB\u53D6\u77E5\u6E90 Skill \u6587\u4EF6\uFF1A${SKILL_RESOURCE_PATH}`);
}
function readSkillResource(resourceUrl) {
  try {
    return readFileSync(resourceUrl, "utf8");
  } catch {
    return void 0;
  }
}
function countOccurrences(content, marker) {
  return content.split(marker).length - 1;
}
function extractSystemPrompt(content) {
  if (countOccurrences(content, SYSTEM_PROMPT_START) !== 1 || countOccurrences(content, SYSTEM_PROMPT_END) !== 1) {
    throw new Error(`\u77E5\u6E90 Skill \u7F3A\u5C11\u552F\u4E00\u7684 system prompt \u6807\u8BB0\uFF1A${SKILL_RESOURCE_PATH}`);
  }
  const start = content.indexOf(SYSTEM_PROMPT_START) + SYSTEM_PROMPT_START.length;
  const end = content.indexOf(SYSTEM_PROMPT_END);
  const text2 = content.slice(start, end).trim();
  if (!text2) throw new Error(`\u77E5\u6E90 Skill \u7684 system prompt \u6458\u8981\u4E3A\u7A7A\uFF1A${SKILL_RESOURCE_PATH}`);
  return text2;
}
var SKILL_BODY = loadSkillContent();
var SYSTEM_PROMPT_TEXT = extractSystemPrompt(SKILL_BODY);
var ZHIYUAN_SKILL = {
  name: "zhiyuan-kb",
  description: "\u5728\u7528\u6237\u6307\u5B9A\u7684\u77E5\u8BC6\u5E93\u4E2D\u68C0\u7D22\u539F\u6587\uFF1A\u5148\u7528 kb_search \u83B7\u53D6\u6587\u4EF6 overview\uFF0C\u518D\u7528 query\u3001aliases \u548C path \u83B7\u53D6 file-detail\uFF1B\u672A\u6307\u5B9A\u5E93\u65F6\u5148 kb_list\u3002",
  whenToUse: "\u7528\u6237\u8BE2\u95EE\u5DF2\u5BFC\u5165\u77E5\u8BC6\u5E93\u4E2D\u7684\u4E8B\u5B9E\u3001\u6761\u6B3E\u3001\u7EAA\u8981\uFF0C\u8981\u6C42\u67E5\u627E\u539F\u6587\uFF0C\u6216\u8981\u6C42\u5BFC\u5165\u672C\u673A md/markdown/txt/csv\u3002",
  source: "runtime",
  content: SKILL_BODY
};
var ZHIYUAN_PROMPT_SECTION = {
  name: "zhiyuan:identity",
  order: 170,
  text: SYSTEM_PROMPT_TEXT
};
function registerZhiyuanSkill(ctx) {
  return ctx.skills?.register(ZHIYUAN_SKILL) ?? (() => void 0);
}
function registerZhiyuanPrompt(ctx) {
  return ctx.systemPrompt?.section(ZHIYUAN_PROMPT_SECTION) ?? (() => void 0);
}

// src/index.ts
var name = PACKAGE_NAME;
function apply(ctx) {
  const jobs = createJobRunner();
  const catalogRepository = new FileCatalogRepository({
    onWarning: (message) => ctx.logger?.warn?.(`[zhiyuan] ${message}`)
  });
  const knowledgeServices = createKnowledgeServices(catalogRepository);
  const disposers = [];
  let alive = true;
  const reportCleanupError = (error) => {
    const message = error instanceof Error ? error.message : String(error);
    ctx.logger?.warn?.(`[zhiyuan] cleanup failed: ${message}`);
  };
  const track = (off) => {
    if (typeof off !== "function") return;
    if (!alive) {
      off();
      return;
    }
    disposers.push(off);
  };
  const trackAsync = (off) => {
    if (typeof off !== "function") return;
    const dispose = () => {
      void Promise.resolve().then(off).catch(reportCleanupError);
    };
    if (!alive) {
      dispose();
      return;
    }
    disposers.push(dispose);
  };
  ctx.logger?.info("[zhiyuan] host loaded");
  ctx.inject(["commands"], (scoped) => {
    track(registerKbCommands(scoped, jobs, knowledgeServices));
  });
  ctx.inject(["connection"], (scoped) => {
    trackAsync(registerKnowledgePrivateRpc(scoped, jobs, knowledgeServices));
  });
  ctx.inject(["tools"], (scoped) => {
    track(registerKbTools(scoped, jobs, knowledgeServices));
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
