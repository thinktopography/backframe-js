import _ from 'lodash'
import knex from '../../services/knex'
import { defaultProcessor, defaultResponder } from '../../utils'
import { validateOptions, defaultOptions } from '../../utils/options'
import { coerceArray, applyToRecords } from '../../utils/core'
import * as constants from '../../constants'
import { fail } from '../../utils/response'

export default (backframeOptions = {}) => {

  return (userOptions = {}) => {

    const TYPES = {
      after: { type: ['function','function[]'], required: false },
      alterRequest: { type: ['function','function[]'], required: false },
      alterRecord: { type: ['function','function[]'], required: false },
      before: { type: ['function','function[]'], required: false },
      csvResponder: { type: ['function'], required: false },
      jsonResponder: { type: ['function'], required: false},
      processor: { type: 'function', required: true },
      renderer: { type: 'function', required: false },
      responder: { type: 'function', required: false },
      tsvResponder: { type: ['function'], required: false },
      xlsxResponder: { type: ['function'], required: false },
      xmlResponder: { type: ['function'], required: false }
    }

    validateOptions('handler', userOptions, TYPES)

    const options = normalizeOptions(userOptions, backframeOptions, TYPES)

    return buildHandler(options)

  }

}

export const normalizeOptions = (userOptions, backframeOptions, types) => {

  return expandLifecycle({
    ...defaultOptions(types),
    responder: defaultResponder('Success')(userOptions),
    ...backframeOptions,
    ...userOptions,
  })

}

export const expandLifecycle = (userOptions) => {

  return constants.BACKFRAME_HOOKS.reduce((options, hook) => ({
    ...options,
    [hook]: coerceArray(userOptions[hook])
  }), userOptions)

}

export const buildHandler = (options) => {

  const { alterRequest, before, processor, after, renderer, alterRecord, responder } = options

  return (req, res, recordTick = () => {}) => {

    return knex.transaction(async trx => {

      try {

        req = await runAlterRequest(req, trx, alterRequest)

        recordTick('alterRequest')

        await runHooks(req, trx, before)

        recordTick('before')

        let result = await processor(req, trx)

        recordTick('processor')

        await runHooks(req, trx, after, result)

        recordTick('after')

        result = renderer ? await renderer(req, trx, result) : result

        recordTick('renderer')

        result = await runAlterRecord(req, trx, alterRecord, result)

        recordTick('alterRecord')

        await responder(req, res, result)

        recordTick('responder')

        await trx.commit()

        recordTick('commit')

        return result

      } catch(err) {

        await trx.rollback(err)

        recordTick('rollback')

      }

    }).catch(err => {

      return renderError(res, err)

    })

  }

}

export const runAlterRequest = (req, trx, alterRequest) => {

  const runner = async (req, operation) => await operation(req, trx)

  if(alterRequest.length === 0) req

  if(alterRequest.length === 1) return runner(req, alterRequest[0])

  return Promise.reduce(alterRequest, runner, req)

}

export const runAlterRecord = (req, trx, alterRecord, result) => {

  const runner = async (result, operation) => await (result && result.records) ? applyToRecords(req, trx, result, operation) : operation(req, trx, result)

  if(alterRecord.length === 0) return result

  if(alterRecord.length === 1) return runner(result, alterRecord[0])

  return Promise.reduce(alterRecord, runner, result)

}

export const runHooks = (req, trx, hooks, result = null) => {

  const runner = async (hook) => await result ? hook(req, trx, result) : hook(req, trx)

  if(hooks.length === 0) return null

  if(hooks.length === 1) return runner(hooks[0])

  return Promise.map(hooks, hook => runner(hook))

}

export const renderError = (res, err) => {

  if(_.includes(['development'], process.env.NODE_ENV)) console.log(err)

  if(err.name == 'BackframeError') return fail(res, err.code, err.message, { errors: err.errors })

  return fail(res, 500, err.message)

}
