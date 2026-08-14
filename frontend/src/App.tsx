import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <Login />;
}
