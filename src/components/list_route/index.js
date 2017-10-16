import _ from 'lodash'
import moment from 'moment'
import { defaultQuery, defaultRenderer, defaultResponder } from '../../utils'
import { castColumn, coerceArray, mergeTypes } from '../../utils/core'
import { validateOptions, defaultOptions, checkPermitted } from '../../utils/options'
import {  } from '../../utils/options'
import * as constants from '../../constants'
import buildRoute from '../route'

export default (backframeOptions = {}) => (userOptions = {}) => {

  const TYPES = mergeTypes({
    filterParams: { type: ['string','string[]'], required: false },
    sortParams: { type: ['string','string[]'], required: false },
    searchParams: { type: ['string','string[]'], required: false },
    virtualFilters: { type: ['object'], required: false, default: {} }
  }, backframeOptions.plugins)

  validateOptions('list route', userOptions, TYPES)

  const options = normalizeOptions(userOptions, backframeOptions, TYPES)

  return buildListRoute(options, buildRoute(backframeOptions))

}

// normalize and merge defaut options
export const normalizeOptions = (userOptions, backframeOptions, types) => {

  return {
    defaultFormat: backframeOptions.defaultFormat,
    defaultLimit: backframeOptions.defaultLimit,
    filterParams: [],
    knex: backframeOptions.knex,
    sortParams: [],
    searchParams: [],
    virtualFilters: {},
    ...userOptions
  }

}

// convert options into route fomat { method, path, options, handler]}
export const buildListRoute = (routeOptions, buildRoute) => {

  const beforeProcessor = (req, trx, options)  => {

    if(req.query.$filter) {

      const virtualFilters = options.virtualFilters || {}

      const allowed = [
        ...routeOptions.filterParams,
        ...Object.keys(virtualFilters),
        'q'
      ]

      checkPermitted(req.query.$filter, allowed, 'Unable to filter on the keys {unpermitted}. Please add it to filterParams')

      if(req.query.$filter.q && !routeOptions.searchParams && process.env.NODE_ENV == 'development') {
        throw new BackframeError({ code: 412, message: 'Unable to search on q without searchParams' })
      }

    }

    if(req.query.$sort) {

      const sort = req.query.$sort.split(',').map(sort => sort.replace('-', ''))

      checkPermitted(sort, routeOptions.sortParams, 'Unable to sort on the keys {unpermitted}. Please add it to sortParams')

    }

  }

  const processor = async (req, trx, options) => {

    const tableName = routeOptions.model.extend().__super__.tableName

    const columns = await options.knex(tableName).columnInfo()

    const whitelistedFilters = _.pick(req.query.$filter, [...routeOptions.filterParams, 'q'])

    const whitelistedVirtualFilters = _.pick(req.query.$filter, Object.keys(routeOptions.virtualFilters))

    const fetchOptions = routeOptions.withRelated ? { withRelated: coerceArray(routeOptions.withRelated), transacting: trx } : { transacting: trx }

    const limit = parseInt(_.get(req.query, '$page.limit') || routeOptions.defaultLimit)

    const skip = parseInt(_.get(req.query, '$page.skip') || 0)

    const query = qb => {

      defaultQuery(req, trx, qb, {
        ...options,
        defaultQuery: [
          ...coerceArray(routeOptions.defaultQuery),
          ...coerceArray(options.defaultQuery),
        ]
      })

      if(routeOptions.searchParams && whitelistedFilters && whitelistedFilters.q) {

        const vector = routeOptions.searchParams.map(param => {

          return `coalesce(${castColumn(tableName, param)}, '')`

        })

        if(vector.length > 0) {

          const term = whitelistedFilters.q.toLowerCase().replace(' ', '%')

          qb.whereRaw(`lower(${vector.join(' || ')}) LIKE '%${term}%'`)


        }

      }

      filter(routeOptions, qb, whitelistedFilters, whitelistedVirtualFilters)

      if(req.query.$exclude_ids) qb.whereNotIn(`${tableName}.id`, req.query.$exclude_ids)

      if(req.query.$ids) qb.whereIn(`${tableName}.id`, req.query.$ids)

      return qb

    }

    let allQueryObject = null

    routeOptions.model.query(qb => {

      defaultQuery(req, trx, qb, {
        ...options,
        defaultQuery: [
          ...coerceArray(routeOptions.defaultQuery),
          ...coerceArray(options.defaultQuery),
        ]
      })

      if(routeOptions.softDelete) qb.whereNull('deleted_at')

      allQueryObject = qb.toSQL()

    })

    const all = () => options.knex.raw(`select count(*) as count from (${allQueryObject.sql}) as temp`, allQueryObject.bindings).transacting(trx)

    const countQueryObject = query(routeOptions.knex(tableName)).toSQL()

    const count = () => routeOptions.knex.raw(`select count(*) as count from (${countQueryObject.sql}) as temp`, countQueryObject.bindings).transacting(trx)

    const paged = () => routeOptions.model.query(qb => {

      const sort = extractSort(req.query.$sort, routeOptions.defaultSort, routeOptions.sortParams)

      query(qb)

      if(limit > 0) qb.limit(limit).offset(skip)

      if(sort) sort.map(item => {

        const column = castColumn(tableName, item.key)

        const isString = columns[item.key] && columns[item.key].type === 'character varying'

        qb.orderByRaw(`${column} ${item.order}`)

      })

    }).fetchAll(fetchOptions).then(records => records.map(record => record))

    return Promise.all([all(), count(), paged()]).then(responses => {

      const allResonse = responses[0].rows ? responses[0].rows[0] : responses[0][0]

      const all = allResonse.count ? parseInt(allResonse.count) : 0

      const totalResonse = responses[1].rows ? responses[1].rows[0] : responses[1][0]

      const total = totalResonse.count ? parseInt(totalResonse.count) : 0

      const records = responses[2]

      return { all, total, records, limit, skip }

    })

  }

  return buildRoute({
    method: routeOptions.method,
    path: routeOptions.path,
    beforeProcessor,
    processor,
    renderer: defaultRenderer,
    responder: defaultResponder('Successfully found records'),
    serializer: routeOptions.serializer
  })

}

// takes sort param and converts to sort array
export const extractSort = (query, defaults, allowedParams = []) => {

  if(query) {
    query = coerceArray(query).filter(item => _.includes(allowedParams, item.replace('-', '')))
  }

  const sort = query || defaults || null

  if(!sort) return null

  return coerceArray(sort).map(item => ({
    key: item.replace('-', ''),
    order: (item[0] === '-') ? 'desc' : 'asc'
  }))

}

// map query filters to a qb object
export const filter = (options, qb, filters, virtualFilters) => {

  const tableName = options.model.extend().__super__.tableName

  if(options.virtualFilters) {

    Object.keys(options.virtualFilters).map(key => {

      if(!virtualFilters[key]) return

      options.virtualFilters[key](qb, virtualFilters[key], options)

    })

  }

  Object.keys(filters).filter(key => filters[key]).map(key => {

    const column = castColumn(tableName, key)

    if(filters[key].$eq) {

      if(filters[key].$eq === 'null') {

        qb.whereNull(column)

      } else if(filters[key].$eq === 'not_null') {

        qb.whereNotNull(column)

      } else if(filters[key].$eq === 'true') {

        qb.where(column, true)

      } else if(filters[key].$eq === 'false') {

        qb.where(column, false)

      } else if (filters[key].$eq.match(/^\d*$/)) {

        qb.where(column, filters[key].$eq)

      } else {

        qb.whereRaw(`lower(${column}) = ?`, filters[key].$eq.toLowerCase())
      }

    } else if(filters[key].$ne) {

      qb.whereNot(column, filters[key].$ne)

    } else if(filters[key].$lk) {

      qb.whereRaw(`lower(${column}) like ?`, `%${filters[key].$lk.toLowerCase()}%`)

    } else if(filters[key].$in) {

      const inArray = _.without(filters[key].$in, 'null')
      if(_.includes(filters[key].$in, 'null')) {
        qb.where(function() {
          this.whereIn(column, inArray).orWhereNull(key)
        })
      } else {
        qb.whereIn(column, inArray)
      }

    } else if(filters[key].$nin) {

      const inArray = _.without(filters[key].$nin, 'null')
      if(_.includes(filters[key].$nin, 'null')) {
        qb.where(function() {
          this.whereNotIn(column, inArray).orWhereNotNull(key)
        })
      } else {
        qb.whereNotIn(column, inArray)
      }

    } else if(filters[key].$lt) {

      qb.where(column, '<', filters[key].$lt)

    } else if(filters[key].$lte) {

      qb.where(column, '<=', filters[key].$lte)

    } else if(filters[key].$gt) {

      qb.where(column, '>', filters[key].$gt)

    } else if(filters[key].$gte) {

      qb.where(column, '>=', filters[key].$gte)

    } else if(filters[key].$dr) {

      if(filters[key].$dr === 'this_week') {

        daterange(qb, column, 0, 'week')

      } else if(filters[key].$dr === 'last_week') {

        daterange(qb, column, -1, 'week')

      } else if(filters[key].$dr === 'next_week') {

        daterange(qb, column, 1, 'week')

      } else if(filters[key].$dr === 'this_month') {

        daterange(qb, column, 0, 'month')

      } else if(filters[key].$dr === 'last_month') {

        daterange(qb, column, -1, 'month')

      } else if(filters[key].$dr === 'next_month') {

        daterange(qb, column, 1, 'month')

      } else if(filters[key].$dr === 'this_quarter') {

        daterange(qb, column, 0, 'quarter')

      } else if(filters[key].$dr === 'last_quarter') {

        daterange(qb, column, -1, 'quarter')

      } else if(filters[key].$dr === 'next_quarter') {

        daterange(qb, column, 1, 'quarter')

      } else if(filters[key].$dr === 'this_year') {

        daterange(qb, column, 0, 'year')

      } else if(filters[key].$dr === 'last_year') {

        daterange(qb, column, -1, 'year')

      } else if(filters[key].$dr === 'next_year') {

        daterange(qb, column, 1, 'year')

      }

    }

  })

}

export const daterange = (qb, column, quantity, unit) => {

  qb.where(column, '>=', moment().add(quantity, unit).startOf(unit).format('YYYY-MM-DD'))

  qb.where(column, '<=', moment().add(quantity, unit).endOf(unit).format('YYYY-MM-DD'))

}
