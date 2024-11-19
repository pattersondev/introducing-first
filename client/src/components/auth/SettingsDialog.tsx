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
import { Settings, Check, X, Crown, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedCheck } from "@/components/ui/animated-check";
import { motion } from "framer-motion";
import { UserService } from "@/services/user-service";

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

export function SettingsDialog() {
  const { user, refreshAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string>("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement password change functionality
    // This will be implemented when we add the endpoint to the backend
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await UserService.uploadProfilePicture(file);
      if (result.error) {
        setError(result.error);
      } else {
        // Refresh auth context to get updated user data
        await refreshAuth();
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
        }, 2000);
      }
    } catch (err) {
      setError("Failed to upload profile picture");
      console.error("Profile picture upload error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start px-2 hover:bg-gray-800"
        >
          <User className="h-4 w-4 mr-2" />
          <span>Account</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-gray-950 border border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Account Settings</DialogTitle>
          <DialogDescription className="text-gray-400">
            Manage your account settings and profile
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Premium Upgrade Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 rounded-lg p-6 border border-amber-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    <h4 className="text-sm font-medium text-white">
                      Premium Access
                    </h4>
                  </div>
                  {!user?.isPremium && (
                    <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full">
                      Upgrade Available
                    </span>
                  )}
                </div>
                {user?.isPremium ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">
                      You're currently on our Premium plan. Enjoy all the
                      exclusive features!
                    </p>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-500">
                        Active Premium Membership
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                      Upgrade to Premium for exclusive features:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-400">
                        <Check className="h-4 w-4 text-amber-500" />
                        Advanced fight statistics and analytics
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-400">
                        <Check className="h-4 w-4 text-amber-500" />
                        Exclusive fighter insights and predictions
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-400">
                        <Check className="h-4 w-4 text-amber-500" />
                        Ad-free experience
                      </li>
                    </ul>
                    <Button
                      onClick={() => {
                        // TODO: Implement premium upgrade flow
                        console.log("Premium upgrade clicked");
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-purple-500 hover:from-amber-600 hover:to-purple-600 text-white"
                    >
                      Upgrade to Premium
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Picture Section */}
            <div className="space-y-4 bg-gray-900/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">
                  Profile Picture
                </h4>
              </div>
              <div className="flex flex-col items-center gap-6">
                <div className="h-32 w-32 rounded-full bg-gray-800 flex items-center justify-center ring-2 ring-gray-700 ring-offset-2 ring-offset-gray-950">
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-gray-400">
                      {user?.username?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col w-full gap-2">
                  <Button
                    variant="outline"
                    className="bg-gray-900 border-gray-800 text-white w-full"
                    onClick={() =>
                      document.getElementById("picture-upload")?.click()
                    }
                  >
                    Upload New Picture
                  </Button>
                  <p className="text-xs text-gray-400 text-center">
                    Recommended: Square image, at least 400x400 pixels
                  </p>
                </div>
                <input
                  id="picture-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            {/* Account Information Section */}
            <div className="space-y-4 bg-gray-900/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">
                  Account Information
                </h4>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Username</label>
                  <Input
                    value={user?.username || ""}
                    disabled
                    className="bg-gray-900 border-gray-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Email</label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-900 border-gray-800 text-white"
                  />
                </div>
                <div className="border-t border-gray-800 my-4 pt-4">
                  <label className="text-sm text-gray-400">Password</label>
                  {!showPasswordForm ? (
                    <Button
                      variant="outline"
                      className="bg-gray-900 border-gray-800 text-white mt-2 w-full"
                      onClick={() => setShowPasswordForm(true)}
                    >
                      Change Password
                    </Button>
                  ) : (
                    <form
                      onSubmit={handlePasswordChange}
                      className="space-y-4 mt-2"
                    >
                      <Input
                        type="password"
                        placeholder="Current Password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                      />
                      <Input
                        type="password"
                        placeholder="New Password"
                        value={passwordData.newPassword}
                        onChange={(e) => {
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          });
                          setShowPasswordRequirements(true);
                        }}
                        className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                      />
                      <Input
                        type="password"
                        placeholder="Confirm New Password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                      />
                      {showPasswordRequirements && (
                        <div className="space-y-2">
                          {passwordRequirements.map((req, index) => (
                            <div
                              key={index}
                              className="flex items-center text-sm space-x-2"
                            >
                              {req.test(passwordData.newPassword) ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                              <span
                                className={
                                  req.test(passwordData.newPassword)
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
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          className="bg-gray-800 hover:bg-gray-700 text-white"
                          disabled={isLoading}
                        >
                          {isLoading ? "Updating..." : "Update Password"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-gray-900 border-gray-800 text-white"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setPasswordData({
                              currentPassword: "",
                              newPassword: "",
                              confirmPassword: "",
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
