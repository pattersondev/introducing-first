import { Metadata } from "next";
import { Shield, Lock, Eye, Database } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata: Metadata = {
  title: "Privacy Policy - Introducing First",
  description: "Privacy Policy for Introducing First",
};

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: `We collect information that you provide directly to us when you create an account, 
      make predictions, or interact with our services. This includes:
      • Your name and email address
      • Account credentials
      • Prediction history and preferences
      • Usage data and analytics
      • Communication preferences`,
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      content: `We use the collected information to:
      • Provide and maintain our services
      • Process your predictions and track accuracy
      • Improve our prediction algorithms
      • Send important updates and notifications
      • Ensure platform security and prevent fraud`,
    },
    {
      icon: Lock,
      title: "Data Security",
      content: `We implement robust security measures to protect your personal information:
      • End-to-end encryption for sensitive data
      • Regular security audits and updates
      • Secure data storage and transmission
      • Limited employee access to user data`,
    },
  ];

  return (
    <ScrollArea className="h-[calc(100vh-64px)]">
      <div className="pb-6">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-2 text-center mb-12">
            <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-gray-400">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {sections.map((section, idx) => (
              <div
                key={idx}
                className="bg-gray-800 rounded-lg p-8 border border-gray-700"
              >
                <div className="flex items-start gap-4">
                  <section.icon className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">
                      {section.title}
                    </h2>
                    <div className="text-gray-400 space-y-4 whitespace-pre-line">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto mt-12 text-center text-sm text-gray-400">
            <p>
              If you have any questions about our Privacy Policy, please{" "}
              <a href="/contact" className="text-primary hover:underline">
                contact us
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
