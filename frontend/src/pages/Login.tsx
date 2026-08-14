import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { loginWithGoogleCredential } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-canvas px-4 py-12 overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div
          className="absolute -top-24 -left-20 w-96 h-96 rounded-[40%_60%_70%_30%/40%_50%_60%_55%] bg-[#59e25d]/15 blur-2xl"
        />
        <div
          className="absolute top-1/4 -right-24 w-[28rem] h-[28rem] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-[#e261e5]/10 blur-3xl"
        />
        <div
          className="absolute -bottom-32 left-1/4 w-[32rem] h-[32rem] rounded-[50%_50%_40%_60%/40%_60%_50%_50%] bg-[#ffe228]/20 blur-3xl"
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        <div className="card-meadow p-8 md:p-10 border border-[#130e30]/10 shadow-[0_4px_32px_rgba(19,14,48,0.04)] !rounded-[36px]">
          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#130e30] text-[#ffe228] flex items-center justify-center text-base font-bold shadow-sm">
              ✉
            </div>
            <div>
              <div className="text-lg font-serif font-bold text-deep-ink">
                Sendora
              </div>
              <div className="text-xs text-slate -mt-0.5">
                Email Job Scheduler
              </div>
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="mb-6">
            <span className="small-caps-label inline-block px-2.5 py-0.5 bg-white/80 rounded-full border border-[#130e30]/10 mb-2.5">
              Workspace Access
            </span>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-deep-ink leading-snug">
              Sign in to Sendora
            </h1>
            <p className="text-sm text-slate mt-2 leading-relaxed font-sans">
              Schedule, manage, and monitor your email delivery queues.
            </p>
          </div>

          {/* Authentication Container */}
          <div className="bg-white rounded-[28px] p-6 border border-[#130e30]/15 flex flex-col items-center shadow-xs">
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={(res) => {
                  setError(null);
                  if (res.credential) {
                    loginWithGoogleCredential(res.credential).catch(() =>
                      setError("Authentication failed. Please try again.")
                    );
                  }
                }}
                onError={() => setError("Sign-in failed. Please try again.")}
                theme="outline"
                shape="pill"
                size="large"
                text="continue_with"
                width="280"
              />
            </div>

            {error && (
              <div className="mt-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-pill border border-red-200 text-center font-medium">
                {error}
              </div>
            )}
          </div>

          {/* Footer Badges */}
          <div className="mt-6 pt-5 border-t border-[#130e30]/10 flex flex-wrap items-center justify-center gap-2 text-xs text-slate">
            <span className="px-3 py-1 bg-white/60 rounded-pill border border-[#130e30]/5">
              BullMQ Queue
            </span>
            <span className="px-3 py-1 bg-white/60 rounded-pill border border-[#130e30]/5">
              Rate Limit Protected
            </span>
            <span className="px-3 py-1 bg-white/60 rounded-pill border border-[#130e30]/5">
              Ethereal SMTP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


