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
import { UserPlus, Eye, EyeOff, Check, X } from "lucide-react";
import { UserService } from "@/services/user-service";
import { RegisterData } from "@/types/api";

interface RegisterDialogProps {
  onRegisterSuccess: () => void;
}

export function RegisterDialog({ onRegisterSuccess }: RegisterDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<RegisterData>({
    username: "",
    password: "",
    email: "",
    phone: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRequirements = [
    {
      id: "length",
      label: "At least 8 characters",
      validate: (pass: string) => pass.length >= 8 && pass.length <= 50,
    },
    {
      id: "uppercase",
      label: "At least one uppercase letter",
      validate: (pass: string) => /[A-Z]/.test(pass),
    },
    {
      id: "lowercase",
      label: "At least one lowercase letter",
      validate: (pass: string) => /[a-z]/.test(pass),
    },
    {
      id: "special",
      label: "At least one special character",
      validate: (pass: string) => /[^\w\d\s]/.test(pass),
    },
  ];

  const isPasswordValid = (password: string) => {
    return passwordRequirements.every((req) => req.validate(password));
  };

  const PasswordRequirement = ({
    met,
    label,
  }: {
    met: boolean;
    label: string;
  }) => (
    <div className="flex items-center space-x-2">
      {met ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )}
      <span className={`text-sm ${met ? "text-green-500" : "text-red-500"}`}>
        {label}
      </span>
    </div>
  );

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    return /^\d{3}-\d{3}-\d{4}$/.test(phone);
  };

  const isValidUsername = (username: string) => {
    return username.length >= 3 && username.length <= 50;
  };

  const isFormValid = () => {
    return (
      isValidUsername(formData.username) &&
      isValidEmail(formData.email) &&
      isValidPhone(formData.phone) &&
      isPasswordValid(formData.password) &&
      formData.password === confirmPassword
    );
  };

  const validateForm = () => {
    if (
      !formData.username ||
      !formData.password ||
      !formData.email ||
      !formData.phone ||
      !confirmPassword
    ) {
      setError("All fields are required");
      return false;
    }
    if (formData.password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const numbers = value.replace(/\D/g, "");

    // Add dashes after 3rd and 6th digits
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(
      6,
      10
    )}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    // Only update if we haven't reached max length or if we're deleting
    if (formatted.length <= 12) {
      setFormData({ ...formData, phone: formatted });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await UserService.register(formData);

      // Handle specific error messages from the server
      if (response.error) {
        if (response.error.includes("Username or Email")) {
          setError(
            "This username or email is already registered. Please try another."
          );
        } else if (response.error.includes("Invalid Username")) {
          setError("Please check your username format (3-50 characters).");
        } else if (response.error.includes("Invalid Password")) {
          setError("Please ensure your password meets all requirements.");
        } else if (response.error.includes("Invalid Email")) {
          setError("Please enter a valid email address.");
        } else if (response.error.includes("Invalid Phone")) {
          setError("Please enter a valid phone number (123-456-7890).");
        } else {
          // For any other errors, use the server's message
          setError(response.error);
        }
        return;
      }

      // If successful
      onRegisterSuccess();
      setIsOpen(false);

      // Reset form
      setFormData({
        username: "",
        password: "",
        email: "",
        phone: "",
      });
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof Error) {
        // Handle network or other errors
        setError("Unable to create account. Please try again later.");
        console.error("Registration error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isConfirmPasswordValid = () => {
    return confirmPassword && formData.password === confirmPassword;
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
          <DialogTitle className="text-white">Create an account</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter your details to create a new account
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              id="username"
              placeholder="Username (3-50 characters)"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              className={`bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 ${
                formData.username && !isValidUsername(formData.username)
                  ? "border-red-500 focus:border-red-500"
                  : formData.username && isValidUsername(formData.username)
                  ? "border-green-500 focus:border-green-500"
                  : ""
              }`}
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
              required
              className={`bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 ${
                formData.email && !isValidEmail(formData.email)
                  ? "border-red-500 focus:border-red-500"
                  : formData.email && isValidEmail(formData.email)
                  ? "border-green-500 focus:border-green-500"
                  : ""
              }`}
            />
          </div>
          <div className="space-y-2">
            <Input
              id="phone"
              placeholder="Phone (123-456-7890)"
              value={formData.phone}
              onChange={handlePhoneChange}
              required
              maxLength={12}
              className={`bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 ${
                formData.phone && !isValidPhone(formData.phone)
                  ? "border-red-500 focus:border-red-500"
                  : formData.phone && isValidPhone(formData.phone)
                  ? "border-green-500 focus:border-green-500"
                  : ""
              }`}
            />
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className={`bg-gray-900 border-gray-800 text-white pr-10 placeholder:text-gray-500 ${
                  formData.password && !isPasswordValid(formData.password)
                    ? "border-red-500 focus:border-red-500"
                    : formData.password && isPasswordValid(formData.password)
                    ? "border-green-500 focus:border-green-500"
                    : ""
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            {formData.password && (
              <div className="mt-2 space-y-2 rounded-md bg-gray-900 p-3 border border-gray-800">
                <p className="text-sm text-gray-400 mb-2">
                  Password requirements:
                </p>
                {passwordRequirements.map((requirement) => (
                  <PasswordRequirement
                    key={requirement.id}
                    met={requirement.validate(formData.password)}
                    label={requirement.label}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`bg-gray-900 border-gray-800 text-white pr-10 placeholder:text-gray-500 ${
                  confirmPassword && !isConfirmPasswordValid()
                    ? "border-red-500 focus:border-red-500"
                    : confirmPassword && isConfirmPasswordValid()
                    ? "border-green-500 focus:border-green-500"
                    : ""
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {confirmPassword && !isConfirmPasswordValid() && (
              <p className="text-sm text-red-500">Passwords do not match</p>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !isFormValid()}
          >
            {isLoading ? "Creating account..." : "Register"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
