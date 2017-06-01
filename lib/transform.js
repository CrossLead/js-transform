"use strict";
exports.__esModule = true;
var R = require("ramda");
function mkEither(kind, value) {
    return { kind: kind, value: value };
}
function mkLeft(val) {
    return mkEither('left', val);
}
exports.mkLeft = mkLeft;
function mkRight(val) {
    return mkEither('right', val);
}
exports.mkRight = mkRight;
function isLeft(either) {
    return either.kind === 'left';
}
exports.isLeft = isLeft;
function isRight(either) {
    return either.kind === 'right';
}
exports.isRight = isRight;
function left(either) {
    if (!isLeft(either)) {
        throw new Error('Attempt to read Left from Right');
    }
    return either.value;
}
exports.left = left;
function right(either) {
    if (!isRight(either)) {
        throw new Error('Attempt to read Left from Right');
    }
    return either.value;
}
exports.right = right;
var Transformer = (function () {
    function Transformer(config) {
        this.setConfig(config);
    }
    Transformer.prototype.setConfig = function (config) {
        this.config = config;
        var selectorOf = function (fc) {
            var selector = fc.selector;
            if (selector === undefined) {
                return [fc.name];
            }
            return Array.isArray(selector) ? selector : [selector];
        };
        var dataFields = this.config.fields;
        var lenses = R.map(R.compose(R.lensPath, selectorOf), dataFields);
        this.transforms = R.zip(lenses, dataFields);
    };
    Transformer.prototype.transform = function (input) {
        var _this = this;
        var errors = [];
        var nestedTransform = function (config, data, input) {
            if (config === undefined) {
                return data;
            }
            var data0 = data === undefined ? input : data;
            var data1 = Array.isArray(data0) ? data0 : [data0];
            var transformer = new Transformer(config);
            var rets = R.map(function (item) {
                var ret = transformer.transform(item);
                if (isLeft(ret)) {
                    errors = R.concat(errors, left(ret));
                    return null;
                }
                return right(ret);
            })(data1);
            return rets.length === 1 ? rets[0] : rets;
        };
        var wrap = function (f, data) { return new f(data); };
        var process = function (out, arg) {
            var lens = arg[0], field = arg[1];
            var data0 = R.view(lens, input);
            var data1 = nestedTransform(field.config, data0, input);
            var data2 = field.defValue !== undefined && data1 === undefined ? field.defValue : data1;
            var mapper = field.mapper ? field.mapper : R.identity;
            var wrapper = field.wrapper ? R.curry(wrap)(field.wrapper) : R.identity;
            if (data2 !== undefined) {
                out[field.name] = R.compose(wrapper, mapper)(data2);
            }
            else {
                if (field.mandatory) {
                    errors.push(new Error('Missing mandatory data expected at selector \'' + field.selector + '\'' + (_this.config.wrapper ? 'for constructor \'' + _this.config.wrapper + '\'' : '')));
                }
            }
            return out;
        };
        var out = R.reduce(process, {}, this.transforms);
        if (this.config.keepOrig) {
            out.$orig = input;
        }
        var ret = this.config.wrapper ? new this.config.wrapper(out) : out;
        return errors.length ? mkLeft(errors) : mkRight(ret);
    };
    return Transformer;
}());
exports.Transformer = Transformer;
exports["default"] = {
    Transformer: Transformer
};
