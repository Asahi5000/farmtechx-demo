import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "LayasPinas Admin SignIn Page | LayasPinas Admin - LayasPinas Admin LayasPinas CMS",
  description: "LayasPinas Content Management System",
};

export default function SignIn() {
  return <SignInForm />;
}
