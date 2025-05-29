import { useState } from "react";
import AuthPage from "./AuthPage";

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const handleAuthClick = (mode: "login" | "register") => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <img 
        src="https://od.lk/s/NjBfMTY1NTk5NzI4Xw/Title%20screen%20with%20text%2016%20Jan.png"
        alt="Brainz Title Screen"
        className="absolute w-full h-full object-contain bg-black"
      />
      <div className="absolute bottom-16 w-full flex justify-center gap-12 z-10">
        {!showAuth ? (
          <>
            <button
              onClick={() => handleAuthClick("login")}
              className="text-4xl font-cursive text-white hover:text-purple-300 transition-colors duration-300"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              Login
            </button>
            <button
              onClick={() => handleAuthClick("register")}
              className="text-4xl font-cursive text-white hover:text-purple-300 transition-colors duration-300"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              Register
            </button>
          </>
        ) : (
          <AuthPage initialMode={authMode} />
        )}
      </div>
    </div>
  );
}