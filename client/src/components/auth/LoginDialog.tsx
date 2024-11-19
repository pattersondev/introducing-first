"use client";

import { useState, useEffect } from "react";
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
import { LoginData } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedCheck } from "@/components/ui/animated-check";
import { motion } from "framer-motion";

interface LoginDialogProps {
  onLoginSuccess: () => void;
}

export function LoginDialog({ onLoginSuccess }: LoginDialogProps) {
  const { login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!isLoading && !showSuccess) {
      setIsOpen(open);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        setIsLoading(false);
        setIsSuccess(true);
        setShowSuccess(true);

        // Wait for animation
        setTimeout(() => {
          setIsOpen(false);
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        }, 1500);
      } else {
        setError(result.error || "Login failed");
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Login error:", err);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
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
              disabled={isLoading || isSuccess}
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
              disabled={isLoading || isSuccess}
              className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <motion.div
            animate={
              isSuccess
                ? {
                    backgroundColor: "rgb(22 163 74)",
                    transition: { duration: 0.3 },
                  }
                : {}
            }
          >
            <Button
              type="submit"
              className="w-full bg-gray-800 hover:bg-gray-700 text-white"
              disabled={isLoading || isSuccess}
            >
              {isSuccess ? (
                <AnimatedCheck className="text-white" />
              ) : isLoading ? (
                "Logging in..."
              ) : (
                "Login"
              )}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
