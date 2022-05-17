import Mail from '@ioc:Adonis/Addons/Mail';
import Env from '@ioc:Adonis/Core/Env';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import BadRequestException from 'App/Exceptions/BadRequestException';
import PasswordReset from 'App/Models/PasswordReset';
import User from 'App/Models/User';
import CreateUserValidator from 'App/Validators/CreateUserValidator';
import ResetPasswordValidator from 'App/Validators/ResetPasswordValidator';
import * as CryptoJS from "crypto-js";

export default class AuthController {

  private async sendWelcomeMail(user: User) {
    await Mail.send((message) => {
      message
        .from('noreply@mail.local')
        .to(user.email)
        .subject('Welcome Onboard!')
        .htmlView('emails/welcome', { user })
    })
  }

  private async sendResetPasswordMail({ user, token, reset, resetPasswordUrl }) {
    await Mail.send((message) => {
      message
        .to(user.email)
        .from('noreply@mail.local')
        .subject('Password recovery')
        .htmlView('emails/forgotpassword', { user, token, reset, resetPasswordUrl })
    })
  }

  async getUser({ auth, response }: HttpContextContract) {
    return response.status(200).json(auth.user)
  }

  async register({ request }: HttpContextContract) {
    const payload = await request.validate(CreateUserValidator)
    const user = await User.create(payload)

    this.sendWelcomeMail(user)

    return user
  }

  async login({ request, auth, response }: HttpContextContract) {
    let user;
    const { email, password } = request.all();
    const token = await auth.use('api').attempt(email, password, {
      expiresIn: '2hours'
    })
    if (auth.user) {
      user = await User
        .query()
        .where('id', auth.user?.id)
        .first()
    }

    return response.json({
      user,
      token,
    })
  }

  async forgot({ request, response }: HttpContextContract) {
    const { email, callbackUrl } = request.only(['email', 'callbackUrl'])
    const secret = Env.get('APP_KEY', 'secret')

    const user = await User.findByOrFail('email', email)
    const token = CryptoJS.lib.WordArray.random(10)

    // remove all token from user
    const allTokens = await PasswordReset.findBy('email', email)
    await allTokens?.delete()

    const reset = await PasswordReset.firstOrNew({ email: email })
    reset.merge({ token })
    await reset.save()

    const encryptedEmail = CryptoJS.AES.encrypt(email, secret).toString()
    const resetPasswordUrl = `${callbackUrl}/${token}/${encryptedEmail}`

    this.sendResetPasswordMail({ user, token, reset, resetPasswordUrl })

    return response.noContent()

  }

  async reset({ request, response, params }: HttpContextContract) {
    const tokenProvided = params.token

    const reset = await PasswordReset.findByOrFail('token', tokenProvided)
    const emailRequesting = reset?.email
    const { password } = await request.validate(ResetPasswordValidator)

    // looking for user with the registered email
    const user = await User.findByOrFail('email', emailRequesting)

    // checking if token is still the same
    // just to make sure that the user is not using an old link
    // after requesting the password recovery again
    const sameToken = tokenProvided === reset.token

    if (!sameToken)
      throw new BadRequestException('Old token provided or token already used', 401)

    // saving new password
    user.password = password
    // persisting data (saving)
    await user.save()
    // remove old token
    await reset.delete();

    response.status(200).json(user)

  }

  async logout({ response, auth }: HttpContextContract) {
    auth.logout()
    response.status(200).json({
      success: true,
      message: 'user logged out'
    })
  }

}
