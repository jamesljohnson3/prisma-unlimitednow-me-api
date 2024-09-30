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
        // Validate that userId and segmentId are provided
        if (!userId || !segmentId) {
          return res.status(400).json({ message: 'userId and segmentId are required.' });
        }

        // Fetch the slug of the specified segment
        const segment = await prisma.segment.findUnique({
          where: { id: segmentId as string },
          select: { slug: true }, // Only fetch the slug
        });

        if (!segment) {
          return res.status(404).json({ message: 'Segment not found.' });
        }

        // Use the segment slug to filter segments for the user
        const matchedSegments = await prisma.userSegment.findMany({
          where: {
            userId: userId as string, // Filter by userId
            segment: {
              slug: {
                contains: segment.slug, // Match by slug inclusion
              },
            },
          },
          include: {
            segment: true, // Include segment details
          },
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
        return res.status(200).json(updatedSegment);
      }

      case 'DELETE': {
        const deleteId = req.body.id;
        if (!deleteId) {
          return res.status(400).json({ message: 'Missing id for deleting segment' });
        }

        const deletedSegment = await prisma.segment.delete({
          where: { id: deleteId },
        });
        return res.status(200).json(deletedSegment);
      }

      default:
        return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('[account] Error responding:', error);
    return res.status(500).json({ message: error?.message || 'Internal Server Error' });
  } finally {
    await prisma.$disconnect();
  }
}
