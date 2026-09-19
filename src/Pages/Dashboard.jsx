import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Dashboard.css";

const getCompletedTime = (swap) => {
  return Math.max(
    new Date(swap.sender_completed_at).getTime(),
    new Date(swap.receiver_completed_at).getTime(),
  );
};

function Dashboard() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const navigate = useNavigate();

  const [pendingRequests, setPendingRequests] = useState([]);
  const [currentSwaps, setCurrentSwaps] = useState([]);
  const [completedSwaps, setCompletedSwaps] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [completingSwapId, setCompletingSwapId] = useState(null);
  const [ratingSwap, setRatingSwap] = useState(null);
  const [ratingValue, setRatingValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAcceptSwap = async (requestId) => {
    console.log("Accept clicked:", requestId);

    const { data, error } = await supabase
      .from("swap_requests")
      .update({ status: "accepted" })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      console.error("Accept swap error:", error);
      return;
    }

    console.log("Swap accepted:", data);

    const { error: activityError } = await supabase
      .from("activity_logs")
      .insert({
        user_id: data.receiver_id,
        action_type: "swap_accepted",
        description: "Swap request accepted",
      });

    if (activityError) {
      console.error("Activity log insert error:", activityError);
    } else {
      console.log("Activity log created successfully");
    }

    setPendingRequests((currentRequests) =>
      currentRequests.filter((request) => request.id !== requestId),
    );
  };

  const handleRejectSwap = async (requestId) => {
    console.log("Reject clicked:", requestId);

    const { data, error } = await supabase
      .from("swap_requests")
      .update({ status: "rejected" })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      console.error("Reject swap error:", error);
      return;
    }

    console.log("Swap rejected:", data);

    const { error: activityError } = await supabase
      .from("activity_logs")
      .insert({
        user_id: data.receiver_id,
        action_type: "swap_rejected",
        description: "Swap request rejected",
      });

    if (activityError) {
      console.error("Activity log insert error:", activityError);
    } else {
      console.log("Activity log created successfully");
    }

    setPendingRequests((currentRequests) =>
      currentRequests.filter((request) => request.id !== requestId),
    );
  };

  const handleCancelSwap = async (requestId) => {
    console.log("Cancel clicked:", requestId);

    const { data, error } = await supabase
      .from("swap_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      console.error("Cancel swap error:", error);
      return;
    }

    console.log("Swap cancelled:", data);

    const { error: activityError } = await supabase
      .from("activity_logs")
      .insert({
        user_id: data.sender_id,
        action_type: "swap_cancelled",
        description: "Swap request cancelled",
      });

    if (activityError) {
      console.error("Activity log insert error:", activityError);
    } else {
      console.log("Activity log created successfully");
    }

    setSentRequests((currentRequests) =>
      currentRequests.filter((request) => request.id !== requestId),
    );
  };

  const handleCompleteSwap = async (swap) => {
    console.log("Complete clicked:", swap.id);

    setCompletingSwapId(swap.id);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      console.error("Session error:", sessionError);
      setCompletingSwapId(null);
      return;
    }

    const currentUserId = sessionData.session.user.id;

    const isSender = swap.sender_id === currentUserId;

    const updateData = isSender
      ? { sender_completed_at: new Date().toISOString() }
      : { receiver_completed_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from("swap_requests")
      .update(updateData)
      .eq("id", swap.id)
      .select()
      .single();

    if (error) {
      console.error("Complete swap error:", error);
      setCompletingSwapId(null);
      return;
    }

    console.log("Swap completion updated:", data);

    if (data.status === "completed") {
      const { error: activityError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: currentUserId,
          action_type: "swap_completed",
          description: "Swap completed successfully",
        });

      if (activityError) {
        console.error("Activity log insert error:", activityError);
      } else {
        console.log("Activity log created successfully");
      }
    }

    setCurrentSwaps((currentSwaps) =>
      currentSwaps.map((currentSwap) =>
        currentSwap.id === swap.id ? { ...currentSwap, ...data } : currentSwap,
      ),
    );

    setCompletingSwapId(null);
  };

  const handleSubmitRating = async () => {
    console.log("Submit rating clicked");

    if (!ratingSwap || !ratingValue) {
      console.log("Rating validation failed");
      return;
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      console.error("Session error:", sessionError);
      return;
    }

    const currentUserId = sessionData.session.user.id;

    const revieweeId =
      ratingSwap.sender_id === currentUserId
        ? ratingSwap.receiver_id
        : ratingSwap.sender_id;

    const { data, error } = await supabase
      .from("ratings")
      .insert({
        swap_request_id: ratingSwap.id,
        reviewer_id: currentUserId,
        reviewee_id: revieweeId,
        rating: Number(ratingValue),
        feedback: feedback.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Submit rating error:", error);

      if (error.code === "23505") {
        alert("You have already rated this user for this swap.");
      }

      return;
    }

    console.log("Rating submitted:", data);

    const { error: activityError } = await supabase
      .from("activity_logs")
      .insert({
        user_id: currentUserId,
        action_type: "rating_submitted",
        description: "Rating submitted",
      });

    if (activityError) {
      console.error("Activity log insert error:", activityError);
    } else {
      console.log("Activity log created successfully");
    }

    setRatingSwap(null);
    setRatingValue("");
    setFeedback("");
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    navigate("/login");
  };

  const handleNotificationClick = async (notification) => {
    if (notification.is_read) {
      return;
    }

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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("id", data.session.user.id)
        .single();

      if (profileError) {
        console.error("Profile check error:", profileError);
        await supabase.auth.signOut();
        navigate("/login");
        return;
      }

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        navigate("/login");
        return;
      }

      const userId = data.session.user.id;

      setCurrentUserId(userId);

      const { data: userProfile, error: userProfileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (userProfileError) {
        console.error("User profile error:", userProfileError);
      } else {
        setCurrentUserProfile(userProfile);
      }

      const { data: pendingRequests, error: requestsError } = await supabase
        .from("swap_requests")
        .select(
          `
  *,
  sender:profiles!swap_requests_sender_id_fkey (
    full_name,
    username
  ),
  offered_skill:skills!swap_requests_offered_skill_id_fkey (
    name
  ),
  requested_skill:skills!swap_requests_requested_skill_id_fkey (
    name
  )
`,
        )
        .eq("receiver_id", userId)
        .eq("status", "pending");

      if (requestsError) {
        console.error("Pending requests error:", requestsError);
        return;
      }

      setPendingRequests(pendingRequests);

      const { data: acceptedSwaps, error: swapsError } = await supabase
        .from("swap_requests")
        .select(
          `
    *,
    sender:profiles!swap_requests_sender_id_fkey (
      full_name,
      username
    ),
    receiver:profiles!swap_requests_receiver_id_fkey (
      full_name,
      username
    ),
    offered_skill:skills!swap_requests_offered_skill_id_fkey (
      name
    ),
    requested_skill:skills!swap_requests_requested_skill_id_fkey (
      name
    )
  `,
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("status", "accepted");

      if (swapsError) {
        console.error("Current swaps error:", swapsError);
        return;
      }

      setCurrentSwaps(acceptedSwaps);

      const { data: completedSwapsData, error: completedSwapsError } =
        await supabase
          .from("swap_requests")
          .select(
            `
      *,
      sender:profiles!swap_requests_sender_id_fkey (
        full_name,
        username
      ),
      receiver:profiles!swap_requests_receiver_id_fkey (
        full_name,
        username
      ),
      offered_skill:skills!swap_requests_offered_skill_id_fkey (
        name
      ),
      requested_skill:skills!swap_requests_requested_skill_id_fkey (
        name
      )
    `,
          )
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq("status", "completed");

      if (completedSwapsError) {
        console.error("Completed swaps error:", completedSwapsError);
        return;
      }

      const sortedCompletedSwaps = [...(completedSwapsData || [])].sort(
        (a, b) => getCompletedTime(b) - getCompletedTime(a),
      );

      setCompletedSwaps(sortedCompletedSwaps);

      console.log("Current User ID:", userId);
      const { data: sentRequests, error: sentRequestsError } = await supabase
        .from("swap_requests")
        .select(
          `
    *,
    receiver:profiles!swap_requests_receiver_id_fkey (
      full_name,
      username
    ),
    offered_skill:skills!swap_requests_offered_skill_id_fkey (
      name
    ),
    requested_skill:skills!swap_requests_requested_skill_id_fkey (
      name
    )
  `,
        )
        .eq("sender_id", userId)
        .eq("status", "pending");
      console.log("Sent Requests Data:", sentRequests);
      console.log("Sent Requests Error:", sentRequestsError);

      if (sentRequestsError) {
        console.error("Sent requests error:", sentRequestsError);
        return;
      }

      setSentRequests(sentRequests);
      console.log("Sent swap requests:", sentRequests);

      console.log("Pending swap requests:", pendingRequests);
      console.log("Current swaps:", acceptedSwaps);

      const { data: announcementData, error: announcementError } =
        await supabase
          .from("notifications")
          .select("id, title, message, created_at, is_read")
          .eq("user_id", data.session.user.id)
          .eq("is_announcement", true)
          .order("created_at", { ascending: false });

      const { data: notificationData, error: notificationError } =
        await supabase
          .from("notifications")
          .select(
            "id, type, title, message, created_at, is_read, is_announcement",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

      if (notificationError) {
        console.error("Notifications error:", notificationError);
      } else {
        setNotifications(notificationData || []);

        const unreadCount = (notificationData || []).filter(
          (notification) => !notification.is_read,
        ).length;

        setUnreadNotificationCount(unreadCount);
      }

      if (announcementError) {
        console.error("Announcements error:", announcementError);
      } else {
        setAnnouncements(announcementData || []);
      }

      setAnnouncementsLoading(false);
    };

    checkSession();

    const notificationChannel = supabase
      .channel(`dashboard-notifications-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        async (payload) => {
          const { data: sessionData } = await supabase.auth.getSession();

          const userId = sessionData?.session?.user?.id;

          if (!userId || payload.new.user_id !== userId) {
            return;
          }

          const newNotification = payload.new;

          setNotifications((currentNotifications) => [
            newNotification,
            ...currentNotifications,
          ]);

          if (!newNotification.is_read) {
            setUnreadNotificationCount((count) => count + 1);
          }
        },
      )
      .subscribe();

    const channel = supabase
      .channel("dashboard-swap-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "swap_requests",
        },
        async (payload) => {
          const updatedSwap = payload.new;

          const { data: sessionData } = await supabase.auth.getSession();

          const userId = sessionData?.session?.user?.id;

          if (!userId) {
            return;
          }

          if (
            updatedSwap.sender_id !== userId &&
            updatedSwap.receiver_id !== userId
          ) {
            return;
          }

          if (updatedSwap.status === "completed") {
            const { data: completedSwap, error } = await supabase
              .from("swap_requests")
              .select(
                `
            *,
            sender:profiles!swap_requests_sender_id_fkey (
              full_name,
              username
            ),
            receiver:profiles!swap_requests_receiver_id_fkey (
              full_name,
              username
            ),
            offered_skill:skills!swap_requests_offered_skill_id_fkey (
              name
            ),
            requested_skill:skills!swap_requests_requested_skill_id_fkey (
              name
            )
          `,
              )
              .eq("id", updatedSwap.id)
              .single();

            if (error) {
              console.error("Completed swap realtime fetch error:", error);
              return;
            }

            setCurrentSwaps((currentSwaps) =>
              currentSwaps.filter((swap) => swap.id !== updatedSwap.id),
            );

            setCompletedSwaps((currentCompletedSwaps) => {
              const updatedCompletedSwaps = [
                ...currentCompletedSwaps.filter(
                  (swap) => swap.id !== completedSwap.id,
                ),
                completedSwap,
              ];

              return updatedCompletedSwaps.sort(
                (a, b) => getCompletedTime(b) - getCompletedTime(a),
              );
            });

            return;
          }

          if (updatedSwap.status === "accepted") {
            const { data: activeSwap, error } = await supabase
              .from("swap_requests")
              .select(
                `
            *,
            sender:profiles!swap_requests_sender_id_fkey (
              full_name,
              username
            ),
            receiver:profiles!swap_requests_receiver_id_fkey (
              full_name,
              username
            ),
            offered_skill:skills!swap_requests_offered_skill_id_fkey (
              name
            ),
            requested_skill:skills!swap_requests_requested_skill_id_fkey (
              name
            )
          `,
              )
              .eq("id", updatedSwap.id)
              .single();

            if (error) {
              console.error("Accepted swap realtime fetch error:", error);
              return;
            }

            setCurrentSwaps((currentSwaps) => {
              const alreadyExists = currentSwaps.some(
                (swap) => swap.id === activeSwap.id,
              );

              if (alreadyExists) {
                return currentSwaps.map((swap) =>
                  swap.id === activeSwap.id ? { ...swap, ...activeSwap } : swap,
                );
              }

              return [activeSwap, ...currentSwaps];
            });
          }

          if (
            updatedSwap.status === "rejected" ||
            updatedSwap.status === "cancelled"
          ) {
            setCurrentSwaps((currentSwaps) =>
              currentSwaps.filter((swap) => swap.id !== updatedSwap.id),
            );

            setCompletedSwaps((currentCompletedSwaps) =>
              currentCompletedSwaps.filter(
                (swap) => swap.id !== updatedSwap.id,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notificationChannel);
    };
  }, []);

  return (
    <div className="dashboard-page">
      <nav className="dashboard-navbar">
        <button
          type="button"
          className="dashboard-mobile-menu"
          aria-label="Open navigation menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>

        <a href="/" className="dashboard-navbar-logo">
          <span className="dashboard-logo-mark">S</span>
          <span>SkillSwap</span>
        </a>

        <div className="dashboard-navbar-links">
          <a href="/dashboard" className="active">
            Dashboard
          </a>

          <a href="/browse">Browse</a>

          <a href="/swap-requests">Swap Requests</a>
        </div>

        {mobileMenuOpen && (
          <div className="dashboard-mobile-dropdown">
            <a href="/dashboard">Dashboard</a>
            <a href="/browse">Browse</a>
            <a href="/swap-requests">Swap Requests</a>
            <a href="/profile">Profile</a>
          </div>
        )}

        <div className="dashboard-navbar-profile">
          <div className="dashboard-notification-wrapper">
            <button
              type="button"
              className="dashboard-notification"
              onClick={() => setNotificationOpen(!notificationOpen)}
              aria-label="Notifications"
            >
              🔔
              {unreadNotificationCount > 0 && (
                <span className="dashboard-notification-badge">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="dashboard-notification-dropdown">
                <div className="dashboard-notification-header">
                  <strong>Notifications</strong>

                  <span>{unreadNotificationCount} unread</span>
                </div>

                {notifications.length === 0 ? (
                  <div className="dashboard-notification-empty">
                    No notifications
                  </div>
                ) : (
                  <div className="dashboard-notification-list">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`dashboard-notification-item ${
                          !notification.is_read ? "unread" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="dashboard-notification-item-icon">
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
                        </div>

                        <div className="dashboard-notification-item-content">
                          <strong>{notification.title}</strong>

                          <p>{notification.message}</p>

                          <small>
                            {new Date(notification.created_at).toLocaleString()}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <a href="/profile" className="dashboard-user">
            <div className="dashboard-user-info">
              <strong>
                {currentUserProfile?.full_name || "SkillSwap User"}
              </strong>
              <span>View Profile</span>
            </div>

            {currentUserProfile?.avatar_url ? (
              <img
                src={currentUserProfile.avatar_url}
                alt={currentUserProfile.full_name || "Profile"}
                className="dashboard-user-avatar dashboard-user-avatar-image"
              />
            ) : (
              <span className="dashboard-user-avatar">
                {currentUserProfile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            )}
          </a>
        </div>
      </nav>
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-welcome-label">SKILLSWAP DASHBOARD</span>
          <h1>Welcome back!</h1>
          <p>Manage your skill swaps, requests and learning connections.</p>
        </div>
      </section>
      <section className="dashboard-announcements">
        {announcementsLoading ? (
          <p className="dashboard-announcement-state">
            Loading announcements...
          </p>
        ) : announcements.length === 0 ? (
          <p className="dashboard-announcement-state">No announcements.</p>
        ) : (
          <>
            <div className="dashboard-section-heading">
              <span>📢</span>
              <h2>Platform Announcements</h2>
            </div>

            <div className="dashboard-announcement-list">
              {announcements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="dashboard-announcement-card"
                >
                  <div className="dashboard-announcement-icon">📢</div>

                  <div className="dashboard-announcement-content">
                    <div className="dashboard-announcement-title-row">
                      <h3>{announcement.title}</h3>
                      <span className="dashboard-announcement-badge">
                        Active Now
                      </span>
                    </div>

                    <p>{announcement.message}</p>

                    <small>
                      Posted{" "}
                      {new Date(announcement.created_at).toLocaleString()}
                      {" • Campus Hub"}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="dashboard-announcement-close"
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      <section id="pending-requests" className="dashboard-swap-section">
        <div className="dashboard-section-heading">
          <span>↔</span>
          <div>
            <h2>Pending Swap Requests</h2>
            <p>People who want to exchange skills with you.</p>
          </div>
        </div>

        {pendingRequests?.length === 0 ? (
          <div className="dashboard-empty-card">
            <span>↔</span>
            <p>No pending swap requests.</p>
          </div>
        ) : (
          <div className="dashboard-request-grid">
            {pendingRequests?.map((request) => (
              <article key={request.id} className="dashboard-request-card">
                <div className="dashboard-request-user">
                  <div className="dashboard-request-avatar">
                    {request.sender?.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div>
                    <strong>{request.sender?.full_name}</strong>
                    <span>@{request.sender?.username}</span>
                  </div>

                  <span className="dashboard-pending-badge">Pending</span>
                </div>

                <div className="dashboard-skill-exchange">
                  <div>
                    <small>Offering</small>
                    <strong>{request.offered_skill?.name}</strong>
                  </div>

                  <span>↔</span>

                  <div>
                    <small>Wants to learn</small>
                    <strong>{request.requested_skill?.name}</strong>
                  </div>
                </div>

                <div className="dashboard-request-message">
                  <small>Message</small>
                  <p>{request.message || "No message"}</p>
                </div>

                <div className="dashboard-request-actions">
                  <button
                    type="button"
                    className="dashboard-accept-button"
                    onClick={() => handleAcceptSwap(request.id)}
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    className="dashboard-reject-button"
                    onClick={() => handleRejectSwap(request.id)}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-swap-section">
        <div className="dashboard-section-heading">
          <span>↗</span>
          <div>
            <h2>Sent Swap Requests</h2>
            <p>Requests you have sent to other skill partners.</p>
          </div>
        </div>

        {sentRequests.length === 0 ? (
          <div className="dashboard-empty-card">
            <span>↗</span>
            <p>No sent swap requests.</p>
          </div>
        ) : (
          <div className="dashboard-request-grid">
            {sentRequests.map((request) => (
              <article key={request.id} className="dashboard-request-card">
                <div className="dashboard-request-user">
                  <div className="dashboard-request-avatar">
                    {request.receiver?.full_name?.charAt(0)?.toUpperCase() ||
                      "U"}
                  </div>

                  <div>
                    <strong>{request.receiver?.full_name}</strong>
                    <span>@{request.receiver?.username}</span>
                  </div>

                  <span className="dashboard-pending-badge">
                    {request.status}
                  </span>
                </div>

                <div className="dashboard-skill-exchange">
                  <div>
                    <small>Offering</small>
                    <strong>{request.offered_skill?.name}</strong>
                  </div>

                  <span>↔</span>

                  <div>
                    <small>Wants to learn</small>
                    <strong>{request.requested_skill?.name}</strong>
                  </div>
                </div>

                <div className="dashboard-request-message">
                  <small>Message</small>
                  <p>{request.message || "No message"}</p>
                </div>

                <div className="dashboard-request-actions">
                  <button
                    type="button"
                    className="dashboard-cancel-button"
                    onClick={() => handleCancelSwap(request.id)}
                  >
                    Cancel Request
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-swap-section">
        <div className="dashboard-section-heading dashboard-current-swaps-heading">
          <span>↔</span>

          <div>
            <h2>Current Swaps</h2>
            <p>Manage your accepted and completed skill exchanges.</p>
          </div>

          {currentSwaps.length > 2 && (
            <button
              type="button"
              className="dashboard-view-all-button"
              onClick={() => navigate("/swap-requests")}
            >
              View All Swaps
            </button>
          )}
        </div>

        {currentSwaps.length === 0 ? (
          <div className="dashboard-empty-card">
            <span>↔</span>
            <p>No current swaps.</p>
          </div>
        ) : (
          <div className="dashboard-current-swaps">
            {currentSwaps.slice(0, 4).map((swap) => (
              <article key={swap.id} className="dashboard-current-swap-card">
                <div className="dashboard-current-swap-top">
                  <div className="dashboard-request-user">
                    <div className="dashboard-request-avatar">
                      {(swap.sender_id === currentUserId
                        ? swap.receiver?.full_name
                        : swap.sender?.full_name
                      )
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>

                    <div>
                      <strong>
                        {swap.sender_id === currentUserId
                          ? swap.receiver?.full_name
                          : swap.sender?.full_name}
                      </strong>

                      <span>
                        @
                        {swap.sender_id === currentUserId
                          ? swap.receiver?.username
                          : swap.sender?.username}
                      </span>
                    </div>
                  </div>

                  <span className="dashboard-pending-badge">
                    {swap.status === "completed"
                      ? "Completed"
                      : (swap.sender_id === currentUserId &&
                            swap.sender_completed_at) ||
                          (swap.receiver_id === currentUserId &&
                            swap.receiver_completed_at)
                        ? "Completed"
                        : "Active"}
                  </span>
                </div>

                <div className="dashboard-skill-exchange">
                  <div>
                    <small>Offering</small>
                    <strong>{swap.offered_skill?.name}</strong>

                    {swap.sender_completed_at && (
                      <span className="dashboard-skill-completed">
                        ✓ Completed
                      </span>
                    )}
                  </div>

                  <span>↔</span>

                  <div>
                    <small>Wants to learn</small>
                    <strong>{swap.requested_skill?.name}</strong>

                    {swap.receiver_completed_at && (
                      <span className="dashboard-skill-completed">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </div>

                <div className="dashboard-current-swap-status">
                  <small>Status</small>
                  <strong>{swap.status}</strong>
                </div>

                {swap.status === "accepted" && (
                  <div className="dashboard-current-swap-actions">
                    <button
                      type="button"
                      className="dashboard-accept-button"
                      onClick={() => handleCompleteSwap(swap)}
                      disabled={
                        completingSwapId === swap.id ||
                        (swap.sender_id === currentUserId &&
                          swap.sender_completed_at) ||
                        (swap.receiver_id === currentUserId &&
                          swap.receiver_completed_at)
                      }
                    >
                      {completingSwapId === swap.id
                        ? "Completing..."
                        : (swap.sender_id === currentUserId &&
                              swap.sender_completed_at) ||
                            (swap.receiver_id === currentUserId &&
                              swap.receiver_completed_at)
                          ? "Completed ✓"
                          : "Complete Swap"}
                    </button>
                  </div>
                )}
                {swap.status === "completed" && (
                  <>
                    <div className="dashboard-completed-label">Completed ✓</div>

                    <div className="dashboard-current-swap-actions">
                      <button
                        type="button"
                        className="dashboard-accept-button"
                        onClick={() => setRatingSwap(swap)}
                      >
                        Rate User
                      </button>
                    </div>
                  </>
                )}

                {ratingSwap?.id === swap.id && (
                  <div className="dashboard-rating-form">
                    <h3>Rate User</h3>

                    <p>
                      Rate:{" "}
                      {ratingSwap.sender_id === currentUserId
                        ? ratingSwap.receiver?.full_name
                        : ratingSwap.sender?.full_name}
                    </p>

                    <select
                      value={ratingValue}
                      onChange={(e) => setRatingValue(e.target.value)}
                    >
                      <option value="" disabled>
                        Select rating
                      </option>

                      <option value="1">1 ⭐</option>
                      <option value="2">2 ⭐⭐</option>
                      <option value="3">3 ⭐⭐⭐</option>
                      <option value="4">4 ⭐⭐⭐⭐</option>
                      <option value="5">5 ⭐⭐⭐⭐⭐</option>
                    </select>

                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Write your feedback..."
                    />

                    <button
                      type="button"
                      className="dashboard-accept-button"
                      onClick={handleSubmitRating}
                    >
                      Submit Rating
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-swap-section">
        <div className="dashboard-section-heading dashboard-current-swaps-heading">
          <span>✓</span>

          <div>
            <h2>Completed Swaps</h2>
            <p>Your completed skill exchanges and ratings.</p>
          </div>

          {completedSwaps.length > 4 && (
            <button
              type="button"
              className="dashboard-view-all-button"
              onClick={() => navigate("/swap-requests")}
            >
              View All Swaps
            </button>
          )}
        </div>

        {completedSwaps.length === 0 ? (
          <div className="dashboard-empty-card">
            <span>✓</span>
            <p>No completed swaps yet.</p>
          </div>
        ) : (
          <div className="dashboard-current-swaps">
            {completedSwaps.slice(0, 4).map((swap) => (
              <article key={swap.id} className="dashboard-current-swap-card">
                <div className="dashboard-current-swap-top">
                  <div className="dashboard-request-user">
                    <div className="dashboard-request-avatar">
                      {(swap.sender_id === currentUserId
                        ? swap.receiver?.full_name
                        : swap.sender?.full_name
                      )
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>

                    <div>
                      <strong>
                        {swap.sender_id === currentUserId
                          ? swap.receiver?.full_name
                          : swap.sender?.full_name}
                      </strong>

                      <span>
                        @
                        {swap.sender_id === currentUserId
                          ? swap.receiver?.username
                          : swap.sender?.username}
                      </span>
                    </div>
                  </div>

                  <span className="dashboard-pending-badge">Completed</span>
                </div>

                <div className="dashboard-skill-exchange">
                  <div>
                    <small>Offering</small>
                    <strong>{swap.offered_skill?.name}</strong>

                    <span className="dashboard-skill-completed">
                      ✓ Completed
                    </span>
                  </div>

                  <span>↔</span>

                  <div>
                    <small>Wants to learn</small>
                    <strong>{swap.requested_skill?.name}</strong>

                    <span className="dashboard-skill-completed">
                      ✓ Completed
                    </span>
                  </div>
                </div>

                <div className="dashboard-current-swap-status">
                  <small>Status</small>
                  <strong>Completed</strong>
                </div>

                <div className="dashboard-completed-label">Completed ✓</div>

                <div className="dashboard-current-swap-actions">
                  <button
                    type="button"
                    className="dashboard-accept-button"
                    onClick={() => setRatingSwap(swap)}
                  >
                    Rate User
                  </button>
                </div>

                {ratingSwap?.id === swap.id && (
                  <div className="dashboard-rating-form">
                    <h3>Rate User</h3>

                    <p>
                      Rate:{" "}
                      {ratingSwap.sender_id === currentUserId
                        ? ratingSwap.receiver?.full_name
                        : ratingSwap.sender?.full_name}
                    </p>

                    <select
                      value={ratingValue}
                      onChange={(e) => setRatingValue(e.target.value)}
                    >
                      <option value="" disabled>
                        Select rating
                      </option>

                      <option value="1">1 ⭐</option>
                      <option value="2">2 ⭐⭐</option>
                      <option value="3">3 ⭐⭐⭐</option>
                      <option value="4">4 ⭐⭐⭐⭐</option>
                      <option value="5">5 ⭐⭐⭐⭐⭐</option>
                    </select>

                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Write your feedback..."
                    />

                    <button
                      type="button"
                      className="dashboard-accept-button"
                      onClick={handleSubmitRating}
                    >
                      Submit Rating
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;
