import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="login-page">
      {/* Header */}
      <header className="login-header">
        <a href="/" className="login-logo">
          <span className="login-logo-mark">S</span>
          <span>SkillSwap</span>
        </a>

        <div className="login-header-right">
          <span>New to SkillSwap?</span>
          <a href="/signup">Create an account</a>
        </div>
      </header>

      {/* Main Content */}
      <main className="login-main">
        {/* Left Section */}
        <section className="login-intro">
          <span className="login-badge">✦ Peer-to-Peer Skill Exchange</span>

          <h1>
            Welcome <span>Back</span>
          </h1>

          <p className="login-intro-text">
            Sign in to continue swapping skills with people around you.
          </p>

          <div className="login-illustration">
            <div className="login-illustration-content">
              <div className="login-person-card login-person-one">
                <span>👩‍💻</span>
                <div>
                  <strong>Sarah</strong>
                  <small>Web Development</small>
                </div>
              </div>

              <div className="login-exchange-symbol">↔</div>

              <div className="login-person-card login-person-two">
                <span>👨‍🎨</span>
                <div>
                  <strong>Alex</strong>
                  <small>Graphic Design</small>
                </div>
              </div>

              <div className="login-illustration-title">
                <strong>1:1 Knowledge Exchange</strong>
                <small>Coding, Design, Languages & more</small>
              </div>
            </div>
          </div>

          <div className="login-trust-items">
            <span>✓ Verified Student & Peer Matches</span>
            <span>♙ Safe & Reciprocal Learning</span>
          </div>
        </section>

        {/* Login Card */}
        <section className="login-card">
          <div className="login-card-logo">
            <span className="login-logo-mark">S</span>
            <strong>SkillSwap</strong>
          </div>

          <div className="login-card-heading">
            <h2>Sign In to Your Account</h2>
            <p>Welcome back! Please enter your details.</p>
          </div>

          {errorMessage && (
            <p className="login-error-message">{errorMessage}</p>
          )}

          <form onSubmit={handleLogin} className="login-form">
            {/* Email */}
            <div className="login-field">
              <label htmlFor="email">Email Address</label>

              <div className="login-input-wrapper">
                <span className="login-input-icon">@</span>

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
            <div className="login-field">
              <div className="login-password-label">
                <label htmlFor="password">Password</label>

                <a href="#" className="login-forgot-link">
                  Forgot password?
                </a>
              </div>

              <div className="login-input-wrapper">
                <span className="login-input-icon">⌑</span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Remember */}
            <label className="login-remember">
              <input type="checkbox" />
              <span>Remember this device</span>
            </label>

            {/* Login Button */}
            <button
              type="submit"
              className="login-submit-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Sign In to SkillSwap →"}
            </button>

            {/* Divider */}
            <div className="login-divider">
              <span></span>
              <strong>OR</strong>
              <span></span>
            </div>

            {/* Google UI */}
            <button type="button" className="login-google-button">
              <span className="login-google-icon">G</span>
              <span>Continue with Google</span>
            </button>
          </form>

          {/* Signup */}
          <p className="login-signup-text">
            Don't have an account? <a href="/signup">Sign Up</a>
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <div className="login-footer-brand">
          <strong>SkillSwap</strong>
          <span>Peer skill exchange & student collaboration</span>
        </div>

        <div className="login-footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Campus Guidelines</a>
        </div>
      </footer>
    </div>
  );
}

export default Login;
