import "./Home.css";

function Home() {
  return (
    <div className="home-page">
      {/* Navbar */}
      <header className="home-navbar">
        <div className="home-logo">
          <span className="home-logo-mark">S</span>
          <span>SkillSwap</span>
        </div>

        <nav className="home-nav-links">
          <a href="#skills">Browse Skills</a>
          <a href="#how-it-works">How It Works</a>
        </nav>

        <div className="home-nav-actions">
          <a href="/login" className="home-login-link">
            Login
          </a>

          <a href="/signup" className="home-get-started">
            Get Started
          </a>

          <span className="home-user-icon">●</span>
        </div>
      </header>

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-content">
          <span className="home-hero-badge">
            ✦ Peer-to-Peer Knowledge Exchange
          </span>

          <h1>
            Share Your Skills.
            <br />
            <span>Learn Something New.</span>
          </h1>

          <p>
            SkillSwap connects students and passionate learners to trade
            knowledge directly. Teach what you excel at—from coding to
            photography—and master new skills in return, without paying a dime.
          </p>

          <div className="home-hero-actions">
            <a href="/browse" className="home-primary-button">
              ✦ Find a Skill
            </a>

            <a href="/profile" className="home-secondary-button">
              ◎ Offer a Skill
            </a>
          </div>

          <div className="home-hero-trust">
            <span>♧ Student Verified</span>
            <span>◉ 100% Free Peer Swaps</span>
            <span>◌ Flexible Self-Paced</span>
          </div>
        </div>

        <div className="home-hero-visual">
          <div className="home-floating-card">
            <span>↗</span>
            <div>
              <strong>1:1 Live Swap</strong>
              <small>Active Coordination</small>
            </div>
          </div>

          <div className="home-illustration-placeholder">
            <span>Skill Exchange</span>
          </div>

          <div className="home-verified-card">
            <span>✓</span>
            <div>
              <strong>Verified Peer</strong>
              <small>Campus Ready</small>
            </div>
          </div>
        </div>
      </section>
      {/* How It Works */}
      <section id="how-it-works" className="home-how-it-works">
        <div className="home-section-heading">
          <span>SIMPLE PROCESS</span>

          <h2>How It Works</h2>

          <p>Three simple steps to start trading knowledge.</p>
        </div>

        <div className="home-how-cards">
          <div className="home-how-card">
            <div className="home-how-card-top">
              <div className="home-how-icon">♙</div>
              <span>01</span>
            </div>

            <h3>Create Your Profile</h3>

            <p>
              List the skills you can share and the topics you want to explore.
              Highlight your background and preferred schedule.
            </p>

            <a href="/profile">Define your skill strengths →</a>
          </div>

          <div className="home-how-card">
            <div className="home-how-card-top">
              <div className="home-how-icon">⌕</div>
              <span>02</span>
            </div>

            <h3>Find Your Skill Match</h3>

            <p>
              Browse peers by topic, mutual exchange interests, and
              availability. Find someone eager to learn what you teach.
            </p>

            <a href="/browse">Explore peer matches →</a>
          </div>

          <div className="home-how-card">
            <div className="home-how-card-top">
              <div className="home-how-icon">⇄</div>
              <span>03</span>
            </div>

            <h3>Swap Skills & Learn</h3>

            <p>
              Connect, coordinate sessions, and learn hands-on together.
              Alternate between mentor and mentee roles seamlessly.
            </p>

            <a href="/browse">Start trading sessions →</a>
          </div>
        </div>
      </section>
      {/* Popular Skills */}
      <section id="skills" className="home-skills">
        <div className="home-section-heading">
          <span>EXPLORE & LEARN</span>

          <h2>Popular Skills to Swap</h2>

          <p>Discover what people are teaching and learning on SkillSwap.</p>
        </div>

        <div className="home-skill-grid">
          <a href="/browse" className="home-skill-card">
            <div className="home-skill-icon">{"</>"}</div>
            <h3>JavaScript</h3>
            <span>Web Development</span>
          </a>

          <a href="/browse" className="home-skill-card">
            <div className="home-skill-icon">PS</div>
            <h3>Photoshop</h3>
            <span>Design & Creative</span>
          </a>

          <a href="/browse" className="home-skill-card">
            <div className="home-skill-icon">Ex</div>
            <h3>Excel</h3>
            <span>Business & Productivity</span>
          </a>

          <a href="/browse" className="home-skill-card">
            <div className="home-skill-icon">▣</div>
            <h3>Photography</h3>
            <span>Creative & Media</span>
          </a>

          <a href="/browse" className="home-skill-card">
            <div className="home-skill-icon">✦</div>
            <h3>Video Editing</h3>
            <span>Creative & Media</span>
          </a>

          <a href="/browse" className="home-skill-card">
            <div className="home-skill-icon">✎</div>
            <h3>Graphic Design</h3>
            <span>Design & Creative</span>
          </a>

          <a href="/browse" className="home-skill-card">
            <div className="home-skill-icon">JS</div>
            <h3>Node.js</h3>
            <span>Backend Development</span>
          </a>

          <a href="/browse" className="home-skill-card">
            <div className="home-skill-icon">Aa</div>
            <h3>Public Speaking</h3>
            <span>Communication</span>
          </a>
        </div>
      </section>
      {/* Key Platform Features */}
      <section className="home-features">
        <div className="home-section-heading">
          <span>WHY SKILLSWAP</span>

          <h2>Everything You Need to Learn & Share</h2>

          <p>
            Simple tools that make peer-to-peer skill exchange easy and
            reliable.
          </p>
        </div>

        <div className="home-feature-grid">
          <div className="home-feature-card">
            <div className="home-feature-icon">↔</div>
            <h3>Skill-Based Matching</h3>
            <p>
              Find people who can teach the skills you want to learn and
              discover learners interested in what you offer.
            </p>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-icon">✓</div>
            <h3>Verified Profiles</h3>
            <p>
              View clear profiles with skills, availability and useful
              information before starting a swap.
            </p>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-icon">★</div>
            <h3>Ratings & Feedback</h3>
            <p>
              Share feedback after completed swaps and build trust within the
              SkillSwap community.
            </p>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-icon">🔒</div>
            <h3>Safe & Controlled Swaps</h3>
            <p>
              Manage requests, accept or reject swaps, and complete exchanges
              when both people are ready.
            </p>
          </div>
        </div>
      </section>
      {/* Community & Trust */}
      <section className="home-community">
        <div className="home-community-content">
          <span className="home-community-label">LEARN TOGETHER</span>

          <h2>
            Knowledge Grows
            <br />
            When You Share It.
          </h2>

          <p>
            SkillSwap is built around people helping people. Teach something you
            know, learn something you've always wanted to master, and grow
            together through meaningful skill exchanges.
          </p>

          <div className="home-community-stats">
            <div>
              <strong>100%</strong>
              <span>Free to Join</span>
            </div>

            <div>
              <strong>1:1</strong>
              <span>Peer Learning</span>
            </div>

            <div>
              <strong>∞</strong>
              <span>Skills to Explore</span>
            </div>
          </div>
        </div>

        <div className="home-community-card">
          <div className="home-community-avatar">S</div>

          <div>
            <strong>Learn. Share. Grow.</strong>
            <p>Connect with your next skill partner.</p>
          </div>

          <span className="home-community-check">✓</span>
        </div>
      </section>
    </div>
  );
}

export default Home;
