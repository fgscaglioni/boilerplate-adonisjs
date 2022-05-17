import { UserFactory } from "Database/factories";

export async function getAuthToken(client) {
  const password = '5up3r@53cr3t'
  const user = await UserFactory
    .merge({ password })
    .create()

  const response = await client
    .post('/api/login')
    .form({
      email: user.email,
      password: password
    })

  response.assertStatus(200)

  const token = response.body().token.token

  return token
}
