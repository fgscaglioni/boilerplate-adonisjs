import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { rules, schema, validator } from '@ioc:Adonis/Core/Validator'

export default class ResetPasswordValidator {
  constructor(protected ctx: HttpContextContract) {
  }

  public reporter = validator.reporters.api

  public schema = schema.create({
    password: schema.string({}, [
      rules.minLength(8),
      rules.confirmed()
    ])
  })

  public messages = {}
}
