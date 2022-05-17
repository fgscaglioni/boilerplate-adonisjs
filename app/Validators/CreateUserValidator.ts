import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema, validator } from '@ioc:Adonis/Core/Validator'

export default class CreateUserValidator {
  constructor(protected ctx: HttpContextContract) {
  }

  public reporter = validator.reporters.api

  public refs = schema.refs({
    id: this.ctx.request.only(['id'])
  })

  public schema = schema.create({
    email: schema.string({}, [
      rules.email(),
      rules.unique({
        table: 'users',
        column: 'email',
        where: { id: this.refs.id },
      })
    ]),
    password: schema.string.optional({}, [rules.minLength(8)])
  })

  public messages = {}
}
