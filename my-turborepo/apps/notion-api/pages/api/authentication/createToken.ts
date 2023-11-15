// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Data = {
  name: string;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const { code } = req.body;

  const options = {
    method: 'POST',
    url: 'https://api.notion.com/v1/oauth/token',
    auth: {
      username: '8df27c71-ed50-41c0-866b-8a625000c87c',
      password: 'secret_xiK8R9bZjpFSCbp2L71hNDscWKckXzelnOYi6Kq4LFF',
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    data: { code, grant_type: 'authorization_code' },
  };

  axios
    .request(options)
    .then(async function (response) {
      try {
        const notion = await prisma.integration.create({
          data: {
            organisationId: response.data.workspace_id,
            notionToken: response.data.access_token,
            notionId: response.data.bot_id,
          },
        });
        res.status(200).json({
          organisationId: response.data.workspace_id,
          notionToken: response.data.access_token,
          notionId: response.data.bot_id,
        });
      } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } finally {
        await prisma.$disconnect();
      }
    })
    .catch(function (error) {
      res.status(405).json({ error: error });
    });
}
