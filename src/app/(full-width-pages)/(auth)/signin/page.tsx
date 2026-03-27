import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FarmTechXBaluzo Admin Sign In",
  description: "FarmTechXBaluzo Hydroponic Farm Management System",
};

export default function SignIn() {
  return <SignInForm />;
}
