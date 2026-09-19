import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "./Browse.css";

function Browse() {
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");
  const [swapUser, setSwapUser] = useState(null);
  const [swapError, setSwapError] = useState("");
  const [swapSending, setSwapSending] = useState(false);
  const [selectedOfferedSkill, setSelectedOfferedSkill] = useState("");
  const [selectedRequestedSkill, setSelectedRequestedSkill] = useState("");
  const [swapMessage, setSwapMessage] = useState("");
  const [myOfferedSkills, setMyOfferedSkills] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchBrowseData = async () => {
      setRecommendationLoading(true);
      setRecommendationError("");

      const { data: skillsData, error: skillsError } = await supabase
        .from("skills")
        .select("id, name, parent_id")
        .not("parent_id", "is", null)
        .order("name");

      if (skillsError) {
        console.error("Skills fetch error:", skillsError);
        setRecommendationError("Unable to load recommendations.");
        setRecommendationLoading(false);
        return;
      }

      setAvailableSkills(skillsData || []);

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user?.id;

      if (!currentUserId) {
        setRecommendationLoading(false);
        return;
      }

      const { data: userProfile, error: userProfileError } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", currentUserId)
        .single();

      if (userProfileError) {
        console.error("Current profile fetch error:", userProfileError);
      } else {
        setCurrentUserProfile(userProfile);
      }

      const { data: notificationData, error: notificationError } =
        await supabase
          .from("notifications")
          .select(
            "id, type, title, message, created_at, is_read, is_announcement",
          )
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(20);

      if (notificationError) {
        console.error("Notifications fetch error:", notificationError);
      } else {
        setNotifications(notificationData || []);
        setUnreadNotificationCount(
          (notificationData || []).filter(
            (notification) => !notification.is_read,
          ).length,
        );
      }

      const { data: mySkills, error: mySkillsError } = await supabase
        .from("user_skills")
        .select("skill_id, skill_type")
        .eq("user_id", currentUserId);

      if (mySkillsError) {
        console.error("My skills fetch error:", mySkillsError);
        setRecommendationError("Unable to load recommendations.");
        setRecommendationLoading(false);
        return;
      }

      const myOfferedSkillIds = mySkills
        .filter((skill) => skill.skill_type === "offer")
        .map((skill) => skill.skill_id);

      const myWantedSkillIds = mySkills
        .filter((skill) => skill.skill_type === "want")
        .map((skill) => skill.skill_id);

      const myOfferedSkillData = mySkills
        .filter((skill) => skill.skill_type === "offer")
        .map((skill) => ({
          id: skill.skill_id,
          name:
            (skillsData || []).find((item) => item.id === skill.skill_id)
              ?.name || "Unknown skill",
        }));

      setMyOfferedSkills(myOfferedSkillData);

      const { data: allUserSkills, error: allUserSkillsError } = await supabase
        .from("user_skills")
        .select("user_id, skill_id, skill_type")
        .eq("moderation_status", "approved")
        .neq("user_id", currentUserId);

      if (allUserSkillsError) {
        console.error("All user skills fetch error:", allUserSkillsError);
        setRecommendationError("Unable to load recommendations.");
        setRecommendationLoading(false);
        return;
      }

      const recommendedUserIds = [
        ...new Set((allUserSkills || []).map((item) => item.user_id)),
      ];

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, location, availability, is_public")
        .in("id", recommendedUserIds)
        .eq("is_public", true);

      if (profilesError) {
        console.error("Profiles fetch error:", profilesError);
        setRecommendationError("Unable to load recommendations.");
        setRecommendationLoading(false);
        return;
      }

      const matchedUsers = (allUserSkills || []).reduce((users, item) => {
        if (!users[item.user_id]) {
          users[item.user_id] = {
            user_id: item.user_id,
            offers: [],
            wants: [],
            matchScore: 0,
          };
        }

        if (item.skill_type === "offer") {
          users[item.user_id].offers.push(item.skill_id);

          if (myWantedSkillIds.includes(item.skill_id)) {
            users[item.user_id].matchScore += 1;
          }
        }

        if (item.skill_type === "want") {
          users[item.user_id].wants.push(item.skill_id);

          if (myOfferedSkillIds.includes(item.skill_id)) {
            users[item.user_id].matchScore += 1;
          }
        }

        return users;
      }, {});

      const recommendedUsersWithNames = Object.values(matchedUsers)
        .filter((user) => user.matchScore > 0)
        .map((user) => ({
          ...user,
          offerSkillIds: user.offers,
          wantSkillIds: user.wants,
          profile:
            (profilesData || []).find(
              (profile) => profile.id === user.user_id,
            ) || null,
          offers: user.offers.map(
            (skillId) =>
              (skillsData || []).find((skill) => skill.id === skillId)?.name ||
              "Unknown skill",
          ),
          wants: user.wants.map(
            (skillId) =>
              (skillsData || []).find((skill) => skill.id === skillId)?.name ||
              "Unknown skill",
          ),
        }))
        .sort((a, b) => b.matchScore - a.matchScore);

      setRecommendedUsers(recommendedUsersWithNames);

      setRecommendationLoading(false);
    };

    fetchBrowseData();
  }, []);

  const handleNotificationClick = async (notification) => {
    if (notification.is_read) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user?.id;

    if (!currentUserId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Mark notification as read error:", error);
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      ),
    );

    setUnreadNotificationCount((count) => Math.max(0, count - 1));
  };

  const handleSendSwapRequest = async () => {
    console.log("Send Swap Request clicked");
    setSwapError("");
    setSwapSending(true);

    if (!swapUser || !selectedOfferedSkill || !selectedRequestedSkill) {
      console.log("Swap request validation failed");
      setSwapSending(false);
      return;
    }

    console.log("Swap request validation passed");

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user?.id;

    if (!currentUserId) {
      console.log("User session not found");
      return;
    }

    const { data, error } = await supabase
      .from("swap_requests")
      .insert({
        sender_id: currentUserId,
        receiver_id: swapUser.user_id,
        offered_skill_id: selectedOfferedSkill,
        requested_skill_id: selectedRequestedSkill,
        message: swapMessage.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Swap request insert error:", error);

      setSwapError(
        error.code === "23505"
          ? "You already have a pending swap request for this exchange."
          : error.message || "Unable to send swap request.",
      );

      setSwapSending(false);
      return;
    }

    console.log("Swap request created:", data);
    setSwapSending(false);

    const { error: activityError } = await supabase
      .from("activity_logs")
      .insert({
        user_id: currentUserId,
        action_type: "swap_requested",
        description: `Sent a swap request to ${
          swapUser.profile?.full_name || swapUser.profile?.username || "a user"
        }`,
      });

    if (activityError) {
      console.error("Activity log insert error:", activityError);
    } else {
      console.log("Activity log created successfully");
    }
    alert("Swap request sent successfully!");

    setSwapUser(null);
    setSelectedOfferedSkill("");
    setSelectedRequestedSkill("");
    setSwapMessage("");
  };

  const handleSearch = async (skillOverride = "") => {
    setSearchLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user?.id;

    const selectedSkillName = availableSkills.find(
      (skill) => skill.id === selectedSkill,
    )?.name;

    const skillName = skillOverride || selectedSkillName || searchTerm.trim();

    const availabilityFilter = selectedAvailability;

    if (!skillName) {
      setSearchLoading(false);
      setSubmittedSearch("");
      setSearchResults([]);
      setRecommendationError("Please enter or select a skill to search.");
      return;
    }

    setSubmittedSearch(skillName);

    const { data: skillResults, error: skillError } = await supabase
      .from("user_skills")
      .select("user_id, skill_id, skill_type")
      .eq("skill_type", "offer")
      .eq("moderation_status", "approved");

    if (skillError) {
      console.error("User search error:", skillError);
      setSubmittedSearch("");
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const matchedSkillResults = (skillResults || [])
      .filter((result) => result.user_id !== currentUserId)
      .filter((result) => {
        const skill = availableSkills.find(
          (item) => item.id === result.skill_id,
        );

        return skill?.name?.toLowerCase().includes(skillName.toLowerCase());
      });

    const userIds = [
      ...new Set(matchedSkillResults.map((result) => result.user_id)),
    ];

    if (userIds.length === 0) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username, location, availability, is_public")
      .in("id", userIds)
      .eq("is_public", true);

    if (profilesError) {
      console.error("Search profiles error:", profilesError);
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const enrichedResults = matchedSkillResults
      .map((result) => {
        const skill = availableSkills.find(
          (item) => item.id === result.skill_id,
        );

        const profile = (profilesData || []).find(
          (item) => item.id === result.user_id,
        );

        if (!profile) {
          return null;
        }

        return {
          ...result,
          skills: skill || null,
          profile,
        };
      })
      .filter(Boolean);

    const availabilityFilteredResults = enrichedResults.filter((result) => {
      if (!availabilityFilter) {
        return true;
      }

      return result.profile?.availability?.includes(availabilityFilter);
    });

    setSearchResults(availabilityFilteredResults);
    setSearchLoading(false);
  };

  const handlePopularSkillClick = async (skillName) => {
    setSelectedSkill("");
    setSearchTerm(skillName);
    await handleSearch(skillName);
  };

  return (
    <div className="browse-page">
      <nav className="browse-navbar">
        <a href="/" className="browse-navbar-logo">
          <span className="browse-navbar-logo-icon">S</span>
          <span>SkillSwap</span>
        </a>

        <div className="browse-navbar-links">
          <a href="/">Home</a>
          <a href="/browse" className="active">
            Browse
          </a>
          <a href="/swap-requests">Swap Requests</a>
          <a href="/dashboard">Dashboard</a>
        </div>

        <div className="browse-navbar-profile">
          <div className="browse-notification-wrapper">
            <button
              type="button"
              className="browse-notification"
              onClick={() => setNotificationOpen((current) => !current)}
              aria-label="Notifications"
            >
              🔔
              {unreadNotificationCount > 0 && (
                <span className="browse-notification-badge">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="browse-notification-dropdown">
                <div className="browse-notification-header">
                  <strong>Notifications</strong>
                  <span>{unreadNotificationCount} unread</span>
                </div>

                {notifications.length === 0 ? (
                  <div className="browse-notification-empty">
                    No notifications
                  </div>
                ) : (
                  <div className="browse-notification-list">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className={`browse-notification-item ${
                          !notification.is_read ? "unread" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <span className="browse-notification-icon">
                          {notification.is_announcement
                            ? "📢"
                            : notification.type === "swap_request"
                              ? "↔"
                              : notification.type === "swap_accepted"
                                ? "✓"
                                : notification.type === "swap_rejected"
                                  ? "✕"
                                  : notification.type === "swap_cancelled"
                                    ? "↩"
                                    : notification.type === "swap_completed"
                                      ? "🤝"
                                      : notification.type === "rating_received"
                                        ? "⭐"
                                        : "🔔"}
                        </span>

                        <span className="browse-notification-content">
                          <strong>{notification.title}</strong>
                          <span>{notification.message}</span>
                          <small>
                            {new Date(notification.created_at).toLocaleString()}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <a href="/profile" className="browse-navbar-user">
            <span className="browse-navbar-user-info">
              <strong>
                {currentUserProfile?.full_name ||
                  currentUserProfile?.username ||
                  "SkillSwap User"}
              </strong>
              <span>View Profile</span>
            </span>

            <span className="browse-navbar-avatar">
              {currentUserProfile?.avatar_url ? (
                <img
                  src={currentUserProfile.avatar_url}
                  alt={currentUserProfile.full_name || "Profile"}
                />
              ) : (
                (
                  currentUserProfile?.full_name ||
                  currentUserProfile?.username ||
                  "U"
                )
                  .charAt(0)
                  .toUpperCase()
              )}
            </span>
          </a>
        </div>

        <button
          type="button"
          className="browse-mobile-menu"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-label="Open menu"
        >
          ☰
        </button>

        {mobileMenuOpen && (
          <div className="browse-mobile-dropdown">
            <a href="/">Home</a>
            <a href="/swap-requests">Swap Requests</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/profile">View Profile</a>
          </div>
        )}
      </nav>

      <main className="browse-content">
        <section className="browse-hero">
          <div className="browse-hero-copy">
            <div className="browse-hero-tags">
              <span>✦ DISCOVER SKILLS</span>
              <span>Peer-to-Peer Exchange</span>
            </div>

            <h1>Find someone who can teach you.</h1>

            <p>
              Explore people with skills you want to learn and discover
              meaningful, reciprocal skill exchanges across campuses and
              creative hubs.
            </p>
          </div>

          <div className="browse-member-info">
            <div className="browse-member-avatars">
              <span>AM</span>
              <span>PS</span>
              <span>MP</span>
            </div>

            <div>
              <strong>1,480+ Members</strong>
              <small>Active this week</small>
            </div>
          </div>
        </section>

        <div className="browse-search-card">
          <div className="browse-search-row">
            <input
              className="browse-search-input"
              type="text"
              placeholder="Search by skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="browse-search-select"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
            >
              <option value="">Select a skill</option>

              {availableSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>

            <select
              className="browse-search-select"
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
            >
              <option value="">Availability</option>
              <option value="weekends">Weekends</option>
              <option value="evenings">Evenings</option>
              <option value="weekday_nights">Weekday evenings</option>
              <option value="weekday_mornings">Weekday mornings</option>
            </select>

            <button
              type="button"
              className="browse-search-button"
              onClick={() => handleSearch()}
            >
              Search
            </button>
          </div>
          <div className="browse-popular-skills">
            <span className="browse-popular-label">Popular:</span>

            <button
              type="button"
              onClick={() => handlePopularSkillClick("Photoshop")}
            >
              Photoshop
            </button>
            <button
              type="button"
              onClick={() => handlePopularSkillClick("Figma")}
            >
              Figma
            </button>

            <button
              type="button"
              onClick={() => handlePopularSkillClick("React")}
            >
              React
            </button>

            <button
              type="button"
              onClick={() => handlePopularSkillClick("Python")}
            >
              Python
            </button>

            <button
              type="button"
              onClick={() => handlePopularSkillClick("Digital Photography")}
            >
              Digital Photography
            </button>

            <button
              type="button"
              onClick={() => handlePopularSkillClick("Excel")}
            >
              Excel
            </button>

            <button
              type="button"
              onClick={() => handlePopularSkillClick("UX Research")}
            >
              UX Research
            </button>
          </div>

          {submittedSearch && <p>Searching for: {submittedSearch}</p>}

          <section className="browse-recommendations">
            <div className="browse-section-heading">
              <div>
                <span className="browse-section-eyebrow">FOR YOU</span>
                <h2>Recommended for you</h2>
                <p>People whose skills match what you want to learn.</p>
              </div>
            </div>

            {recommendationLoading ? (
              <div className="browse-state-card">
                <p>Loading recommendations...</p>
              </div>
            ) : recommendationError ? (
              <div className="browse-state-card">
                <p>{recommendationError}</p>
              </div>
            ) : recommendedUsers.length === 0 ? (
              <div className="browse-state-card">
                <p>No recommendations available.</p>
              </div>
            ) : (
              <div className="browse-recommendation-grid">
                {recommendedUsers.map((user) => (
                  <article
                    className="browse-recommendation-card"
                    key={user.user_id}
                  >
                    <div className="browse-card-top">
                      <div className="browse-profile-avatar">
                        {(
                          user.profile?.full_name ||
                          user.profile?.username ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <span className="browse-match-badge">
                        {user.matchScore} Match
                      </span>
                    </div>

                    <div className="browse-profile-info">
                      <h3>
                        {user.profile?.full_name ||
                          user.profile?.username ||
                          "Unknown User"}
                      </h3>

                      <span className="browse-username">
                        @{user.profile?.username || "N/A"}
                      </span>

                      <span className="browse-location">
                        📍 {user.profile?.location || "Location not provided"}
                      </span>
                    </div>

                    <div className="browse-availability">
                      <span>●</span>
                      {user.profile?.availability?.length > 0
                        ? user.profile.availability
                            .map((value) => {
                              const labels = {
                                weekends: "Weekends",
                                weekday_nights: "Mon–Sat evenings",
                                evenings: "Weekday evenings",
                                weekday_mornings: "Weekday mornings",
                              };

                              return labels[value] || value;
                            })
                            .join(", ")
                        : "Availability not provided"}
                    </div>

                    <div className="browse-skill-exchange">
                      <div>
                        <small>CAN TEACH</small>
                        <p>
                          {user.offers.length > 0
                            ? user.offers.slice(0, 2).join(", ")
                            : "No skills listed"}
                        </p>
                      </div>

                      <div>
                        <small>WANTS TO LEARN</small>
                        <p>
                          {user.wants.length > 0
                            ? user.wants.slice(0, 2).join(", ")
                            : "No skills listed"}
                        </p>
                      </div>
                    </div>

                    <div className="browse-card-actions">
                      <button
                        type="button"
                        className="browse-profile-button"
                        onClick={() => navigate(`/profile/${user.user_id}`)}
                      >
                        View Profile
                      </button>

                      <button
                        type="button"
                        className="browse-swap-button"
                        onClick={() => {
                          setSwapUser(user);
                          setSelectedOfferedSkill("");
                          setSelectedRequestedSkill("");
                          setSwapMessage("");
                        }}
                      >
                        Request Swap
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {swapUser && (
            <div
              className="browse-modal-overlay"
              onClick={() => setSwapUser(null)}
            >
              <div
                className="browse-swap-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="browse-modal-header">
                  <div>
                    <span className="browse-section-eyebrow">
                      FREE PEER EXCHANGE
                    </span>

                    <h2>Request a Skill Swap</h2>

                    <p>
                      Send a request to exchange skills and learn from each
                      other.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="browse-modal-close"
                    onClick={() => setSwapUser(null)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="browse-swap-user">
                  <div className="browse-swap-user-avatar">
                    {(
                      swapUser.profile?.full_name ||
                      swapUser.profile?.username ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="browse-swap-user-info">
                    <strong>
                      {swapUser.profile?.full_name ||
                        swapUser.profile?.username ||
                        "SkillSwap User"}
                    </strong>

                    <span>
                      @{swapUser.profile?.username || "N/A"}
                      {swapUser.profile?.location
                        ? ` • ${swapUser.profile.location}`
                        : ""}
                    </span>
                  </div>

                  <span className="browse-swap-availability">
                    {swapUser.profile?.availability?.length > 0
                      ? swapUser.profile.availability
                          .map((value) => {
                            const labels = {
                              weekends: "Weekends",
                              weekday_nights: "Mon–Sat evenings",
                              evenings: "Weekday evenings",
                              weekday_mornings: "Weekday mornings",
                            };

                            return labels[value] || value;
                          })
                          .join(", ")
                      : "Availability not provided"}
                  </span>
                </div>

                <div className="browse-swap-fields">
                  <div className="browse-swap-field">
                    <label>YOU OFFER</label>

                    <select
                      value={selectedOfferedSkill}
                      onChange={(e) => setSelectedOfferedSkill(e.target.value)}
                    >
                      <option value="">Select your skill</option>

                      {myOfferedSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </select>

                    <small>What you can teach</small>
                  </div>

                  <div className="browse-swap-arrow">⇄</div>

                  <div className="browse-swap-field">
                    <label>YOU WANT</label>

                    <select
                      value={selectedRequestedSkill}
                      onChange={(e) =>
                        setSelectedRequestedSkill(e.target.value)
                      }
                    >
                      <option value="">Select a skill</option>

                      {swapUser.offerSkillIds.map((skillId, index) => (
                        <option key={skillId} value={skillId}>
                          {swapUser.offers[index]}
                        </option>
                      ))}
                    </select>

                    <small>What you want to learn</small>
                  </div>
                </div>

                <div className="browse-swap-note">
                  <span>✓</span>
                  <span>100% free peer-to-peer skill exchange</span>
                </div>

                {swapError && (
                  <div className="browse-swap-error">{swapError}</div>
                )}

                <div className="browse-swap-message">
                  <div className="browse-swap-message-header">
                    <label>PERSONAL NOTE</label>
                    <span>{swapMessage.length} / 2000</span>
                  </div>

                  <textarea
                    placeholder="Introduce yourself and explain what you'd like to learn..."
                    maxLength={2000}
                    value={swapMessage}
                    onChange={(e) => setSwapMessage(e.target.value)}
                  />
                </div>

                <div className="browse-swap-summary">
                  <span>
                    Summary:{" "}
                    <strong>
                      {myOfferedSkills.find(
                        (skill) => skill.id === selectedOfferedSkill,
                      )?.name || "Your skill"}
                    </strong>
                    {" → "}
                    <strong>
                      {swapUser.offers[
                        swapUser.offerSkillIds.indexOf(selectedRequestedSkill)
                      ] || "Learning skill"}
                    </strong>
                  </span>

                  <span>1-on-1 skill exchange</span>
                </div>

                <div className="browse-modal-actions">
                  <button
                    type="button"
                    className="browse-modal-cancel"
                    onClick={() => setSwapUser(null)}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="browse-modal-send"
                    onClick={handleSendSwapRequest}
                    disabled={
                      !selectedOfferedSkill ||
                      !selectedRequestedSkill ||
                      swapSending
                    }
                  >
                    {swapSending ? "Sending..." : "Send Swap Request"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="browse-search-results">
            {submittedSearch && (
              <div className="browse-section-heading browse-results-heading">
                <div>
                  <span className="browse-section-eyebrow">SEARCH RESULTS</span>
                  <h2>People offering {submittedSearch}</h2>
                  <p>Find someone who can help you learn this skill.</p>
                </div>
              </div>
            )}

            {searchLoading ? (
              <div className="browse-state-card">
                <p>Searching...</p>
              </div>
            ) : submittedSearch && searchResults.length === 0 ? (
              <div className="browse-state-card">
                <p>No users found for "{submittedSearch}".</p>
              </div>
            ) : (
              submittedSearch && (
                <div className="browse-search-result-grid">
                  {searchResults.map((result) => (
                    <article
                      className="browse-search-result-card"
                      key={`${result.user_id}-${result.skills?.id || "unknown"}`}
                    >
                      <div className="browse-card-top">
                        <div className="browse-profile-avatar">
                          {(
                            result.profile?.full_name ||
                            result.profile?.username ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <span className="browse-result-skill-badge">
                          {result.skills?.name || "Skill"}
                        </span>
                      </div>

                      <div className="browse-profile-info">
                        <h3>
                          {result.profile?.full_name ||
                            result.profile?.username ||
                            "Unknown User"}
                        </h3>

                        <span className="browse-username">
                          @{result.profile?.username || "N/A"}
                        </span>

                        <span className="browse-location">
                          📍{" "}
                          {result.profile?.location || "Location not provided"}
                        </span>
                      </div>

                      <div className="browse-availability">
                        <span>●</span>
                        {result.profile?.availability?.length > 0
                          ? result.profile.availability
                              .map((value) => {
                                const labels = {
                                  weekends: "Weekends",
                                  weekday_nights: "Mon–Sat evenings",
                                  evenings: "Weekday evenings",
                                  weekday_mornings: "Weekday mornings",
                                };

                                return labels[value] || value;
                              })
                              .join(", ")
                          : "Availability not provided"}
                      </div>

                      <div className="browse-result-offer">
                        <small>CAN TEACH</small>
                        <p>{result.skills?.name || "Unknown skill"}</p>
                      </div>

                      <button
                        type="button"
                        className="browse-profile-button browse-result-profile-button"
                        onClick={() => navigate(`/profile/${result.user_id}`)}
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        className="browse-swap-button browse-result-swap-button"
                        onClick={() => {
                          const resultUser = {
                            user_id: result.user_id,
                            profile: result.profile,
                            offers: result.skills?.name
                              ? [result.skills.name]
                              : [],
                            offerSkillIds: result.skills?.id
                              ? [result.skills.id]
                              : [],
                          };

                          setSwapUser(resultUser);
                          setSelectedOfferedSkill("");
                          setSelectedRequestedSkill("");
                          setSwapMessage("");
                          setSwapError("");
                        }}
                      >
                        Request Swap
                      </button>
                    </article>
                  ))}
                </div>
              )
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default Browse;
