import {type NextRequest } from 'next/server';
import { logger } from '@elba-security/logger';
import { findOrganisation, updateOrganization } from './service';

type OrganizationRecordObject = {
  id: string;
  region: string;
  createdAt: string; 
  domain: string;
  client_id: string;
  client_secret: string;
  auth_token: string;
}

type OAuthRequestBody = {
  grant_type: string,
  code: string,
  client_id: string,
  client_secret: string,
  redirect_uri: string,
  scope: string
}

type AuthTokenResponse = {
  access_token: string,
  token_type: string,
  scope: string
}

export async function GET(request: NextRequest) {
  const token: string | null = request.nextUrl.searchParams.get('code');
  const orgId: string   | null = request.nextUrl.searchParams.get('orgId');

  if (!orgId){
    return new Response(JSON.stringify({error: "Organisation id is required"}), {
    status:400
  })
  }

  if (!token){
    return new Response(JSON.stringify({error: "Code is required"}), {
    status:400
  })
  /* Confirm Error Scenarios */
  }

  const organisation = await findOrganisation({organisationId: orgId})
  if (!organisation.length){
    return new Response(JSON.stringify({ error: 'Organization not found' }), { status: 404 });
  }
  
  const {client_id: clientId, client_secret: clientSecret, domain:subdomain} = organisation[0] as OrganizationRecordObject;
  const redirectURL = process.env.REDIRECTION_URL_FOR_ZENDESK;
  const oAuthRequestBody: OAuthRequestBody = {
      "grant_type": "authorization_code",
      "code": `${token}`,
      "client_id": `${clientId}`,
      "client_secret": `${clientSecret}`,
      "redirect_uri": `${redirectURL}`,
      "scope": "read write"
}
  const oAuthRequestHeaders = {
      "Content-Type": "application/json"
  }
  
  try {
    const response = await fetch(`${subdomain}/oauth/tokens`, {
      method: 'POST',
      headers: oAuthRequestHeaders,
      body: JSON.stringify(oAuthRequestBody)
    })

  const authCodeResponseData = await response.json() as AuthTokenResponse;
  if (!authCodeResponseData.access_token){
    // Throw error
  }
  await updateOrganization({organisationId: orgId, authToken: authCodeResponseData.access_token});
  return {
    success: true
  }
  } catch (error) {
      logger.info(`Failed to fetch auth token`, {error});
      /* @TODO: Confirm Error Scenario */
      return new Response(JSON.stringify({error: "FAILED_TO_FETCH"}), {
        status:400
  })
    }
}
