import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin panel.</p>

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

        {usersLoading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div>
            {users.map((user) => (
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
    </div>
  );
}

export default AdminDashboard;
