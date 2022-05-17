import Mail from '@ioc:Adonis/Addons/Mail'
import { test } from '@japa/runner'
import PasswordReset from 'App/Models/PasswordReset'
import { UserFactory } from 'Database/factories'

test.group('Login', (group) => {

  group.teardown(() => {
    Mail.restore()
  })

  test('it should register user', async ({ client, assert }) => {
    const user = await UserFactory.make()

    const fakeMailer = Mail.fake()
    const request = await client
      .post('/api/register')
      .form({
        email: user.email,
        password: user.password
      })

    request.assertStatus(200)
    assert.propertyVal(request.body(), 'email', user.email)

    fakeMailer.exists({ to: [{ address: user.email }] })
    fakeMailer.exists({ subject: 'Welcome Onboard!' })
  })

  test('it should login user', async ({ client, assert }) => {
    const { request } = await loginUser(client)

    request.assertStatus(200)
    assert.properties(request.body(), ['token'])
  })

  const loginUser = async (client) => {
    const password = '5up3r@53cr3t'
    const user = await UserFactory
      .merge({ password })
      .create()

    const request = await client
      .post('/api/login')
      .form({
        email: user.email,
        password: password
      })
    return { user, request }
  }

  test('it should logout user', async ({ client, assert }) => {
    const { user, request: userRequest } = await loginUser(client)
    const request = await client
      .post('/api/logout')
      .bearerToken(userRequest.body().token.token)

    request.assertStatus(200)
    assert.properties(request.body(), ['success', 'message'])
  })

  test('it should send email with instructions to reset password', async ({ client, assert }) => {
    const fakeMailer = Mail.fake()
    const { request, user } = await requestResetPassword(client)

    fakeMailer.exists({ to: [{ address: user.email }] })
    fakeMailer.exists({ subject: 'Password recovery' })

    request.assertStatus(204)
    assert.isEmpty(request.body())
  })

  const requestResetPassword = async (client) => {
    const password = '5up3r@53cr3t'
    const user = await UserFactory
      .merge({ password })
      .create()

    const request = await client
      .post('/api/forgot')
      .form({
        email: user.email,
        callbackUrl: 'http://localhost/api/'
      })

    return { request, user }
  }

  test('it should reset password', async ({ client, assert }) => {
    const { user } = await requestResetPassword(client)
    const passwordReset = await PasswordReset.findBy('email', user.email)

    const fakeMailer = Mail.fake()
    const request = await client
      .put(`/api/reset/${passwordReset.token}`)
      .form({
        password: 'newPassword',
        password_confirmation: 'newPassword'
      })

    fakeMailer.exists({ to: [{ address: user.email }] })
    fakeMailer.exists({ subject: 'Password recovery' })

    request.assertStatus(200)
    assert.properties(request.body(), ['id', 'email'])
  })





})
