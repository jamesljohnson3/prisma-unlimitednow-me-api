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

          // Ensure we have valid user segments and remove duplicate products
          const filteredSegments = userSegments.map((userSegment: { segment: { product: any } }) => {
            // Get the product associated with the segment
            const products = userSegment.segment?.product ? [userSegment.segment.product] : [];

            // Use a Set to ensure unique products based on product.id
            const uniqueProducts = Array.from(
              new Map(products.map(product => [product.id, product])).values()
            );

            return {
              ...userSegment,
              segment: {
                ...userSegment.segment,
                products: uniqueProducts, // Deduplicated products based on ID
              },
            };
          });

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
