import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./AdminDashboard.css";

const downloadCSV = (filename, rows) => {
  if (!rows || rows.length === 0) {
    alert("No data available for this report.");
    return;
  }

  const headers = Object.keys(rows[0]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    publicProfiles: 0,
    activeSwaps: 0,
    completedSwaps: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateRange, setDateRange] = useState("30");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [roleUpdating, setRoleUpdating] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [banUpdating, setBanUpdating] = useState(null);
  const [swaps, setSwaps] = useState([]);
  const [swapsLoading, setSwapsLoading] = useState(true);
  const [pendingSkills, setPendingSkills] = useState([]);
  const [pendingSkillsLoading, setPendingSkillsLoading] = useState(true);
  const [swapUpdating, setSwapUpdating] = useState(null);
  const [swapFilter, setSwapFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementMessageStatus, setAnnouncementMessageStatus] =
    useState("");
  const [reportRatings, setReportRatings] = useState([]);
  const [reportActivityLogs, setReportActivityLogs] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const usersPerPage = 5;

  const fetchStats = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    setCurrentUserId(userId);

    const { count: usersCount, error: usersError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: publicProfilesCount, error: publicProfilesError } =
      await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_public", true);

    const { count: activeSwapsCount, error: activeSwapsError } = await supabase
      .from("swap_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted");

    const { count: completedSwapsCount, error: completedSwapsError } =
      await supabase
        .from("swap_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

    if (
      usersError ||
      publicProfilesError ||
      activeSwapsError ||
      completedSwapsError
    ) {
      console.error("Admin stats error:", {
        usersError,
        publicProfilesError,
        activeSwapsError,
        completedSwapsError,
      });
      setLoading(false);
      return;
    }

    setStats({
      users: usersCount || 0,
      publicProfiles: publicProfilesCount || 0,
      activeSwaps: activeSwapsCount || 0,
      completedSwaps: completedSwapsCount || 0,
    });

    setLoading(false);
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);

    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, location, is_public, role, is_banned")
        .order("created_at", { ascending: false });

      if (profileError) {
        console.error("Users fetch error:", profileError);
        setUsersLoading(false);
        return;
      }

      const { data: emailData, error: emailError } =
        await supabase.rpc("get_admin_users");

      if (emailError) {
        console.error("Admin emails fetch error:", emailError);
        setUsersLoading(false);
        return;
      }

      const usersWithEmails = (profileData || []).map((profile) => ({
        ...profile,
        email:
          (emailData || []).find((item) => item.id === profile.id)?.email ||
          "N/A",
      }));

      setUsers(usersWithEmails);
      setUsersLoading(false);
    };

    fetchUsers();
  }, [refreshKey]);

  useEffect(() => {
    const fetchPendingSkills = async () => {
      const { data, error } = await supabase
        .from("user_skills")
        .select(
          `
        id,
        user_id,
        skill_id,
        skill_type,
        description,
        moderation_status,
        profiles (
          full_name,
          username
        ),
        skills (
          name
        )
      `,
        )
        .eq("moderation_status", "pending")
        .order("id", { ascending: false });

      if (error) {
        console.error("Pending skills fetch error:", error);
        setPendingSkillsLoading(false);
        return;
      }

      setPendingSkills(data || []);
      setPendingSkillsLoading(false);
    };

    fetchPendingSkills();
  }, [refreshKey]);

  useEffect(() => {
    const fetchSwaps = async () => {
      let query = supabase
        .from("swap_requests")
        .select(
          `
    id,
    sender_id,
    receiver_id,
    offered_skill_id,
    requested_skill_id,
    message,
    status,
    created_at,
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
        .order("created_at", { ascending: false });

      if (dateRange !== "all") {
        const days = Number(dateRange);
        const startDate = new Date();

        startDate.setDate(startDate.getDate() - days);

        query = query.gte("created_at", startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Swaps fetch error:", error);
        setSwapsLoading(false);
        return;
      }

      const swapData = data || [];

      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("swap_request_id, rating")
        .in(
          "swap_request_id",
          swapData.map((swap) => swap.id),
        );

      if (ratingsError) {
        console.error("Swap ratings fetch error:", ratingsError);
      }

      const swapsWithRatings = swapData.map((swap) => ({
        ...swap,
        rating:
          ratingsData?.find((rating) => rating.swap_request_id === swap.id)
            ?.rating || null,
      }));

      setSwaps(swapsWithRatings);
      setSwapsLoading(false);
    };

    fetchSwaps();
  }, [refreshKey, dateRange]);

  useEffect(() => {
    const fetchReportData = async () => {
      const getDateFilter = () => {
        if (dateRange === "all") {
          return null;
        }

        const days = Number(dateRange);
        const startDate = new Date();

        startDate.setDate(startDate.getDate() - days);

        return startDate.toISOString();
      };

      const startDate = getDateFilter();

      setReportsLoading(true);

      let ratingsQuery = supabase
        .from("ratings")
        .select(
          `
    id,
    swap_request_id,
    reviewer_id,
    reviewee_id,
    rating,
    feedback,
    created_at
  `,
        )
        .order("created_at", { ascending: false });

      if (startDate) {
        ratingsQuery = ratingsQuery.gte("created_at", startDate);
      }

      const { data: ratingsData, error: ratingsError } = await ratingsQuery;

      if (ratingsError) {
        console.error("Report ratings fetch error:", ratingsError);
      } else {
        setReportRatings(ratingsData || []);
      }

      let activityQuery = supabase
        .from("activity_logs")
        .select(
          `
    id,
    user_id,
    action_type,
    description,
    created_at
  `,
        )
        .order("created_at", { ascending: false });

      if (startDate) {
        activityQuery = activityQuery.gte("created_at", startDate);
      }

      const { data: activityData, error: activityError } = await activityQuery;

      if (activityError) {
        console.error("Report activity fetch error:", activityError);
      } else {
        setReportActivityLogs(activityData || []);
      }

      setReportsLoading(false);
    };

    fetchReportData();
  }, [refreshKey, dateRange]);

  const handleRoleChange = async (userId, newRole) => {
    setRoleUpdating(userId);

    const { data, error } = await supabase.rpc("set_user_role", {
      target_user_id: userId,
      new_role: newRole,
    });

    if (error) {
      console.error("Role update error:", error);
      setRoleUpdating(null);
      return;
    }

    if (!data) {
      console.error("Role update failed");
      setRoleUpdating(null);
      return;
    }

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user,
      ),
    );

    setRoleUpdating(null);
  };

  const handleBanChange = async (userId, newBanStatus) => {
    setBanUpdating(userId);

    const { data, error } = await supabase.rpc("set_user_ban", {
      target_user_id: userId,
      ban_status: newBanStatus,
    });

    if (error) {
      console.error("Ban update error:", error);
      setBanUpdating(null);
      return;
    }

    if (!data) {
      console.error("Ban update failed");
      setBanUpdating(null);
      return;
    }

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId ? { ...user, is_banned: newBanStatus } : user,
      ),
    );

    setBanUpdating(null);
  };

  const handleSkillModeration = async (skillId, newStatus) => {
    const { error } = await supabase
      .from("user_skills")
      .update({ moderation_status: newStatus })
      .eq("id", skillId);

    if (error) {
      console.error("Skill moderation error:", error);
      return;
    }

    setPendingSkills((prevSkills) =>
      prevSkills.filter((skill) => skill.id !== skillId),
    );
  };

  const handleRejectSwap = async (swapId) => {
    setSwapUpdating(swapId);

    const { data, error } = await supabase
      .from("swap_requests")
      .update({ status: "rejected" })
      .eq("id", swapId)
      .eq("status", "pending")
      .select()
      .single();

    if (error) {
      console.error("Swap moderation error:", error);
      setSwapUpdating(null);
      return;
    }

    if (!data) {
      console.error("Swap moderation failed");
      setSwapUpdating(null);
      return;
    }

    setSwaps((prevSwaps) =>
      prevSwaps.map((swap) =>
        swap.id === swapId ? { ...swap, status: "rejected" } : swap,
      ),
    );

    setSwapUpdating(null);
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();

    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      setAnnouncementMessageStatus("Title and message are required.");
      return;
    }

    setAnnouncementLoading(true);
    setAnnouncementMessageStatus("");

    const { data, error } = await supabase.rpc("create_admin_announcement", {
      announcement_title: announcementTitle.trim(),
      announcement_message: announcementMessage.trim(),
    });

    if (error) {
      console.error("Announcement error:", error);
      setAnnouncementMessageStatus(error.message);
      setAnnouncementLoading(false);
      return;
    }

    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setAnnouncementMessageStatus(
      `Announcement sent to ${data} users successfully.`,
    );

    setAnnouncementLoading(false);
  };

  const handleDownloadUsersReport = () => {
    const rows = users.map((user) => ({
      name: user.full_name || "",
      username: user.username || "",
      email: user.email || "",
      location: user.location || "",
      profile: user.is_public ? "Public" : "Private",
      role: user.role || "",
      status: user.is_banned ? "Banned" : "Active",
    }));

    downloadCSV("users_report.csv", rows);
  };

  const handleDownloadSwapsReport = () => {
    const rows = swaps.map((swap) => ({
      sender: swap.sender?.full_name || "",
      sender_username: swap.sender?.username || "",
      receiver: swap.receiver?.full_name || "",
      receiver_username: swap.receiver?.username || "",
      offered_skill: swap.offered_skill?.name || "",
      requested_skill: swap.requested_skill?.name || "",
      message: swap.message || "",
      status: swap.status || "",
      created_at: swap.created_at
        ? new Date(swap.created_at).toLocaleString()
        : "",
    }));

    downloadCSV("swaps_report.csv", rows);
  };

  const handleDownloadRatingsReport = () => {
    const rows = reportRatings.map((rating) => {
      const reviewer = users.find((user) => user.id === rating.reviewer_id);

      const reviewee = users.find((user) => user.id === rating.reviewee_id);

      return {
        reviewer: reviewer?.full_name || "Unknown User",
        reviewee: reviewee?.full_name || "Unknown User",
        rating: rating.rating,
        feedback: rating.feedback || "",
        created_at: rating.created_at
          ? new Date(rating.created_at).toLocaleString()
          : "",
      };
    });

    downloadCSV("ratings_feedback_report.csv", rows);
  };

  const handleDownloadActivityReport = () => {
    const rows = reportActivityLogs.map((log) => {
      const user = users.find((item) => item.id === log.user_id);

      return {
        user: user?.full_name || "Unknown User",
        action_type: log.action_type || "",
        description: log.description || "",
        created_at: log.created_at
          ? new Date(log.created_at).toLocaleString()
          : "",
      };
    });

    downloadCSV("activity_log_report.csv", rows);
  };

  const reportSummary = {
    totalUsers: users.length,
    activeUsers: users.filter((user) => !user.is_banned).length,
    bannedUsers: users.filter((user) => user.is_banned).length,
    adminUsers: users.filter((user) => user.role === "admin").length,

    pendingSwaps: swaps.filter((swap) => swap.status === "pending").length,
    acceptedSwaps: swaps.filter((swap) => swap.status === "accepted").length,
    completedSwaps: swaps.filter((swap) => swap.status === "completed").length,
    rejectedSwaps: swaps.filter((swap) => swap.status === "rejected").length,
    cancelledSwaps: swaps.filter((swap) => swap.status === "cancelled").length,

    totalRatings: reportRatings.length,

    averageRating:
      reportRatings.length > 0
        ? (
            reportRatings.reduce(
              (total, item) => total + Number(item.rating),
              0,
            ) / reportRatings.length
          ).toFixed(2)
        : "0.00",

    pendingSkillModerations: pendingSkills.length,
    totalActivityLogs: reportActivityLogs.length,
  };

  const filteredSwaps = swaps.filter((swap) => {
    if (swapFilter === "all") return true;
    return swap.status === swapFilter;
  });

  const currentAdmin = users.find((user) => user.id === currentUserId);

  const filteredUsers = users.filter((user) => {
    const search = userSearch.toLowerCase().trim();

    const matchesSearch =
      !search ||
      user.full_name?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.location?.toLowerCase().includes(search);

    const matchesRole = !roleFilter || user.role === roleFilter;

    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" && !user.is_banned) ||
      (statusFilter === "banned" && user.is_banned);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage);

  const userStartIndex = (currentUserPage - 1) * usersPerPage;

  const paginatedUsers = filteredUsers.slice(
    userStartIndex,
    userStartIndex + usersPerPage,
  );

  useEffect(() => {
    setCurrentUserPage(1);
  }, [userSearch, roleFilter, statusFilter]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    window.location.href = "/login";
  };

  return (
    <div className="admin-page">
      {/* ================= NAVBAR ================= */}
      <header className="admin-navbar">
        <div className="admin-brand">
          <div className="admin-brand-icon">S</div>

          <span className="admin-brand-name">SkillSwap</span>

          <span className="admin-brand-badge">
            ADMIN
            <br />
            DASHBOARD
          </span>
        </div>

        <nav className="admin-nav">
          <button
            type="button"
            className="admin-nav-item active"
            onClick={() =>
              document.getElementById("admin-overview")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            Overview
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              document.getElementById("admin-users")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            Users
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              document
                .getElementById("admin-skill-moderation")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
          >
            Skill
            <br />
            Moderation
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              document.getElementById("admin-swap-monitoring")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            Swap
            <br />
            Monitoring
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              document.getElementById("admin-announcements")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            Announcements
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              document.getElementById("admin-reports")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          >
            Reports
          </button>
        </nav>

        <div className="admin-navbar-right">
          <div className="admin-user-info">
            <strong>{currentAdmin?.full_name || "Admin User"}</strong>

            <span>{currentAdmin?.email || "admin@skillswap.io"}</span>
          </div>

          <div className="admin-avatar">
            {(currentAdmin?.full_name || "A").charAt(0).toUpperCase()}
          </div>

          <button
            className="admin-logout-icon"
            type="button"
            onClick={handleLogout}
            title="Logout"
          >
            ↪
          </button>
        </div>
      </header>

      {/* ================= PAGE HEADER ================= */}
      <main className="admin-content">
        <div className="admin-page-heading">
          <div>
            <div className="admin-eyebrow">
              PLATFORM ADMINISTRATION
              <span>•</span>
              Cluster eu-west-1
            </div>

            <h1>Admin Dashboard</h1>

            <p>
              Manage users, skills, swaps, and real-time platform activity
              across the SkillSwap network.
            </p>
          </div>

          <div className="admin-heading-actions">
            <span className="admin-operational">
              <span className="admin-status-dot"></span>
              Platform Operational
            </span>

            <select
              className="admin-filter-button"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="1">Last 1 Day</option>
              <option value="2">Last 2 Days</option>
              <option value="3">Last 3 Days</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>

            <button
              className="admin-refresh-button"
              type="button"
              onClick={handleRefreshData}
              disabled={refreshing}
            >
              ↻ {refreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {/* ================= STATS ================= */}
        {loading ? (
          <div className="admin-loading-card">Loading stats...</div>
        ) : (
          <div id="admin-overview" className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-top">
                <div>
                  <span className="admin-stat-label">TOTAL USERS</span>

                  <strong className="admin-stat-number">
                    {stats.users.toLocaleString()}
                  </strong>
                </div>

                <div className="admin-stat-icon users-icon">♧</div>
              </div>

              <div className="admin-stat-bottom">
                <span className="admin-stat-growth">↗ +12.4%</span>
                <span>this month</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-top">
                <div>
                  <span className="admin-stat-label">PUBLIC PROFILES</span>

                  <strong className="admin-stat-number">
                    {stats.publicProfiles.toLocaleString()}
                  </strong>
                </div>

                <div className="admin-stat-icon profile-icon">♢</div>
              </div>

              <div className="admin-stat-bottom">
                <strong>75.6%</strong>
                <span>profile completion rate</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-top">
                <div>
                  <span className="admin-stat-label">ACTIVE SWAPS</span>

                  <strong className="admin-stat-number">
                    {stats.activeSwaps.toLocaleString()}
                  </strong>
                </div>

                <div className="admin-stat-icon swap-icon">⇄</div>
              </div>

              <div className="admin-stat-bottom">
                <span className="admin-purple-dot"></span>
                <span>Active peer trades in-flight</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-top">
                <div>
                  <span className="admin-stat-label">COMPLETED SWAPS</span>

                  <strong className="admin-stat-number">
                    {stats.completedSwaps.toLocaleString()}
                  </strong>
                </div>

                <div className="admin-stat-icon completed-icon">✓</div>
              </div>

              <div className="admin-stat-bottom">
                <span className="admin-stat-growth">98.4%</span>
                <span>satisfaction rating</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= USER MANAGEMENT ================= */}
        <section id="admin-users" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <div className="admin-section-title-row">
                <h2>User Management</h2>

                <span className="admin-count-badge">
                  {users.length.toLocaleString()} Total
                </span>
              </div>

              <p>
                Audit accounts, manage administrative privileges, and enforce
                community moderation policies.
              </p>
            </div>

            <div className="admin-user-filters">
              <div className="admin-search-box">
                <span>⌕</span>

                <input
                  type="text"
                  placeholder="Search by name, @handle, or email"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <select
                className="admin-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">Member</option>
              </select>

              <select
                className="admin-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>
          </div>

          {usersLoading ? (
            <div className="admin-table-state">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-table-state">No users found.</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>USER / IDENTITY</th>
                    <th>CONTACT</th>
                    <th>LOCATION</th>
                    <th>PROFILE</th>
                    <th>ROLE</th>
                    <th>STATUS</th>
                    <th>ADMINISTRATIVE ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-table-avatar">
                            {(user.full_name || "U").charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <div className="admin-user-name">
                              {user.full_name || "Unnamed User"}

                              {user.id === currentUserId && (
                                <span className="admin-you-badge">YOU</span>
                              )}
                            </div>

                            <span className="admin-user-handle">
                              @{user.username || "N/A"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="admin-contact">
                          {user.email || "N/A"}
                        </span>
                      </td>

                      <td>
                        <span className="admin-location">
                          {user.location || "Not provided"}
                        </span>
                      </td>

                      <td>
                        <span className="admin-status-pill public">
                          {user.is_public ? "◉ Public" : "▣ Private"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`admin-role-pill ${
                            user.role === "admin" ? "admin-role" : "member-role"
                          }`}
                        >
                          {user.role === "admin" ? "Admin" : "Member"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`admin-status-pill ${
                            user.is_banned ? "banned" : "active"
                          }`}
                        >
                          <span className="status-pill-dot"></span>
                          {user.is_banned ? "Banned" : "Active"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          {user.id === currentUserId ? (
                            <span className="admin-current-session">
                              🔒 Current Session (Protected)
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="admin-action-button admin-button-primary"
                                disabled={roleUpdating === user.id}
                                onClick={() =>
                                  handleRoleChange(
                                    user.id,
                                    user.role === "admin" ? "user" : "admin",
                                  )
                                }
                              >
                                {roleUpdating === user.id
                                  ? "Updating..."
                                  : user.role === "admin"
                                    ? "Remove Admin"
                                    : "Make Admin"}
                              </button>

                              <button
                                type="button"
                                className={`admin-action-button ${
                                  user.is_banned
                                    ? "admin-button-unban"
                                    : "admin-button-danger"
                                }`}
                                disabled={banUpdating === user.id}
                                onClick={() =>
                                  handleBanChange(user.id, !user.is_banned)
                                }
                              >
                                {banUpdating === user.id
                                  ? "Updating..."
                                  : user.is_banned
                                    ? "Unban User"
                                    : "Ban User"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-table-footer">
            <span>
              Showing {filteredUsers.length === 0 ? 0 : userStartIndex + 1} -{" "}
              {Math.min(userStartIndex + usersPerPage, filteredUsers.length)} of{" "}
              {filteredUsers.length.toLocaleString()} registered users
            </span>

            <div className="admin-pagination">
              <button
                type="button"
                disabled={currentUserPage === 1}
                onClick={() => setCurrentUserPage((prev) => prev - 1)}
              >
                Previous
              </button>

              {Array.from(
                { length: totalUserPages },
                (_, index) => index + 1,
              ).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={currentUserPage === page ? "active" : ""}
                  onClick={() => setCurrentUserPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={
                  currentUserPage === totalUserPages || totalUserPages === 0
                }
                onClick={() => setCurrentUserPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
        {/* ================= SKILL MODERATION ================= */}
        <section
          id="admin-skill-moderation"
          className="admin-section moderation-section"
        >
          <div className="moderation-header">
            <div>
              <div className="moderation-title-row">
                <h2>Skill Moderation Queue</h2>

                <span className="pending-review-badge">
                  {pendingSkills.length} Pending Review
                </span>
              </div>

              <p>
                Vet proposed skills against university guidelines, commercial
                policy, and platform integrity.
              </p>
            </div>
            <button
              type="button"
              className="preview-queue-button"
              onClick={() => {
                setPendingSkillsLoading(true);
                setRefreshKey((prev) => prev + 1);
              }}
            >
              ◉ Preview Clean Queue
            </button>
          </div>

          {pendingSkillsLoading ? (
            <div className="admin-table-state">Loading pending skills...</div>
          ) : pendingSkills.length === 0 ? (
            <div className="admin-table-state">No pending skills.</div>
          ) : (
            <div className="skill-moderation-grid">
              {pendingSkills.map((skill) => (
                <article className="skill-review-card" key={skill.id}>
                  <div className="skill-card-top">
                    <span
                      className={`skill-type-badge ${
                        skill.skill_type === "offer"
                          ? "offer-badge"
                          : "want-badge"
                      }`}
                    >
                      {skill.skill_type === "offer"
                        ? "I can teach"
                        : "I want to learn"}
                    </span>

                    <span className="skill-pending-badge">
                      <span></span>
                      Pending
                    </span>
                  </div>

                  <h3>{skill.skills?.name || "Unknown Skill"}</h3>

                  <p className="skill-description">
                    {skill.description || "No description"}
                  </p>

                  <div className="skill-card-divider"></div>

                  <div className="skill-user">
                    <div className="skill-user-avatar">
                      {(skill.profiles?.full_name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {skill.profiles?.full_name || "Unknown User"}
                      </strong>

                      <span>@{skill.profiles?.username || "N/A"}</span>
                    </div>
                  </div>

                  <div className="skill-card-actions">
                    <button
                      type="button"
                      className="skill-approve-button"
                      onClick={() =>
                        handleSkillModeration(skill.id, "approved")
                      }
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      className="skill-reject-button"
                      onClick={() =>
                        handleSkillModeration(skill.id, "rejected")
                      }
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ================= SWAP MONITORING ================= */}
        <section
          id="admin-swap-monitoring"
          className="admin-section swap-monitoring-section"
        >
          <div className="swap-monitoring-header">
            <div>
              <h2>Swap Monitoring</h2>

              <p>
                Real-time audit log of active, completed, and flagged
                peer-to-peer skill exchanges.
              </p>
            </div>

            <div className="swap-filter-tabs">
              <button
                type="button"
                className={
                  swapFilter === "all"
                    ? "swap-filter-tab active"
                    : "swap-filter-tab"
                }
                onClick={() => setSwapFilter("all")}
              >
                All Swaps
              </button>

              <button
                type="button"
                className={
                  swapFilter === "pending"
                    ? "swap-filter-tab active"
                    : "swap-filter-tab"
                }
                onClick={() => setSwapFilter("pending")}
              >
                Pending (
                {swaps.filter((swap) => swap.status === "pending").length})
              </button>

              <button
                type="button"
                className={
                  swapFilter === "accepted"
                    ? "swap-filter-tab active"
                    : "swap-filter-tab"
                }
                onClick={() => setSwapFilter("accepted")}
              >
                Accepted (
                {swaps.filter((swap) => swap.status === "accepted").length})
              </button>

              <button
                type="button"
                className={
                  swapFilter === "completed"
                    ? "swap-filter-tab active"
                    : "swap-filter-tab"
                }
                onClick={() => setSwapFilter("completed")}
              >
                Completed (
                {swaps.filter((swap) => swap.status === "completed").length})
              </button>

              <button
                type="button"
                className={
                  swapFilter === "rejected"
                    ? "swap-filter-tab active"
                    : "swap-filter-tab"
                }
                onClick={() => setSwapFilter("rejected")}
              >
                Rejected (
                {swaps.filter((swap) => swap.status === "rejected").length})
              </button>

              <button
                type="button"
                className={
                  swapFilter === "cancelled"
                    ? "swap-filter-tab active"
                    : "swap-filter-tab"
                }
                onClick={() => setSwapFilter("cancelled")}
              >
                Cancelled (
                {swaps.filter((swap) => swap.status === "cancelled").length})
              </button>
            </div>
          </div>

          {swapsLoading ? (
            <div className="admin-table-state">Loading swaps...</div>
          ) : filteredSwaps.length === 0 ? (
            <div className="admin-table-state">No swap requests found.</div>
          ) : (
            <div className="swap-table-wrapper">
              <table className="swap-monitoring-table">
                <thead>
                  <tr>
                    <th>PARTIES (SENDER → RECEIVER)</th>
                    <th>SKILL EXCHANGE</th>
                    <th>INTRODUCTION NOTE</th>
                    <th>TIMELINE</th>
                    <th>STATUS</th>
                    <th>INTERVENTION</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSwaps.map((swap) => (
                    <tr key={swap.id}>
                      {/* PARTIES */}
                      <td>
                        <div className="swap-parties">
                          <div>
                            <strong>
                              {swap.sender?.full_name || "Unknown User"}
                            </strong>

                            <span>@{swap.sender?.username || "N/A"}</span>
                          </div>

                          <span className="swap-arrow">→</span>

                          <div>
                            <strong>
                              {swap.receiver?.full_name || "Unknown User"}
                            </strong>

                            <span>@{swap.receiver?.username || "N/A"}</span>
                          </div>
                        </div>
                      </td>

                      {/* SKILLS */}
                      <td>
                        <div className="swap-skills">
                          <div>
                            <span className="swap-skill-label offer">
                              Offers
                            </span>

                            <span>{swap.offered_skill?.name || "N/A"}</span>
                          </div>

                          <div>
                            <span className="swap-skill-label want">Wants</span>

                            <span>{swap.requested_skill?.name || "N/A"}</span>
                          </div>
                        </div>
                      </td>

                      {/* MESSAGE */}
                      <td>
                        <span
                          className={`swap-message ${
                            swap.status === "rejected" ? "rejected-message" : ""
                          }`}
                          title={swap.message || "No message"}
                        >
                          “
                          {swap.message
                            ? swap.message.length > 35
                              ? `${swap.message.slice(0, 35)}...`
                              : swap.message
                            : "No message"}
                          ”
                        </span>
                      </td>

                      {/* TIMELINE */}
                      <td>
                        <span className="swap-timeline">
                          {new Date(swap.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td>
                        <span className={`swap-status-badge ${swap.status}`}>
                          <span></span>

                          {swap.status.charAt(0).toUpperCase() +
                            swap.status.slice(1)}
                        </span>
                      </td>

                      {/* INTERVENTION */}
                      <td>
                        {swap.status === "pending" ? (
                          <button
                            type="button"
                            className="swap-reject-button"
                            disabled={swapUpdating === swap.id}
                            onClick={() => handleRejectSwap(swap.id)}
                          >
                            {swapUpdating === swap.id
                              ? "Rejecting..."
                              : "Reject Swap"}
                          </button>
                        ) : swap.status === "accepted" ? (
                          <span className="swap-intervention-text">
                            In Progress
                          </span>
                        ) : swap.status === "completed" ? (
                          <span className="swap-intervention-rating">
                            {swap.rating
                              ? `★ ${Number(swap.rating).toFixed(1)} Rated`
                              : "Not Rated"}
                          </span>
                        ) : swap.status === "rejected" ? (
                          <span className="swap-intervention-text danger">
                            Policy Violation
                          </span>
                        ) : (
                          <span className="swap-intervention-text">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* ================= PLATFORM ANNOUNCEMENT ================= */}
        <section id="admin-announcements" className="announcement-section">
          <div className="announcement-heading">
            <h2>Platform Announcement</h2>
            <p>
              Broadcast an alert banner or urgent operational notice to all
              active students on SkillSwap.
            </p>
          </div>

          <div className="announcement-layout">
            {/* LEFT: FORM */}
            <div className="announcement-form-card">
              <form onSubmit={handleCreateAnnouncement}>
                <div className="announcement-field">
                  <label>Announcement Title</label>

                  <input
                    type="text"
                    placeholder="Announcement title"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="announcement-field">
                  <label>Target Audience</label>

                  <select defaultValue="all">
                    <option value="all">
                      All Registered Students & Mentors ({users.length} users)
                    </option>
                  </select>
                </div>

                <div className="announcement-field">
                  <div className="announcement-label-row">
                    <label>Announcement Message</label>

                    <span>{announcementMessage.length} / 500 characters</span>
                  </div>

                  <textarea
                    placeholder="Write announcement message..."
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    maxLength={500}
                    rows={5}
                  />
                </div>

                <div className="announcement-form-footer">
                  <span className="announcement-dispatch-info">
                    ⓘ Dispatched via Realtime WebSocket & Push
                  </span>

                  <button
                    type="submit"
                    className="announcement-send-button"
                    disabled={announcementLoading}
                  >
                    ✣ {announcementLoading ? "Sending..." : "Send Announcement"}
                  </button>
                </div>

                {announcementMessageStatus && (
                  <p
                    className={`announcement-result ${
                      announcementMessageStatus.includes("successfully")
                        ? "success"
                        : "error"
                    }`}
                  >
                    {announcementMessageStatus}
                  </p>
                )}
              </form>
            </div>

            {/* RIGHT: PREVIEW */}
            <div className="announcement-preview-card">
              <div className="announcement-preview-header">
                <span>STUDENT DASHBOARD PREVIEW</span>

                <span className="live-banner-badge">LIVE IN-APP BANNER</span>
              </div>

              <div className="announcement-preview-banner">
                <div className="preview-icon">♧</div>

                <div>
                  <strong>
                    {announcementTitle ||
                      "Scheduled Platform Maintenance — Sunday at 2:00 AM UTC"}
                  </strong>

                  <p>
                    {announcementMessage ||
                      "We will be performing a brief 15-minute scheduled database upgrade to improve swap notification speeds and socket stability."}
                  </p>

                  <div className="preview-meta">
                    <span>Just now</span>
                    <span>•</span>
                    <span>SkillSwap Ops Core</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUCCESS BANNER */}
          {announcementMessageStatus &&
            announcementMessageStatus.includes("successfully") && (
              <div className="announcement-success-banner">
                <span className="success-banner-icon">✓</span>

                <div>
                  <strong>Announcement Published Successfully</strong>

                  <span>{announcementMessageStatus}</span>
                </div>
              </div>
            )}
        </section>

        {/* ================= REPORTS ================= */}
        <section id="admin-reports" className="reports-section">
          <div className="reports-heading">
            <h2>Reports & Analytics</h2>

            <p>
              Audit compliance metrics and trigger live CSV exports directly
              from Supabase platform tables.
            </p>
          </div>

          {reportsLoading ? (
            <div className="admin-table-state">Loading reports...</div>
          ) : (
            <>
              {/* SUMMARY CARDS */}
              <div className="reports-summary-grid">
                <div className="report-summary-card">
                  <div className="report-card-heading">
                    <span>Users Summary</span>
                    <span>♧</span>
                  </div>

                  <div className="report-metric">
                    <span>Total Registered:</span>
                    <strong>{reportSummary.totalUsers.toLocaleString()}</strong>
                  </div>

                  <div className="report-metric">
                    <span>Active Students:</span>
                    <strong className="blue-value">
                      {reportSummary.activeUsers.toLocaleString()}
                    </strong>
                  </div>

                  <div className="report-metric">
                    <span>Banned Accounts:</span>
                    <strong className="red-value">
                      {reportSummary.bannedUsers.toLocaleString()}
                    </strong>
                  </div>

                  <div className="report-metric">
                    <span>Admin Moderators:</span>
                    <strong>{reportSummary.adminUsers.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="report-summary-card">
                  <div className="report-card-heading">
                    <span>Swaps Summary</span>
                    <span>⇄</span>
                  </div>

                  <div className="report-metric">
                    <span>Pending In-Queue:</span>
                    <strong>{reportSummary.pendingSwaps}</strong>
                  </div>

                  <div className="report-metric">
                    <span>Accepted & Ongoing:</span>
                    <strong>{reportSummary.acceptedSwaps}</strong>
                  </div>

                  <div className="report-metric">
                    <span>Successfully Completed:</span>
                    <strong>{reportSummary.completedSwaps}</strong>
                  </div>

                  <div className="report-metric">
                    <span>Rejected / Cancelled:</span>
                    <strong>
                      {reportSummary.rejectedSwaps +
                        reportSummary.cancelledSwaps}
                    </strong>
                  </div>
                </div>

                <div className="report-summary-card">
                  <div className="report-card-heading">
                    <span>Ratings & Feedback</span>
                    <span>☆</span>
                  </div>

                  <div className="report-metric">
                    <span>Total Reviews:</span>
                    <strong>{reportSummary.totalRatings}</strong>
                  </div>

                  <div className="report-metric">
                    <span>Average Swap Rating:</span>
                    <strong className="blue-value">
                      {reportSummary.averageRating} / 5.0
                    </strong>
                  </div>

                  <div className="report-metric">
                    <span>5-Star Trades:</span>
                    <strong>
                      {reportSummary.totalRatings > 0
                        ? `${Math.round(
                            (reportRatings.filter(
                              (item) => Number(item.rating) === 5,
                            ).length /
                              reportSummary.totalRatings) *
                              100,
                          )}%`
                        : "0%"}
                    </strong>
                  </div>

                  <div className="report-metric">
                    <span>Flagged Reviews:</span>
                    <strong className="red-value">0</strong>
                  </div>
                </div>

                <div className="report-summary-card">
                  <div className="report-card-heading">
                    <span>Activity & Moderation</span>
                    <span>⌁</span>
                  </div>

                  <div className="report-metric">
                    <span>Total Activity Logs:</span>
                    <strong>
                      {reportSummary.totalActivityLogs.toLocaleString()}
                    </strong>
                  </div>

                  <div className="report-metric">
                    <span>Pending Skills:</span>
                    <strong className="red-value">
                      {reportSummary.pendingSkillModerations}
                    </strong>
                  </div>

                  <div className="report-metric">
                    <span>Turnaround SLA:</span>
                    <strong>24 mins</strong>
                  </div>

                  <div className="report-metric">
                    <span>System Health:</span>
                    <strong className="blue-value">99.8% Uptime</strong>
                  </div>
                </div>
              </div>

              {/* DOWNLOAD CARDS */}
              <div className="report-download-grid">
                <button
                  type="button"
                  className="report-download-card"
                  onClick={handleDownloadUsersReport}
                >
                  <span className="report-download-icon">▣</span>

                  <span className="report-download-content">
                    <strong>Users Report</strong>
                    <small>
                      CSV export • {users.length.toLocaleString()} rows
                    </small>
                  </span>

                  <span className="report-download-arrow">↓</span>
                </button>

                <button
                  type="button"
                  className="report-download-card"
                  onClick={handleDownloadSwapsReport}
                >
                  <span className="report-download-icon blue">⇄</span>

                  <span className="report-download-content">
                    <strong>Swaps Report</strong>
                    <small>
                      CSV export • {swaps.length.toLocaleString()} records
                    </small>
                  </span>

                  <span className="report-download-arrow">↓</span>
                </button>

                <button
                  type="button"
                  className="report-download-card"
                  onClick={handleDownloadRatingsReport}
                >
                  <span className="report-download-icon purple">☆</span>

                  <span className="report-download-content">
                    <strong>Ratings & Feedback</strong>
                    <small>CSV export • {reportRatings.length} reviews</small>
                  </span>

                  <span className="report-download-arrow">↓</span>
                </button>

                <button
                  type="button"
                  className="report-download-card"
                  onClick={handleDownloadActivityReport}
                >
                  <span className="report-download-icon">▤</span>

                  <span className="report-download-content">
                    <strong>Activity Report</strong>
                    <small>CSV export • Last 30 days</small>
                  </span>

                  <span className="report-download-arrow">↓</span>
                </button>
              </div>
            </>
          )}
        </section>

        {/* ================= FOOTER ================= */}
        <footer className="admin-footer">
          <span>
            <i></i>
            SkillSwap Ops Core v2.4 • Admin Portal
          </span>

          <span>© 2024 SkillSwap Inc. All rights reserved.</span>
        </footer>
      </main>
    </div>
  );
}

export default AdminDashboard;
