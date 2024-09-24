import { PrismaClient, Prisma } from '@prisma/client'
import { VercelRequest, VercelResponse } from '@vercel/node'

type VercelRequestQuery = {
  id?: string
}

export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query as VercelRequestQuery
    const prisma = new PrismaClient()

    console.log(
      '[account] Incoming request:',
      JSON.stringify(
        {
          method: req.method,
          query: req.query,
          body: req.body,
        },
        null,
        2,
      ),
    )

  
    switch (req.method) {
      case 'GET':
        return res.json(
          await prisma.space.findMany({
            where: { id },
          }),
        )
      case 'POST':
        return res.json(
          await prisma.space.create({
            data: req.body as Prisma.AccountCreateInput,
          }),
        )
      case 'PUT':
        if (id === undefined) {
          // Handle the case where id is undefined
          return res.status(400).json({ error: 'Bad Request. Missing id parameter.' });
        }

        return res.json(
          await prisma.space.update({
            where: {
              id: parseInt(id, 10) || 0, // Convert id to integer or use a default value (e.g., 0)
            },
            data: req.body as Prisma.AccountUpdateInput,
          }),
        )
      case 'DELETE':
        return res.json(
          await prisma.space.delete({
            where: { id },
          }),
        )
    }

    return res
      .status(400)
      .send({ message: `Unexpected request method: ${req.method}` })
  } catch (e: any) {
    console.error('[account] Error responding:', e)
    return res.status(500).json({ message: e?.message || e })
  }
}