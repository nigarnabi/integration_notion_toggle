import { auth } from "@/lib/auth";
import { NavbarClient } from "./ClientNavbar";

export async function NavbarServer() {
  const session = await auth();
  const isSignedIn = !!session?.user;

  return <NavbarClient isSignedIn={isSignedIn} />;
}
