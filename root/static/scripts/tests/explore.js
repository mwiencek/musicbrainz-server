var _ = require('lodash');
var test = require('tape');
var React = require('react/addons');
var scryRenderedDOMComponentsWithTag = React.addons.TestUtils.scryRenderedDOMComponentsWithTag;
var findRenderedDOMComponentWithClass = React.addons.TestUtils.findRenderedDOMComponentWithClass;
var {triggerChange, triggerClick, triggerCheck, triggerkeyDown} = require('./external-links-editor/utils.js');

MB.options = {
  entities: ["release_group","recording","area","place","series","url","instrument","release","work","event","artist","label"],
  genders: [{"name":"Male"},{"name":"Female"},{"name":"Other"}],
  artistTypes: [{"name":"Person"},{"name":"Group"},{"name":"Other"},{"name":"Character"},{"name":"Orchestra"},{"name":"Choir"}],
  countries: [[{"value":"240","label":"[Worldwide]","code":["XW"]},{"value":1,"label":"Afghanistan","code":["AF"]},{"value":"250","label":"Ã…land Islands","code":["AX"]},{"value":2,"label":"Albania","code":["AL"]}]],
  rgPrimaryTypes: [{"name":"Album"},{"name":"Single"},{"name":"EP"},{"name":"Other"},{"name":"Broadcast"}],
  rgSecondaryTypes: [{"name":"Audiobook"},{"name":"Compilation"},{"name":"DJ-mix"}],
  releaseStatus: [{"name":"Official"},{"name":"Promotion"},{"name":"Bootleg"},{"name":"Pseudo-Release"}],
  mediums: [{"name":"CD"},{"name":"DVD"},{"name":"SACD"}],
  languages: [[{"options":[{"value":284,"label":"[Multiple languages]","code":"mul"},{"value":18,"label":"Arabic","code":"ara"}],"optgroup":"Frequently used"},{"options":[{"value":24,"label":"[Artificial (Other)]","code":"qaa"},{"value":2,"label":"Abkhazian","code":"abk"}],"optgroup":"Other"}]],
  placeTypes: [[{"name":"Studio"},{"name":"Venue"}]],
  scripts: [[{"options":[{"value":18,"label":"Arabic","code":"Arab"},{"value":31,"label":"Cyrillic","code":"Cyrl"}],"optgroup":"Frequently used"},{"options":[{"value":160,"label":"[Multiple scripts]","code":"Qaaa"},{"value":35,"label":"Armenian","code":"Armn"}],"optgroup":"Other"}]],
  labelTypes: [{"name":"Distributor"},{"name":"Holding"}],
  workTypes: [{"name":"Aria"},{"name":"Ballet"},{"name":"Cantata"},{"name":"Concerto"},{"name":"Sonata"}],
  eventTypes: [{"name":"Concert"},{"name":"Festival"},{"name":"Launch event"}],
  seriesTypes: [{"name":"Release group"},{"name":"Release"},{"name":"Recording"},{"name":"Work"}],
  instrumentTypes: [{"name":"Wind instrument"},{"name":"String instrument"},{"name":"Percussion instrument"}]
};

var abortCount = 0;

function exploreTest(name, callback, options) {
  test(name, options, function (t) {
    var __debounce = _.debounce;
    _.debounce = _.identity;

    abortCount = 0;

    if (options && options.mockRequest) {
      $.ajax = function (opt) {
        var mockXHR = $.Deferred();

        mockXHR.done((data) => {
          opt.success(data);
        });

        mockXHR.fail(() => {
          abortCount++;
        });

        mockXHR.abort = mockXHR.reject;

        mockResponse = {"created":"2015-09-03T17:30:45.804Z","count":888,"offset":0,"artists":[{"id":"f2e690db-9122-49f8-8e35-a05de8916a7c","type":"Orchestra","score":"100","name":"Chinese Musical Instruments Orchestra of the China Broadcasting Arts Company","sort-name":"Chinese Musical Instruments Orchestra of the China Broadcasting Arts Company","country":"CN","area":{"id":"7c81bb69-a99b-3487-b6d4-0f76d7a29ca0","name":"China","sort-name":"China"},"life-span":{"ended":null}},{"id":"58c2f02f-8093-426f-9515-b509b45ce8fd","type":"Person","score":"83","name":"Wu Man","sort-name":"Wu Man","gender":"female","country":"CN","area":{"id":"7c81bb69-a99b-3487-b6d4-0f76d7a29ca0","name":"China","sort-name":"China"},"life-span":{"begin":"1963","ended":null}}]};

        if (options.delay) {
          setTimeout (function () {
            mockXHR.resolve(mockResponse);
          }, options.delay);
        } else {
          mockXHR.resolve(mockResponse);
        }

        return mockXHR;
      };
    }

    var mountPoint = document.createElement('div');
    callback(t, $(mountPoint), MB.init_explore(MB.options, mountPoint));

    _.debounce = __debounce;
  });
}

// Pass test if the element/elements matching the specified selector exists
function contains(t, $mountPoint, selector, description) {
  t.ok(!!$mountPoint.find(selector).length, description);
}

// Pass test if no elements matching the specified selector exists
function notContains(t, $mountPoint, selector, description) {
  t.ok(!$mountPoint.find(selector).length, description);
}

function getCheckBoxElement(component, value) {
  var elements = scryRenderedDOMComponentsWithTag(component, 'input');

  var checkbox = _.find(elements, function (comp) {
    return comp.getDOMNode() && comp.getDOMNode().value ? comp.getDOMNode().value === value : false;
  });
  return checkbox;
}

function getInputElement(component, attribute, value) {
  var elements = scryRenderedDOMComponentsWithTag(component, 'input');

  var element = _.find(elements, function (comp) {
    return comp.getDOMNode() && comp.getDOMNode()[attribute] ? comp.getDOMNode()[attribute] === value : false;
  });
  return element;
}

function getSelectElement(component, attribute, value) {
  var elements = scryRenderedDOMComponentsWithTag(component, 'select');

  var select = _.find(elements, function (element) {
    return element.getDOMNode() && element.getDOMNode()[attribute] ? element.getDOMNode()[attribute] === value : false;
  });
  return select;
}

function getPanelHeadingElement($mountPoint, value) {
  var elements = $mountPoint.find('.panel-title span');

  var a = _.find(elements, function (element) {
    return element ? element.id === 'title-' + value : false;
  });
  return a;
}

// Functional testing
exploreTest("Query update detection for search key input", function (t, $mountPoint, component) {
  t.plan(1);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerChange(getInputElement(component, 'id', 'search-box'), "taylor");

  contains(t, $mountPoint, "#browse-query [href*='taylor']", 'Query contains search key');
});

exploreTest("Query update detection for SelectField Component", function (t, $mountPoint, component) {
  t.plan(6);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerCheck(getCheckBoxElement(component, 'person'));
  triggerCheck(getCheckBoxElement(component, 'group'));
  triggerCheck(getCheckBoxElement(component, 'other'));
  triggerCheck(getCheckBoxElement(component, 'character'));
  triggerCheck(getCheckBoxElement(component, 'orchestra'));
  triggerCheck(getCheckBoxElement(component, 'choir'));
  triggerCheck(getCheckBoxElement(component, 'choir'));

  contains(t, $mountPoint, "#browse-query [href*='person']", 'Query contains type person');
  contains(t, $mountPoint, "#browse-query [href*='group']", 'Query contains type group');
  contains(t, $mountPoint, "#browse-query [href*='other']", 'Query contains type other');
  contains(t, $mountPoint, "#browse-query [href*='character']", 'Query contains type character');
  contains(t, $mountPoint, "#browse-query [href*='orchestra']", 'Query contains type orchestra');
  notContains(t, $mountPoint, "#browse-query [href*='choir']", 'Query does not contain type choir');
});

exploreTest("Query update detection for InputSelectField Component", function (t, $mountPoint, component) {
  t.plan(3);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerCheck(getCheckBoxElement(component, 'rock'));
  triggerCheck(getCheckBoxElement(component, 'jazz'));
  triggerCheck(getCheckBoxElement(component, 'jazz'));
  triggerkeyDown(getInputElement(component, 'id', 'tag-text'), 'Pop');

  contains(t, $mountPoint, "#browse-query [href*='rock']", 'Query contains tag rock');
  notContains(t, $mountPoint, "#browse-query [href*='jazz']", 'Query does not contain tag jazz');
  contains(t, $mountPoint, "#browse-query [href*='pop']", 'Query contains tag pop');
});

exploreTest("Query update detection for DateRangeField Component", function (t, $mountPoint, component) {
  t.plan(7);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-from-yyyy'), "1900", 'yyyy');
  contains(t, $mountPoint, "#browse-query [href*='[1900 TO *]']", 'Query contains range [1900 TO *]');

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-from-mm'), "8", 'mm');
  contains(t, $mountPoint, "#browse-query [href*='[1900-8 TO *]']", 'Query contains range [1900-8 TO *]');

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-from-dd'), "21", 'dd');
  contains(t, $mountPoint, "#browse-query [href*='[1900-8-21 TO *]']", 'Query contains range [1900-8-21 TO *]');

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-to-yyyy'), "2007", 'yyyy');
  contains(t, $mountPoint, "#browse-query [href*='[1900-8-21 TO 2007]']", 'Query contains range [1900-8-21 TO 2007]');

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-to-mm'), "05", 'mm');
  contains(t, $mountPoint, "#browse-query [href*='[1900-8-21 TO 2007-05]']", 'Query contains range [1900-8-21 TO 2007-05]');

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-to-dd'), "16", 'dd');
  contains(t, $mountPoint, "#browse-query [href*='[1900-8-21 TO 2007-05-16]']", 'Query contains range [1900-8-21 TO 2007-05-16]');

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-from-yyyy'), "", 'yyyy');
  contains(t, $mountPoint, "#browse-query [href*='[* TO 2007-05-16]']", 'Query contains range [* TO 2007-05-16]');
});

exploreTest("Query update detection for ListSelectField Component", function (t, $mountPoint, component) {
  t.plan(2);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  var options;

  options = [{id: "artist-country-1", value: "AF"}];
  triggerChange(getSelectElement(component, 'name', '0'), null, '0', options);
  contains(t, $mountPoint, "#browse-query [href*='AF']", 'Query contains country code AF');

  options = [{id: "artist-country-null", value: ""}];
  triggerChange(getSelectElement(component, 'name', '0'), null, '0', options);
  notContains(t, $mountPoint, "#browse-query [href*='country']", 'Query does not contain country attribute');
});

exploreTest("Multiple Country selections with ListSelectField Component", function (t, $mountPoint, component) {
  t.plan(2);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));
  triggerClick($mountPoint.find('.panel-body button:eq(0)')[0]);

  var options;

  options = [{id: "artist-country-1", value: "AF"}];
  triggerChange(getSelectElement(component, 'name', '0'), null, '0', options);
  contains(t, $mountPoint, "#browse-query [href*='AF']", 'Query contains country code AF');

  options = [{id: "artist-country-3", value: "AL"}];
  triggerChange(getSelectElement(component, 'name', '1'), null, '1', options);
  contains(t, $mountPoint, "#browse-query [href*='AL']", 'Query contains country code AL');
});

exploreTest("Query update detection for NumberOfField Component", function (t, $mountPoint, component) {
  t.plan(2);

  triggerClick(getPanelHeadingElement($mountPoint, 'recording'));

  triggerChange(getInputElement(component, 'id', 'dur-text'), '5000');
  contains(t, $mountPoint, "#browse-query [href*='5000']", 'Query contains duration 5000');

  triggerChange(getInputElement(component, 'id', 'dur-text'), '5000-6000');
  contains(t, $mountPoint, "#browse-query [href*='[5000 TO 6000]']", 'Query contains duration range [5000 TO 6000]');
});

exploreTest("Pagination functionality check", function (t, $mountPoint, component) {
  t.plan(9);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerChange(getInputElement(component, 'id', 'search-box'), "abc");

  contains(t, $mountPoint, "#pagination", 'Pagination displayed');
  contains(t, $mountPoint, "strong:first-child:contains('1')", 'Page 1 selected by default');
  contains(t, $mountPoint, "#browse-query [href*='offset=0']", 'Query contains offset 0');

  triggerClick(findRenderedDOMComponentWithClass(component, 'next-page'));
  contains(t, $mountPoint, "strong:contains('2')", 'Page 2 selected on Next click');
  contains(t, $mountPoint, "#browse-query [href*='offset=25']", 'Query contains offset 25');

  triggerClick(findRenderedDOMComponentWithClass(component, 'previous-page'));
  contains(t, $mountPoint, "strong:first-child:contains('1')", 'Page 1 selected on Previous click');
  contains(t, $mountPoint, "#browse-query [href*='offset=0']", 'Query contains offset 0');

  var elements = scryRenderedDOMComponentsWithTag(component, 'a');
  var page3 = _.find(elements, function (comp) {
    return comp.getDOMNode() && comp.getDOMNode().innerHTML ? comp.getDOMNode().innerHTML === '3' : false;
  });

  triggerClick(page3);
  contains(t, $mountPoint, "strong:first-child:contains('3')", 'Page 3 selected on page 3 click');
  contains(t, $mountPoint, "#browse-query [href*='offset=50']", 'Query contains offset 50');
}, {mockRequest: true});

exploreTest("Result table display check", function (t, $mountPoint, component) {
  t.plan(1);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerCheck(getCheckBoxElement(component, 'person'));

  contains(t, $mountPoint, "table:contains('Score')", 'Result table displayed');
}, {mockRequest: true});

// UI testing
exploreTest("Input validation detection for InputSelectField Component", function (t, $mountPoint, component) {
  t.plan(1);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerkeyDown(getInputElement(component, 'id', 'tag-text'), 'Jazz');
  contains(t, $mountPoint, "#artist-tags :contains('Please enter a valid tag.')", 'InputSelectField Component input validation displayed');
});

exploreTest("Input validation detection for DateRangeField Component", function (t, $mountPoint, component) {
  t.plan(2);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-from-yyyy'), "1900", 'yyyy');

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-from-mm'), "13", 'mm');
  contains(t, $mountPoint, "#artist-born-founded :contains('Please enter a valid date.')", 'Month input validation displayed');

  triggerChange(getInputElement(component, 'id', 'artist-born-founded-from-dd'), "32", 'dd');
  contains(t, $mountPoint, "#artist-born-founded :contains('Please enter a valid date.')", 'Date input validation displayed');
});

exploreTest("Input validation detection for NumberOfField Component", function (t, $mountPoint, component) {
  t.plan(1);

  triggerClick(getPanelHeadingElement($mountPoint, 'recording'));

  triggerChange(getInputElement(component, 'id', 'dur-text'), 'aa');
  contains(t, $mountPoint, "#recording-duration :contains('Please enter a valid number or range.')", 'Duration input validation displayed');
});

exploreTest("Entity count check", function (t, $mountPoint, component) {
  t.plan(1);

  var count = $mountPoint.find('.panel-title span').length;
  t.equal(count, 11, 'No unimplemented entities exist');
});

exploreTest("Status Component message check", function (t, $mountPoint, component) {
  t.plan(1);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));
  triggerCheck(getCheckBoxElement(component, 'person'));

  contains(t, $mountPoint, "#status :contains('Fetching data')", 'Data fetching status displayed');
}, {mockRequest: true, delay: 1000});

// Performance testing
exploreTest("Ajax request burst performance tuning check", function (t, $mountPoint, component) {
  t.plan(1);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerCheck(getCheckBoxElement(component, 'person'));
  triggerCheck(getCheckBoxElement(component, 'group'));
  triggerCheck(getCheckBoxElement(component, 'other'));
  triggerCheck(getCheckBoxElement(component, 'character'));
  triggerCheck(getCheckBoxElement(component, 'orchestra'));
  triggerCheck(getCheckBoxElement(component, 'choir'));

  t.equal(abortCount, 5, 'All requests in a burst except the last one are aborted');
}, {mockRequest: true, delay: 1000});

// Security testing
exploreTest("Escape special characters check", function (t, $mountPoint, component) {
  t.plan(7);

  triggerClick(getPanelHeadingElement($mountPoint, 'artist'));

  triggerChange(getInputElement(component, 'id', 'search-box'), 't[ay(lo]r)sw:i"f/t');

  contains(t, $mountPoint, '#browse-query [href*="\\["]', 'Query contains only the escaped [');
  contains(t, $mountPoint, '#browse-query [href*="\\("]', 'Query contains only the escaped (');
  contains(t, $mountPoint, '#browse-query [href*="\\]"]', 'Query contains only the escaped ]');
  contains(t, $mountPoint, '#browse-query [href*="\\)"]', 'Query contains only the escaped )');
  contains(t, $mountPoint, '#browse-query [href*="\\:"]', 'Query contains only the escaped :');
  contains(t, $mountPoint, '#browse-query [href*="\\/"]', 'Query contains only the escaped /');
  contains(t, $mountPoint, '#browse-query [href*="\\\""]', 'Query contains only the escaped "');
});
