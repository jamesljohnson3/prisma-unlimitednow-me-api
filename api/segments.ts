import { PrismaClient, Prisma } from '@prisma/client';
import { VercelRequest, VercelResponse } from '@vercel/node';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { userId, segmentId } = req.query as { userId?: string; segmentId?: string };

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
    );

    switch (req.method) {
      case 'GET': {
        if (userId && segmentId) {
          // Fetch user segments based on userId
          const userSegments = await prisma.userSegment.findMany({
            where: {
              userId,
            },
            include: {
              segment: true, // Include segment data
            },
          });

          // Filter user segments to find the matching segment by segmentId
          const matchedSegment = userSegments.find((us: { segmentId: string; }) => us.segmentId === segmentId);

          // If a matching segment is found, check the slug
          if (matchedSegment) {
            // Get the cleaned slug
            const cleanSlug = matchedSegment.segment.slug?.replace(/\//g, ''); // Example cleaning logic

            // Fetch the segment by segmentId and include the products
            const segmentWithProducts = await prisma.segment.findUnique({
              where: {
                id: segmentId,
              },
              include: {
                product: true, // Include products associated with this segment
              },
            });

            // Check if the segment matches the cleaned slug
            if (segmentWithProducts && segmentWithProducts.slug?.replace(/\//g, '') === cleanSlug) {
              return res.json(segmentWithProducts); // Return the matching segment with products
            } else {
              return res.status(404).json({ message: 'No matching segment found with the cleaned slug' });
            }
          } else {
            return res.status(404).json({ message: 'No matching segments found for the given userId and segmentId' });
          }
        } else {
          return res.status(400).json({ message: 'Missing userId or segmentId for fetching segments' });
        }
      }

      // Handling other methods (POST, PUT, DELETE)
      case 'POST': {
        const createdSegment = await prisma.segment.create({
          data: req.body as Prisma.SegmentCreateInput,
        });
        return res.status(201).json(createdSegment);
      }

      case 'PUT': {
        const { id } = req.body;
        if (id) {
          const updatedSegment = await prisma.segment.update({
            where: { id },
            data: req.body as Prisma.SegmentUpdateInput,
          });
          return res.json(updatedSegment);
        } else {
          return res.status(400).json({ message: 'Missing id for updating segment' });
        }
      }

      case 'DELETE': {
        const deleteId = req.body.id;
        if (deleteId) {
          const deletedSegment = await prisma.segment.delete({
            where: { id: deleteId },
          });
          return res.json(deletedSegment);
        } else {
          return res.status(400).json({ message: 'Missing id for deleting segment' });
        }
      }

      default:
        return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
  } catch (e: any) {
    console.error('[account] Error responding:', e);
    return res.status(500).json({ message: e?.message || e });
  } finally {
    await prisma.$disconnect();
  }
}
