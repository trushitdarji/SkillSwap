import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      setSaving(false);
      console.error("Session error:", sessionError);
      return;
    }

    if (!sessionData.session) {
      setSaving(false);
      navigate("/login");
      return;
    }

    const userId = sessionData.session.user.id;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        location: location.trim() || null,
        bio: bio.trim() || null,
        is_public: isPublic,
      })
      .eq("id", userId);

    if (updateError) {
      setSaving(false);
      console.error("Profile update error:", updateError);
      return;
    }

    setProfile((prev) => ({
      ...prev,
      location: location.trim() || null,
      bio: bio.trim() || null,
      is_public: isPublic,
    }));

    setSaving(false);

    console.log("Profile updated successfully");
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        return;
      }

      if (!data.session) {
        navigate("/login");
        return;
      }

      console.log("Current user ID:", data.session.user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.session.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return;
      }

      setProfile(profile);
      setLocation(profile.location || "");
      setBio(profile.bio || "");
      setIsPublic(profile.is_public);
      console.log("Current profile:", profile);
    };

    checkSession();
  }, [navigate]);
  return (
    <div>
      <h1>Profile</h1>

      <p>Welcome, {profile?.full_name}</p>
      <p>Username: {profile?.username}</p>
      <p>Role: {profile?.role}</p>
      <p>Location: {profile?.location || "Not added"}</p>
      <p>Bio: {profile?.bio || "No bio added"}</p>
      <p>Profile visibility: {profile?.is_public ? "Public" : "Private"}</p>

      <hr />

      <h2>Edit Profile</h2>

      <div>
        <label htmlFor="location">Location</label>
        <input
          id="location"
          type="text"
          placeholder="Enter your location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          placeholder="Tell something about yourself"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="isPublic">
          <input
            id="isPublic"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make my profile public
        </label>
      </div>

      <button type="button" onClick={handleSaveProfile} disabled={saving}>
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}

export default Profile;
