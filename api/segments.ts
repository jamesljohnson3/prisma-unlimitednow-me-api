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
          // Step 1: Fetch the segment and its slug
          const segmentData = await prisma.segment.findUnique({
            where: { id: segmentId },
            select: { slug: true }, // Fetch only the slug
          });

          if (!segmentData) {
            return res.status(404).json({ message: 'Segment not found' });
          }

          // Clean the slug by removing the leading/trailing slashes
          const cleanSlug = segmentData.slug.replace(/\//g, '');

          // Step 2: Fetch user segments along with associated products using the cleaned slug
          const userSegments = await prisma.userSegment.findMany({
            where: {
              userId,
              segmentId,
            },
            include: {
              segment: true, // Include the segment data
            },
          });

          if (userSegments.length === 0) {
            return res.status(404).json({ message: 'No segments found for the given userId and segmentId' });
          }

          // Step 3: Fetch products where the slug matches the cleaned slug
          const products = await prisma.product.findMany({
            where: {
              slug: {
                contains: cleanSlug, // Use the cleaned slug
              },
            },
          });

          // Combine the user segments with their related products
          const result = userSegments.map((userSegment: any) => ({
            ...userSegment,
            products,
          }));

          return res.json(result);
        } else {
          return res.status(400).json({ message: 'Missing userId or segmentId for fetching segments' });
        }
      }

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
