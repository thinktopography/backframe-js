import React from 'react'
import Details from 'admin/components/details'
import Page from 'admin/components/page'
import Edit from './edit'
import Tabs from 'admin/components/tabs'
import Avatar from 'admin/components/avatar'
import NewMember from './members/new'
import EditMember from './members/edit'
import NewExpenseType from './expense_types/new'
import EditExpenseType from './expense_types/edit'

class Show extends React.Component {

  render() {
    return (
      <div className="chrome-body">
        <div className="chrome-sidebar">
        <Details {...this._getDetails()} />
        </div>
        <div className="chrome-content">
          <Tabs {...this.props} {...this._getTabs()} />
        </div>
      </div>
    )
  }

  _getDetails() {
    const { project } = this.props
    return {
      items: [
        { label: 'Title ', content: project.title },
        { label: 'Code ', content: project.code, format: 'code' },
        { label: 'Created ', content: project.created_at, format: 'datetime' }
      ]
    }
  }

  _getTabs() {
    return {
      tabs: [
        { label: 'Members', content: Members },
        { label: 'Expense Types', content: ExpenseTypes }
      ]
    }
  }

}

class Members extends React.Component {

  static contextTypes = {
    modal: React.PropTypes.object
  }

  render() {
    const { members } = this.props
    return (
      <div className="project-members">
        { members.length === 0 && <p>This project does not yet have any members yet</p>}
        { members.map((member, index) => {
          return (
            <div key={`member_${index}`} className="project-member" onClick={this._handleEdit.bind(this, member.id)}>
              <Avatar user={ member.user  } />
              <p>
                <strong>{ member.user.full_name }</strong><br />
                { member.user.email }
              </p>
              { member.is_owner && <div className="owner"><span>OWNER</span></div> }
            </div>
          )
        }) }
      </div>

    )
  }

  _handleEdit(id) {
    this.context.modal.push(<EditMember {...this.props} member_id={id} />)
  }

}

class ExpenseTypes extends React.Component {

  static contextTypes = {
    modal: React.PropTypes.object
  }

  render() {
    const { project_expense_types } = this.props
    return (
      <div className="project-members">
        { project_expense_types.length === 0 && <p>This project does not yet have any expense types yet</p>}
        { project_expense_types.map((project_expense_type, index) => {
          return (
            <div key={`expense_types_${index}`} className="project-member" onClick={this._handleEdit.bind(this, project_expense_type.id)}>
              <p>
                <strong>{project_expense_type.expense_type.code}</strong><br />
                {project_expense_type.expense_type.title}
              </p>
            </div>
          )
        }) }
      </div>
    )
  }

  _handleEdit(id) {
    this.context.modal.push(EditExpenseType)
  }

}

const mapPropsToPage = (props, context) => ({
  title: 'Project',
  rights: [],
  tasks: [
    { label: 'Edit Project', modal: Edit },
    { label: 'Add Member', modal: NewMember },
    { label: 'Add Expense Type', modal: NewExpenseType }
  ],
  resources: {
    project: `/admin/expenses/projects/${props.params.id}`,
    members: `/admin/expenses/projects/${props.params.id}/members`,
    project_expense_types: `/admin/expenses/projects/${props.params.id}/expense_types`
  }
})

export default Page(mapPropsToPage)(Show)
