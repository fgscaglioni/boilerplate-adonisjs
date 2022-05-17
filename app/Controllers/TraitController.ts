import Env from '@ioc:Adonis/Core/Env';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { RequestContract } from '@ioc:Adonis/Core/Request';
import { BaseModel, ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm';

interface TraitConfig {
  model: typeof BaseModel,
  validators?: {
    create?: any,
    update?: any
  }
}

export default class TraitController {

  config: TraitConfig
  DB_CONNECTION = Env.get('DB_CONNECTION', 'sqlite')

  constructor(config: TraitConfig) {
    this.config = config
  }

  public async index({ request, response }: HttpContextContract) {
    const query = this.config.model.query()
    const result = await this.applyFilters(request, query)
    return response.json(result)
  }

  public async applyFilters(request, query) {
    const {
      paginate, limit, page, order,
      _with, where, whereNull, whereNotIn, like,
      select, first, whereBetween, whereHas
    } = this.destructuringOfRequest(request)

    if (_with) query = this.addWithClauses(query, _with)
    if (where) query = this.addWhereClauses(query, where)
    if (whereNull) query = this.addWhereNullClauses(query, whereNull)
    if (whereNotIn) query = this.addWhereNotInClauses(query, whereNotIn)
    if (like) query = this.addLikeClauses(query, like)
    if (select) query = this.addSelect(query, select)
    if (whereBetween) query = this.addWhereBetweenClauses(query, whereBetween)
    if (whereHas) query = this.addWhereHasClauses(query, whereHas)

    if (order) {
      const _order = order.split(',')
      query.orderBy(_order[0], _order[1])
    }

    const result = (paginate) ? await query.paginate(page, limit) :
      (first) ? await query.first() : await query

    return result
  }

  private destructuringOfRequest(request: RequestContract) {
    const req = request.all()
    let paginate: boolean = true

    if (req?.paginate) paginate = (/true/i).test(req.paginate)

    const limit = (req['limit']) ? req.limit : 20
    const page = (req['page']) ? req.page : 1
    const order = (req['order']) ? req.order : 'id,asc'
    const _with = req['with'] ?? undefined
    const where = req['where'] ?? undefined
    const whereNull = req['whereNull'] ?? undefined
    const whereNotIn = req['whereNotIn'] ?? undefined
    const like = req['like'] ?? undefined
    const select = req['select'] ?? undefined
    const first: boolean = (/true/i).test(req?.first)
    const whereBetween = req['whereBetween'] ?? undefined
    const whereHas = req['whereHas'] ?? undefined

    return {
      paginate, limit, page, order,
      _with, where, whereNull, whereNotIn, like, select,
      first, whereBetween, whereHas
    }
  }

  public async store(ctx: HttpContextContract) {
    const { request, response } = ctx
    try {
      const payload = await request.validate(this.config.validators?.create)
      let result = await this.config.model.create(payload)

      if (this['extraOnStore']) {
        result = await this['extraOnStore'](ctx, { data: result })
      }

      return response.json(result)
    } catch (error) {
      response.badRequest({ error })
    }
  }

  public async show({ params, response }: HttpContextContract) {
    let query = this.config.model.query();

    const result = await query.where('id', params.id).first()
    return response.json(result)
  }

  public async update(ctx: HttpContextContract) {
    const { request, params, response } = ctx
    try {
      const payload = await request.validate(this.config.validators?.create)
      let result = await this.config.model.findOrFail(params.id)

      result.merge(payload)
      await result.save()

      if (this['extraOnUpdate']) {
        result = await this['extraOnUpdate'](ctx, { data: result })
      }

      return response.json(result)
    } catch (error) {
      response.badRequest({ error })
    }
  }

  public async destroy({ params, response }: HttpContextContract) {
    let result = await this.config.model.findOrFail(params.id)
    result.delete()
    return response.json(result)
  }

  addSelect(query: ModelQueryBuilderContract<any, any>, selects) {
    const fields = (selects.length > 0) ? `id,${selects}`.split(',') : ['*']
    query.select(fields)
    return query
  }

  nestedPreload(query: ModelQueryBuilderContract<any, any>, relations: string[]) {
    const first = relations.shift() || ""
    if (relations.length > 1) {
      this.nestedPreload(query, relations)
    } else {
      query.preload(first, (builder) => {
        builder.preload(relations[0])
      })
    }
    return query
  }

  addWhereClauses(query: ModelQueryBuilderContract<any, any>, wheres) {
    query.where(wheres)
    return query
  }

  addWithClauses(query: ModelQueryBuilderContract<any, any>, withs) {
    const loadRelations = (preload: string, fields: string | undefined = undefined) => {
      const relations = preload.split('.')
      if (relations.length === 1) {
        if (fields) {
          query.preload(relations[0], builder => {
            builder.select(fields.split(','))
          })
        } else {
          query.preload(relations[0])
        }
        return query
      }
      this.nestedPreload(query, relations)
    }

    if (typeof withs === 'string') {
      loadRelations(withs);
    } else {
      Object.keys(withs).forEach(key => {
        loadRelations(key, withs[key]);
      })
    }

    return query
  }

  addWhereNullClauses(query: ModelQueryBuilderContract<any, any>, wheres) {
    Object.keys(wheres).forEach(key => {
      query.whereNull(key)
    })
    return query
  }

  addWhereNotInClauses(query: ModelQueryBuilderContract<any, any>, wheres) {
    Object.keys(wheres).forEach(key => {
      query.whereNotIn(key, wheres[key].split(','))
    })
    return query
  }

  addWhereBetweenClauses(query: ModelQueryBuilderContract<any, any>, wheres) {
    Object.keys(wheres).forEach(key => {
      query.whereBetween(key, wheres[key].split(','))
    })
    return query
  }

  addWhereHasClauses(query: ModelQueryBuilderContract<any, any>, wheres) {
    console.log(wheres);

    Object.keys(wheres).forEach(key => {
      query.whereHas(key, qb => {
        const [field, value] = wheres[key].split(',')
        qb.where(field, value)
      })
    })
    return query
  }

  addLikeClauses(query: ModelQueryBuilderContract<any, any>, likes) {
    const typeOfLikes = typeof likes;

    if (typeOfLikes == 'string') {
      query = this.mountLikeClause(query, likes)
    }

    if (typeOfLikes == 'object') {
      Object.keys(likes).forEach(key => {
        query = this.mountLikeClause(query, `${key},${likes[key]}`)
      })
    }

    return query
  }

  mountLikeClause(query: ModelQueryBuilderContract<any, any>, like: string) {
    const parts = like.split(',');
    const search = parts[1].toLowerCase()
    const index = parts[0].indexOf('.')
    if (index == -1) {
      switch (this.DB_CONNECTION) {
        case 'pg':
          query.whereRaw(`lower(??) ilike ?`, [parts[0], `%${search}%`])
          break;
        default:
          query.where(parts[0], 'like', `%${search}%`)
          break;
      }
    } else {
      const model = parts[0].substring(0, index)
      const field = parts[0].substring(index + 1, parts[0].length)
      query
        .whereHas(model, (builder) => {
          switch (this.DB_CONNECTION) {
            case 'pg':
              builder.whereRaw(`lower(??) ilike ?`, [field, `%${search}%`])
              break;
            default:
              builder.where(field, 'like', `%${search}%`)
              break;
          }
        })
    }
    return query
  }


}
