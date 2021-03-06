/*
 * Copyright (c) 2018 One Hill Technologies, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const {PropertyDescriptor} = require ('base-object');

/**
 * @class ResourceDescriptor
 *
 * Define a property on an object that is bound to a service.
 */
class ResourceDescriptor extends PropertyDescriptor {
  constructor ({type, name}) {
    super ();

    this.type = type;
    this.name = name;
  }

  defineProperty (obj, name) {
    const framework = require ('../-framework');
    const serviceName = this.name || name;
    const service = framework.lookup (`${this.type}:${serviceName}`);

    Object.defineProperty (obj, name, {
      writable: false,
      value: service
    });
  }
}

module.exports = ResourceDescriptor;

