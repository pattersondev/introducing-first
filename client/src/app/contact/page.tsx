import { Metadata } from "next";
import { Mail, MessageSquare, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata: Metadata = {
  title: "Contact Us - Introducing First",
  description: "Get in touch with the Introducing First team",
};

export default function ContactPage() {
  return (
    <ScrollArea className="h-[calc(100vh-64px)]">
      <div className="pb-6">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-2 text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
            <p className="text-gray-400">Get in touch with our team</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <Mail className="h-8 w-8 mb-4 text-primary" />
                  <CardTitle>General Support</CardTitle>
                  <CardDescription>
                    For general inquiries and help
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href="mailto:support@introducingfirst.com"
                    className="text-primary hover:underline"
                  >
                    support@introducingfirst.com
                  </a>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <Building2 className="h-8 w-8 mb-4 text-primary" />
                  <CardTitle>Business</CardTitle>
                  <CardDescription>
                    For business and partnership inquiries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href="mailto:business@introducingfirst.com"
                    className="text-primary hover:underline"
                  >
                    business@introducingfirst.com
                  </a>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <MessageSquare className="h-8 w-8 mb-4 text-primary" />
                  <CardTitle>Feedback</CardTitle>
                  <CardDescription>
                    Share your thoughts and suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href="mailto:feedback@introducingfirst.com"
                    className="text-primary hover:underline"
                  >
                    feedback@introducingfirst.com
                  </a>
                </CardContent>
              </Card>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                <h2 className="text-2xl font-semibold mb-6">
                  Send us a message
                </h2>
                <form className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        Name
                      </label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        className="bg-gray-900 border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email
                      </label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Your email"
                        className="bg-gray-900 border-gray-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium">
                      Message
                    </label>
                    <Textarea
                      id="message"
                      placeholder="Your message"
                      className="bg-gray-900 border-gray-700 min-h-[150px]"
                    />
                  </div>
                  <Button size="lg" className="w-full sm:w-auto">
                    Send Message
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
