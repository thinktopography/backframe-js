const Promise = require('bluebird')
const fs = require('fs')
const path = require('path')
const parse = require('csv-parse/lib/sync')
const moment = require('moment')
const _ = require('lodash')

module.exports = {

  import(args, environment) {

    const users = toMatrix('users.tsv', '\t')

    const assets = [{
      id: 1,
      team_id: 1,
      original_file_name: 'cornell.jpg',
      file_name: 'cornell.jpg',
      content_type: 'image/jpeg',
      file_size: 12345,
      fingerprint: 'aefasdf7dsaf6sd87sda6f',
      created_at: moment(),
      updated_at: moment()
    }]

    const userData = users.reduce((data, record) => {

      const user_id = (data.users.length + 1)

      const filename = `${record[2]}.jpg`

      const photoExists = fs.existsSync(path.join(__dirname, '..', '..', '..', 'public', 'photos', `${record[2]}.jpg`))

      const asset_id = photoExists ? (data.assets.length + 1) : null

      if(photoExists) {

        data.assets.push({
          id: asset_id,
          team_id: 1,
          original_file_name: filename,
          file_name: filename,
          content_type: 'image/jpeg',
          file_size: 12345,
          fingerprint: 'aefasdf7dsaf6sd87sda6f',
          created_at: moment(),
          updated_at: moment()
        })

      }

      data.users.push({
        id: user_id,
        team_id: 1,
        first_name: record[0],
        last_name: record[1],
        email: `${record[2]}@cornell.edu`,
        password_salt: '$2a$10$wlhVrmkAu7H7Wttks/9vte',
        password_hash: '$2a$10$wlhVrmkAu7H7Wttks/9vte8KTY6afM7XHdKTXadrXlpvpVgfHyx6m',
        is_active: true,
        photo_id: asset_id,
        created_at: moment(),
        updated_at: moment()
      })

      const roles = [3,4,5,6,7,8]

      roles.map(index => {
        if(record[index] == 1) {
          data.users_roles.push({
            team_id: 1,
            user_id,
            role_id: index - 2,
            created_at: moment(),
            updated_at: moment()
          })
        }
      })

      return data

    }, { assets: assets, users: [], users_roles: [] })

    const projects = toMatrix('projects.tsv', '\t')

    const projectData = projects.reduce((data, record) => {

      const project_id = (data.projects.length + 1)

      data.projects.push({
        id: project_id,
        team_id: 1,
        title: record[1].trim().replace(/'/g, ''),
        code: record[0].trim(),
        is_active: true,
        created_at: moment(),
        updated_at: moment()
      })

      record[2].split('/').map(netid => {

        const user_id = _.find(userData.users, { email: `${netid}@cornell.edu`}).id

        data.members.push({
          team_id: 1,
          project_id,
          user_id,
          member_type_id: 1,
          created_at: moment(),
          updated_at: moment()
        })

      })

      return data

    }, { projects: [], members: [] })

    const expenses = toMatrix('expense_types.tsv', '|')

    const expenseData = expenses.reduce((data, record) => {

      const expense_type_id = (data.expense_types.length + 1)

      data.expense_types.push({
        id: expense_type_id,
        team_id: 1,
        code: record[0].trim(),
        title: record[1].trim(),
        description: record[2].trim(),
        created_at: moment(),
        updated_at: moment()
      })

      return data

    }, { expense_types: []})

    const members = toMatrix('members.tsv', '|')

    const memberData = members.reduce((data, record) => {

      const project_id = _.find(projectData.projects, { code: record[0] }).id

      const user_id = _.find(userData.users, { email: `${record[1]}@cornell.edu` }).id

      const member_types = {
        owner: 1,
        approver: 2,
        member: 3
      }

      data.members.push({
        team_id: 1,
        project_id,
        user_id,
        member_type_id: member_types[record[2]],
        created_at: moment(),
        updated_at: moment()
      })

      return data

    }, { members: projectData.members })

    return new Promise(function(resolve, reject) {

      fs.writeFileSync(path.join(__dirname, '..', '..', 'platform', 'db', 'imports', 'assets.js'), `module.exports = ${toJSON({ tableName: 'assets', records: userData.assets })}`, reject)

      fs.writeFileSync(path.join(__dirname, '..', '..', 'platform', 'db', 'imports', 'users.js'), `module.exports = ${toJSON({ tableName: 'users', records: userData.users })}`, reject)

      fs.writeFileSync(path.join(__dirname, '..', '..', 'platform', 'db', 'imports', 'users_roles.js'), `module.exports = ${toJSON({ tableName: 'users_roles', records: userData.users_roles })}`, reject)

      fs.writeFileSync(path.join(__dirname, '..', '..', 'apps', 'expenses', 'db', 'imports', 'projects.js'), `module.exports = ${toJSON({ tableName: 'expenses_projects', records: projectData.projects })}`, reject)

      fs.writeFileSync(path.join(__dirname, '..', '..', 'apps', 'expenses', 'db', 'imports', 'members.js'), `module.exports = ${toJSON({ tableName: 'expenses_members', records: memberData.members })}`, reject)

      fs.writeFileSync(path.join(__dirname, '..', '..', 'apps', 'expenses', 'db', 'imports', 'expense_types.js'), `module.exports = ${toJSON({ tableName: 'expenses_expense_types', records: expenseData.expense_types })}`, reject)

      resolve()

    })

  }

}

const toJSON = (object) => {
  return JSON.stringify(object, null, '  ').replace(/\"(\w*)\"\:/g, '$1:').replace(/\"/g, '\'')
}

const toMatrix = (filename, delimiter) => {
  return parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'tmp', filename), 'utf8'), { delimiter, quote: '^' })
}
