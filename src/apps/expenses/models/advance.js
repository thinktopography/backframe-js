import model from 'platform/models/model'
import ExpenseType from  './expense_type'
import Project from  './project'
import User from 'platform/models/user'

export default model.extend({

  tableName: 'expenses_advances',

  rules: {
    name: ['required']
  },

  expense_type: function() {
    return this.belongsTo(ExpenseType, 'expense_type_id')
  },

  project: function() {
    return this.belongsTo(Project, 'project_id')
  },

  user: function() {
    return this.belongsTo(User, 'user_id')
  }

})
