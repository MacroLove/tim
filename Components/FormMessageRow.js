'use strict';

var utils = require('../utils/utils');
var translate = utils.translate
var ArticleView = require('./ArticleView');
var MessageView = require('./MessageView');
var NewResource = require('./NewResource');
var dateformat = require('dateformat')
var PhotoList = require('./PhotoList');
var Icon = require('react-native-vector-icons/Ionicons');
var constants = require('@tradle/constants');
var RowMixin = require('./RowMixin');
var equal = require('deep-equal')
import { makeResponsive } from 'react-native-orient'
var StyleSheet = require('../StyleSheet')
var chatStyles = require('../styles/chatStyles')
var reactMixin = require('react-mixin');

var STRUCTURED_MESSAGE_COLOR
const MAX_PROPS_IN_FORM = 1
const PRODUCT_APPLICATION = 'tradle.ProductApplication'
import {
  // StyleSheet,
  Text,
  TouchableHighlight,
  Navigator,
  View
} from 'react-native'

import React, { Component } from 'react'

class FormMessageRow extends Component {
  constructor(props) {
    super(props);
    var resource = this.props.resource;
    var me = utils.getMe();
    STRUCTURED_MESSAGE_COLOR = this.props.bankStyle.STRUCTURED_MESSAGE_COLOR
  }
  shouldComponentUpdate(nextProps, nextState) {
    return !equal(this.props.resource, nextProps.resource) ||
           !equal(this.props.to, nextProps.to)             ||
           this.props.orientation != nextProps.orientation ||
           this.props.sendStatus !== nextProps.sendStatus
  }

  onPress(event) {
    this.props.navigator.push({
      id: 7,
      component: ArticleView,
      passProps: {url: this.props.resource.message}
    });
  }
  verify(event) {
    var resource = this.props.resource;
    var isVerification = resource[constants.TYPE] === constants.TYPES.VERIFICATION;
    var r = isVerification ? resource.document : resource

    var passProps = {
      resource: r,
      bankStyle: this.props.bankStyle,
      currency: this.props.currency
    }
    if (!isVerification)
      passProps.verify = true
    else
      passProps.verification = resource

    var model = utils.getModel(r[constants.TYPE]).value;
    var route = {
      id: 5,
      component: MessageView,
      backButtonTitle: 'Back',
      passProps: passProps,
      title: translate(model)
    }
    if (this.isMyMessage()) {
      route.rightButtonTitle = 'Edit'
      route.onRightButtonPress = {
        title: 'Edit',
        component: NewResource,
        // titleTextColor: '#7AAAC3',
        id: 4,
        passProps: {
          resource: r,
          metadata: model,
          bankStyle: this.props.bankStyle,
          currency: this.props.currency,
          callback: this.props.onSelect.bind(this, r)
        }
      };
    }
    this.props.navigator.push(route);
  }
  render() {
    var resource = this.props.resource;
    var to = this.props.to;
    var model = utils.getModel(resource[constants.TYPE]).value
    let photos = utils.getResourcePhotos(model, resource)
    var photoListStyle = {height: 3};
    var photoUrls = []
    var isMyMessage = this.isMyMessage()
    if (photos) {
      photos.forEach((p) => {
        photoUrls.push({url: utils.getImageUri(p.url)});
      })
      let isSharedContext = to[constants.TYPE] === PRODUCT_APPLICATION && utils.isReadOnlyChat(this.props.context)
      photoListStyle = {
        flexDirection: 'row',
        alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
        // marginLeft: isMyMessage ? 30 : isSharedContext ? 45 : 0, //(hasOwnerPhoto ? 45 : 10),
        borderRadius: 10,
        marginBottom: 3,
      }
    }
    var len = photoUrls.length;
    var inRow = len === 1 ? 1 : (len == 2 || len == 4) ? 2 : 3;
    var photoStyle = {};
    var width = utils.dimensions(FormMessageRow).width
    let msgWidth =  Math.floor(width * 0.7)
    if (inRow > 0) {
      if (inRow === 1) {
        var ww = Math.max(240, msgWidth / 2)
        var hh = ww * 280 / 240
        photoStyle = [chatStyles.bigImage, {
          width:  ww,
          height: hh
        }]
      }
      else if (inRow === 2)
        photoStyle = chatStyles.mediumImage;
      else
        photoStyle = chatStyles.image;
    }
    var sendStatus = <View />
    if (this.props.sendStatus  &&  this.props.sendStatus !== null)
      sendStatus = this.getSendStatus()
    // var val = this.getTime(resource);
    // var date = val
    //          ? <Text style={chatStyles.date}>{val}</Text>
    //          : <View />;

    return  <View style={{margin: 1, backgroundColor: this.props.bankStyle.BACKGROUND_COLOR}}>
              <TouchableHighlight onPress={this.props.onSelect.bind(this, resource, null)} underlayColor='transparent'>
                {this.formStub(resource, to)}
              </TouchableHighlight>
              <View style={photoListStyle}>
                <PhotoList photos={photoUrls} resource={this.props.resource} style={[photoStyle, {marginTop: -5}]} navigator={this.props.navigator} numberInRow={inRow} chat={this.props.to} />
              </View>
              {sendStatus}
            </View>
  }
  formStub(resource, to) {
    let hasSentTo = !to || utils.getId(to) !== utils.getId(resource.to.organization)
    let sentTo = hasSentTo
               ? <View style={{padding: 5}}>
                   <Text style={{color: '#7AAAC3', fontSize: 14, alignSelf: 'flex-end'}}>{translate('asSentTo', resource.to.organization.title)}</Text>
                 </View>
               : <View/>

    let renderedRow = []
    let ret = this.formatRow(true, renderedRow)
    let noContent = !hasSentTo &&  !renderedRow.length

    let isMyMessage = this.isMyMessage()
    let isSharedContext = to  &&  to[constants.TYPE] === PRODUCT_APPLICATION && utils.isReadOnlyChat(this.props.context)
    let width = Math.floor(utils.dimensions().width * 0.7) - (isSharedContext  ? 45 : 0)
    var viewStyle = {
      width: Math.min(width, 600),
      alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
      // marginLeft: isMyMessage ? 30 : 0, //(hasOwnerPhoto ? 45 : 10),
      backgroundColor: this.props.bankStyle.BACKGROUND_COLOR,
      flexDirection: 'row',
    }

    let headerStyle = [
      chatStyles.verifiedHeader,
      noContent ? {borderBottomLeftRadius: 10, borderBottomRightRadius: 10} : {},
      {backgroundColor: this.props.bankStyle.SHARED_WITH_BG}, // opacity: isShared ? 0.5 : 1},
      isMyMessage ? {borderTopRightRadius: 0, borderTopLeftRadius: 10 } : {borderTopRightRadius: 10, borderTopLeftRadius: 0 }
    ]

    var st = {
      margin: 1,
      paddingRight: 10,
      // flexDirection: 'row',
      backgroundColor: this.props.bankStyle.BACKGROUND_COLOR
    }
    var sealedStatus = (resource.txId)
                     ? <View style={chatStyles.sealedStatus}>
                         <Icon style={{marginTop: 2}} name='md-done-all' size={20} color='#EBFCFF'/>
                       </View>
                     : <View />

    let row
    if (noContent)
      row = <View/>
    else
      row = <View style={{paddingVertical: 5}}>
              {renderedRow}
              {sentTo}
            </View>

    var ownerPhoto = this.getOwnerPhoto(isMyMessage)
    return (
      <View style={st, viewStyle} key={this.getNextKey()}>
        {ownerPhoto}
        <View style={[{flex:1}, chatStyles.verificationBody]}>
          <View style={headerStyle}>
            {sealedStatus}
            <Text style={chatStyles.verificationHeaderText}>{translate(utils.getModel(resource[constants.TYPE]).value)}</Text>
            <Icon color='#EBFCFF' size={20} name={'ios-arrow-forward'} style={{marginTop: 2, position: 'absolute', right: 10}}/>
          </View>
          {row}
        </View>
      </View>
    );
  }

  formatRow(isMyMessage, renderedRow) {
    var resource = this.props.resource;
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;

    var viewCols = model.gridCols || model.viewCols;
    if (!viewCols)
      return
    var first = true;
    var self = this;

    var properties = model.properties;
    var onPressCall;

    var self = this
    var vCols = [];

    viewCols.forEach(function(v) {
      if (vCols.length > MAX_PROPS_IN_FORM)
        return
      if (properties[v].type === 'array')
        return;
      if (properties[v].ref) {
        if (resource[v]) {
          vCols.push(self.getPropRow(properties[v], resource, resource[v].title || resource[v]))
          first = false;
        }
        return;
      }
      var style = chatStyles.resourceTitle
      if (isMyMessage)
        style = [style, styles.myMsg];

      if (resource[v]                      &&
          properties[v].type === 'string'  &&
          (resource[v].indexOf('http://') == 0  ||  resource[v].indexOf('https://') == 0)) {
        onPressCall = self.onPress.bind(self);
        vCols.push(<Text style={style} key={self.getNextKey()}>{resource[v]}</Text>);
      }
      else if (!model.autoCreate) {
        let val
        if (properties[v].type === 'date')
          // val = dateformat(new Date(resource[v]), 'mmm d, yyyy')

          val = resource[v] ? dateformat(new Date(resource[v]), 'mmm d, yyyy') : null

        else
           val = (properties[v].displayAs)
                ? utils.templateIt(properties[v], resource)
                : properties[v].type === 'boolean' ? (resource[v] ? 'Yes' : 'No') : resource[v];

        if (!val)
          return
        if (model.properties.verifications  &&  !isMyMessage && !utils.isVerifier(resource))
          onPressCall = self.verify.bind(self);
        if (!isMyMessage)
          style = [style, {paddingBottom: 10, color: '#2892C6'}];
        vCols.push(self.getPropRow(properties[v], resource, val))
      }
      else {
        if (!resource[v]  ||  !resource[v].length)
          return
        vCols.push(<Text style={style} key={self.getNextKey()}>{resource[v]}</Text>);
      }
      first = false;

    });

    if (vCols.length > MAX_PROPS_IN_FORM)
      vCols.splice(MAX_PROPS_IN_FORM, 1)

    // else
    //   vCols.push(<Text style={[chatStyles.resourceTitle, chatStyles.formType, {color: isMyMessage ? '#EBFCFF' : this.props.bankStyle.STRUCTURED_MESSAGE_BORDER}]} key={this.getNextKey()}>{title}</Text>);

    if (vCols  &&  vCols.length) {
      vCols.forEach((v) => {
        renderedRow.push(v);
      })
    }
    if (onPressCall)
      return {onPressCall: onPressCall}
    return {onPressCall: this.props.onSelect.bind(this, resource, null)}
  }
}

var styles = StyleSheet.create({
  myMsg: {
    justifyContent: 'flex-end',
    // color: '#ffffff'
  },
  youSharedText: {
    color: '#ffffff',
    fontSize: 18
  }
});
reactMixin(FormMessageRow.prototype, RowMixin);
FormMessageRow = makeResponsive(FormMessageRow)

module.exports = FormMessageRow;

  // render() {
  //   var resource = this.props.resource;
  //   var isMyMessage = this.isMyMessage()
  //   var to = this.props.to;

  //   if (isMyMessage  &&  resource.to.organization  &&  utils.getId(resource.to.organization) !== utils.getId(to)) {
      // return  <View style={{margin: 1, backgroundColor: this.props.bankStyle.BACKGROUND_COLOR}}>
      //           <TouchableHighlight onPress={this.props.onSelect.bind(this, resource, null)} underlayColor='transparent'>
      //             {this.formStub(resource)}
      //           </TouchableHighlight>
      //          </View>
    // }

    // var model = utils.getModel(resource[constants.TYPE]).value;

    // var me = utils.getMe();
    // // var isVerifier = utils.isVerifier(resource)
    // var ownerPhoto = this.getOwnerPhoto(isMyMessage)
    // let hasOwnerPhoto = !isMyMessage &&  to  &&  to.photos;

    // var renderedRow = [];
    // var ret = this.formatRow(isMyMessage, renderedRow);
    // let onPressCall = ret ? ret.onPressCall : null

    // var photoUrls = [];
    // var photoListStyle = {height: 3};
    // var addStyle, inRow;
    // var noMessage = !resource.message  ||  !resource.message.length;
    // if (!renderedRow.length) {
    //   var vCols = noMessage ? null : utils.getDisplayName(resource, model.properties);
    //   if (vCols)
    //     renderedRow = <Text style={chatStyles.resourceTitle}>{vCols}</Text>;
    // }
    // else {
    //   var fromHash = resource.from.id
    //   if (isMyMessage) {
    //     if (!noMessage)
    //       addStyle = chatStyles.myCell
    //     addStyle = [addStyle, chatStyles.verificationBody, {backgroundColor: STRUCTURED_MESSAGE_COLOR, borderColor: '#C1E3E8', paddingBottom: 5, borderTopLeftRadius: 0, borderTopRightRadius: 0 }];
    //   }
    //   else
    //     addStyle = [chatStyles.verificationBody, {flex: 1, borderColor: '#efefef', backgroundColor: '#ffffff', borderTopLeftRadius: 0, borderTopRightRadius: 0 }];
    // }
    // var properties = model.properties;
    // let photos = utils.getResourcePhotos(model, resource)
    // if (photos) {
    //   var len = photos.length;
    //   inRow = len === 1 ? 1 : (len == 2 || len == 4) ? 2 : 3;
    //   var style;
    //   if (inRow === 1)
    //     style = chatStyles.bigImage;
    //   else if (inRow === 2)
    //     style = chatStyles.mediumImage;
    //   else
    //     style = chatStyles.image;
    //   photos.forEach((p) => {
    //     photoUrls.push({url: utils.getImageUri(p.url)});
    //   })
    //   let isSharedContext = to[constants.TYPE] === PRODUCT_APPLICATION && utils.isReadOnlyChat(this.props.context)

    //   photoListStyle = {
    //     flexDirection: 'row',
    //     alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
    //     marginLeft: isMyMessage ? 30 : isSharedContext ? 45 : 0, //(hasOwnerPhoto ? 45 : 10),
    //     borderRadius: 10,
    //     marginBottom: 3,
    //   }
    // }
    // var rowStyle = [chatStyles.row, {backgroundColor: this.props.bankStyle.BACKGROUND_COLOR}];
    // var val = this.getTime(resource);
    // var date = val
    //          ? <Text style={chatStyles.date}>{val}</Text>
    //          : <View />;

    // var sendStatus = <View />
    // if (this.props.sendStatus  &&  this.props.sendStatus !== null)
    //   sendStatus = this.getSendStatus()

    // let cellStyle = [chatStyles.textContainer]
    // if (addStyle) {
    //   if (Array.isArray(addStyle))
    //     addStyle.forEach((a) => cellStyle.push(a))
    //   else
    //     cellStyle.push(addStyle)
    // }

    // HACK that solves the case when the message is short and we don't want it to be displayed
    // in a bigger than needed bubble
    // var width = utils.dimensions(FormMessageRow).width
    // let msgWidth =  Math.floor(width * 0.7)

    // var viewStyle = { width: msgWidth, flexDirection: 'row', alignSelf: isMyMessage ? 'flex-end' : 'flex-start'};

    // var messageBody;
    // messageBody =
    //   <TouchableHighlight onPress={onPressCall ? onPressCall : () => {}} underlayColor='transparent'>
    //     <View style={[rowStyle, viewStyle]}>
    //       {ownerPhoto}
    //       <View style={cellStyle}>
    //         <View style={{flex: 1}}>
    //         {this.isShared()
    //           ? <View style={[chatStyles.verifiedHeader, {backgroundColor: this.props.bankStyle.SHARED_WITH_BG}]}>
    //               <Text style={styles.youSharedText}>{translate('youShared', resource.to.organization.title)}</Text>
    //             </View>
    //           : <View />
    //         }
    //           {renderedRow}
    //        </View>
    //       </View>
    //     </View>
    //   </TouchableHighlight>

    // var len = photoUrls.length;
    // var inRow = len === 1 ? 1 : (len == 2 || len == 4) ? 2 : 3;
    // var photoStyle = {};
    // var height;

    // if (inRow > 0) {
    //   if (inRow === 1) {
    //     var ww = Math.max(240, msgWidth / 2)
    //     var hh = ww * 280 / 240
    //     photoStyle = [chatStyles.bigImage, {
    //       width:  ww,
    //       height: hh
    //     }]
    //   }
    //   else if (inRow === 2)
    //     photoStyle = chatStyles.mediumImage;
    //   else
    //     photoStyle = chatStyles.image;
    // }
                         // <Icon name={'md-done-all'} size={20} color={this.props.bankStyle.REQUEST_FULFILLED} style={{opacity: 0.7}} />
    // return  <View style={{margin: 1, backgroundColor: this.props.bankStyle.BACKGROUND_COLOR}}>
    //           <TouchableHighlight onPress={this.props.onSelect.bind(this, resource, null)} underlayColor='transparent'>
    //             {this.formStub(resource, to)}
    //           </TouchableHighlight>
    //           <View style={photoListStyle}>
    //             <PhotoList photos={photoUrls} resource={this.props.resource} style={[photoStyle, {marginTop: -5}]} navigator={this.props.navigator} numberInRow={inRow} chat={this.props.to} />
    //           </View>
    //           {sendStatus}
    //         </View>
    // var sealedStatus = (resource.txId)
    //                  ? <View style={chatStyles.sealedStatus}>
    //                      <Text style={{fontSize: 20, marginTop: -5}}>{'💋'}</Text>
    //                    </View>
    //                  : <View />

    // let title = translate(model)
    // if (title.length > 30)
    //   title = title.substring(0, 27) + '...'

    // let header = <View style={[viewStyle, {backgroundColor: '#fff', borderTopLeftRadius: 10, flexDirection: 'row', paddingVertical: 5, justifyContent: 'center', borderWidth: 1, borderColor: this.props.bankStyle.STRUCTURED_MESSAGE_COLOR}]} key={this.getNextKey()}>
    //                {sealedStatus}
    //                <Text style={[chatStyles.resourceTitle, {paddingRight: 5, color: this.props.bankStyle.STRUCTURED_MESSAGE_COLOR}]}>{title}</Text>
    //                <Icon color={this.props.bankStyle.STRUCTURED_MESSAGE_COLOR} size={20} name={'ios-arrow-forward'} style={{marginTop: 2, position: 'absolute', right: 10}}/>
    //              </View>

    // return (
    //   <View style={{margin: 1, backgroundColor: this.props.bankStyle.BACKGROUND_COLOR}}>
    //     {date}
    //     {header}
    //     {messageBody}
    //     <View style={photoListStyle}>
    //       <PhotoList photos={photoUrls} resource={this.props.resource} style={[photoStyle, {marginTop: -5}]} navigator={this.props.navigator} numberInRow={inRow} chat={this.props.to} />
    //     </View>
    //     {sendStatus}
    //   </View>
    // )
  // }
