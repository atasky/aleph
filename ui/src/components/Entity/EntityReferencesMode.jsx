import _ from 'lodash';
import React from 'react';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { Button } from '@blueprintjs/core';
import queryString from 'query-string';
import c from 'classnames';

import {
  selectEntitiesResult, selectSchema,
} from 'selectors';
import {
  Entity, ErrorSection, Property, SectionLoading, QueryInfiniteLoad
} from 'components/common';
import EntityProperties from 'components/Entity/EntityProperties';
import ensureArray from 'util/ensureArray';
import { queryEntities } from 'actions/index';
import Collection from 'components/common/Collection';

const messages = defineMessages({
  no_relationships: {
    id: 'entity.references.no_relationships',
    defaultMessage: 'This entity does not have any relationships.',
  },
});


class EntityReferencesMode extends React.Component {

  onExpand(entity) {
    const { expandedId, parsedHash, history, location } = this.props;
    parsedHash.expand = expandedId === entity.id ? undefined : entity.id;
    history.replace({
      pathname: location.pathname,
      search: location.search,
      hash: queryString.stringify(parsedHash),
    });
  }

  renderCell(prop, entity) {
    const { schema, isThing } = this.props;
    let content = <Property.Values prop={prop} values={entity.getProperty(prop.name)} translitLookup={entity.latinized} />;
    if (isThing && schema.caption.indexOf(prop.name) !== -1) {
      content = <Entity.Link entity={entity}>{content}</Entity.Link>;
    }
    return (
      <td key={prop.name} className={prop.type.name}>
        {content}
      </td>
    );
  }

  renderRow(columns, entity) {
    const { isThing, expandedId, hideCollection } = this.props;
    const isExpanded = entity.id === expandedId;
    const expandIcon = isExpanded ? 'chevron-up' : 'chevron-down';
    const mainRow = (
      <tr key={entity.id} className={c('nowrap', { prefix: isExpanded })}>
        { !isThing && (
          <td className="expand">
            <Button onClick={() => this.onExpand(entity)} small minimal icon={expandIcon} />
          </td>
        )}
        {columns.map(prop => this.renderCell(prop, entity))}
        { !hideCollection && (
          <td key={entity.collection?.id}>
            <Collection.Link collection={entity.collection} />
          </td>
        )}
      </tr>
    );
    if (!isExpanded) {
      return mainRow;
    }
    const colSpan = hideCollection ? columns.length : columns.length + 1;
    return [
      mainRow,
      <tr key={`${entity.id}-expanded`}>
        <td />
        <td colSpan={colSpan}>
          <EntityProperties entity={entity} />
        </td>
      </tr>,
    ];
  }

  render() {
    const {
      intl, reference, query, result, schema, isThing, hideCollection
    } = this.props;

    if (!reference) {
      return <ErrorSection icon="graph" title={intl.formatMessage(messages.no_relationships)} />;
    }
    const { property } = reference;
    const results = _.uniqBy(ensureArray(result.results), 'id');
    const columns = schema.getFeaturedProperties().filter(prop => prop.name !== property.name);
    return (
      <section className="EntityReferencesTable">
        <table className="data-table references-data-table">
          <thead>
            <tr>
              {!isThing && (
                <th key="expand" />
              )}
              {columns.map(prop => (
                <th key={prop.name} className={prop.type}>
                  <Property.Name prop={prop} />
                </th>
              ))}
              {!hideCollection && (
                <th>
                  <FormattedMessage
                    id="xref.match_collection"
                    defaultMessage="Dataset"
                  />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {results.map(entity => this.renderRow(columns, entity))}
          </tbody>
        </table>
        <QueryInfiniteLoad
          query={query}
          result={result}
          fetch={this.props.queryEntities}
        />
        { result.isPending && (
          <SectionLoading />
        )}
      </section>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const { location, reference, query } = ownProps;
  const parsedHash = queryString.parse(location.hash);
  const schema = selectSchema(state, reference.schema);
  return {
    schema,
    parsedHash,
    expandedId: parsedHash.expand,
    result: selectEntitiesResult(state, query),
    isThing: schema.isThing(),
  };
};

export default compose(
  withRouter,
  connect(mapStateToProps, { queryEntities }),
  injectIntl,
)(EntityReferencesMode);
