// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SuccessData = {
  organization_id: string;
  organization_name: string;
  notionToken: string;
};

interface ErrorData {
  error: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessData | ErrorData>
) {
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
        const existingIntegration = await prisma.integration.findFirst({
          where: { organization_id: response.data.workspace_id },
        });
        if (existingIntegration) {
          await prisma.integration.update({
            where: { id: existingIntegration.id },
            data: {
              notionToken: response.data.access_token,
              organization_name: response.data.workspace_name,
            },
          });
        } else {
          await prisma.integration.create({
            data: {
              organization_id: response.data.workspace_id,
              organization_name: response.data.workspace_name,
              notionToken: response.data.access_token,
            },
          });
        }

        const existingJob = await prisma.users_Sync_Jobs.findFirst({
          where: { organization_id: response.data.workspace_id },
        });

        if (!existingJob) {
          await prisma.users_Sync_Jobs.create({
            data: {
              priority: 1,
              organization_id: response.data.workspace_id,
              pagination_token: '',
              sync_started_at: new Date(),
            },
          });
        }

        res.status(200).json({
          organization_id: response.data.workspace_id,
          organization_name: response.data.workspace_name,
          notionToken: response.data.access_token,
        });
      } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } finally {
        await prisma.$disconnect();
      }
    })
    .catch(function (error) {
      console.error(error);
      res.status(405).json({ error: error });
    });
}
