import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptToString } from "@/lib/crypto";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { apiKey } = await req.json();
  if (!apiKey) {
    return new Response("API key is required", { status: 400 });
  }
  // validate the API key with Toggl API
  const basic = Buffer.from(`${apiKey}:api_token`).toString("base64");
  const res = await fetch("https://api.track.toggl.com/api/v9/me", {
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    return new Response("Invalid Toggl API token", { status: 401 });
  }
  if (!res.ok) {
    return new Response(`Toggl error: ${res.status}`, { status: 502 });
  }
  // encrypt the API key
  const encryptedApiKey = await encryptToString(apiKey);
  // Save the API key to the database
  await prisma.user.update({
    where: { id: userId },
    data: {
      toggleApiKeyEnc: encryptedApiKey,
      togglLastVerifiedAt: new Date(),
    },
  });
  return Response.json({ success: true });
}
