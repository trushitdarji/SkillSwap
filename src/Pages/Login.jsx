import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setErrorMessage("");

    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setLoading(false);
      setErrorMessage("Email and password are required");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage("Invalid email or password");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMessage("Unable to verify account status");
      return;
    }

    if (profile?.is_banned) {
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMessage("Your account has been banned by an administrator");
      return;
    }

    setLoading(false);
    console.log("Login successful:", data.user);
    navigate("/dashboard");
  };

  return (
    <div>
      <h1>Login</h1>
      <p>SkillSwap Login</p>

      {errorMessage && <p>{errorMessage}</p>}

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;
