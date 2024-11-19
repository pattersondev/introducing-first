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
import { UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedCheck } from "@/components/ui/animated-check";
import { motion } from "framer-motion";

interface RegisterDialogProps {
  onRegisterSuccess: () => void;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  phone: string;
}

export function RegisterDialog({ onRegisterSuccess }: RegisterDialogProps) {
  const { register } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      // Reset states when dialog closes
      setIsSuccess(false);
      setError("");
      setFormData({
        username: "",
        email: "",
        password: "",
        phone: "",
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await register(formData);
      if (result.success) {
        setIsSuccess(true);
        // Wait for animation to complete before closing
        setTimeout(() => {
          setIsOpen(false);
          onRegisterSuccess();
        }, 1500);
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err) {
      setError("Unable to register. Please try again later.");
      console.error("Registration error:", err);
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
          <UserPlus className="mr-2 h-4 w-4" />
          Register
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-950 border border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Create an Account</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter your details to create your account
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              id="username"
              placeholder="Username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              disabled={isLoading || isSuccess}
              className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <Input
              id="email"
              type="email"
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
          <div className="space-y-2">
            <Input
              id="phone"
              placeholder="Phone (123-456-7890)"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
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
                    backgroundColor: "rgb(22 163 74)", // green-600
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
                "Registering..."
              ) : (
                "Register"
              )}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
