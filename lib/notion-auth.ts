import { prisma } from "@/lib/prisma";
import { Client as NotionClient } from "@notionhq/client";

type TokenBundle = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
};

function isExpired(expiresAt?: number | null, skewSec = 60): boolean {
  if (!expiresAt) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= expiresAt - skewSec;
}

async function refreshNotionToken(refreshToken: string) {
  const clientId = process.env.NOTION_CLIENT_ID!;
  const clientSecret = process.env.NOTION_CLIENT_SECRET!;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Notion token refresh failed: ${resp.status} ${text}`);
  }
  return resp.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
    bot_id?: string;
    workspace_id?: string;
  }>;
}

export async function getUserNotionToken(
  userId: string
): Promise<string | null> {
  const acct = await prisma.account.findFirst({
    where: { userId, provider: "notion" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  if (!acct?.access_token) return null;

  let bundle: TokenBundle = {
    accessToken: acct.access_token,
    refreshToken: acct.refresh_token,
    expiresAt: acct.expires_at,
  };

  if (isExpired(bundle.expiresAt) && bundle.refreshToken) {
    const fresh = await refreshNotionToken(bundle.refreshToken);
    const newExpiresAt =
      typeof fresh.expires_in === "number"
        ? Math.floor(Date.now() / 1000) + fresh.expires_in
        : null;

    await prisma.account.update({
      where: { id: acct.id },
      data: {
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token ?? acct.refresh_token,
        expires_at: newExpiresAt ?? acct.expires_at ?? null,
      },
    });

    bundle = {
      accessToken: fresh.access_token,
      refreshToken: fresh.refresh_token ?? acct.refresh_token,
      expiresAt: newExpiresAt ?? acct.expires_at,
    };
  }

  return bundle.accessToken;
}

export async function getUserNotionClient(userId: string) {
  const token = await getUserNotionToken(userId);
  if (!token) return null;
  return new NotionClient({ auth: token });
}
