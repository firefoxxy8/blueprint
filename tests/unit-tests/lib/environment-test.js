const {env} = require ('../../../lib/environment');
const expect = require ('chai').expect;

describe ('lib | Environment', function () {
  it ('should create an environment object', function () {
    expect (env).to.equal ('test');
  });
});