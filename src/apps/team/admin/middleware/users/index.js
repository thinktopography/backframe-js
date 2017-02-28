import resources from 'platform/middleware/resources'
import User from 'platform/models/user'
import UserSerializer from 'platform/serializers/user_serializer'
import { createRoles, updateRoles } from './hooks'
import accessHandler from '../access/user.js'

export default resources({
  actions: {
    access: {
      on: 'member',
      path: 'access',
      method: 'get',
      handler: accessHandler
    }
  },
  after: {
    create: createRoles,
    update: updateRoles
  },
  allowedParams: ['first_name','last_name','email'],
  defaultSort: 'last_name',
  model: User,
  name: 'user',
  serializer: UserSerializer,
  searchParams: ['first_name','last_name','email'],
  sortParams: ['last_name'],
  filterParams: ['role_id'],
  withRelated: ['photo','roles']
})
