import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "LayasPinas Admin SignUp Page | LayasPinas Admin - LayasPinas Admin LayasPinas CMS",
  description: "LayasPinas Content Management System",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
