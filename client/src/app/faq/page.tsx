import { Metadata } from "next";
import { HelpCircle, MessageCircle, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "FAQ - Introducing First",
  description: "Frequently Asked Questions about Introducing First",
};

export default function FAQPage() {
  const faqSections = [
    {
      title: "General Questions",
      items: [
        {
          question: "What is Introducing First?",
          answer:
            "Introducing First is a platform dedicated to MMA fight predictions and analytics. We provide detailed fighter statistics, matchup analysis, and a community-driven prediction system.",
        },
        {
          question: "Is Introducing First free to use?",
          answer:
            "Yes, our core features are free to use. We may introduce premium features in the future, but our basic prediction and analytics tools will always be accessible to all users.",
        },
        {
          question: "How accurate are the predictions?",
          answer:
            "Our predictions are based on comprehensive data analysis, historical fight data, and advanced algorithms. While we strive for accuracy, MMA is inherently unpredictable, and our predictions should be used as one of many tools in making informed decisions.",
        },
      ],
    },
    {
      title: "Account & Features",
      items: [
        {
          question: "How do I create an account?",
          answer:
            "Click the 'Sign Up' button in the top right corner, fill in your details, and verify your email address. Once verified, you'll have full access to all our features.",
        },
        {
          question: "Can I track my prediction accuracy?",
          answer:
            "Yes, once you've made predictions, you can view your accuracy statistics in your profile dashboard, including overall accuracy and performance by weight class.",
        },
        {
          question: "How often is fighter data updated?",
          answer:
            "Fighter statistics and rankings are updated within 24 hours after each event. News and fight announcements are updated in real-time.",
        },
      ],
    },
    {
      title: "Technical Support",
      items: [
        {
          question: "What browsers are supported?",
          answer:
            "Introducing First works best on modern browsers like Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience.",
        },
        {
          question: "Is my data secure?",
          answer:
            "Yes, we use industry-standard encryption and security measures to protect your data. You can read more about our security practices in our Privacy Policy.",
        },
        {
          question: "How can I report a bug?",
          answer:
            "If you encounter any issues, please use our Contact form or email support directly. Include as much detail as possible about the problem you're experiencing.",
        },
      ],
    },
  ];

  return (
    <ScrollArea className="h-[calc(100vh-64px)]">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center justify-center gap-3 text-primary">
            <HelpCircle className="h-8 w-8" />
            <h1 className="text-3xl font-bold">FAQ</h1>
          </div>
          <p className="text-center text-gray-400 max-w-2xl mx-auto">
            Find answers to commonly asked questions about Introducing First.
            Can't find what you're looking for? Feel free to contact us.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqSections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-100 px-2">
                {section.title}
              </h2>
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="pt-6">
                  <Accordion type="single" collapsible className="space-y-4">
                    {section.items.map((item, itemIdx) => (
                      <AccordionItem
                        key={itemIdx}
                        value={`${idx}-${itemIdx}`}
                        className="border-gray-800"
                      >
                        <AccordionTrigger className="text-gray-100 hover:text-primary hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-400">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Separator className="mb-8" />
          <p className="text-sm text-gray-400">
            Still have questions?{" "}
            <a
              href="/contact"
              className="text-primary hover:text-primary/80 hover:underline"
            >
              Get in touch with our team
            </a>
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
