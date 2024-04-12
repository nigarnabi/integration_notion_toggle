import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { prisma } from "./prisma";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// map common Auth.js error codes to friendly text
function friendlyAuthError(code: string) {
  switch (code) {
    case "OAuthAccountNotLinked":
      return "This email is already linked with a different sign-in method.";
    case "AccessDenied":
      return "Access was denied. Please try again.";
    case "Configuration":
      return "There was a configuration issue. Contact support.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
export { friendlyAuthError };

//function fetch user Notion token from database
export async function getNotionAccessToken(userId: string) {
  const acc = await prisma.account.findFirst({
    where: { userId, provider: "notion" },
    select: { access_token: true },
  });
  return acc?.access_token ?? null;
}
