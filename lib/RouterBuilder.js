var express = require ('express')
  , winston = require ('winston')
  , path    = require ('path')
  , util    = require ('util')
  ;

/**
 * @class MethodCall
 *
 * Helper class for using reflection to call a method.
 *
 * @param obj
 * @param method
 * @constructor
 */
function MethodCall (obj, method) {
  this._obj = obj;
  this._method = method;

  this.invoke = function () {
    return this._method.apply (this._obj, arguments);
  };
}

// The solution for endWith() is adopted from the following solution on
// StackOverflow:
//
//  http://stackoverflow.com/a/2548133/2245732

if (typeof String.prototype.endsWith !== 'function') {
  String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
  };
}
const ROUTER_SUFFIX = 'Router';

/**
 * @class RouterBuilder
 *
 * Builder class for building an express.Router object.
 *
 * @param routerPath
 * @param controllers
 * @param currPath
 * @constructor
 */
function RouterBuilder (routerPath, controllers, currPath) {
  this._routerPath = routerPath;
  this._controllers = controllers;
  this._currPath = currPath || '/';

  this._router = express.Router ();
}

RouterBuilder.prototype.build = function (routers) {
  for (var key in routers) {
    if (routers.hasOwnProperty(key)) {
      if (key.endsWith (ROUTER_SUFFIX))
        this.addRouter (key, routers[key]);
      else
        this.addPath (key, routers[key]);
    }
  }

  return this;
};

RouterBuilder.prototype.addRouter = function (name, routes) {
  winston.log ('info', 'adding router %s', name);
  var self = this;

  function resolveController (action) {
    var parts = action.split ('@');

    if (parts.length != 2)
      throw new Error (util.format ('invalid action format [%s]', action));

    var controllerName = parts[0];
    var actionName = parts[1];

    // Locate the controller object in our loaded controllers. If the controller
    // does not exist, then throw an exception.
    var controller = self._controllers[controllerName];

    if (!controller)
      throw new Error (util.format ('controller %s not found', controllerName));

    // Locate the action method on the loaded controller. If the method does
    // not exist, then throw an exception.
    var method = controller[actionName];

    if (!method)
      throw new Error (util.format ('controller %s does not define method %s', controllerName, actionName));

    return new MethodCall (controller, method);
  }

  /**
   * Register a route with the router. A router starts with a forward slash (/).
   *
   * @param path
   * @param route
   */
  function processRoute (path, route) {
    winston.log ('info', 'processing route %s', path);

    for (var verb in route) {
      var opts = route[verb];
      var verbFunc = self._router[verb.toLowerCase ()];

      if (!verbFunc)
        throw new Error (util.format ('%s is not a valid http verb', verb));

      if (opts.action) {
        // Resolve the controller and its method. The format of the action is
        // 'controller@method'.
        var controller = resolveController (opts.action);
        verbFunc.call (self._router, path, controller.invoke ());
      }
      else if (opts.view) {
        // Use a generic callback to render the view. Make sure we save a reference
        // to the target view since the opts variable will change during the next
        // iteration.
        var view = opts.view;

        verbFunc.call (self._router, path, function (req, res) {
          return res.render (view);
        });
      }
      else {
        winston.error ('[%s]: %s %s must define an action or view property', name, verb, path);
      }
    }
  }

  /**
   * Registers a parameters with the router. The parameter starts with a colon (:).
   *
   * @param param
   * @param action
   */
  function processParam (param, action) {
    winston.log ('info', 'processing parameter %s', param);

    var controller = resolveController (action);
    var rawParam = param.substring (1);

    self._router.param (rawParam, controller.invoke ());
  }

  for (var key in routes) {
    if (routes.hasOwnProperty (key)) {
      switch (key[0]) {
        case '/':
          processRoute (key, routes[key]);
          break;

        case ':':
          processParam (key, routes[key]);
          break;

        default:
          throw new Error (String.format ('unsupported key in router [router=%s, key=%s]', name, key));
      }
    }
  }
  return this;
};

RouterBuilder.prototype.addPath = function (basePath, router) {
  var targetPath = path.join (this._currPath, basePath);
  winston.log ('info', 'building router for path %s', targetPath);

  var builder = new RouterBuilder (this._routerPath, this._controllers, targetPath);
  builder.build (router);

  this._router.use (targetPath, builder.getRouter ());

  return this;
};

RouterBuilder.prototype.getRouter = function () {
  return this._router;
};

module.exports = exports = RouterBuilder;