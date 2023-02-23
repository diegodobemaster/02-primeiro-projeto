import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExistis } from '../middlewares/check-session-id-existis'

export async function transactionsRoutes(app: FastifyInstance) {
  // esse exemplo foi apenas para demosntrar que da pra usar o middleware de forma global
  // ao invez de colcoar um por um em cada rota.
  // app.addHook('preHandler', async (request, reply) => {
  //   console.log(`[${request.method}] ${request.url}`)
  // })

  // traz  todas as transções
  app.get(
    '/',
    {
      preHandler: [checkSessionIdExistis],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies

      const transactions = await knex('transactions')
        .where('session_id', sessionId)
        .select()

      return { transactions }
    },
  )

  // traz somente a transação do id especifico
  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExistis],
    },
    async (request) => {
      const getTansactionsParamsSchema = z.object({
        id: z.string().uuid(),
      })
      const { id } = getTansactionsParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      const transaction = await knex('transactions')
        .where({
          session_id: sessionId,
          id,
        })
        .first()

      return { transaction }
    },
  )

  // traz um resumo dos valores das transações
  app.get(
    '/summary',
    {
      preHandler: [checkSessionIdExistis],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const summary = await knex('transactions')
        .where('session_id', sessionId)
        .sum('amount', { as: 'amount' })
        .first()
      return { summary }
    },
  )

  // Cria uma nova transação
  app.post('/', async (request, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })

    const { title, amount, type } = createTransactionBodySchema.parse(
      request.body,
    )

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    })

    return reply.status(201).send('criado com sucesso')
  })
}
