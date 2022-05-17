import { test } from '@japa/runner'
import User from 'App/Models/User'

test.group('Password', () => {

  test('ensure user password gets hashed during save', async ({ assert }) => {
    const user = new User()
    user.email = 'test@mail.com'
    user.password = 'superSecret'
    await user.save()

    assert.notEqual(user.password, 'superSecret')
  })

})
