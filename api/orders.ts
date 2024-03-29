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
          await prisma.orders.findMany({
            where: {
              createdBy: id,
            },
          }),
        );
      case 'POST':
        return res.json(
          await prisma.orders.create({
            data: req.body,
          }),
        );
      case 'PUT':
        if (id === undefined) {
          return res.status(400).json({ error: 'Bad Request. Missing id parameter.' });
        }

        return res.json(
          await prisma.orders.update({
            where: {
              id: parseInt(id, 10) || 0,
            },
            data: req.body,
          }),
        );
      case 'DELETE':
        return res.json(
          await prisma.orders.delete({
            where: { id },
          }),
        );
    }

    return res
      .status(400)
      .send({ message: `Unexpected request method: ${req.method}` })
  } catch (e: any) {
    console.error('[account] Error responding:', e)
    return res.status(500).json({ message: e?.message || e })
  }
}