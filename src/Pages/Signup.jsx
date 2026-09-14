import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setLoading(false);
      setErrorMessage("All fields are required");
      return;
    }
    if (password.length < 6) {
      setLoading(false);
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setLoading(false);
      setErrorMessage("Please enter a valid email address");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setLoading(false);
      setErrorMessage("User was not created");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: name,
      username: `${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")}_${Date.now().toString().slice(-6)}`,
      role: "user",
    });

    if (profileError) {
      setLoading(false);
      setErrorMessage("Profile creation failed");
      return;
    }

    setLoading(false);
    console.log("Signup and profile creation successful");
    navigate("/login");
  };
  return (
    <div>
      <h1>Create Account</h1>
      <p>SkillSwap Signup</p>

      {errorMessage && <p>{errorMessage}</p>}

      <form onSubmit={handleSignup}>
        <div>
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

export default Signup;
