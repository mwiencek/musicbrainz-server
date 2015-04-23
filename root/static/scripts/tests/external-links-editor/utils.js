const React = require('react');
const ReactTestUtils = require('react-addons-test-utils');

exports.triggerChange = function (node, value, name, options, index) {
  ReactTestUtils.Simulate.change(node, { target: { value: value, name: name, options: options, selectedIndex: 0 } });
};

exports.triggerCheck = function (node) {
  ReactTestUtils.Simulate.change(node);
};

exports.triggerChange = function (node, value, name, options, index) {
  ReactTestUtils.Simulate.change(node, { target: { value: value, name: name, options: options, selectedIndex: 0 } });
};

exports.triggerCheck = function (node) {
  ReactTestUtils.Simulate.change(node);
};

exports.triggerkeyDown = function (node, value) {
  ReactTestUtils.Simulate.keyDown(node, {keyCode : 13, target: { value: value }});
};

exports.triggerClick = function (node) {
  ReactTestUtils.Simulate.click(node);
};

exports.addURL = function (component, name) {
  var inputs = ReactTestUtils.scryRenderedDOMComponentsWithTag(component, 'input');
  exports.triggerChange(inputs[inputs.length - 1], name);
};
