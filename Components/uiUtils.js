import utils from '../utils/utils'
var translate = utils.translate

import GridList from './GridList'
import NewResource from './NewResource'
var defaultBankStyle = require('../styles/defaultBankStyle.json')
const constants = require('@tradle/constants')

var { TYPE } = constants
const BOOKMARK = 'tradle.Bookmark'

var uiUtils = {
  showBookmarks(params) {
    let { resource, searchFunction, navigator, bankStyle, currency } = params
    let model = utils.getModel(BOOKMARK)
    let btype = resource.bookmark[TYPE]
    let bm = utils.getModel(btype).value
    navigator.push({
      id: 30,
      title: translate('searchSomething', utils.makeModelTitle(bm)),
      backButtonTitle: 'Back',
      component: GridList,
      passProps: {
        modelName: btype,
        bookmark: resource,
        resource: resource.bookmark,
        bankStyle: bankStyle,
        currency: currency,
        limit: 20,
        search: true
      },
    //   rightButtonTitle: 'Search',
    //   onRightButtonPress: {
    //     title: translate('searchSomething', utils.makeModelTitle(bm)),
    //     id: 4,
    //     component: NewResource,
    //     titleTextColor: '#7AAAC3',
    //     backButtonTitle: 'Back',
    //     rightButtonTitle: 'Done',
    //     passProps: {
    //       model: model,
    //       resource: resource.bookmark,
    //       searchWithFilter: searchFunction,
    //       search: true,
    //       bankStyle: bankStyle || defaultBankStyle,
    //     }
    //   }
    })
  },
}
module.exports = uiUtils