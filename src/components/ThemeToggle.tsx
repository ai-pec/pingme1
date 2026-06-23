import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        relative inline-flex items-center gap-1.5
        h-9 w-[4.5rem] rounded-full p-1
        transition-all duration-300 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${isDark
          ? "bg-gray-800 border border-gray-600/50 shadow-inner"
          : "bg-yellow-100 border border-yellow-300/60 shadow-inner"
        }
      `}
    >
      {/* Sun icon (left side) */}
      <Sun
        className={`absolute left-2 w-4 h-4 transition-all duration-300 ${
          isDark ? "text-gray-500 opacity-50" : "text-yellow-600 opacity-100"
        }`}
      />

      {/* Moon icon (right side) */}
      <Moon
        className={`absolute right-2 w-4 h-4 transition-all duration-300 ${
          isDark ? "text-blue-300 opacity-100" : "text-yellow-400/50 opacity-50"
        }`}
      />

      {/* Sliding thumb */}
      <span
        className={`
          relative z-10 flex items-center justify-center
          w-7 h-7 rounded-full shadow-md
          transition-all duration-300 ease-in-out
          ${isDark
            ? "translate-x-[2.1rem] bg-gray-700 border border-gray-500"
            : "translate-x-0 bg-white border border-yellow-200"
          }
        `}
      >
        {isDark
          ? <Moon className="w-3.5 h-3.5 text-blue-300" />
          : <Sun className="w-3.5 h-3.5 text-yellow-500" />
        }
      </span>
    </button>
  );
};

export default ThemeToggle;