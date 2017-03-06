'use strict';

var Q = require('q')
var Keychain = require('react-native-keychain')
var debounce = require('debounce')
var ResourceList = require('./ResourceList');
var VideoPlayer = require('./VideoPlayer')
var NewResource = require('./NewResource');
var HomePage = require('./HomePage')
var ResourceView = require('./ResourceView');
var MessageList = require('./MessageList')
var extend = require('extend')
var utils = require('../utils/utils');
var translate = utils.translate
var Reflux = require('reflux');
var Actions = require('../Actions/Actions');
var Store = require('../Store/Store');
var reactMixin = require('react-mixin');
var constants = require('@tradle/constants');
var debug = require('debug')('Tradle-Home')
var PasswordCheck = require('./PasswordCheck')
var FadeInView = require('./FadeInView')
var TouchIDOptIn = require('./TouchIDOptIn')
var defaultBankStyle = require('../styles/bankStyle.json')
var QRCodeScanner = require('./QRCodeScanner')
var TimerMixin = require('react-timer-mixin')

try {
  var commitHash = require('../version').commit.slice(0, 7)
} catch (err) {
  // no version info available
}

// var Progress = require('react-native-progress')
import {
  // authenticateUser,
  hasTouchID,
  signIn,
  setPassword
} from '../utils/localAuth'

import { SyncStatus } from 'react-native-code-push'
import AutomaticUpdates from '../utils/automaticUpdates'
import CustomIcon from '../styles/customicons'
import BackgroundImage from './BackgroundImage'
import Navs from '../utils/navs'
import ENV from '../utils/env'

const BG_IMAGE = ENV.splashBackground
const PASSWORD_ITEM_KEY = 'app-password'
const SUBMIT_LOG_TEXT = {
  submit: translate('submitLog'),
  submitting: translate('submitting') + '...',
  submitted: translate('restartApp')
}

import {
  StyleSheet,
  Text,
  Navigator,
  View,
  TouchableOpacity,
  Image,
  NetInfo,
  ScrollView,
  Linking,
  StatusBar,
  Modal,
  Alert,
  Platform
} from 'react-native'
import ActivityIndicator from './ActivityIndicator'

const isAndroid = Platform.OS === 'android'
const FOOTER_TEXT_COLOR = '#eeeeee'
import React, { Component, PropTypes } from 'react'

class TimHome extends Component {
  static displayName = 'TimHome';
  static orientation = 'PORTRAIT';
  props: {
    modelName: PropTypes.string.isRequired,
    navigator: PropTypes.object.isRequired
  };
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      hasMe: utils.getMe()
    };

    this._handleConnectivityChange = this._handleConnectivityChange.bind(this)
  }
  componentWillMount() {
    this.uhOhTimeout = this.setTimeout(() => {
      if (!this.state.isLoading && !this.state.downloadingUpdate) return

      this.setState({ submitLogButtonText: SUBMIT_LOG_TEXT.submit })
    }, 120000)

    this.listenTo(Store, 'handleEvent');
    this._pressHandler = debounce(this._pressHandler, 500, true)
    if (!isAndroid)
      Linking.addEventListener('url', this._handleOpenURL);

    // var url = LinkingIOS.popInitialURL()
    // if (url)
    //   this._handleOpenURL({url});
    NetInfo.isConnected.addEventListener(
      'change',
      this._handleConnectivityChange
    );
    NetInfo.isConnected.fetch().then(isConnected => this._handleConnectivityChange(isConnected))
    Actions.start();
  }
  // componentDidMount() {
    // AutomaticUpdates.on()
    // LinkingIOS.addEventListener('url', this._handleOpenURL);
    // var url = LinkingIOS.popInitialURL();
    // if (url)
    //   this._handleOpenURL({url});
  // }
  _handleConnectivityChange(isConnected) {
    this.props.navigator.isConnected = isConnected
  }
  componentWillUnmount() {
    if (!isAndroid)
      Linking.removeEventListener('url', this._handleOpenURL);

    NetInfo.isConnected.removeEventListener(
      'change',
      this._handleConnectivityChange
    );
  }
  async _checkConnectivity() {
    try {
      const isConnected = await NetInfo.isConnected.fetch()
      const firstRoute = this.props.navigator.getCurrentRoutes()[0]
      firstRoute.isConnected = isConnected
    } catch (err) {
      debug('failed to check connectivity', err)
    }
  }
  async componentDidMount() {
    this._checkConnectivity()

    try {
      const url = await Linking.getInitialURL() || ENV.initWithDeepLink
      if (url)
        this._handleOpenURL({url})
    } catch (err) {
      debug('failed to open deep link', err)
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.submitLogButtonText !== nextState.submitLogButtonText    ||
        this.state.busyWith !== nextState.busyWith                             ||
        this.state.downloadUpdateProgress !== nextState.downloadUpdateProgress ||
        this.state.isLoading  !== nextState.isLoading   ||
        this.state.message !== nextState.message        ||
        this.state.hasMe !== nextState.hasMe
  }

  _handleOpenURL({url}) {
    // return
    debug(`opening URL: ${url}`)

    let URL = require('url').parse(url)
    let pathname = URL.pathname
    let query = URL.query

    let qs = require('querystring').parse(query)
    pathname = pathname.substring(1)
    let state = {firstPage: pathname}
    extend(state, qs)
    this.setState(state)
    Actions.setPreferences(state)
  }

  async onStart(params) {
    // prior to registration
    // force install updates before first interaction
    if (!utils.getMe()) {
      //   UP_TO_DATE: 0, // The running app is up-to-date
      //   UPDATE_INSTALLED: 1, // The app had an optional/mandatory update that was successfully downloaded and is about to be installed.
      //   UPDATE_IGNORED: 2, // The app had an optional update and the end-user chose to ignore it
      //   UNKNOWN_ERROR: 3,
      //   SYNC_IN_PROGRESS: 4, // There is an ongoing "sync" operation in progress.
      //   CHECKING_FOR_UPDATE: 5,
      //   AWAITING_USER_ACTION: 6,
      //   DOWNLOADING_PACKAGE: 7,
      //   INSTALLING_UPDATE: 8
      try {
        await AutomaticUpdates.sync({
          onSyncStatusChanged: status => {
            if (status === SyncStatus.DOWNLOADING_PACKAGE) {
              this.setState({ downloadingUpdate: true, downloadUpdateProgress: 0 })
            }
          },
          onDownloadProgress: debounce(({ totalBytes, receivedBytes }) => {
            const downloadUpdateProgress = (receivedBytes * 100 / totalBytes) | 0
            // avoid going from 1 percent to 0
            this.setState({ downloadUpdateProgress })
          }, 300, true)
        })
      } catch (err) {
        debug('failed to sync with code push', err)
      } finally {
        this.setState({ downloadingUpdate: false, downloadUpdateProgress: null })
      }

      const hasUpdate = await AutomaticUpdates.hasUpdate()
      if (hasUpdate) return AutomaticUpdates.install()
    }

    AutomaticUpdates.on()
    if (this.state.message) {
      this.restartTiM()
      return
    }

    // utils.setMe(params.me);
    // utils.setModels(params.models);
    this.setState({isLoading: false});
    clearTimeout(this.uhOhTimeout)
    if (!utils.getMe()) {
      if (ENV.autoRegister)
        this.showFirstPage()
      else
        this.setState({isModalOpen: true})
      // this.register(() => this.showFirstPage())
      return
    }

    this.signInAndContinue()
  }

  async signInAndContinue() {
    const routes = this.props.navigator.getCurrentRoutes()
    // get the top TimHome in the stack
    const homeRoute = routes.filter(r => r.component.displayName === TimHome.displayName).pop()
    const afterAuthRoute = utils.getTopNonAuthRoute(this.props.navigator)
    try {
      await signIn(this.props.navigator)
    } catch (err) {
      if (afterAuthRoute.component.displayName === TimHome.displayName) return

      if (homeRoute) {
        return this.props.navigator.popToRoute(homeRoute)
      }

      return this.props.navigator.resetTo({
        id: 1,
        component: TimHome,
        passProps: {}
      })
    }

    if (afterAuthRoute.component.displayName !== TimHome.displayName) {
      return this.props.navigator.popToRoute(afterAuthRoute)
    }

    return this.showFirstPage()
  }

  async handleEvent(params) {
    const self = this
    switch(params.action) {
    case 'busy':
      this.setState({
        busyWith: params.activity
      })

      return
    case 'connectivity':
      this._handleConnectivityChange(params.isConnected)
      return
    case 'reloadDB':
      this.setState({
        isLoading: false,
        message: translate('pleaseRestartTIM'), //Please restart TiM'
      });
      utils.setModels(params.models);
      return
    case 'getProvider':
      this.showChat(params.provider)
      // this.setState({
      //   provider: params.provider,
      //   action: 'chat'
      // })
      return
    case 'start':
      this.onStart(params)
      return
    case 'pairingSuccessful':
      this.signInAndContinue()
      return
    case 'getMe':
      utils.setMe(params.me)
      this.setState({hasMe: params.me})
      var nav = this.props.navigator
      this.signInAndContinue()
      // await signIn(this.props.navigator)
      // this.showFirstPage()
      return
    }
  }

  showContacts() {
    let passProps = {
        filter: '',
        modelName: this.props.modelName,
        sortProperty: 'lastMessageTime',
        officialAccounts: true,
        bankStyle: defaultBankStyle
      };
    let me = utils.getMe();
    // this.props.navigator.push({
    //   id: 30,
    //   component: Tabs,
    //   title: 'Hey',
    //   backButtonTitle: translate('back'),
    //   passProps: {
    //     bankStyle: defaultBankStyle,
    //     rlProps: passProps,
    //     profileProps: {
    //       model: utils.getModel(me[constants.TYPE]).value,
    //       resource: me,
    //       bankStyle: defaultBankStyle
    //     }
    //   }
    // })

    Actions.getAllSharedContexts()
    Actions.hasPartials()
    // return
    this.props.navigator.push({
      // sceneConfig: Navigator.SceneConfigs.FloatFromBottom,
      id: 10,
      title: translate('officialAccounts'),
      // titleTextColor: '#7AAAC3',
      backButtonTitle: translate('back'),
      component: ResourceList,
      rightButtonTitle: translate('profile'),
      passProps: passProps,
      onRightButtonPress: {
        title: utils.getDisplayName(me, utils.getModel(me[constants.TYPE]).value.properties),
        id: 3,
        component: ResourceView,
        backButtonTitle: translate('back'),
        // titleTextColor: '#7AAAC3',
        rightButtonTitle: translate('edit'),
        onRightButtonPress: {
          title: me.firstName,
          id: 4,
          component: NewResource,
          // titleTextColor: '#7AAAC3',
          backButtonTitle: translate('back'),
          rightButtonTitle: translate('done'),
          passProps: {
            model: utils.getModel(me[constants.TYPE]).value,
            resource: me,
            bankStyle: defaultBankStyle
          }
        },
        passProps: {
          bankStyle: defaultBankStyle,
          resource: me
        }
      }
    });
  }
  showHomePage(doReplace) {
    let me = utils.getMe()
    let title = translate(ENV.profileTitle)
    this.props.navigator.push({
      title: title,
      id: 3,
      component: ResourceView,
      backButtonTitle: translate('back'),
      rightButtonTitle: translate('edit'),
      onRightButtonPress: {
        title: title,
        id: 4,
        component: NewResource,
        backButtonTitle: translate('back'),
        rightButtonTitle: translate('done'),
        passProps: {
          model: utils.getModel(me[constants.TYPE]).value,
          resource: me,
          bankStyle: defaultBankStyle
        }
      },
      passProps: {
        resource: me,
        bankStyle: defaultBankStyle
      }
    })
    // this.props.navigator.push({
    //   title: translate('homePage'),
    //   id: 30,
    //   component: HomePage,
    //   backButtonTitle: translate('back'),
    //   passProps: {
    //     sponsorName: 'UBS',
    //     modelName: constants.TYPES.ORGANIZATION,
    //     bankStyle: defaultBankStyle,
    //     officialAccounts: true,
    //   }
    // })
  }
  showFirstPage(doReplace) {
    var nav = this.props.navigator
    nav.immediatelyResetRouteStack(nav.getCurrentRoutes().slice(0,1));
    let me = utils.getMe()
    if (me  &&  me.isEmployee) {
      this.showContacts()
      return
    }
    if (this.state.firstPage) {
      switch (this.state.firstPage) {
      case 'chat':
        Actions.getProvider({
          provider: this.state.permalink,
          url: this.state.url
        })
        // this.showChat(this.state.provider)
        return
      case 'officialAccounts':
        this.showOfficialAccounts()
        return
      case 'profile':
        this.showHomePage(doReplace)
        return
      default:
        if (ENV.homePage)
          this.showHomePage(doReplace)
        else
          this.showOfficialAccounts()
      }

      return
    }

    if (ENV.homePage) {
      this.showHomePage(doReplace)
      return
    }

    this.showOfficialAccounts()
  }
  showChat(provider) {
    if (ENV.landingPage) {
      this.showLandingPage(provider, ENV.landingPage)
      return
    }
    return
    let me = utils.getMe()
    var msg = {
      message: translate('customerWaiting', me.firstName),
      _t: constants.TYPES.CUSTOMER_WAITING,
      from: me,
      to: provider,
      time: new Date().getTime()
    }

    utils.onNextTransitionEnd(this.props.navigator, () => Actions.addMessage({msg: msg, isWelcome: true}))

    let style = {}
    extend(style, defaultBankStyle)
    if (provider.style)
      extend(style, provider.style)
    this.props.navigator.push({
      title: provider.name,
      component: MessageList,
      id: 11,
      backButtonTitle: 'Back',
      passProps: {
        resource: provider,
        modelName: constants.TYPES.MESSAGE,
        currency: this.props.currency,
        bankStyle:  style
      }
    })
  }
  showLandingPage(provider, landingPage) {
    let style = {}
    extend(style, defaultBankStyle)
    if (provider.style)
      extend(style, provider.style)
    let c = this.props.landingPageMapping[landingPage]
    this.props.navigator.push({
      title: provider.name,
      component: c.component,
      id: c.id,
      backButtonTitle: __DEV__ ? 'Back' : null,
      passProps: {
        bankStyle: style,
        resource: provider
      }
    })
  }
  showOfficialAccounts() {
    const me = utils.getMe()
    let passProps = {
      filter: '',
      modelName: constants.TYPES.ORGANIZATION,
      sortProperty: 'lastMessageTime',
      officialAccounts: true,
      bankStyle: defaultBankStyle
    };
    Actions.hasPartials()
    let title = me.firstName;
    let route = {
      title: translate('officialAccounts'),
      id: 10,
      component: ResourceList,
      backButtonTitle: translate('back'),
      passProps: {
        modelName: constants.TYPES.ORGANIZATION,
        isConnected: this.state.isConnected,
        officialAccounts: true,
        bankStyle: defaultBankStyle
      },
      rightButtonTitle: translate('profile'),
      onRightButtonPress: {
        title: title,
        id: 3,
        component: ResourceView,
        backButtonTitle: translate('back'),
        rightButtonTitle: translate('edit'),
        onRightButtonPress: {
          title: title,
          id: 4,
          component: NewResource,
          backButtonTitle: translate('back'),
          rightButtonTitle: translate('done'),
          passProps: {
            model: utils.getModel(me[constants.TYPE]).value,
            resource: me,
            bankStyle: defaultBankStyle
          }
        },
        passProps: {
          resource: me,
          bankStyle: defaultBankStyle
        }
      }
    }
    // if (doReplace)
    //   nav.replace(route)
    // else
    var nav = this.props.navigator
    nav.push(route)

  }

  register(cb) {
    let modelName = this.props.modelName;
    if (!utils.getModel(modelName)) {
      this.setState({err: 'Can find model: ' + modelName});
      return;
    }

    let model = utils.getModel(modelName).value;
    let route = {
      component: NewResource,
      titleTextColor: '#BCD3E6',
      id: 4,
      passProps: {
        model: model,
        bankStyle: defaultBankStyle,
        isConnected: this.state.isConnected,
        // callback: () => {
        //   cb()
        // }
      },
    };

    let self = this
    route.passProps.callback = async () => {
      if (ENV.requireSoftPIN) {
        await setPassword(this.props.navigator)
      }

      if (ENV.requireDeviceLocalAuth) {
        await this.optInTouchID()
      }

      this.setState({hasMe: true})
      Actions.setAuthenticated(true)
      this.showFirstPage(true)
    }
    // let nav = self.props.navigator
    // route.passProps.callback = (me) => {
    //   this.showVideoTour(() => {
    //     Actions.getMe()
    //     nav.immediatelyResetRouteStack(nav.getCurrentRoutes().slice(0,1));
    //   })
    // }

    route.passProps.editCols = ['firstName']//, 'lastName', 'language']
    route.titleTintColor = '#ffffff'
    this.props.navigator.push(route);
  }

  optInTouchID() {
    if (ENV.autoOptInTouchId) {
      Actions.updateMe({ useTouchId: true })
      return
    }

    return hasTouchID().then(has => {
      if (!has) return

      return new Promise(resolve => {
        this.props.navigator.replace({
          component: TouchIDOptIn,
          id: 21,
          rightButtonTitle: 'Skip',
          noLeftButton: true,
          passProps: {
            optIn: () => {
              Actions.updateMe({ useTouchId: true })
              resolve()
            }
          },
          onRightButtonPress: resolve
        })
      })
    })
  }

  pairDevices(cb) {
    let modelName = this.props.modelName;
    if (!utils.getModel(modelName)) {
      this.setState({err: 'Can find model: ' + modelName});
      return;
    }

    let model = utils.getModel(modelName).value;
    let route = {
      component: NewResource,
      titleTextColor: '#BCD3E6',
      id: 4,
      passProps: {
        model: model,
        bankStyle: defaultBankStyle,
        isConnected: this.state.isConnected,
        // callback: () => {
        //   cb()
        // }
      },
    };

    let self = this
    route.passProps.callback = () => {
      setPassword(this.props.navigator)
      .then (() => {
        this.setState({hasMe: true})
        Actions.setAuthenticated(true)
        this.showFirstPage(true)
        // cb()
      })

    }
    // let nav = self.props.navigator
    // route.passProps.callback = (me) => {
    //   this.showVideoTour(() => {
    //     Actions.getMe()
    //     nav.immediatelyResetRouteStack(nav.getCurrentRoutes().slice(0,1));
    //   })
    // }

    route.passProps.editCols = ['firstName', 'lastName'] //, 'language']
    route.titleTintColor = '#ffffff'
    this.props.navigator.push(route);
  }

  showVideoTour(cb) {
    let onEnd = (err) => {
      if (err) debug('failed to load video', err)
      cb()
    }

    this.props.navigator.replace({
      // sceneConfig: Navigator.SceneConfigs.FloatFromBottom,
      id: 18,
//      title: 'Tradle',
//      titleTintColor: '#eeeeee',
      component: VideoPlayer,
      rightButtonTitle: __DEV__ ? 'Skip' : undefined,
      passProps: {
        uri: 'videotour',
        onEnd: onEnd,
        onError: onEnd,
        navigator: this.props.navigator
      },
      onRightButtonPress: onEnd
    })
  }
  onReloadDBPressed() {
    utils.setMe(null);
    utils.setModels(null);
    Actions.reloadDB();
  }
  onReloadModels() {
    utils.setModels(null)
    Actions.reloadModels()
  }
  render() {
    StatusBar.setHidden(true);
    if (this.state.message) {
      this.restartTiM()
      return
    }

    // var url = Linking.getInitialURL();
    var {width, height} = utils.dimensions(TimHome)
    var h = height > 800 ? height - 220 : height - 180

    if (!__DEV__ && ENV.landingPage) {
      return this.getSplashScreen()
    }

    if (this.state.isLoading) {
      return this.getSplashScreen(h)
    }

    var err = this.state.err || '';
    var errStyle = err ? styles.err : {'padding': 0, 'height': 0};
    var myId = utils.getMe();
    var me = utils.getMe()
    var settings = <View/>

    var version = !__DEV__ && this.renderVersion()
    var dev = __DEV__
            ? <View style={styles.dev}>
                <TouchableOpacity
                    underlayColor='transparent' onPress={this.onReloadDBPressed.bind(this)}>
                  <Text style={styles.text}>
                    Reload DB
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    underlayColor='transparent' onPress={this.onReloadModels.bind(this)}>
                  <Text style={styles.text}>
                    Reload Models
                  </Text>
                </TouchableOpacity>
                {settings}
              </View>
            : <View style={[styles.dev, { flexDirection: 'column' }]}>
                {settings}
                {version}
              </View>

    let regView = !ENV.autoRegister &&
                  <View  style={{alignSelf: 'center'}}>
                    <FadeInView>
                      <TouchableOpacity  onPress={() => {
                        this.register(this.showFirstPage.bind(this))
                        }} underlayColor='transparent'>
                        <View style={styles.signIn}>
                          <Text style={styles.signInText}>{translate('This is my first Tradle device')}</Text>
                        </View>
                      </TouchableOpacity>
                    </FadeInView>
                    <FadeInView>
                      <TouchableOpacity  onPress={() => {
                        this.pairDevices(this.showFirstPage.bind(this))
                        }} underlayColor='transparent'>
                        <View style={[styles.signIn, {shadowColor: '#245c8c', backgroundColor: 'lightblue'}]}>
                          <Text style={styles.pairDivicesText}>{translate('I have another Tradle device')}</Text>
                        </View>
                      </TouchableOpacity>
                    </FadeInView>
                 </View>

    return (
      <View style={styles.container}>
        <BackgroundImage source={BG_IMAGE} />
        <TouchableOpacity style={styles.splashLayout} onPress={() => this._pressHandler()}>
          <View style={{flexGrow:1}} />
          { utils.getMe()
            ? <TouchableOpacity style={[styles.thumbButton, {justifyContent: 'flex-end',  opacity: me ? 1 : 0}]}
                  underlayColor='transparent' onPress={() => this._pressHandler()}>
                <View style={styles.getStarted}>
                   <Text style={styles.getStartedText}>Get started</Text>
                </View>
              </TouchableOpacity>
            : regView
          }
          <Text style={errStyle}>{err}</Text>
          {dev}
        </TouchableOpacity>
      </View>
    );
  }

  renderVersion() {
    return (
      <View>
        <Text style={styles.version}>git: {commitHash}</Text>
      </View>
    )
  }

  getUpdateIndicator() {
    if (!this.state.downloadingUpdate) return

    var percentIndicator
    if (this.state.downloadUpdateProgress) {
      percentIndicator = <Text style={styles.updateIndicator}>{this.state.downloadUpdateProgress}%</Text>
    }

    return (
      <View>
        <Text style={styles.updateIndicator}>{translate('downloadingUpdate')}</Text>
        {percentIndicator}
      </View>
    )
  }

  getSubmitLogButton() {
    if (!this.state.isLoading) return

    let instructions
    if (this.state.submitLogButtonText === SUBMIT_LOG_TEXT.submit) {
      instructions = (
        <Text style={styles.submitLogInstructions}>
          {translate('somethingWrongSubmitLog')}
        </Text>
      )
    }

    return this.state.submitLogButtonText && (
      <View style={[styles.container, { maxWidth: getIconSize() }]}>
        <TouchableOpacity
          style={styles.submitLog}
          onPress={() => this.onPressSubmitLog()}>
          <Text style={styles.submitLogText}>{this.state.submitLogButtonText}</Text>
        </TouchableOpacity>
        {instructions}
      </View>
    )
  }

  async onPressSubmitLog () {
    if (this.state.submitLogButtonText === SUBMIT_LOG_TEXT.submitted) {
      return utils.restartApp()
    }

    let submitLogButtonText = SUBMIT_LOG_TEXT.submitting
    this.setState({ submitLogButtonText })
    const submitted = await utils.submitLog()
    submitLogButtonText = submitted ? SUBMIT_LOG_TEXT.submitted : SUBMIT_LOG_TEXT.submit
    this.setState({ submitLogButtonText })
  }

  getBusyReason() {
    return this.state.busyWith && (
      <View>
        <Text style={styles.updateIndicator}>{this.state.busyWith}...</Text>
      </View>
    )
  }

  getSplashScreen() {
    const version = __DEV__ && this.renderVersion()
    var {width, height} = utils.dimensions(TimHome)
    var updateIndicator = this.getUpdateIndicator()
    var submitLogButton = this.getSubmitLogButton()
    var busyReason = updateIndicator ? null : this.getBusyReason()
    return (
      <View style={styles.container}>
        <BackgroundImage source={BG_IMAGE} />
        <View style={styles.splashLayout}>
          <View style={{flexGrow: 1}}/>
          <View style={{marginBottom: 20}}>
            <ActivityIndicator hidden='true' size='large' color={FOOTER_TEXT_COLOR}/>
            {busyReason}
            {updateIndicator}
            {submitLogButton}
          </View>
        </View>
        {version}
      </View>
    )
  }

  pairDevices() {
    this.props.navigator.push({
      title: 'Scan QR Code',
      id: 16,
      component: QRCodeScanner,
      titleTintColor: '#eeeeee',
      backButtonTitle: 'Cancel',
      // rightButtonTitle: 'ion|ios-reverse-camera',
      passProps: {
        onread: (result) => {
          Actions.sendPairingRequest(JSON.parse(result.data))
          this.props.navigator.pop()
        }
      }
    })
  }
  // async onSettingsPressed() {
  //   try {
  //     await authenticateUser()
  //   } catch (err) {
  //     return
  //   }

  //   var model = utils.getModel(constants.TYPES.SETTINGS).value
  //   var route = {
  //     component: NewResource,
  //     title: translate('settings'),
  //     backButtonTitle: translate('back'),
  //     rightButtonTitle: translate('done'),
  //     id: 4,
  //     titleTextColor: '#7AAAC3',
  //     passProps: {
  //       model: model,
  //       isConnected: this.state.isConnected,
  //       callback: this.props.navigator.pop,
  //       bankStyle: defaultBankStyle

  //       // callback: this.register.bind(this)
  //     },
  //   }

  //   this.props.navigator.push(route)
  // }
  restartTiM() {
    Alert.alert(
      'Please restart TiM'
    )
  }

  _pressHandler() {
    if (utils.getMe())
      signIn(this.props.navigator)
        .then(() => this.showFirstPage())
  }
}

reactMixin(TimHome.prototype, Reflux.ListenerMixin);
reactMixin(TimHome.prototype, TimerMixin)

var styles = (function () {
  var dimensions = utils.dimensions(TimHome)
  var { width, height } = dimensions
  return StyleSheet.create({
    container: {
      // padding: 30,
      // marginTop: height / 4,
      alignItems: 'center',
    },
    tradle: {
      // color: '#7AAAC3',
      color: FOOTER_TEXT_COLOR,
      fontSize: height > 450 ? 35 : 25,
      alignSelf: 'center',
    },
    updateIndicator: {
      color: FOOTER_TEXT_COLOR,
      paddingTop: 10,
      alignSelf: 'center'
    },
    text: {
      color: '#7AAAC3',
      paddingHorizontal: 5,
      fontSize: 14,
    },
    thumbButton: {
      // marginBottom: 10,
      alignSelf: 'center',
      // justifyContent: isLandscape ? 'flex-start' : 'center',
      // padding: 40,
    },
    thumb: {
      color: '#ffffff'
      // width:  width > 400 ? width / 2.5 : 170,
      // height: width > 400 ? width / 2.5 : 170,
    },
    dev: {
      paddingVertical: 10,
      flexDirection: 'row',
      // marginBottom: 500,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center'
    },
    getStartedText: {
      color: '#f0f0f0',
      fontSize: width > 450 ? 35 : 20,
      fontWeight:'400'
    },
    getStarted: {
      backgroundColor: '#568FBE', //'#2892C6',
      paddingVertical: 10,
      paddingHorizontal: 30
    },
    submitLogInstructions: {
      maxWidth: 200,
      color: '#ffffff',
      fontSize: 12
    },
    submitLogText: {
      color: '#f0f0f0',
      fontSize: width > 450 ? 35 : 20,
      fontWeight:'400'
    },
    submitLog: {
      marginTop: 50,
      marginBottom: 20,
      backgroundColor: '#aaaacc', //'#2892C6',
      paddingVertical: 10,
      paddingHorizontal: 30
    },
    signIn: {
      flexDirection: 'row',
      width: 320,
      height: Platform.OS === 'ios' ? 80 : 60,
      marginTop: 10,
      justifyContent: 'center',
      backgroundColor: '#467EAE',
      // shadowOpacity: 0.5,
      shadowColor: 'lightblue',
      shadowRadius: 10,
      shadowOffset: {width: 0.5, height: 0.5},
      shadowOpacity: 0.7
    },
    version: {
      color: '#ffffff',
      fontSize: 10
    },
    pairDivicesText: {
      backgroundColor: 'transparent',
      color: '#467EAE',
      fontSize: 18,
      alignSelf: 'center'
    },
    signInText: {
      backgroundColor: 'transparent',
      color: 'lightblue',
      fontSize: 18,
      alignSelf: 'center'
    },
    splashLayout: {
      alignItems: 'center',
      justifyContent: 'center',
      width,
      height
    },
    layout: {
      justifyContent: 'space-between',
      height: height
    }
  });
})()

function getIconSize (dimensions) {
  dimensions = dimensions || utils.dimensions(TimHome)
  const { width } = dimensions
  return width > 400 ? width / 2.5 : 170
}

module.exports = TimHome;
  // signIn(cb) {
  //   let self = this
  //   if (this.state.message) {
  //     this.restartTiM()
  //     return
  //   }

  //   let me = utils.getMe()
  //   if (!me) return this.register()

  //   if (isAuthenticated()) {
  //     return cb()
  //   }

  //   let doneWaiting
  //   let authPromise = isAuthenticated() ? Q()
  //     : me.useTouchId ? touchIDWithFallback()
  //     : passwordAuth()

  //   return authPromise
  //     .then(() => {
  //       setAuthenticated(true)
  //       cb()
  //     })
  //     .catch(err => {
  //       if (err.name == 'LAErrorUserCancel' || err.name === 'LAErrorSystemCancel') {
  //         self.props.navigator.popToTop()
  //       } else {
  //         lockUp(err.message || 'Authentication failed')
  //       }
  //     })

  //   function touchIDWithFallback() {
  //     return authenticateUser()
  //     .catch((err) => {
  //       if (err.name === 'LAErrorUserFallback' || err.name.indexOf('TouchID') !== -1) {
  //         return passwordAuth()
  //       }

  //       throw err
  //     })
  //   }

  //   function passwordAuth () {
  //     return Keychain.getGenericPassword(PASSWORD_ITEM_KEY)
  //       .catch(err => {
  //         // registration must have been aborted.
  //         // ask user to set a password
  //         return Q.ninvoke(self, 'setPassword')
  //       })
  //       .then(() => {
  //         return Q.ninvoke(self, 'checkPassword')
  //       })
  //   }

  //   function lockUp (err) {
  //     self.setState({isModalOpen: true})
  //     loopAlert(err)
  //     setTimeout(() => {
  //       doneWaiting = true
  //       // let the user try again
  //       self.signIn(cb)
  //     }, __DEV__ ? 5000 : 5 * 60 * 1000)
  //   }

  //   function loopAlert (err) {
  //     Alert.alert(err, null, [
  //       {
  //         text: 'OK',
  //         onPress: () => !doneWaiting && loopAlert(err)
  //       }
  //     ])
  //   }
  // }
  // async _localAuth() {
    // if (this.state.authenticating) return

    // if (!this.state.authenticated) {
    //   this.setState({ authenticating: true })
    //   try {
    //     await authenticateUser()
    //   } catch (err)  {
    //     this.setState({ authenticating: false })
    //     throw err
    //   }
    // }

    // this.showFirstPage()
    // if (this.state.authenticating) {
    //   this.setState({ authenticating: false })
    // }
  // }
  //////////////////////// LAST CHANGE - 07/12/2016
  // signUp(cb) {
  //   var nav = this.props.navigator
  //   nav.immediatelyResetRouteStack(nav.getCurrentRoutes().slice(0,1));
  //   let self = this
  //   this.setPassword(function(err) {
  //     if (err)
  //       debug('failed to set password', err)
  //     else {
  //       cb()
  //     }
  //   })
  //   // this.showFirstPage(true);
  //   // this.props.navigator.popToTop();
  // }
  // signIn(cb) {
  //   let me = utils.getMe()
  //   if (!me)
  //     return this.register(cb)

  //   if (me.isAuthenticated  &&  !this.state.newMe)
  //     return cb()

  //   let doneWaiting
  //   let authPromise
  //   if (me.useTouchId  &&  me.useGesturePassword) {
  //     if (this.state.newMe) {
  //       if (!newMe.useTouchId)
  //         authPromise = touchIDWithFallback()
  //       else
  //         authPromise = passwordAuth()
  //     }
  //     else
  //       authPromise = touchIDAndPasswordAuth()
  //   }
  //   else if (me.useTouchId)
  //     authPromise = touchIDWithFallback()
  //   else
  //     authPromise = passwordAuth()
  //   let self = this
  //   return authPromise
  //     .then(() => {
  //       Actions.setAuthenticated(true)
  //       cb()
  //     })
  //     .catch(err => {
  //       if (err.name == 'LAErrorUserCancel' || err.name === 'LAErrorSystemCancel') {
  //         self.props.navigator.popToTop()
  //       } else {
  //         lockUp(err.message || 'Authentication failed')
  //       }
  //     })

  //   function touchIDAndPasswordAuth() {
  //     if (isAndroid) return passwordAuth()

  //     return authenticateUser()
  //     .then(() => {
  //       return passwordAuth()
  //     })
  //     .catch((err) => {
  //       debugger
  //       throw err
  //     })
  //   }

  //   function touchIDWithFallback() {
  //     if (isAndroid) return passwordAuth()

  //     return authenticateUser()
  //     .catch((err) => {
  //       if (err.name === 'LAErrorUserFallback' || err.name.indexOf('TouchID') !== -1) {
  //         return passwordAuth()
  //       }

  //       throw err
  //     })
  //   }

  //   function passwordAuth () {
  //     return Keychain.getGenericPassword(PASSWORD_ITEM_KEY)
  //       .then(
  //         () =>  Q.ninvoke(self, 'checkPassword'),
  //         // registration must have been aborted.
  //         // ask user to set a password
  //         (err) => Q.ninvoke(self, 'setPassword')
  //       )
  //   }

  //   function lockUp (err) {
  //     self.setState({isModalOpen: true})
  //     loopAlert(err)
  //     setTimeout(() => {
  //       doneWaiting = true
  //       // let the user try again
  //       signIn(cb, this.props.navigator)
  //     }, __DEV__ ? 5000 : 5 * 60 * 1000)
  //   }

  //   function loopAlert (err) {
  //     Alert.alert(err, null, [
  //       {
  //         text: 'OK',
  //         onPress: () => !doneWaiting && loopAlert(err)
  //       }
  //     ])
  //   }
  // }
  // setPassword(cb) {
  //   let self = this
  //   this.props.navigator.push({
  //     component: PasswordCheck,
  //     id: 20,
  //     passProps: {
  //       mode: PasswordCheck.Modes.set,
  //       validate: (pass) => { return pass.length > 4 },
  //       promptSet: translate('pleaseDrawPassword'),
  //       promptInvalidSet: translate('passwordLimitations'),
  //       onSuccess: (pass) => {
  //         Keychain.setGenericPassword(PASSWORD_ITEM_KEY, utils.hashPassword(pass))
  //         .then(() => {
  //           Actions.updateMe({ isRegistered: true })
  //           return hasTouchID()
  //         })
  //         .then((askTouchID) => {
  //           if (askTouchID) {
  //             return self.props.navigator.replace({
  //               component: TouchIDOptIn,
  //               id: 21,
  //               rightButtonTitle: 'Skip',
  //               passProps: {
  //                 optIn: () => {
  //                   Actions.updateMe({ useTouchId: true })
  //                   cb()
  //                 }
  //               },
  //               onRightButtonPress: cb.bind(this)
  //             })
  //           }

  //           cb()
  //         })
  //         .catch(err => {
  //           debugger
  //         })
  //       },
  //       onFail: () => {
  //         debugger
  //         Alert.alert('Oops!')
  //       }
  //     }
  //   })
  // }
  // checkPassword(cb, doReplace) {
  //   let nav = this.props.navigator
  //   // HACK
  //   let routes = nav.getCurrentRoutes()
  //   if (routes[routes.length - 1].id === 20)
  //     return

  //   let route = {
  //     component: PasswordCheck,
  //     id: 20,
  //     passProps: {
  //       mode: PasswordCheck.Modes.check,
  //       maxAttempts: 3,
  //       promptCheck: translate('drawYourPassword'), //Draw your gesture password',
  //       promptRetryCheck: translate('gestureNotRecognized'), //Gesture not recognized, please try again',
  //       isCorrect: (pass) => {
  //         return Keychain.getGenericPassword(PASSWORD_ITEM_KEY)
  //           .then((stored) => {
  //             return stored === utils.hashPassword(pass)
  //           })
  //           .catch(err => {
  //             return false
  //           })
  //       },
  //       onSuccess: () => {
  //         cb()
  //       },
  //       onFail: (err) => {
  //         cb(err || new Error('For the safety of your data, ' +
  //           'this application has been temporarily locked. ' +
  //           'Please try in 5 minutes.'))
  //         // lock up the app for 10 mins? idk
  //       }
  //     }
  //   }

  //   nav.push(route)
  // }
