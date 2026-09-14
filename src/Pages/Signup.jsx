import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("Signup error:", error);
      return;
    }

    const user = data.user;

    if (!user) {
      console.error("User was not created");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: name,
      username: name.toLowerCase().replace(/\s+/g, "_"),
      role: "user",
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return;
    }

    console.log("Signup and profile creation successful");
    navigate("/login");
  };
  return (
    <div>
      <h1>Create Account</h1>
      <p>SkillSwap Signup</p>

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

        <button type="submit">Create Account</button>
      </form>
    </div>
  );
}

export default Signup;
