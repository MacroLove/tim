'use strict';

var PageView = require('./PageView')
import ActionSheet from 'react-native-actionsheet'
var utils = require('../utils/utils');
var translate = utils.translate
var reactMixin = require('react-mixin');
var extend = require('extend')
var Store = require('../Store/Store');
var Actions = require('../Actions/Actions');
var Reflux = require('reflux');
var constants = require('@tradle/constants');
var Icon = require('react-native-vector-icons/Ionicons');
var buttonStyles = require('../styles/buttonStyles');
var NetworkInfoProvider = require('./NetworkInfoProvider')
var SupervisoryViewPerProvider = require('./SupervisoryViewPerProvider')
var defaultBankStyle = require('../styles/bankStyle.json')
var StyleSheet = require('../StyleSheet')
import { makeResponsive } from 'react-native-orient'

import {Column as Col, Row} from 'react-native-flexbox-grid'

const PRODUCT_APPLICATION = 'tradle.ProductApplication'
// var bankStyles = require('../styles/bankStyles')

import React, { Component, PropTypes } from 'react'
import {
  ListView,
  // StyleSheet,
  Navigator,
  Alert,
  // AlertIOS,
  // ActionSheetIOS,
  TouchableOpacity,
  Image,
  StatusBar,
  View,
  Text,
  Platform
} from 'react-native';

import platformStyles from '../styles/platform'
import ENV from '../utils/env'

class SupervisoryView extends Component {
  props: {
    navigator: PropTypes.object.isRequired,
    resource: PropTypes.object.isRequired,
  };
  constructor(props) {
    super(props);

    this.state = {
      // isLoading: utils.getModels() ? false : true,
      isLoading: true,
      dataSource: new ListView.DataSource({
        rowHasChanged: function(row1, row2) {
          return row1 !== row2 || row1._online !== row2._online
        }
      }),
      isConnected: this.props.navigator.isConnected,
    };
  }
  componentWillMount() {
    utils.onNextTransitionEnd(this.props.navigator, () => {
      Actions.getAllPartials(this.props.resource, this.props.chat)
    });
  }

  componentDidMount() {
    this.listenTo(Store, 'onStats');
  }

  onStats(params) {
    var action = params.action;
    if (action !== 'allPartials' || !params.stats.length)
      return
    let list = params.stats

    // this.product = list[0].applications[0].productType

    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(list),
      list: list,
      owners: params.owners,
      isLoading: false
    })
  }

  renderRow(resource)  {
    let completed = 0
    let open = 0
    for (let p in resource.openApps)
      open += resource.openApps[p]
    for (let p in resource.completedApps)
      completed += resource.completedApps[p]

    return  <Row size={3} style={{borderBottomColor: '#aaaaaa', borderBottomWidth: 1}}>
              <Col sm={1} md={1} lg={1} style={styles.col}>
                <TouchableOpacity onPress={() => this.showProviderDetails(resource)}>
                  <Text style={[styles.cell, {fontWeight: '600'}]}>
                    {resource.providerInfo.title}
                  </Text>
                </TouchableOpacity>
              </Col>
              <Col sm={1} md={1} lg={1} style={styles.col}>
                <Text style={styles.cell}>
                  {completed || 0}
                </Text>
              </Col>
              <Col sm={1} md={1} lg={1} style={[styles.col, {borderRightWidth: 0}]}>
                <Text style={styles.cell}>
                  {open || 0}
                </Text>
              </Col>
            </Row>

  }
  showProviderDetails(resource) {
    // Actions.getAllPartials()
    this.props.navigator.push({
      id: 26,
      component: SupervisoryViewPerProvider,
      backButtonTitle: 'Back',
      title: resource.providerInfo.title,
      passProps: {
        provider: resource,
        applicants: this.state.owners[resource.providerInfo.id]
      }
    })
  }
  render() {
    if (this.state.isLoading)
      return <View/>
    var content = <ListView
          dataSource={this.state.dataSource}
          renderHeader={this.renderHeader.bind(this)}
          enableEmptySections={true}
          renderRow={this.renderRow.bind(this)}
          automaticallyAdjustContentInsets={false}
          removeClippedSubviews={false}
          keyboardDismissMode='on-drag'
          keyboardShouldPersistTaps={true}
          initialListSize={10}
          pageSize={20}
          scrollRenderAhead={10}
          showsVerticalScrollIndicator={false} />

    return (
      <PageView style={platformStyles.container}>
        <NetworkInfoProvider connected={this.state.isConnected} />
        <View style={styles.separator} />
        {content}
      </PageView>
    );
  }
  renderHeader() {
    if (this.state.isLoading)
      return <View/>
    // HACK for now
    // let app = utils.getModel(this.product).value
    //         <Row size={3} style={styles.topRow}>
    //           <Col sm={3} md={3} lg={3}>
    //             <Text style={{fontWeight: '600', alignSelf: 'center', paddingVertical: 5, fontSize: 16 }}>
    //               {app.title}
    //             </Text>
    //           </Col>
    //         </Row>
    return <View style={{backgroundColor: '#FBFFE5'}}>
            <Row size={3} style={{borderBottomColor: '#aaaaaa', borderBottomWidth: 1}}>
              <Col sm={1} md={1} lg={1} style={styles.col}>
                <Text style={{fontWeight: '600', alignSelf: 'center', paddingVertical: 5 }}>
                  Provider
                </Text>
              </Col>
              <Col sm={1} md={4} lg={3} style={styles.col}>
                <Text style={styles.cell}>
                  Completed
                </Text>
              </Col>
              <Col sm={1} md={4} lg={3} style={[styles.col, {borderRightWidth: 0}]}>
                <Text style={styles.cell}>
                  Open
                </Text>
              </Col>
            </Row>
          </View>
  }
}
reactMixin(SupervisoryView.prototype, Reflux.ListenerMixin);
SupervisoryView = makeResponsive(SupervisoryView)

var styles = StyleSheet.create({
  // container: {
  //   flex: 1,
  //   backgroundColor: '#f7f7f7',
  //   // backgroundColor: 'white',
  //   marginTop: Platform.OS === 'ios' ? 64 : 44,
  // },
  topRow: {
    borderBottomColor: '#aaaaaa',
    borderBottomWidth: 1,
  },
  topRowCell: {
    fontSize:16,
    fontWeight: '600',
    alignSelf: 'center'
  },
  col: {
    paddingVertical: 5,
    borderRightColor: '#aaaaaa',
    borderRightWidth: 1,
  },
  cell: {
    paddingVertical: 5,
    fontSize: 14,
    alignSelf: 'center'
  },
});

module.exports = SupervisoryView
