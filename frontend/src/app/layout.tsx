import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skill Gap Analyzer — AI-Powered Resume vs JD Matcher",
  description:
    "Upload your resume and paste a job description. Instantly see which skills you have, which are missing, and your overall match percentage — powered by AI.",
  keywords: ["skill gap", "resume analyzer", "job match", "AI", "career tools"],
  openGraph: {
    title: "Skill Gap Analyzer",
    description: "AI-powered resume vs job description skill matcher",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
