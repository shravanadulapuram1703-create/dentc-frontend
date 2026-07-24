import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/components/ui/utils";
import type { ChatUser, PresenceStatus } from "../messagingModel";
import PresenceDot from "./PresenceDot";

const SIZES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

/** Circular user avatar (image or initials) with an optional presence dot. */
export default function UserAvatar({
  user,
  size = "md",
  presence,
  className,
}: {
  user: ChatUser;
  size?: "sm" | "md" | "lg";
  presence?: PresenceStatus;
  className?: string;
}) {
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <Avatar className={cn(SIZES[size], "border border-[#E2E8F0]")}>
        {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.name} /> : null}
        <AvatarFallback className="bg-gradient-to-br from-[#3A6EA5] to-[#1F3A5F] text-white font-semibold">
          {user.initials}
        </AvatarFallback>
      </Avatar>
      {presence ? (
        <PresenceDot
          status={presence}
          size={size === "sm" ? "sm" : "md"}
          className="absolute -bottom-0.5 -right-0.5"
        />
      ) : null}
    </div>
  );
}
