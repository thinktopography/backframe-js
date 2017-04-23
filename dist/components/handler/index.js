'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderError = exports.runHooks = exports.runAlterRecord = exports.runAlterRequest = exports.buildHandler = exports.expandLifecycle = exports.normalizeOptions = undefined;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _utils = require('../../utils');

var _options = require('../../utils/options');

var _core = require('../../utils/core');

var _response = require('../../utils/response');

var _constants = require('../../constants');

var constants = _interopRequireWildcard(_constants);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

exports.default = function () {
  var backframeOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


  return function () {
    var userOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


    var TYPES = {
      afterHooks: { type: ['function', 'function[]'], required: false },
      alterRequest: { type: ['function', 'function[]'], required: false },
      alterRecord: { type: ['function', 'function[]'], required: false },
      beforeHooks: { type: ['function', 'function[]'], required: false },
      csvResponder: { type: ['function'], required: false },
      jsonResponder: { type: ['function'], required: false },
      processor: { type: 'function', required: true },
      renderer: { type: 'function', required: false },
      responder: { type: 'function', required: false },
      tsvResponder: { type: ['function'], required: false },
      xlsxResponder: { type: ['function'], required: false },
      xmlResponder: { type: ['function'], required: false }
    };

    (0, _options.validateOptions)('handler', userOptions, TYPES);

    var options = normalizeOptions(userOptions, TYPES);

    return buildHandler(options);
  };
};

var normalizeOptions = exports.normalizeOptions = function normalizeOptions(userOptions, types) {

  return expandLifecycle(_extends({}, (0, _options.defaultOptions)(types), {
    responder: (0, _utils.defaultResponder)('Success')(userOptions)
  }, userOptions));
};

var expandLifecycle = exports.expandLifecycle = function expandLifecycle(userOptions) {

  return constants.BACKFRAME_HOOKS.reduce(function (options, hook) {
    return _extends({}, options, _defineProperty({}, hook, (0, _core.coerceArray)(userOptions[hook])));
  }, userOptions);
};

var buildHandler = exports.buildHandler = function buildHandler(components) {
  var alterRequest = components.alterRequest,
      beforeHooks = components.beforeHooks,
      processor = components.processor,
      afterHooks = components.afterHooks,
      renderer = components.renderer,
      alterRecord = components.alterRecord,
      responder = components.responder;


  return function (req, res) {
    var recordTick = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {
      return (0, _bluebird.resolve)();
    };


    return new _bluebird.resolve(req).then(function (req) {
      return runAlterRequest(req, alterRequest);
    }).then(function (req) {
      return recordTick('alterRequest').then(function () {
        return req;
      });
    }).then(function (req) {
      return runHooks(req, beforeHooks).then(function () {
        return req;
      });
    }).then(function (req) {
      return recordTick('beforeHooks').then(function () {
        return req;
      });
    }).then(function (req) {
      return new _bluebird2.default(function (resolve, reject) {
        return processor(req, resolve, reject);
      }).then(function (result) {
        return [req, result];
      });
    }).then(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          req = _ref2[0],
          result = _ref2[1];

      return recordTick('processor').then(function () {
        return [req, result];
      });
    }).then(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
          req = _ref4[0],
          result = _ref4[1];

      return runHooks(req, afterHooks, result).then(function () {
        return [req, result];
      });
    }).then(function (_ref5) {
      var _ref6 = _slicedToArray(_ref5, 2),
          req = _ref6[0],
          result = _ref6[1];

      return recordTick('afterHooks').then(function () {
        return [req, result];
      });
    }).then(function (_ref7) {
      var _ref8 = _slicedToArray(_ref7, 2),
          req = _ref8[0],
          result = _ref8[1];

      return renderer ? new _bluebird2.default(function (resolve, reject) {
        return renderer(req, result, resolve, reject);
      }).then(function (result) {
        return [req, result];
      }) : [req, result];
    }).then(function (_ref9) {
      var _ref10 = _slicedToArray(_ref9, 2),
          req = _ref10[0],
          result = _ref10[1];

      return recordTick('renderer').then(function () {
        return [req, result];
      });
    }).then(function (_ref11) {
      var _ref12 = _slicedToArray(_ref11, 2),
          req = _ref12[0],
          result = _ref12[1];

      return runAlterRecord(req, alterRecord, result).then(function (result) {
        return [req, result];
      });
    }).then(function (_ref13) {
      var _ref14 = _slicedToArray(_ref13, 2),
          req = _ref14[0],
          result = _ref14[1];

      return recordTick('alterRecord').then(function () {
        return [req, result];
      });
    }).then(function (_ref15) {
      var _ref16 = _slicedToArray(_ref15, 2),
          req = _ref16[0],
          result = _ref16[1];

      return new _bluebird2.default(function (resolve, reject) {
        return responder(req, res, result, resolve, reject);
      }).then(function () {
        return [req, result];
      });
    }).then(function (_ref17) {
      var _ref18 = _slicedToArray(_ref17, 2),
          req = _ref18[0],
          result = _ref18[1];

      return recordTick('responder').then(function () {
        return req;
      }).then(function () {
        return [req, result];
      });
    }).then(function (_ref19) {
      var _ref20 = _slicedToArray(_ref19, 2),
          req = _ref20[0],
          result = _ref20[1];

      return result;
    }).catch(function (err) {
      return renderError(res, err);
    });
  };
};

var runAlterRequest = exports.runAlterRequest = function runAlterRequest(req, alterRequest) {

  var runner = function runner(req, operation) {
    return new _bluebird2.default(function (resolve, reject) {
      return operation(req, resolve, reject);
    });
  };

  if (alterRequest.length === 0) return (0, _bluebird.resolve)(req);

  if (alterRequest.length === 1) return runner(req, alterRequest[0]);

  return (0, _bluebird.reduce)(alterRequest, runner, req);
};

var runAlterRecord = exports.runAlterRecord = function runAlterRecord(req, alterRecord, result) {

  var runner = function runner(result, operation) {
    return result && result.records ? (0, _core.applyToRecords)(req, result, operation) : new _bluebird2.default(function (resolve, reject) {
      return operation(req, result, resolve, reject);
    });
  };

  if (alterRecord.length === 0) return (0, _bluebird.resolve)(result);

  if (alterRecord.length === 1) return runner(result, alterRecord[0]);

  return (0, _bluebird.reduce)(alterRecord, runner, result);
};

var runHooks = exports.runHooks = function runHooks(req, hooks) {
  var result = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;


  var runner = function runner(req, result, hook) {
    return new _bluebird2.default(function (resolve, reject) {
      return result ? hook(req, result, resolve, reject) : hook(req, resolve, reject);
    });
  };

  if (hooks.length === 0) return (0, _bluebird.resolve)(null);

  if (hooks.length === 1) return runner(req, result, hooks[0]);

  return (0, _bluebird.map)(hooks, function (hook) {
    return runner(req, result, hook);
  });
};

var renderError = exports.renderError = function renderError(res, err) {

  if (_lodash2.default.includes(['development'], process.env.NODE_ENV)) console.log(err);

  if (err.code) return (0, _response.fail)(res, err.code, err.message, { errors: err.errors });

  return (0, _response.fail)(res, 500, err.message);
};