import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "./Signup.css";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="signup-page">
      {/* Header */}
      <header className="signup-header">
        <a href="/" className="signup-logo">
          <span className="signup-logo-mark">S</span>
          <span>SkillSwap</span>
        </a>

        <div className="signup-header-right">
          <span>Already have an account?</span>
          <a href="/login">Sign In</a>
        </div>
      </header>

      {/* Main */}
      <main className="signup-main">
        {/* Left Section */}
        <section className="signup-intro">
          <span className="signup-badge">✦ Peer-to-Peer Skill Exchange</span>

          <h1>
            Start Your
            <br />
            <span>SkillSwap</span> Journey
          </h1>

          <p className="signup-intro-text">
            Join our campus community to exchange knowledge. Teach skills you've
            mastered and learn exciting new ones from talented peers around
            you—completely free.
          </p>

          <div className="signup-illustration">
            <div className="signup-illustration-content">
              <div className="signup-person-card signup-person-one">
                <span>👩‍💻</span>
                <div>
                  <strong>Sarah</strong>
                  <small>Web Development</small>
                </div>
              </div>

              <div className="signup-exchange-symbol">↔</div>

              <div className="signup-person-card signup-person-two">
                <span>👨‍🎨</span>
                <div>
                  <strong>Alex</strong>
                  <small>Graphic Design</small>
                </div>
              </div>

              <div className="signup-illustration-title">
                <strong>1:1 Knowledge Exchange</strong>
                <small>Coding, Design, Languages & more</small>
              </div>
            </div>
          </div>

          <div className="signup-trust-items">
            <span>✓ 100% Free Peer Learning</span>
            <span>♧ Safe & Reciprocal Campus Network</span>
            <span>✦ No Course Fees, Ever</span>
          </div>
        </section>

        {/* Signup Card */}
        <section className="signup-card">
          <div className="signup-card-logo">
            <span className="signup-logo-mark">S</span>
            <strong>SkillSwap</strong>
          </div>

          <div className="signup-card-heading">
            <h2>Create Your Account</h2>
            <p>Start trading skills with peers in minutes.</p>
          </div>

          {errorMessage && (
            <p className="signup-error-message">{errorMessage}</p>
          )}

          <form onSubmit={handleSignup} className="signup-form">
            {/* Name */}
            <div className="signup-field">
              <label htmlFor="name">Full Name</label>

              <div className="signup-input-wrapper">
                <span className="signup-input-icon">♙</span>

                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="signup-field">
              <label htmlFor="email">Email Address</label>

              <div className="signup-input-wrapper">
                <span className="signup-input-icon">@</span>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="signup-field">
              <label htmlFor="password">Password</label>

              <div className="signup-input-wrapper">
                <span className="signup-input-icon">⌑</span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Community Guidelines */}
            <label className="signup-agreement">
              <input type="checkbox" required />
              <span>
                I agree to the Community Guidelines & Terms of Exchange
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="signup-submit-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account →"}
            </button>

            {/* Divider */}
            <div className="signup-divider">
              <span></span>
              <strong>OR</strong>
              <span></span>
            </div>

            {/* Google UI */}
            <button type="button" className="signup-google-button">
              <span className="signup-google-icon">G</span>
              <span>Continue with Google</span>
            </button>
          </form>

          <p className="signup-login-text">
            Already have an account? <a href="/login">Sign In</a>
          </p>

          <div className="signup-security-note">
            <span>●</span>
            <p>
              SkillSwap is built on mutual exchange. No credit card required,
              100% peer-powered.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="signup-footer">
        <div className="signup-footer-brand">
          <strong>SkillSwap</strong>
          <span>Peer skill exchange & student collaboration</span>
        </div>

        <div className="signup-footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Campus Guidelines</a>
        </div>
      </footer>
    </div>
  );
}

export default Signup;
