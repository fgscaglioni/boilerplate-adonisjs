import { test } from '@japa/runner'
import User from 'App/Models/User'
import { UserFactory } from 'Database/factories'
import { getAuthToken } from '../generics/functions'

test.group('User', (group) => {

  test('it should generate a token', async ({ client, assert }) => {
    const token = await getAuthToken(client)
    assert.notEmpty(token)
  })

  test('it should fail on list user', async ({ client, assert }) => {
    const request = await client
      .get('/api/users')

    assert.properties(request.body(), ['errors'])
    request.assertStatus(401)
  })

  test('it should get a paginated list of users', async ({ assert, client }) => {
    const token = await getAuthToken(client)
    const request = await client
      .get('/api/users')
      .bearerToken(token)

    request.assertStatus(200)
    assert.properties(request.body(), ['meta', 'data'])
    assert.isArray(request.body().data)
    assert.lengthOf(request.body().data, 20)
  })

  test('it should find one user', async ({ assert, client }) => {
    const token = await getAuthToken(client)
    const user = await User.firstOrFail()
    const request = await client
      .get(`/api/users/${user.id}`)
      .bearerToken(token)

    request.assertStatus(200)
    assert.propertyVal(request.body(), 'email', user.email)
  })

  test('it should get logged user info', async ({ assert, client }) => {
    const token = await getAuthToken(client)

    const request = await client
      .get(`/api/user/`)
      .bearerToken(token)

    request.assertStatus(200)
    assert.properties(request.body(), ['id', 'email'])
  })

  test('it should update user info', async ({ assert, client }) => {
    const token = await getAuthToken(client)
    const user = await UserFactory.create()
    const payload = {
      email: 'newemail@mail.local'
    }

    const request = await client
      .put(`/api/users/${user.id}`)
      .form(payload)
      .bearerToken(token)

    request.assertStatus(200)
    assert.propertyVal(request.body(), 'email', payload.email)
  })

  test('it should delete a user', async ({ assert, client }) => {
    const token = await getAuthToken(client)
    const user = await UserFactory.create()

    const foundedUser = await User.find(user.id)
    assert.isNotNull(foundedUser)

    const request = await client
      .delete(`/api/users/${user.id}`)
      .bearerToken(token)

    request.assertStatus(200)

    const deletedUser = await User.find(user.id)
    assert.isNull(deletedUser)
  })

})
