import { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata: Metadata = {
  title: "FAQ - Introducing First",
  description:
    "Frequently asked questions about Introducing First's predictions and services",
};

export default function FAQPage() {
  const faqs = [
    {
      category: "About the Platform",
      items: [
        {
          question: "What is Introducing First?",
          answer:
            "Introducing First is a platform meant to provide the best and most up to date MMA data.",
        },
      ],
    },
    {
      category: "About Our Predictions",
      items: [
        {
          question: "How are your predictions generated?",
          answer:
            "Our predictions are generated using a sophisticated analysis system that considers multiple factors including historical fight data, fighter statistics, and recent performance trends. We utilize advanced algorithms to process this data and generate accurate predictions while maintaining the proprietary nature of our specific methodologies.",
        },
        {
          question: "How accurate are your predictions?",
          answer:
            "Our predictions are designed to be as accurate as possible, but no prediction system can be 100% accurate. We work everyday to improve our predictions and are always looking for ways to make them more accurate.",
        },
        {
          question: "What factors do you consider?",
          answer:
            "We analyze numerous factors including but not limited to: fighter statistics, historical performance, style matchups, recent form, and various other data points that our system has identified as significant predictors.",
        },
      ],
    },
    {
      category: "Using the Platform",
      items: [
        {
          question: "How do I track my prediction accuracy?",
          answer:
            "You can track your prediction accuracy through your personal dashboard. After creating an account and making predictions, your statistics will be automatically calculated and displayed on the leaderboard.",
        },
        {
          question: "How do I make predictions?",
          answer:
            "Once you've created an account, you can navigate to the Events page and click on any upcoming event. From there, you can make predictions for individual fights up until the event starts.",
        },
      ],
    },
  ];

  return (
    <ScrollArea className="h-[calc(100vh-64px)]">
      <div className="pb-6">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-2 text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-gray-400">
              Everything you need to know about Introducing First
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((category, idx) => (
              <div
                key={idx}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700"
              >
                <h2 className="text-2xl font-semibold mb-4">
                  {category.category}
                </h2>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.items.map((item, itemIdx) => (
                    <AccordionItem
                      key={itemIdx}
                      value={`item-${idx}-${itemIdx}`}
                      className="border border-gray-700 rounded-lg px-4 data-[state=open]:bg-gray-750"
                    >
                      <AccordionTrigger className="text-lg hover:no-underline py-4">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-400 pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
