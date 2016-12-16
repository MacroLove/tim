'use strict';

var utils = require('../utils/utils');
var translate = utils.translate
import LinearGradient from 'react-native-linear-gradient';
var ArticleView = require('./ArticleView');
var constants = require('@tradle/constants');
var Icon = require('react-native-vector-icons/Ionicons');
var RowMixin = require('./RowMixin');
var ResourceList = require('./ResourceList')
var Swipeout = require('react-native-swipeout')

var equal = require('deep-equal')
var extend = require('extend')
var Store = require('../Store/Store');
var Actions = require('../Actions/Actions');
var Reflux = require('reflux');
var reactMixin = require('react-mixin');

var StyleSheet = require('../StyleSheet')

import {
  Image,
  PixelRatio,
  // StyleSheet,
  Platform,
  Text,
  TouchableHighlight,
  View
} from 'react-native';

import React, { Component } from 'react'
import ActivityIndicator from './ActivityIndicator'
import Geometry from './Geometry'
const PRODUCT_APPLICATION = 'tradle.ProductApplication'
const UNREAD_COLOR = '#FF6D0D'

var dateProp

class ResourceRow extends Component {
  constructor(props) {
    super(props)
    if (props.changeSharedWithList)
      this.state = {sharedWith: true}
    // Multichooser for sharing context; isChooser for choosing delegated trusted party for requested verification
    if (props.multiChooser)
      this.state = {isChosen: false}
    if (props.resource[constants.TYPE] === constants.TYPES.PROFILE)
      this.state = {resource: props.resource, unread: props.resource._unread}
  }
  componentDidMount() {
    this.listenTo(Store, 'onRowUpdate');
  }
  onRowUpdate(params) {
    if (params.action !== 'updateRow')
      return
    if (params.resource[constants.ROOT_HASH] === this.props.resource[constants.ROOT_HASH])
      this.setState({unread: params.resource._unread})
  }
  shouldComponentUpdate(nextProps, nextState) {
    if (Object.keys(this.props).length  !== Object.keys(nextProps).length)
      return true
    if (this.props.resource.lastMessage !== nextProps.resource.lastMessage)
      return true
    if (this.state || nextState) {
      if (this.state.unread !== nextState.unread)
        return true
      if (nextState.sharedWith  &&  nextState.sharedWith === this.state.sharedWith)
        return true
      if (this.state  &&  nextState) {
        if (Object.keys(this.state).length  !== Object.keys(nextState).length)
          return true
      }
      else
        return true
    }
    var opts = {strict: true}
    for (var p in this.props) {
      if (typeof this.props[p] === 'function') {
        if ('' + this.props[p] !== '' + nextProps[p])
          return true
      }
      else if (this.props[p] !== nextProps[p]) {
        if (!equal(this.props[p], nextProps[p], opts))
          return true
      }
    }
    if (!this.state  &&  !nextState)
      return false
    for (var p in this.state) {
      if (this.state[p] !== nextState[p]) {
        if (!equal(this.state[p], nextState[p], opts))
          return true
      }
    }
    return false
  }

  render() {
    var resource = this.props.resource;
    var photo;
    let rType = resource[constants.TYPE]
    var isIdentity = rType === constants.TYPES.PROFILE;
    var noImage;
    if (resource.photos &&  resource.photos.length) {
      var uri = utils.getImageUri(resource.photos[0].url);
      var params = {
        uri: utils.getImageUri(uri)
      }
      if (uri.indexOf('/var/mobile/') === 0)
        params.isStatic = true
      photo = <Image source={params} style={styles.cellImage}  key={this.getNextKey()} />;
    }
    else {
      if (isIdentity) {
        if (!resource.firstName  &&  !resource.lastName)
          return <View/>
        var name = (resource.firstName ? resource.firstName.charAt(0) : '');
        name += (resource.lastName ? resource.lastName.charAt(0) : '');
        photo = <LinearGradient colors={['#A4CCE0', '#7AAAc3', '#5E92AD']} style={styles.cellRoundImage}>
           <Text style={styles.cellText}>{name}</Text>
        </LinearGradient>
      }
      else  {
        var model = utils.getModel(resource[constants.TYPE]).value;
        var icon = model.icon;
        if (icon)
          photo = <View style={styles.cellImage}><Icon name={icon} size={35} color='#7AAAc3' style={styles.icon} /></View>
        else if (model.properties.photos)
          photo = <View style={styles.cellImage} />
        else {
          photo = <View style={styles.cellNoImage} />
          noImage = true
        }
      }
    }
    if (!this.props.isChooser  &&  photo  &&  rType === constants.TYPES.ORGANIZATION) {
      var onlineStatus = (
        <Geometry.Circle size={20} style={styles.online}>
          <Geometry.Circle size={18} style={{ backgroundColor: resource._online ? '#62C457' : '#FAD70C' }} />
        </Geometry.Circle>
      )

      photo = <View style={{flexDirection: 'row'}}>
                {photo}
                {onlineStatus}
              </View>
    }

    var rId = utils.getId(this.props.resource)
    // var cancelResource = (this.props.onCancel ||  this.state)
    //                    ? <TouchableHighlight onPress={this.action.bind(this)} underlayColor='transparent' style={{position: 'absolute', right: 0, top: 20}}>
    //                        <View>
    //                          <Icon name={this.state.sharedWith[rId] ? 'ios-checkmark-circle-outline' : 'ios-radio-button-off'}  size={30}  color={this.state.sharedWith[rId] ? '#B1010E' : '#dddddd'}  style={styles.cancelIcon} />
    //                        </View>
    //                      </TouchableHighlight>
    //                    : <View />;
    var cancelResource = (this.props.onCancel  ||  (this.state && this.state.sharedWith))
                       ?  <View style={styles.multiChooser}>
                             <Icon name={this.state.sharedWith ? 'ios-checkmark-circle-outline' : 'ios-radio-button-off'}  size={30}  color={this.state.sharedWith ? '#B1010E' : '#dddddd'} />
                           </View>
                       : <View />

    var multiChooser = this.props.multiChooser
                     ?  <View style={styles.multiChooser}>
                          <TouchableHighlight underlayColor='transparent' onPress={this.chooseToShare.bind(this)}>
                           <Icon name={this.state.isChosen ? 'ios-checkmark-circle-outline' : 'ios-radio-button-off'}  size={30}  color='#7AAAc3' />
                          </TouchableHighlight>
                        </View>
                      : <View />
    var textStyle = /*noImage ? [styles.textContainer, {marginVertical: 7}] :*/ styles.textContainer;

    let dateRow
    if (!this.props.isChooser  &&  dateProp  &&  resource[dateProp]) {
      var val = utils.formatDate(new Date(resource[dateProp]), true)
      // var dateBlock = self.addDateProp(resource, dateProp, true);
      dateRow = <View style={{position: 'absolute', top: 2, backgroundColor: 'transparent', right: 10}}>
                  <Text style={styles.verySmallLetters}>{val}</Text>
                </View>
    }
    else
      dateRow = <View/>

    let isNewContact = this.props.newContact  &&  this.props.newContact[constants.ROOT_HASH] === resource[constants.ROOT_HASH]
    let count
    if (isIdentity)
      count = resource._unread

    count = count ? <View style={styles.countView}>
                      <Text style={styles.countText}>{count}</Text>
                    </View>
                  : <View/>

    // Grey out if not loaded provider info yet
            // <ActivityIndicator hidden='true' color='#629BCA'/>
    var isOpaque = resource[constants.TYPE] === constants.TYPES.ORGANIZATION && !resource.contacts  &&  !this.props.isChooser
    if (isOpaque)
      return (
      <View key={this.getNextKey()} style={{opacity: 0.5}}>
        <View style={styles.row} key={this.getNextKey()}>
          {photo}
          <View style={[textStyle, {flexDirection: 'row', justifyContent: 'space-between'}]}>
            {this.formatRow(resource)}
          </View>
          {dateRow}
          {multiChooser}
          {cancelResource}
        </View>
        <View style={styles.cellBorder}  key={this.getNextKey()} />
      </View>
        )
    else {
      let onPress = this.action.bind(this)
      // let onPress = this.state  &&  !this.state.resource
      //             ? this.action.bind(this)
      //             : this.props.onSelect
      return (
        <View key={this.getNextKey()} style={{opacity: 1, justifyContent: 'center', backgroundColor: '#ffffff'}}>
          <TouchableHighlight onPress={onPress} underlayColor='transparent' key={this.getNextKey()}>
            <View style={[styles.row, {width: utils.dimensions(ResourceRow).width - 50}]} key={this.getNextKey()}>
              {photo}
              <View style={textStyle} key={this.getNextKey()}>
                {this.formatRow(resource)}
              </View>
            </View>
          </TouchableHighlight>
          {this.props.isOfficialAccounts
          ? <TouchableHighlight underlayColor='transparent' style={{position: 'absolute', right: 10, top: 25, backgroundColor: 'white'}} onPress={() => {
              this.props.navigator.push({
                component: ResourceList,
                title: translate("myDocuments"),
                backButtonTitle: translate('back'),
                passProps: {
                  modelName: constants.TYPES.FORM,
                  resource: this.props.resource
                }
              })
            }}>
              <View style={textStyle}>
                 {resource.numberOfForms
                    ? <View style={{flexDirection: 'row'}}>
                         <Icon name='ios-paper-outline' color={'#7AAAc3'} size={30} style={{marginTop: Platform.OS === 'ios' ? 0 : 0}}/>
                         <Text style={{fontWeight: '600', marginLeft: 2, marginTop: Platform.OS === 'ios' ? -5 : -5, color: '#7AAAc3'}}>{resource.numberOfForms}</Text>
                      </View>
                    : <View />
                 }
              </View>
            </TouchableHighlight>
            : <View />}
          {count}
          {dateRow}
          {multiChooser}
          {cancelResource}
          <View style={isNewContact ? styles.highlightedCellBorder : styles.cellBorder}  key={this.getNextKey()} />
        </View>
      );
    }
  }

  chooseToShare() {
    let resource = this.props.resource
    let id = utils.getId(resource)
    if (this.state.isChosen) {
      this.setState({isChosen: false})
      delete this.props.chosen[id]
    }
    else {
      this.setState({isChosen: true})
      this.props.chosen[id] = ''
    }
  }
  action() {
    if (this.props.multiChooser)
      this.chooseToShare()
    else if (this.props.onCancel)
      this.props.onCancel()
    else if (this.props.changeSharedWithList  &&  (typeof this.props.changeSharedWithList != 'undefined')) {
      let id = utils.getId(this.props.resource)
      this.setState({sharedWith: this.state.sharedWith ? false : true})
      this.props.changeSharedWithList(id, this.state.sharedWith ? false : true)
    }
    else
      this.props.onSelect(this.props.resource)
  }
  hideResource(resource) {
    let r = {}
    extend(true, r, resource)
    r.hide = true
    Actions.addItem({resource: resource, value: r, meta: utils.getModel(resource[constants.TYPE]).value})
  }
  _allowScroll(scrollEnabled) {
    this.setState({scrollEnabled: scrollEnabled})
  }
  formatRow(resource) {
    var self = this;
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;
    var viewCols = model.gridCols || model.viewCols;
    var renderedViewCols;
    if (!viewCols) {
      if (model.id === 'tradle.Partial') {
        let p = resource.leaves.find((l) => l.key === constants.TYPE && l.value).value
        let productTitle = utils.getModel(p).value.title
        return <View style={{flexDirection: 'row'}}>
                <Text style={[styles.resourceTitle, {fontSize: 18}]} numberOfLines={2}>{resource.provider.title}</Text>
                <Text style={[styles.resourceTitle, {fontSize: 18, color: '#FF6D0D'}]}>{' ' + productTitle}</Text>
              </View>
      }
      var vCols = utils.getDisplayName(resource, model.properties);
      if (vCols && vCols.length) {
        if (model.subClassOf  &&  model.subClassOf === 'tradle.Enum')
          vCols = utils.createAndTranslate(vCols, true)

        return <Text style={styles.resourceTitle} numberOfLines={2}>{vCols}</Text>;
      }
      else
        return <Text style={styles.resourceTitle} numberOfLines={2}>{model.title + ' ' + utils.getFormattedDate(resource.time)}</Text>;
    }
    // HACK
    else if (model.id === PRODUCT_APPLICATION) {
      if (utils.isReadOnlyChat(resource)  &&  resource.to.organization) {
        return <View style={{padding: 5}}>
          <Text style={styles.resourceTitle}>{translate(utils.getModel(resource.product).value)}</Text>
          <Text style={styles.contextOwners}>{resource.from.organization || resource.from.title} -> {resource.to.organization.title}</Text>
        </View>
      }
      return <Text style={styles.resourceTitle}>{translate(utils.getModel(resource.product).value)}</Text>;
    }
    else if (this.props.isChooser)
      return <Text style={styles.resourceTitle}>{utils.getDisplayName(resource)}</Text>

    var vCols = [];
    var properties = model.properties;
    var first = true
    var datePropIdx;
    var datePropsCounter = 0;
    var backlink;
    var cnt = 10;
    for (var i=0; i<viewCols.length; i++) {
      var v = viewCols[i];
      if (properties[v].type === 'array') {
        if (properties[v].items.backlink)
          backlink = v;
        continue;
      }
      if (properties[v].type !== 'date'  ||  !resource[v])
        continue;
      if (resource[v]) {
        if (v === 'dateSubmitted' || v === 'lastMessageTime') {
          dateProp = v;
          if (!datePropsCounter)
            datePropIdx = i;
          datePropsCounter++;
        }
      }
    }
    if (datePropsCounter > 1)
      dateProp = null;

    var isOfficialAccounts = this.props.isOfficialAccounts
    var isIdentity = resource[constants.TYPE] === constants.TYPES.PROFILE;
    viewCols.forEach((v) => {
      if (v === dateProp)
        return;
      if (properties[v].type === 'array')
        return;

      if (!resource[v]  &&  !properties[v].displayAs)
        return;
      var style = first ? styles.resourceTitle : styles.description;
      if (isIdentity  &&  v === 'organization')
        style = [style, {alignSelf: 'flex-end', marginTop: 20}, styles.verySmallLetters];
      if (properties[v].style)
        style = [style, properties[v].style];
      var ref = properties[v].ref;
      if (ref) {
        if (resource[v]) {
          var row;
          if (ref == constants.TYPES.MONEY)
            row = <Text style={style} numberOfLines={first ? 2 : 1} key={self.getNextKey()}>{(resource[v].currency || CURRENCY_SYMBOL) + resource[v].value}</Text>
          else
            row = <Text style={style} numberOfLines={first ? 2 : 1} key={self.getNextKey()}>{resource[v].title}</Text>

          vCols.push(row);
        }
        first = false;
      }
      else if (properties[v].type === 'date') {
        if (!dateProp)
          vCols.push(self.addDateProp(v));
        else
          return;
      }
      else  {
        var row;
        if (resource[v]  &&  (typeof resource[v] != 'string'))
          row = <Text style={style} numberOfLines={1} key={self.getNextKey()}>{resource[v]}</Text>;
        else if (!backlink  &&  resource[v]  && (resource[v].indexOf('http://') == 0  ||  resource[v].indexOf('https://') == 0))
          row = <Text style={style} onPress={self.onPress.bind(self)} numberOfLines={1} key={self.getNextKey()}>{resource[v]}</Text>;
        else {
          var val = properties[v].displayAs ? utils.templateIt(properties[v], resource) : resource[v];
          let msgParts = utils.splitMessage(val);
          if (msgParts.length <= 2)
            val = msgParts[0];
          else {
            val = '';
            for (let i=0; i<msgParts.length - 1; i++)
              val += msgParts[i];
          }
          if (self.props.isOfficialAccounts  &&  v === 'lastMessage') {
            let isMyLastMessage = val.indexOf('You: ') !== -1
            let lastMessageTypeIcon = <View/>
            if (isMyLastMessage) {
              val = val.substring(5)
              let lastMessageType = resource.lastMessageType
              if (lastMessageType) {
                let msgModel = utils.getModel(lastMessageType).value
                let icon
                if (msgModel.subClassOf === constants.TYPES.FINANCIAL_PRODUCT)
                  icon = 'ios-usd'
                else if (msgModel.subClassOf === constants.TYPES.FORM)
                  icon = 'ios-paper-outline'
                // else if (model.id === constants.TYPES.VERIFICATION)
                //   icon =
                if (icon)
                  lastMessageTypeIcon = <Icon name={icon} size={14} color='#7AAAc3' style={{paddingLeft: 1, marginTop: -2}}/>
              }
            }
            let w = utils.dimensions(ResourceRow).width - 145
            row = <View style={{flexDirection: 'row'}} key={self.getNextKey()}>
                    <View style={{flexDirection: 'column'}}>
                    <Icon name='md-done-all' size={16} color={isMyLastMessage ? '#cccccc' : '#7AAAc3'}/>
                    {lastMessageTypeIcon}
                    </View>
                    <Text style={[style, {width: w, paddingLeft: 2}]}>{val}</Text>
                  </View>
          }
          else {
            if (resource._unread  &&  v === 'lastMessage')
              style = [style, {color: UNREAD_COLOR}]
            row = <Text style={style} key={self.getNextKey()}>{val}</Text>;
          }
        }
        // if (first  &&  dateProp) {
        //   var val = utils.formatDate(new Date(resource[dateProp]), true);
        //   // var dateBlock = self.addDateProp(resource, dateProp, true);
        //   row = <View style={{flexDirection: 'row', justifyContent: 'space-between'}} key={self.getNextKey()}>
        //           <View>{row}</View>
        //           <View style={{position: 'absolute', top: -3, right: 10}}>
        //             <Text style={styles.verySmallLetters}>{val}</Text>
        //           </View>
        //         </View>
        // }
        vCols.push(row);
        first = false;
      }
    });

    if (vCols  &&  vCols.length)
      renderedViewCols = vCols;
    else {
      var vCols = utils.getDisplayName(resource, model.properties);
      return <Text style={styles.resourceTitle} numberOfLines={2}>{vCols}</Text>;

    }
    if (!backlink)
      return renderedViewCols
    return [
      <TouchableHighlight key={this.getNextKey()} onPress={this.props.showRefResources.bind(this, resource, backlink)} underlayColor='transparent'>
        <View key={this.getNextKey()}>
          {renderedViewCols}
        </View>
      </TouchableHighlight>
    ];
  }
  onPress(event) {
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;
    var title = utils.makeTitle(utils.getDisplayName(this.props.resource, model.properties));
    this.props.navigator.push({
      id: 7,
      title: title,
      component: ArticleView,
      passProps: {url: this.props.resource.url}
    });
  }
}
reactMixin(ResourceRow.prototype, Reflux.ListenerMixin);
reactMixin(ResourceRow.prototype, RowMixin);

var styles = StyleSheet.create({
  textContainer: {
    flex: 1,
    alignSelf: 'center'
  },
  // TODO: remove when you figure out v-centering
  // HACK FOR VERTICAL CENTERING
  resourceTitle: {
    // flex: 1,
    fontSize: 20,
    // fontWeight: '400',
    color: '#555555'
    // paddingTop: 18,
    // marginBottom: 2,
  },
  description: {
    // flex: 1,
    flexWrap: 'wrap',
    color: '#999999',
    fontSize: 14,
  },
  row: {
    backgroundColor: 'white',
    justifyContent: 'center',
    // justifyContent: 'space-around',
    flexDirection: 'row',
    padding: 5,
  },
  rowV: {
    // backgroundColor: 'white',
    // justifyContent: 'space-around',
    // flexDirection: 'row',
    padding: 5,
  },
  cellRoundImage: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#7AAAc3',
    paddingVertical: 1,
    // borderColor: '#7AAAc3',
    borderRadius: 30,
    // borderWidth: 1,
    height: 60,
    marginRight: 10,
    width: 60,
    alignSelf: 'center'
  },
  cellText: {
    // marginTop: 12,
    // alignSelf: 'center',
    color: '#ffffff',
    fontSize: 20,
    backgroundColor: 'transparent'
  },
  cellImage: {
    backgroundColor: '#ffffff',
    height: 60,
    marginRight: 10,
    width: 60,
    borderColor: '#7AAAc3',
    borderRadius: 30,
    borderWidth: 1,
  },
  cellNoImage: {
    backgroundColor: '#dddddd',
    height: 40,
    marginLeft: 10,
  },
  cellBorder: {
    backgroundColor: '#eeeeee',
    height: 1,
    marginLeft: 4,
  },
  highlightedCellBorder: {
    backgroundColor: '#139459',
    height: 1,
    marginLeft: 4,
  },
  icon: {
    // width: 40,
    // height: 40,
    alignSelf: 'center',
    marginLeft: 10,
    marginTop: 7,
    // color: '#7AAAc3'
  },
  online: {
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    // alignSelf: 'flex-end',
    // marginLeft: -25,
    // marginRight: 25,
    // width: 16,
    // height: 16,
    position: 'absolute',
    top: 40,
    left: 43,
    // borderWidth: 1,
    // borderColor: '#ffffff'
  },
  contextOwners: {
    fontSize: 14,
    color: '#b4c3cb'
  },
  verySmallLetters: {
    fontSize: 12,
    alignSelf: 'flex-end',
    color: '#b4c3cb'
  },
  countView: {
    top: 25,
    position: 'absolute',
    right: 10,
    justifyContent: 'center',
    borderRadius: 10,
    width: 20,
    height: 20,
    backgroundColor: UNREAD_COLOR
  },
  countText: {
    fontSize: 14,
    alignSelf: 'center',
    // fontWeight: '600',
    color: '#ffffff'
  },
  multiChooser: {
    position: 'absolute',
    right: 10,
    top: 25,
    backgroundColor: 'transparent'
  }
});

module.exports = ResourceRow;
      // return (
      // <Swipeout right={[{text: 'Hide', backgroundColor: 'red', onPress: this.hideResource.bind(this, resource)}]} autoClose={true} scroll={(event) => this._allowScroll(event)} >
      //   <View key={this.getNextKey()} style={{opacity: 1, flex: 1, justifyContent: 'center'}}>
      //     <TouchableHighlight onPress={this.state ? this.action.bind(this) : this.props.onSelect} underlayColor='transparent' key={this.getNextKey()}>
      //       <View style={[styles.row]} key={this.getNextKey()}>
      //         {photo}
      //         {orgPhoto}
      //         {onlineStatus}
      //         <View style={textStyle} key={this.getNextKey()}>
      //           {this.formatRow(resource)}
      //         </View>
      //         {cancelResource}
      //       </View>
      //     </TouchableHighlight>
      //     {this.props.isOfficialAccounts
      //     ? <TouchableHighlight underlayColor='transparent' style={{position: 'absolute', right: 20, top: 25, backgroundColor: 'white'}} onPress={() => {
      //         this.props.navigator.push({
      //           component: ResourceList,
      //           title: translate("myDocuments"),
      //           backButtonTitle: translate('back'),
      //           passProps: {
      //             modelName: constants.TYPES.FORM,
      //             resource: this.props.resource
      //           }
      //         })
      //       }}>
      //         <View style={textStyle}>
      //            {resource.numberOfForms
      //               ? <View style={{flexDirection: 'row'}}>
      //                    <Icon name='ios-paper-outline' color='#cccccc' size={35} style={{marginTop: Platform.OS === 'ios' ? -5 : 0}}/>
      //                    <Text style={{fontWeight: '600', marginLeft: 0, marginTop: Platform.OS === 'ios' ? -10 : -6, color: '#cccccc'}}>{resource.numberOfForms}</Text>
      //                 </View>
      //               : <View />
      //            }
      //         </View>
      //       </TouchableHighlight>
      //       : <View />}
      //     {dateRow}
      //     {cancelResource}
      //     <View style={styles.cellBorder}  key={this.getNextKey()} />
      //   </View>
      // </Swipeout>
      // );
