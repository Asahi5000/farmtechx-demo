import DemoLanding from "@/components/auth/DemoLanding";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FarmTechXBaluzo Public Demo",
  description: "Explore the FarmTechX hydroponic farm management demo.",
};

export default function SignIn() {
  return <DemoLanding />;
}
