'use strict';

module.exports = require('../common').dynRequireFrom(__dirname, null, { pathReplace: { from: '-', to: ':' } });
