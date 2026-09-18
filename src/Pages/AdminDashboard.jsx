import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
  const [userSearch, setUserSearch] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementMessageStatus, setAnnouncementMessageStatus] =
    useState("");
  const [reportRatings, setReportRatings] = useState([]);
  const [reportActivityLogs, setReportActivityLogs] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
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

      const { count: activeSwapsCount, error: activeSwapsError } =
        await supabase
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

    fetchStats();
  }, []);

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
  }, []);

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
  }, []);

  useEffect(() => {
    const fetchSwaps = async () => {
      const { data, error } = await supabase
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

      if (error) {
        console.error("Swaps fetch error:", error);
        setSwapsLoading(false);
        return;
      }

      setSwaps(data || []);
      setSwapsLoading(false);
    };

    fetchSwaps();
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      setReportsLoading(true);

      const { data: ratingsData, error: ratingsError } = await supabase
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

      if (ratingsError) {
        console.error("Report ratings fetch error:", ratingsError);
      } else {
        setReportRatings(ratingsData || []);
      }

      const { data: activityData, error: activityError } = await supabase
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

      if (activityError) {
        console.error("Report activity fetch error:", activityError);
      } else {
        setReportActivityLogs(activityData || []);
      }

      setReportsLoading(false);
    };

    fetchReportData();
  }, []);

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

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin panel.</p>

      <div>
        <h2>Platform Announcement</h2>

        <form onSubmit={handleCreateAnnouncement}>
          <div>
            <label>Title</label>
            <input
              type="text"
              placeholder="Announcement title"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <label>Message</label>
            <textarea
              placeholder="Write announcement message..."
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              maxLength={2000}
              rows={5}
            />
          </div>

          <button type="submit" disabled={announcementLoading}>
            {announcementLoading ? "Sending..." : "Send Announcement"}
          </button>
        </form>

        {announcementMessageStatus && <p>{announcementMessageStatus}</p>}
      </div>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <div>
          <div>
            <h2>Total Users</h2>
            <p>{stats.users}</p>
          </div>

          <div>
            <h2>Public Profiles</h2>
            <p>{stats.publicProfiles}</p>
          </div>

          <div>
            <h2>Active Swaps</h2>
            <p>{stats.activeSwaps}</p>
          </div>

          <div>
            <h2>Completed Swaps</h2>
            <p>{stats.completedSwaps}</p>
          </div>
        </div>
      )}

      <div>
        <h2>User Management</h2>

        <input
          type="text"
          placeholder="Search users..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />

        {usersLoading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div>
            {users
              .filter((user) => {
                const search = userSearch.toLowerCase().trim();

                if (!search) return true;

                return (
                  user.full_name?.toLowerCase().includes(search) ||
                  user.username?.toLowerCase().includes(search) ||
                  user.email?.toLowerCase().includes(search) ||
                  user.location?.toLowerCase().includes(search)
                );
              })
              .map((user) => (
                <div key={user.id}>
                  <h3>{user.full_name || "Unnamed User"}</h3>

                  <p>Username: @{user.username || "N/A"}</p>

                  <p>Email: {user.email || "N/A"}</p>

                  <p>Location: {user.location || "Not provided"}</p>

                  <p>Profile: {user.is_public ? "Public" : "Private"}</p>

                  <p>Role: {user.role}</p>

                  {user.id !== currentUserId && (
                    <button
                      type="button"
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
                  )}
                  {user.id !== currentUserId && (
                    <button
                      type="button"
                      disabled={banUpdating === user.id}
                      onClick={() => handleBanChange(user.id, !user.is_banned)}
                    >
                      {banUpdating === user.id
                        ? "Updating..."
                        : user.is_banned
                          ? "Unban User"
                          : "Ban User"}
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
      <div>
        <h2>Skill Moderation</h2>

        {pendingSkillsLoading ? (
          <p>Loading pending skills...</p>
        ) : pendingSkills.length === 0 ? (
          <p>No pending skills.</p>
        ) : (
          <div>
            {pendingSkills.map((skill) => (
              <div key={skill.id}>
                <h3>{skill.skills?.name || "Unknown Skill"}</h3>

                <p>User: @{skill.profiles?.username || "N/A"}</p>

                <p>
                  Type:{" "}
                  {skill.skill_type === "offer"
                    ? "I can teach"
                    : "I want to learn"}
                </p>

                <p>Description: {skill.description || "No description"}</p>

                <p>Status: {skill.moderation_status}</p>

                <button
                  type="button"
                  onClick={() => handleSkillModeration(skill.id, "approved")}
                >
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => handleSkillModeration(skill.id, "rejected")}
                >
                  Reject
                </button>

                <hr />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2>Swap Monitoring</h2>

        {swapsLoading ? (
          <p>Loading swaps...</p>
        ) : swaps.length === 0 ? (
          <p>No swap requests found.</p>
        ) : (
          <div>
            {swaps.map((swap) => (
              <div key={swap.id}>
                <h3>
                  {swap.sender?.full_name || "Unknown User"} →{" "}
                  {swap.receiver?.full_name || "Unknown User"}
                </h3>

                <p>Sender: @{swap.sender?.username || "N/A"}</p>

                <p>Receiver: @{swap.receiver?.username || "N/A"}</p>

                <p>Offering: {swap.offered_skill?.name || "N/A"}</p>

                <p>Wants to learn: {swap.requested_skill?.name || "N/A"}</p>

                <p>Message: {swap.message || "No message"}</p>

                <p>Status: {swap.status}</p>

                <p>Created: {new Date(swap.created_at).toLocaleString()}</p>

                {swap.status === "pending" && (
                  <button
                    type="button"
                    disabled={swapUpdating === swap.id}
                    onClick={() => handleRejectSwap(swap.id)}
                  >
                    {swapUpdating === swap.id ? "Rejecting..." : "Reject Swap"}
                  </button>
                )}

                <hr />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2>Reports Summary</h2>
        <button type="button" onClick={handleDownloadUsersReport}>
          Download Users Report
        </button>
        <button type="button" onClick={handleDownloadSwapsReport}>
          Download Swaps Report
        </button>
        <button type="button" onClick={handleDownloadRatingsReport}>
          Download Ratings & Feedback Report
        </button>
        <button type="button" onClick={handleDownloadActivityReport}>
          Download Activity Report
        </button>

        {reportsLoading ? (
          <p>Loading reports...</p>
        ) : (
          <div>
            <h3>Users</h3>
            <p>Total Users: {reportSummary.totalUsers}</p>
            <p>Active Users: {reportSummary.activeUsers}</p>
            <p>Banned Users: {reportSummary.bannedUsers}</p>
            <p>Admin Users: {reportSummary.adminUsers}</p>

            <h3>Swaps</h3>
            <p>Pending: {reportSummary.pendingSwaps}</p>
            <p>Accepted: {reportSummary.acceptedSwaps}</p>
            <p>Completed: {reportSummary.completedSwaps}</p>
            <p>Rejected: {reportSummary.rejectedSwaps}</p>
            <p>Cancelled: {reportSummary.cancelledSwaps}</p>

            <h3>Ratings & Feedback</h3>
            <p>Total Ratings: {reportSummary.totalRatings}</p>
            <p>Average Rating: {reportSummary.averageRating}</p>

            <h3>Activity</h3>
            <p>Total Activity Logs: {reportSummary.totalActivityLogs}</p>
            <p>
              Pending Skill Moderations: {reportSummary.pendingSkillModerations}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
