import { PrismaClient, Prisma } from '@prisma/client';
import { VercelRequest, VercelResponse } from '@vercel/node';

type VercelRequestQuery = {
  userId?: string;
  segmentId?: string;
};

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId, segmentId } = req.query as VercelRequestQuery;

  console.log('[account] Incoming request:', {
    method: req.method,
    query: req.query,
    body: req.body,
  });

  try {
    switch (req.method) {
      case 'GET': {
        // Validate userId
        if (!userId) {
          return res.status(400).json({ error: 'userId is required.' });
        }

        // Fetch segments for the user based on userId
        const userSegments = await prisma.userSegment.findMany({
          where: { userId }, // Filter by userId
          include: {
            segment: {
              include: {
                product: true, // Include related product details
              },
            },
          },
        });

        // If segmentId is provided, filter based on slug match
        const matchedSegments = userSegments.filter((userSegment: { segment: any; }) => {
          const segment = userSegment.segment;
          return segment.slug && segment.slug.includes(segmentId || ''); // Match by slug inclusion
        });

        // Return matched segments or a 404 if none are found
        if (matchedSegments.length === 0) {
          return res.status(404).json({ message: 'No segments found matching the criteria.' });
        }

        return res.status(200).json(matchedSegments);
      }

      case 'POST': {
        const createdSegment = await prisma.segment.create({
          data: req.body as Prisma.SegmentCreateInput,
        });
        return res.status(201).json(createdSegment);
      }

      case 'PUT': {
        const { id } = req.body;
        if (!id) {
          return res.status(400).json({ message: 'Missing id for updating segment' });
        }

        const updatedSegment = await prisma.segment.update({
          where: { id },
          data: req.body as Prisma.SegmentUpdateInput,
        });
        return res.json(updatedSegment);
      }

      case 'DELETE': {
        const deleteId = req.body.id;
        if (!deleteId) {
          return res.status(400).json({ message: 'Missing id for deleting segment' });
        }

        const deletedSegment = await prisma.segment.delete({
          where: { id: deleteId },
        });
        return res.json(deletedSegment);
      }

      default:
        return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('[account] Error responding:', error);
    return res.status(500).json({ message: error?.message || error });
  } finally {
    await prisma.$disconnect();
  }
}
