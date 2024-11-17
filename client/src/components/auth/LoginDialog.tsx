"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LogIn } from "lucide-react";
import { UserService } from "@/services/user-service";
import { LoginData } from "@/types/api";

interface LoginDialogProps {
  onLoginSuccess: () => void;
}

export function LoginDialog({ onLoginSuccess }: LoginDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await UserService.login(formData);

      if (response.error) {
        // Handle specific login error messages
        if (response.error.includes("Invalid username or password")) {
          setError("Incorrect username or password. Please try again.");
        } else if (response.error.includes("Invalid request method")) {
          setError("Something went wrong. Please try again later.");
        } else {
          // For any other errors, use the server's message
          setError(response.error);
        }
        return;
      }

      // If successful
      onLoginSuccess();
      setIsOpen(false);

      // Reset form
      setFormData({
        email: "",
        password: "",
      });
    } catch (err) {
      // Handle network or other errors
      setError("Unable to log in. Please try again later.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Login
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-950 border border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Login</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter your credentials to access your account
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              id="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-gray-800 hover:bg-gray-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
