type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  accent?: boolean;
  className?: string;
};

const sizeClasses = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
};

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  accent = false,
  className = "",
}: UserAvatarProps) {
  const fallback = initialsFromName(name || "User");

  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        sizeClasses[size],
        accent
          ? "bg-[#DA2C43]/10 text-[#DA2C43]"
          : "bg-primary-soft text-primary",
        className,
      ].join(" ")}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        fallback
      )}
    </div>
  );
}