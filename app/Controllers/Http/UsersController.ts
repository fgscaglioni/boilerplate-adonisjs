import User from 'App/Models/User';
import CreateUserValidator from 'App/Validators/CreateUserValidator';
import TraitController from '../TraitController';

export default class UserController extends TraitController {

  constructor() {
    super({
      model: User,
      validators: {
        create: CreateUserValidator
      }
    })
  }

}
