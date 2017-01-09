'use strict';

var ArticleView = require('./ArticleView');
var utils = require('../utils/utils');
var translate = utils.translate
var constants = require('@tradle/constants');
var RowMixin = require('./RowMixin')
var ResourceMixin = require('./ResourceMixin')
var reactMixin = require('react-mixin')
var dateformat = require('dateformat')
var Icon = require('react-native-vector-icons/Ionicons')
var Accordion = require('react-native-accordion')

var NOT_SPECIFIED = '[not specified]'
var DEFAULT_CURRENCY_SYMBOL = '£'
var CURRENCY_SYMBOL
const ENUM = 'tradle.Enum'
const TYPE = constants.TYPE

import StyleSheet from '../StyleSheet'
import {
  Image,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native'

import React, { Component } from 'react'
class VerificationView extends Component {
  props: {
    navigator: PropTypes.object.isRequired,
    resource: PropTypes.object.isRequired,
    currency: PropTypes.string,
    bankStyle: PropTypes.object,
  };
  constructor(props) {
    super(props);
    this.state = {
      promptVisible: null,
    }
    CURRENCY_SYMBOL = props.currency ? props.currency.symbol || props.currency : DEFAULT_CURRENCY_SYMBOL
  }
  render() {
    let resource = this.props.resource
    let vTree = []
    return (
       <View>
        <View style={[styles.textContainer, {padding: 10, alignSelf: 'stretch', alignItems: 'center', backgroundColor: this.props.bankStyle.VERIFIED_HEADER_COLOR}]}>
          <Text style={[styles.description, {color: this.props.bankStyle.VERIFICATION_BG, fontSize:20}]}>{translate('verifiedBy', resource._verifiedBy ? resource._verifiedBy.title : resource.from.title)}</Text>
        </View>
        {this.renderVerification(resource, utils.getModel(constants.TYPES.VERIFICATION).value, vTree, 0, 0)}
      </View>
    );
  }

  renderVerification(resource, model, vTree, currentLayer) {
    var resource = resource ? resource : this.props.resource;
    var vModel = utils.getModel(constants.TYPES.VERIFICATION).value
    if (resource.method) {
      var m = utils.getModel(resource.method[TYPE]).value
      let dnProps = utils.getPropertiesWithAnnotation(m.properties, 'displayName')
      let displayName = utils.getDisplayName(resource.method, m.properties)
      let val = <View>{this.renderResource(resource.method, m)}</View>
      let title = <View style={{backgroundColor: this.props.bankStyle.VERIFICATION_BG, padding: 10, flexDirection: 'row'}}>
                    <Icon name='md-add-circle' size={15} color={this.props.bankStyle.VERIFIED_HEADER_COLOR} style={{ marginTop: 2, justifyContent:'center', paddingRight: 3, paddingLeft: 10 * (currentLayer + 1)}} />
                    <View style={{flexDirection: 'column'}}>
                      <Text style={{color: this.props.bankStyle.VERIFIED_HEADER_COLOR, fontSize: 18}}>{translate(m)}</Text>
                      <Text style={{color: '#757575', fontSize: 18}}>{displayName}</Text>
                    </View>
                  </View>

      vTree.push(
          <View key={this.getNextKey()}>
            <View style={styles.separator}></View>
            <Accordion
              header={title}
              content={val}
              underlayColor='transparent'
              easing='easeInCirc' />
         </View>
      )
    }
    else if (resource.sources) {
      let arrow = ''
      for (let i=0; i<currentLayer; i++)
        arrow += '→'
      resource.sources.forEach((r) => {
        if (r.method)
          this.renderVerification(r, model, vTree, currentLayer)
        else if (r.from) {
          vTree.push(<View key={this.getNextKey()}>
                       <View style={styles.separator}></View>
                         <View style={[styles.textContainer, {padding: 10, flexDirection: 'row'}]}>
                           <Icon name='ios-play-outline' size={20} color='#757575' style={{justifyContent: 'center', marginTop: 5, paddingLeft: (currentLayer + 1) * 10}} />
                           <Text style={[styles.description, {color: this.props.bankStyle.VERIFIED_SOURCES_COLOR}]}>{translate('sourcesBy', r.from.organization ? r.from.organization.title : r.from.title)}</Text>
                         </View>
                      </View>)
          this.renderVerification(r, model, vTree, currentLayer + 1)
        }
      })
    }
    return vTree
  }

  onPress(url, event) {
    var model = utils.getModel(this.props.resource[TYPE]).value;
    this.props.navigator.push({
      id: 7,
      backButtonTitle: 'Back',
      title: utils.getDisplayName(this.props.resource, model.properties),
      component: ArticleView,
      passProps: {url: url ? url : this.props.resource.url}
    });
  }
  renderResource(resource, model) {
    var resource = resource ? resource : this.props.resource;
    var modelName = resource[TYPE];
    if (!model)
      model = utils.getModel(modelName)
    // var model = utils.getModel(modelName).value;
    var vCols = model.viewCols ? utils.clone(model.viewCols) : null
    let props = model.properties

    if (!vCols) {
      vCols = [];
      for (var p in props) {
        if (p != TYPE)
          vCols.push(p)
      }
    }
    var isMessage = model.interfaces;
    if (!isMessage) {
      var len = vCols.length;
      for (var i=0; i<len; i++) {
        if (props[vCols[i]].displayName) {
          vCols.splice(i, 1);
          len--;
        }
      }
    }
    var first = true;
    let self = this
    var viewCols = vCols.map((p) => {
      var val = resource[p];
      var pMeta = model.properties[p];
      var isRef;
      var isItems
      var isDirectionRow;
      // var isEmail
      if (!val) {
        if (pMeta.displayAs)
          val = utils.templateIt(pMeta, resource);
        else if (this.props.checkProperties) {
          if (p.indexOf('_group') === p.length - 6) {
            return (<View style={{padding: 15}} key={this.getNextKey()}>
                      <View key={this.getNextKey()}  style={{borderBottomColor: this.props.bankStyle.LINK_COLOR, borderBottomWidth: 1, paddingBottom: 5}}>
                        <Text style={{fontSize: 22, color: this.props.bankStyle.LINK_COLOR}}>{translate(pMeta)}</Text>
                      </View>
                    </View>
             );
          }
          else
            val = NOT_SPECIFIED
        }
        else
          return;
      }
      else if (pMeta.ref) {
        if (pMeta.ref == constants.TYPES.MONEY) {
          let c = utils.normalizeCurrencySymbol(val.currency)
          val = (c || CURRENCY_SYMBOL) + val.value
        }
        else if (pMeta.inlined ||  utils.getModel(pMeta.ref).value.inlined)
          return this.renderResource(val, utils.getModel(val[TYPE]).value)

        // Could be enum like props
        else if (utils.getModel(pMeta.ref).value.subClassOf === ENUM)
          val = val.title
        else if (this.props.showVerification) {
          var value = val[TYPE] ? utils.getDisplayName(val, utils.getModel(val[TYPE]).value.properties) : val.title
          val = <Text style={[styles.title, styles.linkTitle]}>{value}</Text>
          isRef = true;
        }
      }
      else if (pMeta.type === 'date')
        val = dateformat(new Date(val), 'fullDate')
      else if (pMeta.range === 'json') {
        // let jsonRows = []
        val = this.showJson(pMeta, val, false, [])
      }
      if (!val)
        return <View key={this.getNextKey()}></View>;
      if (!isRef) {
        // isItems = Array.isArray(val)
        if (pMeta.range !== 'json')
          val = this.renderSimpleProp(val, pMeta, modelName)
      }
      var title = pMeta.skipLabel  ||  isItems
                ? <View />
                : <Text style={styles.title}>{pMeta.title || utils.makeLabel(p)}</Text>
      var separator = first
                    ? <View />
                    : <View style={styles.separator}></View>;

      first = false;
      let style = [styles.textContainer, {padding: 10}]
      style.push(isDirectionRow ? {flexDirection: 'row'} : {flexDirection: 'column'})

      return (<View key={this.getNextKey()}>
               {separator}
               <View style={isDirectionRow ? {flexDirection: 'row'} : {flexDirection: 'column'}}>
                 <View style={[style, {flexDirection: 'column'}]}>
                   {title}
                   {val}
                 </View>
               </View>
             </View>
             );
    });

    let retCols = []
    // flatten the tree
    viewCols.forEach((v) => {
      if (v) {
        if (Array.isArray(v))
          v.forEach((vv) => retCols.push(vv))
        else
          retCols.push(v)
      }
    })
    if (resource.txId) {
      retCols.push(<View key={this.getNextKey()}>
                     <View style={styles.separator}></View>
                     <View style={[styles.textContainer, {padding: 10}]}>
                       <Text style={styles.title}>{translate('irrefutableProofs')}</Text>
                       <TouchableOpacity onPress={this.onPress.bind(this, 'https://tbtc.blockr.io/tx/info/' + resource.txId)}>
                         <Text style={[styles.description, {color: '#7AAAC3'}]}>{translate('independentBlockchainViewer') + ' 1'}</Text>
                       </TouchableOpacity>
                       <TouchableOpacity onPress={this.onPress.bind(this, 'https://test-insight.bitpay.com/tx/' + resource.txId)}>
                         <Text style={[styles.description, {color: '#7AAAC3'}]}>{translate('independentBlockchainViewer') + ' 2'}</Text>
                       </TouchableOpacity>
                      </View>
                    </View>)
    }
    return retCols;
  }
}
reactMixin(VerificationView.prototype, RowMixin);
reactMixin(VerificationView.prototype, ResourceMixin);
var styles = StyleSheet.create({
  textContainer: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#eeeeee',
    marginHorizontal: 15
  },
  description: {
    fontSize: 18,
    marginVertical: 3,
    marginHorizontal: 7,
    color: '#2E3B4E',
  },
  title: {
    fontSize: 16,
    // fontFamily: 'Avenir Next',
    marginTop: 3,
    marginBottom: 0,
    marginHorizontal: 7,
    color: '#9b9b9b'
  },
  linkTitle: {
    color: '#2892C6',
    fontSize: 16
  },
});

module.exports = VerificationView

/*
  renderResource(resource, model) {
    var resource = resource ? resource : this.props.resource;
    var modelName = resource[TYPE];
    var model = utils.getModel(modelName).value;
    var vCols = vCols = model.viewCols
    let props = model.properties

    if (!vCols) {
      vCols = [];
      for (var p in props) {
        if (p != constants.TYPE)
          vCols.push(p)
      }
    }
    var isMessage = model.interfaces;
    if (!isMessage) {
      var len = vCols.length;
      for (var i=0; i<len; i++) {
        if (props[vCols[i]].displayName) {
          vCols.splice(i, 1);
          len--;
        }
      }
    }
    var first = true;
    let self = this
    var viewCols = vCols.map((p) => {
      var val = resource[p];
      var pMeta = model.properties[p];
      var isRef;
      var isItems
      var isDirectionRow;
      // var isEmail
      if (!val) {
        if (pMeta.displayAs)
          val = utils.templateIt(pMeta, resource);
        else if (this.props.checkProperties) {
          if (p.indexOf('_group') === p.length - 6) {
            return (<View style={{padding: 15}} key={this.getNextKey()}>
                      <View key={this.getNextKey()}  style={{borderBottomColor: this.props.bankStyle.LINK_COLOR, borderBottomWidth: 1, paddingBottom: 5}}>
                        <Text style={{fontSize: 22, color: this.props.bankStyle.LINK_COLOR}}>{translate(pMeta)}</Text>
                      </View>
                    </View>
             );
          }
          else
            val = NOT_SPECIFIED
        }
        else
          return;
      }
      else if (pMeta.ref) {
        if (pMeta.ref == constants.TYPES.MONEY) {
          let c = utils.normalizeCurrencySymbol(val.currency)
          val = (c || CURRENCY_SYMBOL) + val.value
        }
        else if (pMeta.inlined)
          return this.renderResource(val, utils.getModel(val[TYPE]).value)

        // Could be enum like props
        else if (utils.getModel(pMeta.ref).value.subClassOf === ENUM)
          val = val.title
        else if (this.props.showVerification) {
          // ex. property that is referencing to the Organization for the contact
          var value = val[TYPE] ? utils.getDisplayName(val, utils.getModel(val[TYPE]).value.properties) : val.title;

          // val = <TouchableOpacity onPress={this.props.showVerification.bind(this, val, pMeta)}>
             val=  <Text style={[styles.title, styles.linkTitle]}>{value}</Text>
               // </TouchableOpacity>

          isRef = true;
        }
      }
      else if (pMeta.type === 'date')
        val = dateformat(new Date(val), 'fullDate')
        // val = utils.formatDate(val);
      // else if (pMeta[constants.SUB_TYPE] === 'email') {
      //   isEmail = true
      //   val = <TouchableOpacity onPress={() => Communications.email([val], null, null, 'My Subject','My body text')}>
      //       <Text  style={[styles.title, styles.linkTitle]}>{val}</Text>
      //   </TouchableOpacity>

      // }

      if (!val)
        return <View key={this.getNextKey()}></View>;
      if (!isRef) {
        if (val instanceof Array) {
          if (pMeta.items.backlink)
            return <View  key={this.getNextKey()} />

          var vCols = pMeta.viewCols;
          if (!vCols)
            vCols = pMeta.items.ref  &&  utils.getModel(pMeta.items.ref).value.viewCols
          var cnt = val.length;
          val = <View style={{marginHorizontal: 7}}>{this.renderItems(val, pMeta)}</View>

          isItems = true
          first = false;
          title = <View style={{flexDirection: 'row'}}>
                    <Text style={styles.title}>{pMeta.title || utils.makeLabel(p)}</Text>
                    {cnt > 3  &&  modelName !== TERMS_AND_CONDITIONS
                      ? <Icon name={'ios-arrow-down'} size={15} color='#7AAAC3' style={{position: 'absolute', right: 10, top: 10}}/>
                      : <View />
                    }
                  </View>

          var separator = first
                    ? <View />
                    : <View style={styles.separator}></View>;
          if (cnt > 3)
            val = <View key={this.getNextKey()}>
                    {separator}
                    <Accordion
                      header={title}
                      content={val}
                      underlayColor='transparent'
                      easing='easeInCirc' />
                 </View>
          else {
            val = <View key={this.getNextKey()}>
                   {title}
                   {val}
                 </View>
          }
        }
        else  {
          if (props[p].units  &&  props[p].units.charAt(0) != '[')
            val += ' ' + props[p].units

          if (val === NOT_SPECIFIED)
            val = <Text style={[styles.description, {color: this.props.bankStyle.LINK}]}>{val}</Text>
          else if (typeof val === 'number')
            val = <Text style={styles.description}>{val}</Text>;
          else if (typeof val === 'boolean')
            val = <Text style={styles.description}>{val ? 'Yes' : 'No'}</Text>;
          else if (pMeta.type === 'boolean')
            val = <Text style={styles.description}>{val.title}</Text>;
          else if (pMeta.type !== 'object'  &&  (typeof val === 'string')  &&  (val.indexOf('http://') == 0  ||  val.indexOf('https://') === 0))
            val = <Text onPress={this.onPress.bind(this, val)} style={[styles.description, {color: '#7AAAC3'}]}>{val}</Text>;
          else if (modelName === TERMS_AND_CONDITIONS)
            val = <Text style={[styles.description, {flexWrap: 'wrap'}]}>{val}</Text>;
          else
            val = <Text style={[styles.description]} numberOfLines={2}>{val}</Text>;

        }
      }
      var title = pMeta.skipLabel  ||  isItems
                ? <View />
                : <Text style={modelName === TERMS_AND_CONDITIONS ? styles.bigTitle : styles.title}>{pMeta.title || utils.makeLabel(p)}</Text>
      var separator = first
                    ? <View />
                    : <View style={styles.separator}></View>;

      first = false;
      let style = [styles.textContainer, {padding: 10}]
      if (isDirectionRow)
        style.push({flexDirection: 'row'})
      else
        style.push({flexDirection: 'column'})

      return (<View key={this.getNextKey()}>
               {separator}
               <View style={isDirectionRow ? {flexDirection: 'row'} : {flexDirection: 'column'}}>
                 <View style={[style, {flexDirection: 'column'}]}>
                   {title}
                   {val}
                 </View>
               </View>
             </View>
             );
    });

    let retCols = []
    viewCols.forEach((v) => {
      if (!v)
        return
      if (Array.isArray(v)) {
        v.forEach((vv) => {
          retCols.push(vv)
        })
      }
      else
        retCols.push(v)
    })
    if (resource.txId) {
      retCols.push(<View key={this.getNextKey()}>
                     <View style={styles.separator}></View>
                     <View style={[styles.textContainer, {padding: 10}]}>
                       <Text style={styles.title}>{translate('irrefutableProofs')}</Text>
                       <TouchableOpacity onPress={this.onPress.bind(this, 'https://tbtc.blockr.io/tx/info/' + resource.txId)}>
                         <Text style={[styles.description, {color: '#7AAAC3'}]}>{translate('independentBlockchainViewer') + ' 1'}</Text>
                       </TouchableOpacity>
                       <TouchableOpacity onPress={this.onPress.bind(this, 'https://test-insight.bitpay.com/tx/' + resource.txId)}>
                         <Text style={[styles.description, {color: '#7AAAC3'}]}>{translate('independentBlockchainViewer') + ' 2'}</Text>
                       </TouchableOpacity>
                      </View>
                    </View>)
    }
    return retCols;
  }
*/
