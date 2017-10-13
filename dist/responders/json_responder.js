'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _response = require('../utils/response');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var JsonResponder = function JsonResponder(message, pagination, data, req, res) {

  var extra = !_lodash2.default.isEmpty(pagination) ? { pagination: pagination, data: data } : { data: data };

  (0, _response.succeed)(res, 200, message, extra);
};

exports.default = JsonResponder;