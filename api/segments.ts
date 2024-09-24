import { PrismaClient, Prisma } from '@prisma/client'
import { VercelRequest, VercelResponse } from '@vercel/node'

type VercelRequestQuery = {
  userId?: string
  segmentId?: string
}

const prisma = new PrismaClient()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { userId, segmentId } = req.query as VercelRequestQuery

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
        if (userId && segmentId) {
          // Fetch the user and their specific segment including product information
          const user = await prisma.user.findUnique({
            where: { id: userId as string }, // Find user by userId
            include: {
              segment: {
                where: { id: segmentId as string }, // Filter by segmentId
                include: {
                  product: true, // Include related product data in the segment
                },
              },
            },
          });

         if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }

          if (user.segments.length === 0) {
            return res.status(404).json({ message: 'Segment not found for the given userId and segmentId' });
          }

          // Return the user along with the segment and product information
          return res.status(200).json(user);
        } else {
          return res.status(400).json({ message: 'Missing userId or segmentId for fetching segment' });
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
