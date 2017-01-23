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
var defaultBankStyle = require('../styles/bankStyle.json')
var StyleSheet = require('../StyleSheet')

import {Column as Col, Row} from 'react-native-flexbox-grid'

const PRODUCT_APPLICATION = 'tradle.ProductApplication'

import React, { Component, PropTypes } from 'react'
import {
  Navigator,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  View,
  Text,
  Platform
} from 'react-native';

import platformStyles from '../styles/platform'
import ENV from '../utils/env'

const SearchBar = Platform.OS === 'android' ? null : require('react-native-search-bar')
const MILLIS_IN_DAY = 86400000

class SupervisoryViewPerProvider extends Component {
  props: {
    navigator: PropTypes.object.isRequired,
    resource: PropTypes.object.isRequired,
  };
  constructor(props) {
    super(props);

    let provider = props.provider

    this.state = {
      applicants: props.applicants,
      isConnected: this.props.navigator.isConnected,
    }
  }

  componentDidMount() {
    this.listenTo(Store, 'onStats');
  }

  onStats(params) {
    var action = params.action;
    if (action !== 'allPartials')
      return
    this.setState({
      applicants: params.owners[this.props.provider.providerInfo.id]
    })
  }

  renderRow(resource, applicant, cnt)  {
    let appType = resource.product
    let app = resource.app.product
    let owner = applicant.owner
    let stats = resource.stats[appType] // applicant.stats ? applicant.stats[appType] : null

    let startDate = app && app.time
    let start = startDate ? utils.formatDate(startDate) : ''
    let completionDate = applicant.completedApps[appType] || ''
    // if (!completionDate  &&  app.myProducts) {
    //   app.myProducts.forEach((p) => {
    //     let pr = p['tradle.My' + appType]
    //     if (pr)
    //       completionDate = pr.time
    //   })
    // }
    let completed = completionDate ? utils.formatDate(new Date(completionDate)) : ''
    let days = startDate && completionDate ? Math.ceil((completionDate - startDate) / MILLIS_IN_DAY) : ''
    let changedCol = {}
    if (stats.changed)
      changedCol = {[stats.changed]: styles.changedCol}

    return  <Row size={8} style={{borderBottomColor: '#aaaaaa', borderBottomWidth: 1}} key={'app_' + cnt}>
              <Col sm={1} md={1} lg={1}>
                <Text style={{alignSelf: 'center', padding: 3}}>
                  {owner.title || ''}
                </Text>
              </Col>
              <Col sm={1} md={1} lg={1} style={changedCol.forms || styles.col}>
                <Text style={styles.cell}>
                  {resource.forms.length}
                </Text>
              </Col>
              <Col sm={1} md={1} lg={1} style={changedCol.formErrors || styles.col}>
                <Text style={styles.cell}>
                  {resource.formErrors.length}
                </Text>
              </Col>
              <Col sm={1} md={1} lg={1} style={changedCol.formCorrections || styles.col}>
                <Text style={styles.cell}>
                  {resource.formCorrections.length}
                </Text>
              </Col>
              <Col sm={1} md={1} lg={1} style={changedCol.verifications || styles.col}>
                <Text style={styles.cell}>
                  {resource.verifications.length}
                </Text>
              </Col>
              <Col sm={1} md={1} lg={1} style={styles.col}>
                <Text style={styles.cell}>
                  {start}
                </Text>
              </Col>
              <Col sm={1} md={1} lg={1} style={styles.col}>
                <Text style={styles.cell}>
                  {completed}
                </Text>
              </Col>
              <Col sm={1} md={1} lg={1} style={styles.col}>
                <Text style={styles.cell}>
                  {days}
                </Text>
              </Col>
            </Row>
  }
  render() {
    let rows = []
    let applicants = this.state.applicants || this.props.applicants
    let products = []
    let cnt = 0

    let pTypes = {}
    if (applicants) {
      for (let app in applicants) {
        let a = applicants[app]
        if (a.applications  &&  a.applications.length)
          a.applications.forEach((app) => pTypes[app.productType] = app.productType)
      }
    }
    // this.props.provider.applications.forEach((a) => {
    pTypes = Object.keys(pTypes)
    pTypes.forEach((productType) => {
      if (products.indexOf(productType) !== -1)
        return
      products.push(productType)
      rows.push(<Row size={8} style={styles.topRow} key={'app_' + cnt++}>
                  <Col sm={8} md={8} lg={8}>
                    <Text style={styles.topRowCell}>
                      {utils.getModel(productType).value.title}
                    </Text>
                  </Col>
                </Row>)
      for (let p in applicants) {
        let app = applicants[p]
        app.allPerApp.forEach((appProps) => {
          if (appProps.app.productType === productType)
            rows.push(this.renderRow(appProps, app, cnt++))
        })
      }
    })
    return (
      <PageView style={platformStyles.container}>
        <ScrollView>
          <NetworkInfoProvider connected={this.state.isConnected} />
          {this.renderHeader()}
          <View style={styles.separator} />
          {rows}
          {rows.length > 7 ? this.renderHeader(true) : <View/>}
        </ScrollView>
      </PageView>
    )
  }

  render1() {
    let rows = []
    let applicants = this.state.applicants
    let products = []
    let cnt = 0

    let pTypes = {}
    if (applicants) {
      for (let app in applicants) {
        let a = applicants[app]
        if (a.applications  &&  a.applications.length)
          a.applications.forEach((app) => pTypes[app.productType] = app.productType)
      }
    }
    // this.props.provider.applications.forEach((a) => {
    pTypes = Object.keys(pTypes)
    pTypes.forEach((productType) => {
      if (products.indexOf(productType) !== -1)
        return
      products.push(productType)
      rows.push(<Row size={8} style={styles.topRow} key={'app_' + cnt++}>
                  <Col sm={8} md={8} lg={8}>
                    <Text style={styles.topRowCell}>
                      {utils.getModel(productType).value.title}
                    </Text>
                  </Col>
                </Row>)
      for (let p in applicants) {
        let app = applicants[p]
        app.allPerApp.forEach((appProps) => {
          if (appProps.app.productType === productType)
            rows.push(this.renderRow(appProps, app, cnt++))
        })
      }
    })
    return (
      <PageView style={platformStyles.container}>
        <ScrollView>
          <NetworkInfoProvider connected={this.state.isConnected} />
          {this.renderHeader()}
          <View style={styles.separator} />
          {rows}
          {rows.length > 7 ? this.renderHeader(true) : <View/>}
        </ScrollView>
      </PageView>
    )
  }
  renderHeader(isFooter) {
    let top = <Row size={8} style={styles.topRow}>
                <Col sm={1} md={1} lg={1}>
                  <Text>
                  </Text>
                </Col>
                <Col sm={1} md={1} lg={1}>
                  <Text style={styles.topRowCell}>
                    Forms
                  </Text>
                </Col>
                <Col sm={2} md={2} lg={2}>
                  <Text style={styles.topRowCell}>
                    Corrections
                  </Text>
                </Col>
                <Col sm={1} md={1} lg={1}>
                  <Text style={styles.topRowCell}>
                    Verified
                  </Text>
                </Col>
                <Col sm={2} md={2} lg={2}>
                  <Text style={styles.topRowCell}>
                    Submissions
                  </Text>
                </Col>
                <Col sm={1} md={1} lg={1}>
                  <Text style={styles.topRowCell}>
                    Elapsed
                  </Text>
                </Col>
              </Row>

    let titles = ['Customer', 'Submitted', 'Requested', 'Completed', this.props.provider.title, 'Started', 'Completed', 'Days']
    return <View style={{backgroundColor: '#FBFFE5'}}>
            {isFooter ? <View/> : top}
            <Row size={8} style={{borderBottomColor: '#aaaaaa', borderBottomWidth: 1}}>
              {getCols(titles)}
            </Row>
          </View>


    function getCols(titles) {
      let cols = []
      let cnt = 1
      titles.forEach((t) =>
        cols.push(<Col sm={1} md={1} lg={1} style={styles.col} key={t + '_' + cnt++}>
                    <Text style={styles.cell}>{t}</Text>
                  </Col>)
      )
      return cols
    }
  }
}
reactMixin(SupervisoryViewPerProvider.prototype, Reflux.ListenerMixin);

var styles = StyleSheet.create({
  topRow: {
    borderBottomColor: '#aaaaaa',
    borderBottomWidth: 1,
  },
  topRowCell: {
    paddingVertical: 5,
    fontSize:  16,
    fontWeight: '600',
    alignSelf: 'center',
  },
  col: {
    borderLeftColor: '#aaaaaa',
    borderLeftWidth: 1,
  },
  changedCol: {
    borderLeftColor: '#aaaaaa',
    backgroundColor: 'pink',
    borderLeftWidth: 1,
  },
  cell: {
    paddingVertical: 5,
    fontSize: 14,
    alignSelf: 'center'
  },
  customerCell: {
    fontWeight: '600',
    alignSelf: 'center',
    paddingVertical: 5
  }
});

module.exports = SupervisoryViewPerProvider
