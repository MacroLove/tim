'use strict';

var React = require('react-native');
var reactMixin = require('react-mixin');
var SearchBar = require('./SearchBar');
var ResourceRow = require('./ResourceRow');
var ResourceView = require('./ResourceView');
var NewResource = require('./NewResource');
var ResourceList = require('./ResourceList');
var utils = require('../utils/utils');
var Reflux = require('reflux');
var Store = require('../Store/Store');
var Actions = require('../Actions/Actions');
var reactMixin = require('react-mixin');
var extend = require('extend');
var constants = require('@tradle/constants');

var {
  ListView,
  Component,
  StyleSheet,
  Text,
  ActivityIndicatorIOS,
  TouchableHighlight,
  View,
} = React;

class IdentitiesList extends Component {
  constructor(props) {
    super(props);
    var dataSource = new ListView.DataSource({
        rowHasChanged: (row1, row2) => row1 !== row2,
      });
    this.state = {
      isLoading: utils.getModels() ? false : true,
      list: this.props.list,
      dataSource: dataSource.cloneWithRows(this.props.list),
      filter: this.props.filter,
      userInput: ''
    };
  }

  componentDidMount() {
    this.listenTo(Store, 'onChangeIdentity');
  }

  selectResource(resource) {
    Actions.changeIdentity(resource);
  }
  onRemoveIdentity(params) {
    var list = [];
    extend(list, this.state.list);
    for (var i=0; i<list.length; i++) {
      if (list[i][constants.ROOT_HASH] == params.resource[constants.ROOT_HASH]) {
        list.splice(i, 1);
        break;
      }
    }
    this.setState({
      list: list,
      dataSource: this.state.dataSource.cloneWithRows(list)
    })
  }
  onChangeIdentity(params) {
    if (params.action === 'removeIdentity') {
      this.onRemoveIdentity(params);
      return;
    }

    if (params.action !== 'changeIdentity')
      return;
    var me = params.me;
    var modelName = me[constants.TYPE];
    var model = utils.getModel(modelName).value;
    var meName = utils.getDisplayName(me, model.properties);
    var self = this;
    var route = {
      title: model.title,
      component: ResourceList,
      id: 10,
      passProps: {
        filter: '',
        modelName: modelName,
      },
      rightButtonTitle: 'Profile', //'fontawesome|user',
      onRightButtonPress: {
        title: meName,
        id: 3,
        component: ResourceView,
        backButtonTitle: 'Back',
        titleTextColor: '#7AAAC3',
        rightButtonTitle: 'Edit',
        onRightButtonPress: {
          title: meName,
          id: 4,
          component: NewResource,
          titleTextColor: '#7AAAC3',
          backButtonTitle: 'Back',
          rightButtonTitle: 'Done',
          passProps: {
            model: model,
            resource: me
          }
        },

        passProps: {resource: me}
      }
    }
    this.props.navigator.replace(route);
  }

  // onSearchChange(event) {
  //   var filter = event.nativeEvent.text.toLowerCase();
  //   Actions.list(filter, this.props.list[0][constants.TYPE]);
  // }

  renderRow(resource)  {
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;
    var me = utils.getMe();
    return (
      <ResourceRow
        onSelect={() => this.selectResource(resource)}
        resource={resource}
        onCancel={() => Actions.removeIdentity(resource)} />
    );
  }
  removeIdentity(resource) {
    Actions.removeIdentity(resource);
  }
  render() {
    if (this.state.isLoading)
      return <View/>
    return (
      <View style={styles.container}>
        <ListView ref='listview'
          dataSource={this.state.dataSource}
          renderRow={this.renderRow.bind(this)}
          automaticallyAdjustContentInsets={false}
          keyboardDismissMode='on-drag'
          keyboardShouldPersistTaps={true}
          showsVerticalScrollIndicator={false} />
      </View>
    );
  }

}
reactMixin(IdentitiesList.prototype, Reflux.ListenerMixin);

var styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 64,
    backgroundColor: 'white',
  },
  centerText: {
    alignItems: 'center',
  },
  NoResourcesText: {
    marginTop: 80,
    color: '#888888',
  },
  separator: {
    height: 1,
    backgroundColor: '#cccccc',
  },
  spinner: {
    width: 30,
    alignSelf: 'center',
    marginTop: 150
  },
});

module.exports = IdentitiesList;

