import { PrismaClient, Prisma } from '@prisma/client'
import { VercelRequest, VercelResponse } from '@vercel/node'

type VercelRequestQuery = {
  userId?: string
}

const prisma = new PrismaClient()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { userId } = req.query as VercelRequestQuery

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
        if (userId) {
          // Fetch user segments including all segment fields and related product data
          const userSegments = await prisma.userSegment.findMany({
            where: { userId }, // Filter by userId
            include: {
              segment: {
                include: {
                  product: true, // Include all fields from the Product model
                },
              },
            },
          })
          return res.json(userSegments)
        } else {
          return res.status(400).json({ message: 'Missing userId for fetching segments' })
        }

      case 'POST':
        const createdSegment = await prisma.segment.create({
          data: req.body as Prisma.SegmentCreateInput,
        })
        return res.status(201).json(createdSegment)

      case 'PUT':
        const { id } = req.body
        if (id) {
          const updatedSegment = await prisma.segment.update({
            where: { id },
            data: req.body as Prisma.SegmentUpdateInput,
          })
          return res.json(updatedSegment)
        } else {
          return res.status(400).json({ message: 'Missing id for updating segment' })
        }

      case 'DELETE':
        const deleteId = req.body.id
        if (deleteId) {
          const deletedSegment = await prisma.segment.delete({
            where: { id: deleteId },
          })
          return res.json(deletedSegment)
        } else {
          return res.status(400).json({ message: 'Missing id for deleting segment' })
        }

      default:
        return res.status(405).json({ message: `Method ${req.method} not allowed` })
    }
  } catch (e: any) {
    console.error('[account] Error responding:', e)
    return res.status(500).json({ message: e?.message || e })
  } finally {
    await prisma.$disconnect()
  }
}
