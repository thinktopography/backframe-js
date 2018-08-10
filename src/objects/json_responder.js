import statusCodes from './status_codes'
import Responder from './responder'

class JsonResponder extends Responder {

  render() {

    this.res.status(200).json({
      meta: {
        success: true,
        status: statusCodes[200],
        message: 'Success'
      },
      data: this.data,
      ...this.pagination ? { pagination: this.pagination } : {}
    })

  }

}

export default JsonResponder