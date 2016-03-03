'use strict'
var path = require('path');
var os = require('os');
var fs = require('fs-extra');
var yaml = require('js-yaml');
var assert = require('assert');
var _ = require('underscore');


var IO = function () {
};

module.exports = function () {
  return new IO();
};

/**
 * initializes the config based on a source config
 * @param options {source,targetDir,targetFile}
 * @param cb function(err,configpath)
 */
IO.prototype.initConfig = function (options, cb) {
  assert(options, 'must have options')
  var source = options.source ? options.source : null;
  assert(source, 'must have source')
  var configDir = options.targetDir ? options.targetDir : null;
  assert(configDir, 'must have configDir')
  var fileName = options.targetFile ? options.targetFile : null;
  assert(fileName, 'must have targetFile')

  var overwrite = options.overwrite;
  var configPath = path.join(configDir, fileName);

  fs.ensureDir(configDir, function (err) {
    err && console.error(err);
    fs.stat(configPath, function (err, stats) {
      if (err) {
        console.error(err);
        fs.ensureFile(configPath, function (err) {
          err && console.error(err);
          fs.copy(source, configPath, function (err) {
            err && console.error(err);
            return cb(err, configPath);
          }); // copy from default config
        });
      } else {
        // exists, so prompt for overwrite
        fs.copy(source, configPath, {clobber: overwrite}, function (err) {
          if(err) {
            console.error(err);
            return cb(err);
          }
          return cb(err,configPath);
        });
      }
    });
  });
}

/**
 * loads config from source config
 * @param options {source,hash=1,0}
 * @returns {*}
 */
IO.prototype.loadSync = function (options) {
  assert(options, 'must have options');
  assert(options.source, 'must have source to load from')
  var source = options.source;
  var hash = options.hash || 0;

  if (!fs.existsSync(source)) {
    console.error('config does not exist', source);
    throw new Error('config does not exist');
  }
  var stat = fs.statSync(source);
  if (!stat.isFile()) {
    console.error('config is not a file', source);
    throw new Error('config is not a file');
  }
  if (stat.size === 0) {
    console.error(' config is empty', source);
    throw new Error('config is empty');
  }
  var content;
  try {
    var file = fs.readFileSync(source);
    content = yaml.safeLoad(file.toString());
    content._hash = hash; // indicates this is a cached config
  } catch (err) {
    console.error('error reading config from', source, err);
    throw new Error(err);
  }
  return content;
};

/**
 *
 * @param config to save
 * @param target destination
 */
IO.prototype.saveSync = function (config, target) {
  this.save(config, {target: target, sync: true}, function () {
  });
};

/**
 *
 * @param config to save
 * @param options {sync,target}
 * @param cb function(err){}
 */
IO.prototype.save = function (config, options, cb) {
  assert(options, 'must have options');
  var target = options.target;
  assert(target, 'target is not set');
  options = options || {sync: false}
  var save = {}; // a copy of the config minus event emitter properties
  Object.keys(config).forEach(function (key) {
    if (key.indexOf('_') === 0)
      return; // skip private properties
    save[key] = config[key];
  });
  var dump = yaml.safeDump(save, {skipInvalid: true});
  if (options.sync) {
    fs.writeFileSync(target, dump);
    _.isFunction(cb) && cb();
  } else {
    fs.writeFile(target, dump, function (err) {
      err && console.error('error saving config to', target, err);
      if (cb && _.isFunction(cb)) {
        cb(err);
      }
    });
  }
}
