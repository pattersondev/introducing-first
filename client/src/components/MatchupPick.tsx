import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PicksService } from "@/services/picks-service";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProbabilityBar } from "./ProbabilityBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LoginDialog } from "./auth/LoginDialog";
import { RegisterDialog } from "./auth/RegisterDialog";
import { Trophy, Users, MessageCircle, ChevronRight } from "lucide-react";

interface MatchupPickProps {
  matchupId: string;
  eventId: string;
  fighterName: string;
  fighterId: string;
  probability?: number;
  className?: string;
  isSelected?: boolean;
  onPickSubmitted?: () => void;
}

export function MatchupPick({
  matchupId,
  eventId,
  fighterName,
  fighterId,
  probability,
  className,
  isSelected: initialIsSelected = false,
  onPickSubmitted,
}: MatchupPickProps) {
  const [isSelected, setIsSelected] = useState(initialIsSelected);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsSelected(initialIsSelected);
  }, [initialIsSelected]);

  const handlePick = async () => {
    if (!user?.id) {
      setShowAuthDialog(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await PicksService.submitPick(
        parseInt(user.id),
        matchupId,
        eventId,
        fighterId
      );
      setIsSelected(true);
      onPickSubmitted?.();
    } catch (error) {
      setIsSelected(initialIsSelected);
      console.error("Failed to submit pick:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    // Automatically submit the pick after successful auth
    handlePick();
  };

  return (
    <>
      <div className={className}>
        {probability !== undefined && (
          <div className="mt-1">
            <ProbabilityBar probability={probability} />
            <p className="text-xs text-gray-400 mt-1">
              {(probability * 100).toFixed(1)}%
            </p>
          </div>
        )}
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          disabled={isSubmitting}
          className={cn(
            "mt-2 w-full text-xs sm:text-sm transition-all duration-200 transform active:scale-95",
            isSelected
              ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/50"
              : "border-gray-700 hover:border-gray-600 hover:bg-gray-700/50"
          )}
          onClick={handlePick}
        >
          {isSubmitting
            ? "Submitting..."
            : isSelected
            ? "My Pick ✓"
            : "Pick to Win"}
        </Button>
      </div>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[425px] bg-gray-950 border border-gray-800">
          <DialogHeader className="space-y-4">
            <div className="mx-auto bg-blue-500/10 rounded-full p-3 w-fit">
              <Trophy className="w-8 h-8 text-blue-400" />
            </div>
            <DialogTitle className="text-2xl text-center text-white">
              Ready to Pick {fighterName}? 🥊
            </DialogTitle>
            <DialogDescription className="text-center text-gray-400">
              Join our community of fight fans to lock in your predictions
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50">
                <div className="bg-blue-500/10 rounded-full p-2">
                  <Trophy className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">
                    Track Your Picks
                  </h4>
                  <p className="text-xs text-gray-400">
                    Build your prediction history and track your success
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50">
                <div className="bg-green-500/10 rounded-full p-2">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">
                    Compare with Others
                  </h4>
                  <p className="text-xs text-gray-400">
                    See how your picks stack up against the community
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50">
                <div className="bg-purple-500/10 rounded-full p-2">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">
                    Join the Discussion
                  </h4>
                  <p className="text-xs text-gray-400">
                    Chat with other fans about upcoming fights
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <RegisterDialog onRegisterSuccess={handleAuthSuccess} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-950 px-2 text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>
            <LoginDialog onLoginSuccess={handleAuthSuccess} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
