// This file is part of MusicBrainz, the open internet music database.
// Copyright (C) 2015 Thanuditha Ruchiranga
// Licensed under the GPL version 2, or (at your option) any later version:
// http://www.gnu.org/licenses/gpl-2.0.txt

const _ = require('lodash');
const React = require('react');
const ReactDOM = require('react-dom');

const {isDateValid} = require('../edit/utility/dates');
const ArtistCreditLink = require('./components/ArtistCreditLink');
const EntityLink = require('./components/EntityLink');
const {addColon, l, ln} = require('./i18n');
const {artistCreditFromArray} = require('./immutable-entities');
const formatTrackLength = require('./utility/formatTrackLength');
const {cleanArtistCredit, cleanWebServiceData} = require('./utility/cleanWebServiceData');
const {escapeLuceneValue, constructLuceneFieldConjunction} = require('./utility/search');

const COMMON_TAGS = [
  'electronic',
  'rock',
  'jazz',
  'classical',
].map(tag => ({label: tag, value: tag}));

const OPTIONS = {};

// Called from root/explore/index.tt
MB.init_explore = function (options, mountPoint) {
  _.assign(OPTIONS, options);
  ReactDOM.render(<Content />, mountPoint);
};

function wsEntityLink(data, entityType) {
  if (!data) {
    return null;
  }
  data = cleanWebServiceData(data);
  data.entityType = entityType;
  return <EntityLink entity={data} />;
}

function wsArtistCreditLink(data) {
  if (!data) {
    return null;
  }
  return (
    <ArtistCreditLink
      artistCredit={artistCreditFromArray(cleanArtistCredit(data))}
    />
  );
}

function typeRender(item) {
  return (item['primary-type'] && item['secondary-types']) ? item['primary-type'] + ' + ' + item['secondary-types'].join(' + ') : (item['primary-type'] ? item['primary-type'] : (item['secondary-types'] ? item['secondary-types'].join(' + ') : null));
}

const ReleaseGroupResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Release Group')}</th>
        <th>{l('Artist')}</th>
        <th>{l('Type')}</th>
        <th>{l('Count')}</th>
        <th>{l('Releases')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'release-group')}</td>
            <td>{wsArtistCreditLink(item['artist-credit'])}</td>
            <td>{typeRender(item)}</td>
            <td>{item.count}</td>
            <td>
              {item.releases && item.releases.map(function (release, i) {
                if (i === (item.releases.length - 1)) {
                  return <div key={i}><a href={"/release/" + release.id}><bdi>{release.title}</bdi></a>&nbsp;({release.status})</div>;
                } else {
                  return <div key={i}><a href={"/release/" + release.id}><bdi>{release.title}</bdi></a>&nbsp;({release.status}),&nbsp;</div>;
                }
              })}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const RecordingResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th className="video c"></th>
        <th>{l('Name')}</th>
        <th>{l('Length')}</th>
        <th>{l('Artist')}</th>
        <th>{l('Release')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{item.video ? <div className="video c is-video" title={l("This recording is a video")}>&nbsp;</div> : null}</td>
            <td>{wsEntityLink(item, 'recording')}</td>
            <td>{formatTrackLength(item.length)}</td>
            <td>{wsArtistCreditLink(item['artist-credit'])}</td>
            <td>
              {item.releases && item.releases.map(function (release, i) {
                const rg = release['release-group'];
                return (
                  <div key={i}>
                    {wsEntityLink(release, 'release')}
                    <a href={"/release/" + release.id}>
                      <bdi>{release.title}</bdi>
                    </a>
                    &nbsp;
                    {rg ? typeRender(rg) : null}
                  </div>
                );
              })}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const AreaResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Name')}</th>
        <th>{l('Type')}</th>
        <th>{l('Code')}</th>
        <th>{l('Begin')}</th>
        <th>{l('End')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'area')}</td>
            <td>{item.type}</td>
            <td>
              <span>
                {item['iso-3166-1-codes'] && item['iso-3166-1-codes'].map(function (code, i) {
                  return i !== (item['iso-3166-1-codes'].length - 1) ? code + ', ' : code;
                })}
              </span>
            </td>
            <td>{item['life-span'] ? item['life-span'].begin : null}</td>
            <td>{item['life-span'] ? item['life-span'].end : null}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const PlaceResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Name')}</th>
        <th>{l('Type')}</th>
        <th>{l('Address')}</th>
        <th>{l('Area')}</th>
        <th>{l('Begin')}</th>
        <th>{l('End')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'place')}</td>
            <td>{item.type}</td>
            <td>{item.address}</td>
            <td>{item.area && <a href={"/area/" + item.area.id}><bdi>{item.area.name}</bdi></a>}</td>
            <td>{item['life-span'] ? item['life-span'].begin : null}</td>
            <td>{item['life-span'] ? item['life-span'].end : null}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const SeriesResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Name')}</th>
        <th>{l('Type')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'series')}</td>
            <td>{item.type}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const InstrumentResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Name')}</th>
        <th>{l('Type')}</th>
        <th>{l('Description')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'instrument')}</td>
            <td>{item.type}</td>
            <td>{item.description}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const ReleaseResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Name')}</th>
        <th>{l('Artist')}</th>
        <th>{l('Format')}</th>
        <th>{l('Tracks')}</th>
        <th>{l('Date')}</th>
        <th>{l('Country')}</th>
        <th>{l('Label')}</th>
        <th>{l('Catalog#')}</th>
        <th>{l('Barcode')}</th>
        <th>{l('Language')}</th>
        <th>{l('Type')}</th>
        <th>{l('Status')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        const releaseGroup = item['release-group'];
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'release')}</td>
            <td>{wsArtistCreditLink(item['artist-credit'])}</td>
            <td>{(item.media && item.media[0]) ? item.media[0].format : null}</td>
            <td>{item['track-count']}</td>
            <td>{item.date}</td>
            <td>
              <ul className="links">
                <li><span className={"flag flag-" + item.country}>{item.country}</span></li>
              </ul>
            </td>
            <td>
              {item['label-info'] && item['label-info'][0] && item['label-info'][0].label && <a href={"/label/" + item['label-info'][0].label.id}><bdi>{item['label-info'][0].label.name}</bdi></a>}
            </td>
            <td>{(item['label-info'] && item['label-info'][0]) ? item['label-info'][0]['catalog-number'] : null}</td>
            <td>{item.barcode}</td>
            <td>{item['text-representation'] && item['text-representation'].language && item['text-representation'].script ?
              item['text-representation'].language + ' / ' + item['text-representation'].script :
              item['text-representation'] ? (item['text-representation'].language ? item['text-representation'].language : item['text-representation'].script) : null}</td>
            <td>{releaseGroup ? typeRender(releaseGroup) : null}</td>
            <td>{item.status}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const WorkResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Name')}</th>
        <th>{l('Writers')}</th>
        <th>{l('Type')}</th>
        <th>{l('Language')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'work')}</td>
            <td>
              {item.relations && item.relations.map(function (relation, i) {
                return (
                  relation.artist && <div key={i}>{wsEntityLink(item, 'artist')}</div>
                );
              })}
            </td>
            <td>{item.type}</td>
            <td>{item.language}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const EventResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Name')}</th>
        <th>{l('Type')}</th>
        <th>{l('Artist')}</th>
        <th>{l('Location')}</th>
        <th>{l('Begin')}</th>
        <th>{l('End')}</th>
        <th>{l('Time')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'event')}</td>
            <td>{item.type}</td>
            <td>
              {item.relations && item.relations.map(function (relation, i) {
                return relation.artist && (
                  <div key={i}>
                    <a href={"/artist/" + relation.artist.id}>
                      <bdi>{relation.artist.name}</bdi>
                    </a>
                  </div>
                );
              })}
            </td>
            <td>
              {item.relations && item.relations.map(function (relation, i) {
                return relation.place && (
                  <div key={i}>
                    <a href={"/place/" + relation.place.id}>
                      <bdi>{relation.place.name}</bdi>
                    </a>
                    &nbsp;
                    {relation.type ? '(' + _.capitalize(relation.type) + ')' : null}
                  </div>
                );
              })}
            </td>
            <td>{item['life-span'] ? item['life-span'].begin : null}</td>
            <td>{item['life-span'] ? item['life-span'].end : null}</td>
            <td>{item.time}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const ArtistResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Name')}</th>
        <th>{l('Sort Name')}</th>
        <th>{l('Type')}</th>
        <th>{l('Gender')}</th>
        <th>{l('Area')}</th>
        <th>{l('Begin')}</th>
        <th>{l('Begin Area')}</th>
        <th>{l('End')}</th>
        <th>{l('End Area')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>

            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'artist')}</td>
            <td>{item['sort-name'] ? item['sort-name'] : null}</td>
            <td>{item.type ? item.type : null}</td>
            <td>{item.gender ? item.gender : null}</td>
            <td>{item.area ? <a href={"/area/" + item.area.id}><bdi>{item.area.name}</bdi></a> : null}</td>
            <td>{item['life-span'] ? item['life-span'].begin : null}</td>
            <td>{item['begin-area'] ? <a href={"/area/" + item['begin-area'].id}><bdi>{item['begin-area'].name}</bdi></a> : null}</td>
            <td>{item['life-span'] ? item['life-span'].end : null}</td>
            <td>{item['end-area'] ? <a href={"/area/" + item['end-area'].id}><bdi>{item['end-area'].name}</bdi></a> : null}</td>
          </tr>
          );
      })}
    </tbody>
  </table>
);

const LabelResults = (props) => (
  <table className="tbl">
    <thead>
      <tr>
        <th>{l('Score')}</th>
        <th>{l('Name')}</th>
        <th>{l('Type')}</th>
        <th>{l('Code')}</th>
        <th>{l('Area')}</th>
        <th>{l('Begin')}</th>
        <th>{l('End')}</th>
      </tr>
    </thead>
    <tbody>
      {props.data.map(function (item, i) {
        return (
          <tr className={(i + 1) % 2 === 0 ? 'even' : 'odd'} key={i}>
            <td>{item.score}</td>
            <td>{wsEntityLink(item, 'label')}</td>
            <td>{item.type}</td>
            <td>{item['label-code'] ? 'LC ' + item['label-code'] : null}</td>
            <td>
              {item.area && <a href={"/area/" + item.area.id}><bdi>{item.area.name}</bdi></a>}
            </td>
            <td>{item['life-span'] ? item['life-span'].begin : null}</td>
            <td>{item['life-span'] ? item['life-span'].end : null}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const Results = (props) => {
  const {currentEntity, data, isValid} = props;
  const commonProps = {currentEntity, data, isValid};
  return (
    <div className={isValid ? "result-pane" : "result-pane fade"} id="results">
      {data && (currentEntity === 'release-group') && <ReleaseGroupResults {...commonProps} />}
      {data && (currentEntity === 'recording') && <RecordingResults {...commonProps} />}
      {data && (currentEntity === 'area') && <AreaResults {...commonProps} />}
      {data && (currentEntity === 'place') && <PlaceResults {...commonProps} />}
      {data && (currentEntity === 'series') && <SeriesResults {...commonProps} />}
      {data && (currentEntity === 'instrument') && <InstrumentResults {...commonProps} />}
      {data && (currentEntity === 'release') && <ReleaseResults {...commonProps} />}
      {data && (currentEntity === 'work') && <WorkResults {...commonProps} />}
      {data && (currentEntity === 'event') && <EventResults {...commonProps} />}
      {data && (currentEntity === 'artist') && <ArtistResults {...commonProps} />}
      {data && (currentEntity === 'label') && <LabelResults {...commonProps} />}
    </div>
  );
};

const SearchBox = React.createClass({
  contextTypes: {
    currentEntity: React.PropTypes.string
  },

  getInitialState: function () {
    return {input: ''};
  },

  handleTextInput: function (event) {
    this.setState({input: event.target.value}, () => {
      this.handleTextInputDebounced();
    });
  },

  componentWillMount: function () {
    // Debounce query update
    this.handleTextInputDebounced = _.debounce(() => {
      this.props.setSearchItem(this.state.input);
    }, 700);
  },

  // To be called at entity change
  clearInput: function () {
    this.setState({input: ''});
  },

  render: function () {
    return (
      <input id="search-box" disabled={this.context.currentEntity === 'all'} value={this.state.input} type="text" onChange={this.handleTextInput} autoFocus />
    );
  }
});

const QueryLink = ({searchURI}) => (
  <div className="result-pane" id="browse-query">
    {addColon(l('Query'))} <a href={searchURI}>{searchURI}</a>
  </div>
);

const ResultInfo = React.createClass({
  render: function () {
    return (
      <div className="result-pane" id="result-info">
        {(this.props.count === 0 || this.props.count) && <span>{ln('Found {count} result.', 'Found {count} results.', this.props.count, {count: this.props.count})}</span>}
        <br />
        {this.props.created && <span>{addColon(l('Created'))} {this.props.created}</span>}
      </div>
    );
  }
});

const ListSelectField = React.createClass({
  getInitialState: function () {
    return {selected: [false], current: ['']};
  },

  handleSelect: function (event) {
    const option = event.target;
    const selectIndex = option.getAttribute('data-index');
    const {current, selected} = this.state;

    if (option.value) {
      // If a selection has already been made remove it
      if (selected[selectIndex]) {
        this.props.removeActiveOption({
          field: this.props.field,
          value: current[selectIndex],
        });
      }
      this.props.addActiveOption({field: this.props.field, value: option.value});

      current[selectIndex] = option.value;
      selected[selectIndex] = true;

      this.setState({selected, current});
    } else if (selected[selectIndex]) {
      // If a selection has already been made, remove it.
      this.props.removeActiveOption({
        field: this.props.field,
        value: current[selectIndex],
      });
      selected[selectIndex] = false;
      this.setState({selected});
    }
  },

  handleAdd: function () {
    this.setState({
      current: this.state.current.concat(''),
      selected: this.state.selected.concat(false),
    });
  },

  render: function () {
    const {entity, options} = this.props;
    const field = this.props.heading.toLowerCase();
    return (
      <div>
        <h3>{this.props.heading}</h3>
        {this.state.current.map(function (item, idx) {
          return (
            <div key={idx}>
              <select data-index={idx} onChange={this.handleSelect}>
                <option id={entity + '-' + field + '-null-' + idx} value="">&nbsp;</option>
                <If condition={options[0].optgroup}>
                  {options.map(function (optgroup, index) {
                    return (
                      <optgroup label={optgroup.optgroup} key={index}>
                      {optgroup.options.map(function (opt, i) {
                        return (
                          <option key={i} id={entity + '-' + field + '-' + i + '-' + idx} value={opt.value}>{opt.label}</option>
                        );
                      })}
                      </optgroup>
                    );
                  })}
                <Else />
                  {options.map(function (opt, i) {
                    return (
                      <option key={i} id={entity +  '-' + field + '-'  + i + '-' + idx} value={opt.value}>{opt.label}</option>
                    );
                  })}
                </If>
              </select>
            </div>
          );
        }, this)}
        <button
          className="with-label add-item"
          onClick={this.handleAdd}
          title={this.props.buttonText}
          type="button"
        >
          {this.props.buttonText}
        </button>
      </div>
    );
  }
});

// Compnent containing 3 input boxes for entering year, month and date
const DateInput = React.createClass({
  getInitialState: function () {
    return {yyyy: "", mm: "", dd: ""};
  },

  handleInput: function (event) {
    const input = event.target.value;

    if (_.isEmpty(input) || _.isFinite(_.parseInt(input))) {
      const part = event.target.name; // To distinguish between yyyy, mm and dd

      const stateOb = this.state;
      stateOb[part] = input;

      // Since the MB Web Service does not allow year or year-month or month agnostic queries
      if (_.isEmpty(input)) {
        if (part === "yyyy") {
          stateOb.mm = "";
          stateOb.dd = "";
        } else if (part === "mm") {
          stateOb.dd = "";
        }
      }

      this.setState(stateOb, () => {
        this.handleInputDebounced();
      });
    }
  },

  componentWillMount: function () {
    // Debounce date update
    this.handleInputDebounced = _.debounce(() => {
      this.props.setDate(this.state.yyyy, this.state.mm, this.state.dd);
    }, 700);
  },

  render: function () {
    const yyyy = this.state.yyyy;
    const mm = this.state.mm;
    const dd = this.state.dd;
    return (
      <div>
        <span className="partial-date">
          <input
            className="partial-date-year"
            id={this.props.id + '-yyyy'}
            maxLength="4"
            name="yyyy"
            onChange={this.handleInput}
            placeholder={l('YYYY')}
            value={yyyy}
          />
          {'-'}
          <input
            className="partial-date-month"
            disabled={!this.state.yyyy}
            id={this.props.id + '-mm'}
            maxLength="2"
            name="mm"
            onChange={this.handleInput}
            placeholder={l('MM')}
            value={mm}
          />
          {'-'}
          <input
            className="partial-date-day"
            disabled={!this.state.mm}
            id={this.props.id + '-dd'}
            maxLength="2"
            name="dd"
            onChange={this.handleInput}
            placeholder={l('DD')}
            value={dd}
          />
        </span>
      </div>
    );
  }
});

const DateRangeField = React.createClass({
  getInitialState: function () {
    return {from: "", to: "", label: "", value: "", checked: false, invalidTo: false, invalidFrom: false};
  },

  validDate: function (yyyy, mm, dd, choice) {
    let date;
    if (yyyy && (!mm && !dd) && choice.indexOf('To') > -1) {
      date = yyyy + '-12-31'; // As suggested by NicolÃ¡s Tamargo: "If searched for a date range of years, say 1900-1935, it won't include anyone born in 1935 for whom we have a month or day of birth, since Lucene sorts those after 1935 proper"
    } else {
      date = yyyy ? (mm ? (dd ? yyyy + "-" + mm + "-" + dd : yyyy + "-" + mm ) : yyyy) : "";
    }

    const stateOb = this.state;

    // choice can have a value of ether 'invalidFrom' or 'invalidTo' to distinguish between the two date input fields
    if (_.isEmpty(date)) {
      stateOb[choice] = false; // Leaving a field empty is valid since it implies 'any'
      return date;
    }

    if (isDateValid(yyyy, mm, dd)) {
      stateOb[choice] = false;
      this.setState(stateOb);
      return date;
    } else {
      stateOb[choice] = true;
      this.setState(stateOb);
      return false;
    }
  },

  setFromDate: function (yyyy, mm, dd) {
    const date = this.validDate(yyyy, mm, dd, "invalidFrom");
    if (date !== false) {
      this.setState({from: date}, () => {
        this.updateState();
      });
    }
  },

  setToDate: function (yyyy, mm, dd) {
    // Validate input date and update state only if validation passed
    const date = this.validDate(yyyy, mm, dd, "invalidTo");
    if (date !== false) {
      this.setState({to: date}, () => {
        this.updateState();
      });
    }
  },

  updateState: function () {
    const from = this.state.from;
    const to = this.state.to;

    // this.state.value holds the value sent to be included in the query in the last update
    if (!_.isEmpty(this.state.value)) {
      this.props.removeActiveOption({field: this.props.field, value: "[" + this.state.value + "]"});
    }

    if (from && !to) {
      this.setState({value: from + " TO *"}, () => {
        this.props.addActiveOption({field: this.props.field, value: "[" + this.state.value + "]"});
      });
    } else if (from && to) {
      this.setState({value: from + " TO " + to}, () => {
        this.props.addActiveOption({field: this.props.field, value: "[" + this.state.value + "]"});
      });
    } else if (!from && to) {
      this.setState({value: "* TO " + to}, () => {
        this.props.addActiveOption({field: this.props.field, value: "[" + this.state.value + "]"});
      });
    } else {
      this.setState({value: ''});
    }
  },

  render: function () {
    const {entity, heading} = this.props;
    const headingID = entity + '-' + heading.toLowerCase().replace(/\//g, "-");
    return (
      <div>
        <h3>{heading}</h3>
        <h4>{l('From')}</h4>
        <DateInput id={headingID + '-from'} setDate={this.setFromDate} />
        <h4>{l('To')}</h4>
        <DateInput id={headingID + '-to'} entity={entity} setDate={this.setToDate} />
        {(this.state.invalidFrom || this.state.invalidTo) &&
          <div id={headingID} className="valid-string">
            <div>{l('Please enter a valid date.')}</div>
          </div>}
      </div>
    );
  }
});

const handleSelectMethod = {
  handleSelect: function (event) {
    const selectedOptions = this.state.selectedOptions;

    if (this.state.invalidInput) {
      this.setState({invalidInput: false});
    }

    // For 'type' field, in cases where there are phrases, they should be surrounded by quotes.
    const field = this.props.field;
    const escapedValue = escapeLuceneValue(event.target.value);
    const value = field === 'type' ? '"' + escapedValue + '"' : escapedValue;

    // Check if the item was a selected item and remove it.
    const index = _.indexOf(selectedOptions, value);
    if (index >= 0) {
      this.props.removeActiveOption({field, value});
      this.setState({selectedOptions: _.without(selectedOptions, value)});
      return;
    }

    this.props.addActiveOption({field, value});
    selectedOptions.push(value);
    this.setState({selectedOptions});
  }
};

const SelectField = React.createClass({
  getInitialState: function () {
    return {selectedOptions: []};
  },

  mixins: [handleSelectMethod],

  render: function () {
    const props = this.props;
    return (
      <div>
        <h3>{props.heading}</h3>
        <div className="select-list">
          {props.options.map(function (opt, i) {
            const value = opt.value;
            return (
              <div key={i}>
                <input onChange={this.handleSelect} type="checkbox" value={value} id={props.field + value}></input>
                <label htmlFor={props.field + value}>{opt.label}</label>
              </div>
            );
          }, this)}
        </div>
      </div>
    );
  }
});

const NumberOfField = React.createClass({
  getInitialState: function () {
    return {invalidInput: false, currentValue: '', previousValue: ''};
  },

  handleInput: function (event) {
    const input = event.target.value.replace(/ /g, ''); // Strip whitespaces around dash if any
    if (/^\d+$/.test(input)) { // If just a single number
      this.setState({invalidInput: false, currentValue: input}, () => {
        this.handleUpdateDebounced();
      });
    } else if (/^\d+-\d+$/.test(input)) { // If input is a range
      const words = _.words(input, /\d+/g);
      const option = '[' + words[0] + ' TO ' + words[1] + ']';

      this.setState({invalidInput: false, currentValue: option}, () => {
        this.handleUpdateDebounced();
      });
    } else if (_.isEmpty(input)) {
      this.setState({invalidInput: false, currentValue: ''}, () => {
        this.handleUpdateDebounced();
      });
    } else { // Not necessary to use escapeLuceneValue() since all weird inputs will come to this case
      this.setState({invalidInput: true}, () => {
        this.handleUpdateDebounced();
      });
    }
  },

  componentWillMount: function () {
    // Debounce query update
    this.handleUpdateDebounced = _.debounce(this.updateState, 700);
  },

  updateState: function () {
    // Remove the existing item from the query first, if any
    if (!this.state.invalidInput && this.state.previousValue) {
      this.props.removeActiveOption({field: this.props.field, value: this.state.previousValue});
      this.setState({previousValue: ''});
    }
    // Add the new input to the query
    if (!this.state.invalidInput && this.state.currentValue) {
      this.props.addActiveOption({field: this.props.field, value: this.state.currentValue});
      this.setState({previousValue: this.state.currentValue});
    }
    this.setState({previousValue: this.state.currentValue});
  },

  render: function () {
    const props = this.props;
    return (
      <div>
        <h3>{props.heading}</h3>
        <input
          className="sub-text-input"
          id={props.field + "-text"}
          onChange={this.handleInput}
          placeholder={props.textplaceholder}
          type="text"
        />
        {this.state.invalidInput &&
          <div id={props.entity + '-' + props.heading.toLowerCase().replace(/\//g, "-")}>
            <div className="valid-string">
              {l('Please enter a valid number or range.')}
            </div>
          </div>}
      </div>
    );
  }
});

const InputSelectField = React.createClass({
  getInitialState: function () {
    return {
      invalidInput: false,
      options: this.props.options.slice(0),
      selectedOptions: [],
    };
  },

  mixins: [handleSelectMethod],

  handleTextInput: function (event) {
    if (event.keyCode === 13) { // Detect Enter key press
      const input = escapeLuceneValue(event.target.value);
      const field = this.props.field;

      if (_.trim(input).length === 0) {
        this.setState({invalidInput: true});
        return;
      }

      const opts = this.state.options;
      const selectedOpts = this.state.selectedOptions;

      // Check if input value already exists
      const index = _.findIndex(opts, function (opt) {
        return (opt.value === input.toLowerCase());
      });
      if (index < 0) {
        this.setState({
          invalidInput: false,
          options: opts.concat({name: input, checked: true}),
          selectedOptions: selectedOpts.concat(input.toLowerCase()),
        }, () => this.props.addActiveOption({field, value: input.toLowerCase()}));
        event.target.value = "";
      } else {
        this.setState({invalidInput: true});
      }
    }
  },

  render: function () {
    const props = this.props;
    return (
      <div>
        <h3>{this.props.heading}</h3>
        <div className="select-list">
          {this.state.options.map(function (opt, i) {
            return (
              <div key={i}>
                <input
                  defaultChecked={opt.checked}
                  id={props.field + opt.value}
                  onChange={this.handleSelect}
                  type="checkbox"
                  value={opt.value}
                />
                <label htmlFor={props.field + opt.value}>
                  {opt.label}
                </label>
              </div>
            );
          }, this)}
        </div>
        <input
          className="sub-text-input"
          id={this.props.field + "-text"}
          onKeyDown={this.handleTextInput}
          placeholder={this.props.textplaceholder}
          type="text"
        />
        {this.state.invalidInput &&
          <div id={this.props.entity + '-' + this.props.heading.toLowerCase().replace(/\//g, "-")}>
            <div className="valid-string">{l('Please enter a valid tag.')}</div>
          </div>
        }
      </div>
    );
  }
});

// Panel containing  the fields for a particular entity
const Panel = React.createClass({
  contextTypes: {
    collapseState: React.PropTypes.string
  },

  handleTitleClick: function (event) {
    event.preventDefault();

    // id is of the format 'title-artist' where 6 refers to the starting index of the entity name
    const entity = _.kebabCase(event.target.id.substring(6));
    this.props.setCollapseState((entity === this.context.collapseState) ? '' : entity, () => {
      if (this.context.collapseState !== '') {
        this.props.setCurrentEntity(entity);
      } else {
        this.props.setCurrentEntity('all');
      }
      // Clear all state information on entity change
      this.props.clearState();
    });
  },

  render: function () {
    const entity = _.kebabCase(this.props.name);
    const commonProps = {
      entity: entity,
      removeActiveOption: this.props.removeActiveOption,
      addActiveOption: this.props.addActiveOption,
    };
    return (
      <div>
        <div className="panel-heading">
          <div className="panel-title">
            <span id={"title-" + this.props.name} className="panel-title-text" onClick={this.handleTitleClick}>
              {l(this.props.entity)}
            </span>
          </div>
        </div>
        {(this.context.collapseState === entity) && (entity === 'artist') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <SelectField {...commonProps} heading={l("Type")} field="type" options={OPTIONS.artist_type} />
                <SelectField {...commonProps} heading={l("Gender")} field="gender" options={OPTIONS.gender} />
                <ListSelectField {...commonProps} heading={l("Country")} field="country" options={OPTIONS.country} buttonText={l("Add Country")} />
                <DateRangeField {...commonProps} heading={l("Born/Founded")} field="begin"/>
                <DateRangeField {...commonProps} heading={l("Died/Dissolved")} field="end"/>
                <InputSelectField {...commonProps} heading={l("Tags")} field="tag" textplaceholder={l("Add another tag")} options={COMMON_TAGS} />
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'release-group') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <SelectField {...commonProps} heading={l("Primary Type")} field="primarytype" options={OPTIONS.release_group_type} />
                <SelectField {...commonProps} heading={l("Secondary Type")} field="secondarytype" options={OPTIONS.release_group_secondary_type} />
                <SelectField {...commonProps} heading={l("Status")} field="status" options={OPTIONS.release_status} />
                <NumberOfField {...commonProps} heading={l("Number of Releases")} field="releases" textplaceholder={l("Specify number or range")} />
                <InputSelectField {...commonProps} heading={l("Contains Release")} field="release" textplaceholder={l("Add a release")} options={[]} />
                <InputSelectField {...commonProps} heading={l("Tags")} field="tag" textplaceholder={l("Add another tag")} options={COMMON_TAGS} />
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'recording') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <ListSelectField {...commonProps} heading={l("Country")} field="country" options={OPTIONS.country} buttonText={l("Add Country")} />
                <DateRangeField {...commonProps} heading={l("Release Date")} field="date"/>
                <NumberOfField {...commonProps} heading={l("Duration")} field="dur" textplaceholder={l("Duration in milliseconds")} />
                <SelectField {...commonProps} heading={l("Medium Format")} field="format" options={OPTIONS.medium_format} />
                <SelectField {...commonProps} heading={l("Primary Type")} field="primarytype" options={OPTIONS.release_group_type} />
                <SelectField {...commonProps} heading={l("Secondary Type")} field="secondarytype" options={OPTIONS.release_group_secondary_type} />
                <SelectField {...commonProps} heading={l("Status")} field="status" options={OPTIONS.release_status} />
                <NumberOfField {...commonProps} heading={l("Track count in the medium on release")} field="tracks" textplaceholder={l("Specify number or range")} />
                <NumberOfField {...commonProps} heading={l("Track count on release as a whole")} field="tracksrelease" textplaceholder={l("Specify number or range")} />
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'work') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <ListSelectField {...commonProps} heading={l("Lyrics Language")} field="lang" options={OPTIONS.language} buttonText={l("Add Language")} />
                <InputSelectField {...commonProps} heading={l("Tags")} field="tag" textplaceholder={l("Add another tag")} options={COMMON_TAGS} />
                <ListSelectField {...commonProps} heading={l("Type")} field="type" options={OPTIONS.work_type} buttonText={l("Add Type")} />
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'area') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <DateRangeField {...commonProps} heading={l("Begin Date")} field="begin"/>
                <DateRangeField {...commonProps} heading={l("End Date")} field="end"/>
                <InputSelectField {...commonProps} heading={l("Tags")} field="tag" textplaceholder={l("Add another tag")} options={COMMON_TAGS} />
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'place') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <SelectField {...commonProps} heading={l("Type")} field="type" options={OPTIONS.place_type} />
                <DateRangeField {...commonProps} heading={l("Begin Date")} field="begin"/>
                <DateRangeField {...commonProps} heading={l("End Date")} field="end"/>
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'release') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <ListSelectField {...commonProps} heading={l("Country")} field="country" options={OPTIONS.country} buttonText={l("Add Country")} />
                <DateRangeField {...commonProps} heading={l("Release Date")} field="date"/>
                <SelectField {...commonProps} heading={l("Medium Format")} field="format" options={OPTIONS.medium_format} />
                <ListSelectField {...commonProps} heading={l("Language")} field="lang" options={OPTIONS.language} buttonText={l("Add Language")} />
                <NumberOfField {...commonProps} heading={l("Medium Count")} field="mediums" textplaceholder={l("Specify number or range")} />
                <SelectField {...commonProps} heading={l("Primary Type")} field="primarytype" options={OPTIONS.release_group_type} />
                <SelectField {...commonProps} heading={l("Secondary Type")} field="secondarytype" options={OPTIONS.release_group_secondary_type} />
                <SelectField {...commonProps} heading={l("Quality")} field="quality" options={[{name: "Low", l_name: l("Low")}, {name: "Normal", l_name: l("Normal")}, {name: "High", l_name: l("High")}]} />
                <ListSelectField {...commonProps} heading={l("Script")} field="script" options={OPTIONS.script} buttonText={l("Add Script")} />
                <SelectField {...commonProps} heading={l("Status")} field="status" options={OPTIONS.release_status} />
                <InputSelectField {...commonProps} heading={l("Tags")} field="tag" textplaceholder={l("Add another tag")} options={COMMON_TAGS} />
                <NumberOfField {...commonProps} heading={l("Track Count Over All Mediums")} field="tracks" textplaceholder={l("Specify number or range")} />
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'label') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <SelectField {...commonProps} heading={l("Type")} field="type" options={OPTIONS.label_type} />
                <ListSelectField {...commonProps} heading={l("Country")} field="country" options={OPTIONS.country} buttonText={l("Add Country")} />
                <DateRangeField {...commonProps} heading={l("Founding Date")} field="begin"/>
                <DateRangeField {...commonProps} heading={l("End Date")} field="end"/>
                <InputSelectField {...commonProps} heading={l("Tags")} field="tag" textplaceholder={l("Add another tag")} options={COMMON_TAGS} />
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'event') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <SelectField {...commonProps} heading={l("Type")} field="type" options={OPTIONS.event_type} />
                <DateRangeField {...commonProps} heading={l("Begin Date")} field="begin"/>
                <DateRangeField {...commonProps} heading={l("End Date")} field="end"/>
                <InputSelectField {...commonProps} heading={l("Tags")} field="tag" textplaceholder={l("Add another tag")} options={COMMON_TAGS} />
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'series') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <SelectField {...commonProps} heading={l("Type")} field="type" options={OPTIONS.series_type} />
                <InputSelectField {...commonProps} heading={l("Tags")} field="tag" textplaceholder={l("Add another tag")} options={COMMON_TAGS} />
              </div>
            </div>
          </div>
        }
        {(this.context.collapseState === entity) && (entity === 'instrument') &&
          <div id={"collapse-" + this.props.name} className="panel-collapse">
            <div id={this.props.name}>
              <div className="panel-body">
                <SelectField {...commonProps} heading={l("Type")} field="type" options={OPTIONS.instrument_type} />
                <InputSelectField {...commonProps} heading={l("Tags")} field="tag" textplaceholder={l("Add another tag")} options={COMMON_TAGS} />
              </div>
            </div>
          </div>
        }
      </div>
    );
  }
});

// Keeps the user updated of any process being carried out in the backgorund
const Status = React.createClass({
  handleRetryClick: function (event) {
    event.preventDefault();
    this.props.fetchResults();
  },

  render: function () {
    return (
      <div className="result-pane" id="status">
        {this.props.status ? <span className={!this.props.fetchingFailed ? "loading" : ""}>{this.props.status}</span> : <div>&nbsp;</div>}
        {this.props.status && this.props.fetchingFailed && <span>&nbsp;<a href="#" onClick={this.handleRetryClick}>Retry</a></span>}
      </div>
    );
  }
});

const EntityPanel = React.createClass({
  getInitialState: function () {
    return {collapseState: ''};
  },

  childContextTypes: {
    collapseState: React.PropTypes.string
  },

  getChildContext: function () {
    return {collapseState: this.state.collapseState};
  },

  setCollapseState: function (state, callback) {
    this.setState({collapseState: state}, callback);
  },

  render: function () {
    return (
      <div>
        {OPTIONS.entity.map(function (opt, i) {
          return (
            <div key={i} className="panel">
              <Panel
                addActiveOption={this.props.addActiveOption}
                clearState={this.props.clearState}
                entity={_.startCase(opt)}
                name={opt}
                optionsCollection={this.props.optionsCollection}
                removeActiveOption={this.props.removeActiveOption}
                setCollapseState={this.setCollapseState}
                setCurrentEntity={this.props.setCurrentEntity}
              />
            </div>
          );
        }, this)}
      </div>
    );
  }
});

const ResultPanel = React.createClass({
  contextTypes: {
    currentEntity: React.PropTypes.string,
    currentPage: React.PropTypes.number,
    fetchingFailed: React.PropTypes.bool,
    query: React.PropTypes.string,
    results: React.PropTypes.object,
    resultsValid: React.PropTypes.bool,
    searchURI: React.PropTypes.string,
    status: React.PropTypes.string,
  },

  componentWillMount: function () {
    if (!this.context.searchURI) {
      this.props.clearResults();
    }
  },

  render: function () {
    const context = this.context;
    const {currentEntity, results, searchURI} = context;
    const data = currentEntity !== 'all' ? results[_.endsWith(currentEntity, 's') ? currentEntity : currentEntity + 's'] : null;

    return (
      <div>
        <Status status={status} fetchResults={this.props.fetchResults} fetchingFailed={context.fetchingFailed} />
        {searchURI && results && <ResultInfo count={results.count} created={results.created} />}
        {searchURI && results &&
          <Pagination
            count={results.count}
            current={context.currentPage}
            data={data}
            getNextPage={this.props.getNextPage}
            getPage={this.props.getPage}
            getPreviousPage={this.props.getPreviousPage}
            resultsValid={context.resultsValid}
          />}
        {searchURI && results && <Results data={data} currentEntity={currentEntity} isValid={context.resultsValid} />}
        {searchURI && results && <QueryLink data={data} searchURI={context.searchURI} />}
      </div>
    );
  }
});

const Pagination = React.createClass({
  getInitialState: function () {
    return {left: [], current: 1, right: []};
  },

  componentWillReceiveProps: function (nextProps) {
    let templeft = []; // Set of page numbers on the left to the current page
    let tempright = []; // Set of page numbers on the right to the current page
    const totalPages = Math.ceil(nextProps.count / 25);

    // -1 used to specify where truncation sign ... is needed
    this.setState({current: nextProps.current}, () => {
      if (totalPages < 7) { // No truncation needed
        templeft = _.range(1, this.state.current);
        tempright = _.range(this.state.current + 1, totalPages + 1);
      } else if (this.state.current < 6) { // Truncation on the right side
        templeft = _.range(1, this.state.current);
        tempright = _.range(this.state.current + 1, this.state.current + 5);
        tempright = tempright.concat([-1, totalPages]);
      } else if (this.state.current > totalPages - 6) { // Truncation on the left side
        templeft = [1, -1];
        templeft = templeft.concat(_.range(this.state.current - 4, this.state.current));
        tempright = _.range(this.state.current + 1, totalPages + 1);
      } else { // Truncation on both sides
        templeft = [1, -1];
        templeft = templeft.concat(_.range(this.state.current - 4, this.state.current));
        tempright = _.range(this.state.current + 1, this.state.current + 5);
        tempright = tempright.concat([-1, totalPages]);
      }

      this.setState({left: templeft, right: tempright});
    });
  },

  render: function () {
    const props = this.props;
    return (
      <div className="result-pane" id="pagination">
        {props.data && (
          <nav>
            <span>{l('Showing page {pageno} of {totalpages}.', {pageno: props.current, totalpages: Math.ceil(props.count / 25) === 0 ? 1 : Math.ceil(props.count / 25)})}</span>
            <ul className="pagination">
              <li>{props.current === 1 || !props.resultsValid || props.count === 0 ? <span>{l('Previous')}</span> : <a href="#" className="previous-page" onClick={props.getPreviousPage}>{l('Previous')}</a>}</li>
              <li className="separator"></li>
              {this.state.left.map((item, idx) => {
                return item < 0 ? <li key={idx}><span>...</span></li> : !props.resultsValid ? <li key={idx}><span>{item}</span></li> : <li key={idx}><a href="#" onClick={_.bind(props.getPage, this, item)}>{item}</a></li>;
              }, this)}
              {!props.resultsValid ? <li><span className="sel">{this.state.current}</span></li> : <li><a href="#" className="sel" onClick={_.bind(props.getPage, this, this.state.current)}><strong>{this.state.current}</strong></a></li>}
              {this.state.right.map((item, idx) => {
                return item < 0 ? <li key={idx}><span>...</span></li> : !props.resultsValid ? <li key={idx}><span>{item}</span></li> : <li key={idx}><a href="#" onClick={_.bind(props.getPage, this, item)}>{item}</a></li>;
              }, this)}
              <li className="separator"></li>
              <li>{props.current === Math.ceil(props.count / 25) || !props.resultsValid || props.count === 0 ? <span>{l('Next')}</span> : <a href="#" className="next-page" onClick={props.getNextPage}>{l('Next')}</a>}</li>
            </ul>
          </nav>)
        }
      </div>
    );
  }
});

// Base component handling all the query generation, requests to the web service and results from the web service
const Content = React.createClass({
  getInitialState: function () {
    return {
      activeOptions: {},
      currentEntity: 'all',
      currentPage: 1,
      fetchingFailed: false,
      query: "",
      requestNumber: 0,
      responseNumber: 0,
      resultCache: {},
      results: {},
      resultsValid: false,
      searchURI: "",
      status: "",
      xhrRequest: null,
    };
  },

  childContextTypes: {
    currentEntity: React.PropTypes.string,
    currentPage: React.PropTypes.number,
    fetchingFailed: React.PropTypes.bool,
    query: React.PropTypes.string,
    results: React.PropTypes.object,
    resultsValid: React.PropTypes.bool,
    searchURI: React.PropTypes.string,
    status: React.PropTypes.string,
  },

  getChildContext: function () {
    return {
      currentEntity: this.state.currentEntity,
      currentPage: this.state.currentPage,
      fetchingFailed: this.state.fetchingFailed,
      query: this.state.query,
      results: this.state.results,
      resultsValid: this.state.resultsValid,
      searchURI: this.state.searchURI,
      status: this.state.status,
    };
  },

  setCurrentEntity: function (entity) {
    this.setState({currentEntity: entity}, () => {
      this.refs.searchBox.clearInput();
    });
  },

  getNextPage: function (event) {
    this.getPage(this.state.currentPage + 1, event);
  },

  getPreviousPage: function (event) {
    this.getPage(this.state.currentPage - 1, event);
  },

  getPage: function (item, event) {
    event.preventDefault();
    this.setState({resultsValid: false, currentPage: item}, () => {
      this.fetchResults();
    });
  },

  fetchResults: function () {
    const host = window.location.host;
    // Would not work for /ws/2/all until the server supports it
    const baseUrl = "/ws/2/" + this.state.currentEntity + "?fmt=json&query=";

    let fieldConjunction = constructLuceneFieldConjunction(this.state.activeOptions);
    if (this.state.query) {
      const keyPart = `(${this.state.query})`;
      fieldConjunction = fieldConjunction ? `${fieldConjunction} AND ${keyPart}` : keyPart;
    }

    const offset = "&offset=" + ((this.state.currentPage - 1) * 25);
    const url = baseUrl + fieldConjunction + offset;

    if (this.state.query || !_.isEmpty(this.state.activeOptions)) {
      this.setState({searchURI: host + url});

      if (this.state.resultCache[this.state.currentPage]) {
        this.setState({
          fetchingFailed: false,
          results: this.state.resultCache[this.state.currentPage],
          resultsValid: true,
          status: "",
        });
      } else {
        // Abort requests in the middle of a burst
        if (this.state.xhrRequest !== null) {
          this.state.xhrRequest.abort();
        }

        this.setState({
          fetchingFailed: false,
          requestNumber: this.state.requestNumber + 1,
          status: l('Fetching data. Please wait...'),
        });

        const xhr = $.ajax({
          url: url,
          dataType: 'json',
          cache: false,
          success: (data) => {
            const cache = this.state.resultCache;
            cache[this.state.currentPage] = data;
            this.setState({responseNumber: this.state.responseNumber + 1}, () => {
              if (this.state.responseNumber === this.state.requestNumber) {
                this.setState({
                  results: data,
                  status: "",
                  resultCache: cache,
                  resultsValid: true,
                  fetchingFailed: false,
                  xhrRequest: null,
                });
              }
            });
          },
          error: (request, status, err) => {
            if (err !== 'abort') {
              this.setState({
                fetchingFailed: true,
                responseNumber: this.state.responseNumber + 1,
                status: addColon(l('Failed to fetch the results')) + err,
                xhrRequest: null,
              });
            } else {
              this.setState({
                responseNumber: this.state.responseNumber + 1,
                xhrRequest: null,
              });
            }
          }
        });

        this.setState({xhrRequest: xhr});
      }
    } else {
      this.setState({
        fetchingFailed: false,
        query: "",
        results: {},
        searchURI: "",
        status: "",
      });
    }
  },

  addActiveOption: function (option) {
    let options = this.state.activeOptions;

    if (options[option.field]) {
      options[option.field].push(option.value);
    } else {
      options[option.field] = [option.value];
    }

    this.setState({
      activeOptions: options,
      currentPage: 1,
      resultCache: {},
      resultsValid: false,
    }, () => this.fetchResults());
  },

  removeActiveOption: function (option) {
    let options = this.state.activeOptions;

    _.pull(options[option.field], option.value);
    if (options[option.field].length === 0) {
      delete options[option.field];
    }

    this.setState({
      activeOptions: options,
      currentPage: 1,
      resultCache: {},
      resultsValid: false,
    }, () => this.fetchResults());
  },

  setSearchItem: function (keyWord) {
    const escaped = escapeLuceneValue(keyWord);
    this.setState({resultsValid: false, query: escaped, currentPage: 1, resultCache: {}}, () => {
      this.fetchResults();
    });
  },

  clearResults: function () {
    this.setState({results: null});
  },

  clearState: function () {
    this.setState({
      activeOptions: {},
      currentPage: 1,
      query: "",
      resultCache: {},
      results: {},
      searchURI: "",
      status: "",
    });
  },

  render: function () {
    return (
      <div>
        <div className="category-bar">
          <div id="heading" className="feature-column">
            <h2>{l('Explore')}</h2>
            <div id="search-container">
              <SearchBox ref="searchBox" setSearchItem={this.setSearchItem} />
            </div>
            <div id="side-group" className="panel-group">
              <EntityPanel
                addActiveOption={this.addActiveOption}
                clearState={this.clearState}
                removeActiveOption={this.removeActiveOption}
                setCurrentEntity={this.setCurrentEntity}
              />
            </div>
          </div>
        </div>
        <div id="result-panel">
          <ResultPanel
            clearResults={this.clearResults}
            fetchResults={this.fetchResults}
            getNextPage={this.getNextPage}
            getPage={this.getPage}
            getPreviousPage={this.getPreviousPage}
          />
        </div>
      </div>
    );
  }
});
