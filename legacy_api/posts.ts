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
          const posts = await prisma.post.findMany({
            where: { userId },
            include: {
              comments: true,
              tags: true,
              images: true,
              Video: true,
              site: true,
              likes: true,
              savedBy: true,
            },
          })
          return res.json(posts)
        } else {
          return res.status(400).json({ message: 'Missing userId for fetching posts' })
        }
      case 'POST':
        const createdPost = await prisma.post.create({
          data: req.body as Prisma.PostCreateInput,
        })
        return res.status(201).json(createdPost)
      case 'PUT':
        const { id } = req.body
        if (id) {
          const updatedPost = await prisma.post.update({
            where: { id },
            data: req.body as Prisma.PostUpdateInput,
          })
          return res.json(updatedPost)
        } else {
          return res.status(400).json({ message: 'Missing id for updating post' })
        }
      case 'DELETE':
        const deleteId = req.body.id
        if (deleteId) {
          const deletedPost = await prisma.post.delete({
            where: { id: deleteId },
          })
          return res.json(deletedPost)
        } else {
          return res.status(400).json({ message: 'Missing id for deleting post' })
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
