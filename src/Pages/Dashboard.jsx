import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    navigate("/login");
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        return;
      }

      console.log("Current session:", data.session);

      if (!data.session) {
        navigate("/login");
        return;
      }
    };

    checkSession();
  }, []);

  return (
    <div>
      <h1>SkillSwap Dashboard</h1>
      <p>Welcome to SkillSwap</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;
