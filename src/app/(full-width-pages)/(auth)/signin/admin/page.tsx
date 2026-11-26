import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FarmTechXBaluzo Administrator Sign In",
  description: "Administrator access to FarmTechXBaluzo.",
};

export default function AdminSignIn() {
  return <SignInForm />;
}
