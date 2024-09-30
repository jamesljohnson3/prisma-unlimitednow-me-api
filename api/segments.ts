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
          // Fetch user segments that match the provided userId and segmentId
          const userSegments = await prisma.userSegment.findMany({
            where: {
              userId: userId as string,
              segmentId: segmentId as string,
            },
            include: {
              segment: {
                include: {
                  product: true, // Include related products
                },
              },
            },
          });

          // Create a map to store unique segment-product pairs
          const segmentMap: Record<string, any> = {};

          // Process and deduplicate segments and products
          userSegments.forEach((userSegment: { segment: any }) => {
            const segment = userSegment.segment;
            if (!segment) return;

            const segmentKey = segment.id; // Use segment id as the key
            if (!segmentMap[segmentKey]) {
              segmentMap[segmentKey] = {
                ...userSegment,
                segment: {
                  ...segment,
                  products: [],
                },
              };
            }

            // Add the product if it exists and ensure no duplicates
            if (segment.product && !segmentMap[segmentKey].segment.products.some(p => p.id === segment.product.id)) {
              segmentMap[segmentKey].segment.products.push(segment.product);
            }
          });

          // Convert map back to an array
          const filteredSegments = Object.values(segmentMap);

          return res.json(filteredSegments);
        } else {
          return res.status(400).json({ message: 'Missing userId or segmentId for fetching segments' });
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
