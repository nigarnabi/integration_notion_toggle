import { NavbarClient } from "./ClientNavbar";

export async function NavbarServer() {
  const isSignedIn = false; // or fetch session via auth()
  return <NavbarClient isSignedIn={isSignedIn} />;
}
