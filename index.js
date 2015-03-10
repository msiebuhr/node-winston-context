/* Make a proxy for an existing Winston logger that adds a prefix and/or further
 * data to the log to be emitted.
 */
'use strict';

// Is a given variable an object?
function _isObject(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
}

// Combine objects, without overwriting keys
function _defaults(obj) {
    var length = arguments.length;
    if (length < 2 || obj === null) {
        return obj;
    }

    for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = _isObject(source) ? Object.keys(source) : [],
            l = keys.length;
        for (var i = 0; i < l; i++) {
            var key = keys[i];
            if (obj[key] === void 0) {
                obj[key] = source[key];
            }
        }
    }
    return obj;
}

function WinstonContext(logger, prefix, metadata) {
    this._parent = logger;

    // Catch: Is the parent already a proxy?
    while (this._parent._parent) {
        this._parent = this._parent._parent;
    }

    this._prefix = prefix ? (prefix.replace(/^\.|\.$/g, '') + '.') : '';
    this._metadata = metadata || {};

    // Generate convenience log methods based on what the parent has
    var that = this;
    Object.keys(this._parent.levels).forEach(function (level) {
        that[level] = function () {
            // build argument list (level, msg, ... [string interpolate], [{metadata}], [callback])
            var args = [level].concat(Array.prototype.slice.call(arguments));
            that.log.apply(that, args);
        };
    });
}

WinstonContext.prototype.getContext = function getContext(prefix, metadata) {
    return new WinstonContext(
        this._parent,
        this._prefix + prefix,
        _defaults({}, metadata, this._metadata)
    );
};

// Proxy log function
WinstonContext.prototype.log = function log(level, name /*, metadata, callback*/) {
    // Stolen procesing code from Winston itself
    var args = Array.prototype.slice.call(arguments, 1); // All args except first

    var callback = typeof args[args.length -1] === 'function' ? args.pop() : null;
    var meta = _isObject(args[args.length - 1]) ? args.pop() : {};

    this._parent.log(
        level,
        this._prefix + name,
        _defaults({}, meta, this._metadata),
        callback
    );
};

// Helper functio to install `getContext` on root winston logger
WinstonContext.patchWinstonWithGetContext = function patchWinstonWithGetContext(winstonInstance) {
    winstonInstance.getContext = function getContext(prefix, meta) {
        return new WinstonContext(winstonInstance, prefix, meta);
    };
};

module.exports = WinstonContext;
