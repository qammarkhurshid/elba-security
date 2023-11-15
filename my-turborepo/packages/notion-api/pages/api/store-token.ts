// pages/api/store-token.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../db/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { organisationId, notionToken, notionId } = req.body;

    try {
      await prisma.integration.create({
        data: {
          organisationId,
          notionToken,
          notionId,
        },
      });

      res.status(200).json({ message: 'Token stored successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
