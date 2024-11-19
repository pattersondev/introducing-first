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
import { UserPlus, Check, X } from "lucide-react";
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
  confirmPassword: string;
  phone: string;
}

interface PasswordRequirement {
  text: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  {
    text: "At least 8 characters long",
    test: (password) => password.length >= 8,
  },
  {
    text: "Contains at least one number",
    test: (password) => /\d/.test(password),
  },
  {
    text: "Contains at least one uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    text: "Contains at least one lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    text: "Contains at least one special character",
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

export function RegisterDialog({ onRegisterSuccess }: RegisterDialogProps) {
  const { register, refreshAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [error, setError] = useState<string>("");
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset states when dialog closes
      setIsSuccess(false);
      setError("");
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
      });
      setShowPasswordRequirements(false);
    }
  }, [isOpen]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");

    // Format the number as XXX-XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(
        6,
        10
      )}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    // Only update if the formatted value is different or if we're deleting
    if (formatted.length <= 12) {
      // 12 is the length of XXX-XXX-XXXX
      setFormData({ ...formData, phone: formatted });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password requirements
    const allRequirementsMet = passwordRequirements.every((req) =>
      req.test(formData.password)
    );

    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { confirmPassword, ...registrationData } = formData;
      const result = await register(registrationData, true);
      if (result.success) {
        setIsSuccess(true);
        setTimeout(async () => {
          await refreshAuth();
          onRegisterSuccess();
          setIsOpen(false);
        }, 750);
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

  const passwordsMatch =
    formData.password && formData.password === formData.confirmPassword;

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
              id="phone"
              placeholder="Phone (123-456-7890)"
              value={formData.phone}
              onChange={handlePhoneChange}
              maxLength={12}
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
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setShowPasswordRequirements(true);
              }}
              onFocus={() => setShowPasswordRequirements(true)}
              disabled={isLoading || isSuccess}
              className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
            />
            {showPasswordRequirements && (
              <div className="space-y-2 mt-2">
                {passwordRequirements.map((req, index) => (
                  <div
                    key={index}
                    className="flex items-center text-sm space-x-2"
                  >
                    {req.test(formData.password) ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={
                        req.test(formData.password)
                          ? "text-green-500"
                          : "text-gray-400"
                      }
                    >
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              disabled={isLoading || isSuccess}
              className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
            />
            {formData.confirmPassword && (
              <div className="flex items-center text-sm space-x-2 mt-2">
                {passwordsMatch ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Passwords match</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <motion.div
            className="rounded-md overflow-hidden"
            animate={
              isSuccess
                ? {
                    backgroundColor: "rgb(34 197 94)",
                    transition: { duration: 0.3 },
                  }
                : {}
            }
          >
            <Button
              type="submit"
              className={`w-full ${
                isSuccess
                  ? "bg-transparent hover:bg-transparent"
                  : "bg-gray-800 hover:bg-gray-700"
              } text-white`}
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
