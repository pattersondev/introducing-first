import { Metadata } from "next";
import { Shield, Lock, Eye, Database, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Privacy Policy - Introducing First",
  description: "Privacy Policy for Introducing First",
};

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      description: "Understanding what data we gather and why",
      items: [
        "Name and email address for account creation",
        "Account credentials for secure access",
        "Prediction history and preferences",
        "Usage data and analytics",
        "Communication preferences",
      ],
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      description: "Transparency in data usage",
      items: [
        "Providing and maintaining our services",
        "Processing predictions and tracking accuracy",
        "Improving our prediction algorithms",
        "Sending important updates and notifications",
        "Ensuring platform security and preventing fraud",
      ],
    },
    {
      icon: Lock,
      title: "Data Security",
      description: "Keeping your information safe",
      items: [
        "End-to-end encryption for sensitive data",
        "Regular security audits and updates",
        "Secure data storage and transmission",
        "Limited employee access to user data",
      ],
    },
  ];

  return (
    <ScrollArea className="h-[calc(100vh-64px)]">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center justify-center gap-3 text-primary">
            <Shield className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-sm text-center text-gray-400">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8 bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <p className="text-gray-300 leading-relaxed">
              At Introducing First, we take your privacy seriously. This policy
              outlines our commitment to protecting your personal information
              and explains how we collect, use, and safeguard your data.
            </p>
          </CardContent>
        </Card>

        {/* Main Sections */}
        <div className="space-y-8">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-gray-800 p-2 rounded-lg">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-100">
                    {section.title}
                  </h2>
                  <p className="text-sm text-gray-400">{section.description}</p>
                </div>
              </div>

              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="pt-6">
                  <ul className="space-y-4">
                    {section.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-3">
                        <ArrowRight className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Separator className="mb-8" />
          <p className="text-sm text-gray-400">
            Have questions about our privacy practices?{" "}
            <a
              href="/contact"
              className="text-primary hover:text-primary/80 hover:underline"
            >
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
