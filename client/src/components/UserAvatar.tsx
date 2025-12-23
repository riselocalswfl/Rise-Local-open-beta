import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  displayName?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
};

export function UserAvatar({
  firstName,
  lastName,
  profileImageUrl,
  displayName,
  size = "md",
  className,
}: UserAvatarProps) {
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    if (displayName) {
      const parts = displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return displayName.slice(0, 2).toUpperCase();
    }
    return "?";
  };

  const getName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    if (firstName) return firstName;
    if (displayName) return displayName;
    return "User";
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)} data-testid="avatar-user">
      <AvatarImage src={profileImageUrl || undefined} alt={getName()} />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
}

interface UserAvatarWithNameProps extends UserAvatarProps {
  showName?: boolean;
  nameClassName?: string;
}

export function UserAvatarWithName({
  firstName,
  lastName,
  profileImageUrl,
  displayName,
  size = "md",
  className,
  showName = true,
  nameClassName,
}: UserAvatarWithNameProps) {
  const getName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    if (firstName) return firstName;
    if (displayName) return displayName;
    return "User";
  };

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="avatar-with-name">
      <UserAvatar
        firstName={firstName}
        lastName={lastName}
        profileImageUrl={profileImageUrl}
        displayName={displayName}
        size={size}
      />
      {showName && (
        <span className={cn("font-medium text-foreground", nameClassName)} data-testid="text-user-name">
          {getName()}
        </span>
      )}
    </div>
  );
}

export function getDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim();
  }
  if (user.firstName) return user.firstName;
  if (user.username) return user.username;
  return "User";
}
