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
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedSkillType, setSelectedSkillType] = useState("offer");
  const [availableSkills, setAvailableSkills] = useState([]);
  const [skillMessage, setSkillMessage] = useState("");
  const [skillSaving, setSkillSaving] = useState(false);
  const [skillRemoving, setSkillRemoving] = useState(false);

  const handleAddSkill = async () => {
    setSkillMessage("");
    setSkillSaving(true);

    if (!selectedSkill) {
      setSkillSaving(false);
      setSkillMessage("Please select a skill");
      return;
    }

    const alreadyAdded = skills.some(
      (item) =>
        item.skills.id === selectedSkill &&
        item.skill_type === selectedSkillType,
    );

    if (alreadyAdded) {
      setSkillSaving(false);
      setSkillMessage("Skill already added");
      return;
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      return;
    }

    if (!sessionData.session) {
      navigate("/login");
      return;
    }

    const userId = sessionData.session.user.id;

    const { error } = await supabase.from("user_skills").insert({
      user_id: userId,
      skill_id: selectedSkill,
      skill_type: selectedSkillType,
    });

    if (error) {
      setSkillSaving(false);
      console.error("Add skill error:", error);
      setSkillMessage("Failed to add skill");
      return;
    }

    console.log("Skill added successfully");
    setSkillSaving(false);
    setSkillMessage("Skill added successfully");
    setSelectedSkill("");

    const addedSkill = {
      skill_type: selectedSkillType,
      skills: availableSkills.find((skill) => skill.id === selectedSkill),
    };

    setSkills((prev) => [...prev, addedSkill]);
  };

  const handleRemoveSkill = async (skillId, skillType) => {
    setSkillRemoving(true);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      setSkillRemoving(false);
      return;
    }

    if (!sessionData.session) {
      setSkillRemoving(false);
      navigate("/login");
      return;
    }

    const { error } = await supabase
      .from("user_skills")
      .delete()
      .eq("user_id", sessionData.session.user.id)
      .eq("skill_id", skillId)
      .eq("skill_type", skillType);

    if (error) {
      setSkillRemoving(false);
      console.error("Remove skill error:", error);
      setSkillMessage("Failed to remove skill");
      return;
    }

    setSkills((prev) =>
      prev.filter(
        (item) =>
          !(item.skills.id === skillId && item.skill_type === skillType),
      ),
    );

    setSkillRemoving(false);
    setSkillMessage("Skill removed successfully");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      setSkillRemoving(false);
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

      const { data: userSkills, error: skillsError } = await supabase
        .from("user_skills")
        .select(
          `
    skill_type,
    skills (
      id,
      name
    )
  `,
        )
        .eq("user_id", data.session.user.id);

      if (skillsError) {
        console.error("Skills fetch error:", skillsError);
        setSkillsLoading(false);
        return;
      }

      setSkills(userSkills || []);
      setSkillsLoading(false);

      const { data: availableSkills, error: availableSkillsError } =
        await supabase.from("skills").select("id, name").order("name");

      if (availableSkillsError) {
        console.error("Available skills fetch error:", availableSkillsError);
        return;
      }

      console.log("Available skills:", availableSkills);
      setAvailableSkills(availableSkills || []);

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

      <h2>My Skills</h2>

      <button type="button" onClick={handleAddSkill} disabled={skillSaving}>
        {skillSaving ? "Adding..." : "Add Skill"}
      </button>

      {skillMessage && <p>{skillMessage}</p>}

      <select
        value={selectedSkill}
        onChange={(e) => {
          setSelectedSkill(e.target.value);
          setSkillMessage("");
        }}
      >
        <option value="">Select a skill</option>

        {availableSkills.map((skill) => (
          <option key={skill.id} value={skill.id}>
            {skill.name}
          </option>
        ))}
      </select>

      <select
        value={selectedSkillType}
        onChange={(e) => setSelectedSkillType(e.target.value)}
      >
        <option value="offer">I can teach</option>
        <option value="want">I want to learn</option>
      </select>
      {skillsLoading ? (
        <p>Loading skills...</p>
      ) : skills.length === 0 ? (
        <p>No skills added yet.</p>
      ) : (
        <div>
          <h3>Skills I Offer</h3>

          {skills.filter((item) => item.skill_type === "offer").length === 0 ? (
            <p>No offered skills.</p>
          ) : (
            skills
              .filter((item) => item.skill_type === "offer")
              .map((item) => (
                <div key={`${item.skills.id}-offer`}>
                  <span>{item.skills.name}</span>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveSkill(item.skills.id, item.skill_type)
                    }
                    disabled={skillRemoving}
                  >
                    {skillRemoving ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))
          )}

          <h3>Skills I Want</h3>

          {skills.filter((item) => item.skill_type === "want").length === 0 ? (
            <p>No wanted skills.</p>
          ) : (
            skills
              .filter((item) => item.skill_type === "want")
              .map((item) => (
                <div key={`${item.skills.id}-want`}>
                  <span>{item.skills.name}</span>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveSkill(item.skills.id, item.skill_type)
                    }
                    disabled={skillRemoving}
                  >
                    {skillRemoving ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))
          )}
        </div>
      )}
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
