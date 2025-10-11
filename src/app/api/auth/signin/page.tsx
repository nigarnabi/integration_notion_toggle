"use client";
import { signIn } from "next-auth/react";
import { friendlyAuthError } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-light-green/20">
      <Card className="w-full max-w-sm border-0 shadow-lg bg-white/90 backdrop-blur-md rounded-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-primary-deep-brown">
            Sign in
          </CardTitle>
          <p className="text-sm text-primary-sage">
            Use your Notion account to continue.
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-primary-brick-red">
              {friendlyAuthError(error)}
            </p>
          )}

          <Button
            className="w-full gap-2 bg-primary-brick-red hover:bg-primary-golden text-white font-medium rounded-lg py-2"
            onClick={() => signIn("notion", { callbackUrl: "/dashboard" })}
          >
            Continue with Notion
          </Button>
        </CardContent>

        <CardFooter>
          <p className="text-xs text-center text-primary-sage">
            By continuing, you agree to our{" "}
            <span className="text-primary-golden underline cursor-pointer hover:text-primary-brick-red">
              Terms
            </span>{" "}
            and{" "}
            <span className="text-primary-golden underline cursor-pointer hover:text-primary-brick-red">
              Privacy Policy
            </span>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
