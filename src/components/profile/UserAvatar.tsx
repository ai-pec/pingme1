import { Link, useNavigate } from "react-router-dom";
import { User, Shield, LogOut, BarChart2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminPanel } from "@/lib/adminAccess";

export default function UserAvatar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAdminAccess = async () => {
      if (!user) {
        if (active) {
          setShowAdmin(false);
        }
        return;
      }

      try {
        const allowed = await canAccessAdminPanel();
        if (active) {
          setShowAdmin(allowed);
        }
      } catch {
        if (active) {
          setShowAdmin(false);
        }
      }
    };

    checkAdminAccess();

    return () => {
      active = false;
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) return null;

  const displayName = profile?.displayName || user.displayName || "User";
  const email = user.email || "";
  const photoURL = profile?.photoURL || user.photoURL;

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src={photoURL || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile/visits" className="flex items-center cursor-pointer">
            <BarChart2 className="mr-2 h-4 w-4" />
            Your NFC profile visits
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile/leads" className="flex items-center cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            NFC Leads & Outreach
          </Link>
        </DropdownMenuItem>
        {showAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="flex items-center cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
