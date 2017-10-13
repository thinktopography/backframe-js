import { coerceArray, selectedLabels, selectedKeys } from '../utils/core'
import tempfile from 'tempfile'
import Excel from 'exceljs'
import _ from 'lodash'
import fs from 'fs'

const XlsxResponder = (message, pagination, result, req, res) => {

  const records = coerceArray(result)

  const labels = selectedLabels(req.query.$select, records[0])

  const keys = selectedKeys(req.query.$select, records[0])

  const workbook = new Excel.Workbook()
  const worksheet = workbook.addWorksheet('test')

  worksheet.addRow(labels)

  records.map(record => {
    worksheet.addRow(keys.map(key => {
      return _.get(record, key)
    }))
  })

  const tempFilePath = tempfile('.xlsx')

  return workbook.xlsx.writeFile(tempFilePath).then(() => {

    fs.readFile(tempFilePath, (err, data) => {

      if(err) reject(err)

      res.send(data)

    })

    return null

  })

}

export default XlsxResponder
