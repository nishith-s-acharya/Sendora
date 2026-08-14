import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

const GOOGLE_CLIENT_ID =
  ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || "").trim() ||
  "469346149423-m3ro8jgol9btbjd7eeq97j6gdme7mqd4.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
