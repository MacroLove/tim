'use strict';

var utils = require('../utils/utils');
var Icon = require('react-native-vector-icons/Ionicons');
var constants = require('@tradle/constants');
var reactMixin = require('react-mixin');
var PhotoCarouselMixin = require('./PhotoCarouselMixin');

var equal = require('deep-equal')
import {
  StyleSheet,
  Image,
  View,
  Text,
  Modal,
  Animated,
  Easing,
  TouchableHighlight
} from 'react-native'

import React, { Component } from 'react'
import * as Animatable from 'react-native-animatable'


class PhotoView extends Component {
  constructor(props) {
    super(props);
    this.state = {anim: new Animated.Value(1.5), isModalOpen: false};
  }
  componentDidMount() {
     Animated.timing(      // Uses easing functions
       this.state.anim,    // The value to drive
       {toValue: 1,
       duration: 500}        // Configuration
     ).start();
  }
  changePhoto(photo) {
    this.setState({currentPhoto: photo});
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.resource[constants.ROOT_HASH] !== nextProps.resource[constants.ROOT_HASH] ||
        this.state.isModalOpen !== nextState.isModalOpen)
      return true

    return !equal(this.props.resource.photos, nextProps.resource.photos)
  }
  render() {
    var resource = this.props.resource;
    if (!resource)
      return <View />;
    var modelName = resource[constants.TYPE];
    var model = utils.getModel(modelName).value;
    if (!model.interfaces  &&  !model.isInterface  &&  !resource[constants.ROOT_HASH])
      return <View />

    var hasPhoto = resource.photos && resource.photos.length;
    var currentPhoto = this.state.currentPhoto || (hasPhoto  &&  resource.photos[0]);
    if (!currentPhoto) {
      // if (model.id === constants.TYPES.PROFILE) {
      //   return (
      //     <View style={styles.photoBG}>
      //       <Icon name='ios-person' size={200}  color='#f6f6f4' />
      //     </View>
      //   )
      // }
      // else
        return <View />
    }

    var url = currentPhoto.url;
    var nextPhoto = resource.photos.length == 1
    var uri = utils.getImageUri(url);
    var source = uri.charAt(0) == '/' || uri.indexOf('data') === 0
               ? {uri: uri, isStatic: true}
               : {uri: uri}
    var nextPhoto;
    var len = resource.photos.length;
    for (var i=0; i<len  &&  !nextPhoto; i++) {
      var p = resource.photos[i].url;
      if (p === url)
        nextPhoto = i === len - 1 ? resource.photos[0] : resource.photos[i + 1];
    }
    let {width, height} = utils.dimensions(PhotoView)
    let baseW = 0.8 * width
    let baseH = 0.8 * height
    let image = utils.isWeb()
              ? {
                  width: Math.floor(width < height ? baseW : baseH),
                  height: Math.floor(width < height ? baseH / 2 : baseW / 2),
                }
              : {
                  width: width < height ? width : height,
                  height: Math.floor(width < height ? height / 2 : width / 2),
                }

    return (
          <View>
            <TouchableHighlight underlayColor='transparent' onPress={this.showCarousel.bind(this, resource.photos[0], true)}>
              <Image resizeMode='cover' source={source} style={image} />
            </TouchableHighlight>
          </View>
    )
    // return (
    //       <Animated.View style={style}>
    //         <TouchableHighlight underlayColor='transparent' onPress={this.openModal.bind(this)}>
    //           <Image resizeMode='cover' source={source} style={image} />
    //         </TouchableHighlight>
    //     <Modal style={{width: width, height: height}} animationType={'fade'} visible={this.state.isModalOpen} transparent={true} onRequestClose={() => this.closeModal()}>
    //       <TouchableHighlight  onPress={() => this.closeModal()} underlayColor='transparent'>
    //         <View style={styles.modalBackgroundStyle}>
    //           {this.shwCarousel(resource.photos[0])}
    //         </View>
    //       </TouchableHighlight>
    //     </Modal>
    //       </Animated.View>
    // )
  }
  /*
  shwCarousel(currentPhoto) {
    var photoUrls = [];
    // var currentPhoto = this.props.currentPhoto || this.props.photos[0];
    var currentPhotoIndex = -1;

    for (var i=0; i<this.props.resource.photos.length; i++) {
      var photo = this.props.resource.photos[i];

      if (currentPhotoIndex === -1  &&  photo.url === currentPhoto.url)
        currentPhotoIndex = i;
      photoUrls.push(photo.url)
    }
    return (
      <Gallery
        style={{flex: 1}}
        images={photoUrls}
        initialPage={currentPhotoIndex}
      />
    );

  }
  */
  openModal() {
    this.setState({isModalOpen: true});
  }
  closeModal() {
    this.setState({isModalOpen: false});
  }

}
reactMixin(PhotoView.prototype, PhotoCarouselMixin);

var styles = StyleSheet.create({
  photoBG: {
    backgroundColor: '#245D8C',
    alignItems: 'center',
    alignSelf: 'stretch'
  },
    modalBackgroundStyle: {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      // padding: 20,
    },
});

module.exports = PhotoView;
