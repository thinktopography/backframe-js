import React from 'react'
import Page from 'admin/components/page'
import Collection from 'admin/components/collection'

class Index extends React.Component {

  render() {
    return (
      <div className="chrome-body">
        <Collection {...this._getCollection()} />
      </div>
    )
  }

  _getCollection() {
    return {
      endpoint: '/admin/expenses/reports/trips',
      columns: [
        { label: 'Date', key: 'date', primary: true , format: 'date' },
        { label: 'User', key: 'user.full_name', primary: true },
        { label: 'Project', key: 'project.title', primary: true },
        { label: 'Amount', key: 'amount', primary: true, format: 'currency' }
      ],
      filters: [
        { label: 'User', name: 'user_id', type: 'select', multiple: true, endpoint: '/admin/team/users', value: 'id', text: 'full_name' },
        { label: 'Projects', name: 'project_id', type: 'select', multiple: true, endpoint: '/admin/expenses/projects', value: 'id', text: 'title' },
        { label: 'Date Range', name: 'date', type: 'daterange', include: ['this','last'] }
      ],
      export: true,
      sort: { key: 'date', order: 'desc' },
      entity: 'trip'
    }
  }

}

const mapPropsToPage = (props, context) => ({
  title: 'Trips Report'
})

export default Page(mapPropsToPage)(Index)
