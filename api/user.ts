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
      '[user] Incoming request:',
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
        if (id === undefined) {
          return res.status(400).json({ message: 'Missing required parameter: id' });
        }
        return res.json(
          await prisma.user.findMany({
            where: { id: id },
          }),
        )
      case 'POST':
        return res.json(
          await prisma.user.create({
            data: req.body as Prisma.UserCreateInput,
          }),
        )
      case 'PUT':
        return res.json(
          await prisma.user.update({
            where: {
              id,
            },
            data: req.body as Prisma.UserUpdateInput,
          }),
        )
      case 'DELETE':
        return res.json(
          await prisma.user.delete({
            where: { id },
          }),
        )
    }

    return res
      .status(400)
      .send({ message: `Unexpected request method: ${req.method}` })
  } catch (e: any) {
    console.error('[user] Error responding:', e)
    return res.status(500).json({ message: e?.message || e })
  }
}