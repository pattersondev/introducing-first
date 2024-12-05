import { Metadata } from "next";
import { MessageCircle, Mail, Twitter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Contact - Introducing First",
  description: "Get in touch with the Introducing First team",
};

export default function ContactPage() {
  const contactMethods = [
    {
      icon: Mail,
      title: "Email",
      description: "For general inquiries and support",
      value: "support@introducingfirst.com",
      link: "mailto:support@introducingfirst.com",
    },
    {
      icon: Twitter,
      title: "Twitter",
      description: "Follow us for updates and news",
      value: "@IntroducingFirst",
      link: "https://twitter.com/IntroducingFirst",
    },
  ];

  return (
    <ScrollArea className="h-[calc(100vh-64px)]">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center justify-center gap-3 text-primary">
            <MessageCircle className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Contact Us</h1>
          </div>
          <p className="text-center text-gray-400 max-w-2xl mx-auto">
            Have a question or feedback? We'd love to hear from you. Choose your
            preferred method of contact below.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Form */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as
                possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-200"
                    >
                      Name
                    </label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-200"
                    >
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label
                      htmlFor="message"
                      className="text-sm font-medium text-gray-200"
                    >
                      Message
                    </label>
                    <Textarea
                      id="message"
                      placeholder="Your message"
                      className="bg-gray-800 border-gray-700 min-h-[150px]"
                    />
                  </div>
                </div>
                <Button className="w-full">Send Message</Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Methods */}
          <div className="space-y-4">
            {contactMethods.map((method, idx) => (
              <a
                key={idx}
                href={method.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gray-800 p-2 rounded-lg">
                        <method.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-100">
                          {method.title}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {method.description}
                        </p>
                        <p className="text-sm text-primary mt-1">
                          {method.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Separator className="mb-8" />
          <p className="text-sm text-gray-400">
            We typically respond within 24 hours during business days.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
