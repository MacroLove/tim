
import React, {
  Component,
  PropTypes
} from 'react'

import {
  Platform,
  TouchableHighlight,
  Linking,
  Alert
} from 'react-native'

import ImagePicker from 'react-native-image-picker'
import utils from '../utils/utils'
import extend from 'extend'

const imageInputPropTypes = {
  ...TouchableHighlight.propTypes,
  prop: PropTypes.string.isRequired,
  onImage: PropTypes.func.isRequired
}

class ImageInput extends Component {
  props: imageInputPropTypes;
  constructor(props) {
    super(props)
    this.showImagePicker = this.showImagePicker.bind(this)
  }
  render() {
    const touchableProps = { ...this.props }
    delete touchableProps.prop
    delete touchableProps.onImage

    const onPress = this.props.onPress || this.showImagePicker
    // allow override onPress
    return (
      <TouchableHighlight
        underlayColor='transparent'
        {...touchableProps}
        onPress={onPress}>
        {this.props.children}
      </TouchableHighlight>
    )
  }
  async showImagePicker() {
    const { prop, onImage } = this.props
    let options = {returnIsVertical: true, quality: utils.imageQuality, cameraType: this.props.prop.cameraType || 'back'}
    let action
    if (utils.isSimulator())
      action = 'launchImageLibrary'
    else if (!prop.allowPicturesFromLibrary)
      action = 'launchCamera'
    else {
      action = 'showImagePicker'
      extend(options, {
        chooseFromLibraryButtonTitle: 'Choose from Library',
        takePhotoButtonTitle: 'Take Photo…',
      })
    }

    const allowed = utils.isSimulator()
      ? true //await ImagePicker.checkPhotosPermissions()
      : await utils.requestCameraAccess()

    if (!allowed) return

    ImagePicker[action](options, (response) => {
      if (response.didCancel)
        return

      if (response.error) {
        console.log('ImagePickerManager Error: ', response.error);
        return
      }

      onImage({
        url: 'data:image/jpeg;base64,' + response.data,
        isVertical: response.isVertical,
        width: response.width,
        height: response.height,
        chooseFromLibraryButtonTitle: ''
      })
    })
  }
}

module.exports = ImageInput
