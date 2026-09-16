import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const isOwnProfile = !userId;

  const availabilityOptions = [
    {
      value: "weekends",
      label: "Weekends",
    },
    {
      value: "weekday_nights",
      label: "Monday–Saturday, 8 PM–10 PM",
    },
    {
      value: "evenings",
      label: "Monday–Friday, 6 PM–8 PM",
    },
    {
      value: "weekday_mornings",
      label: "Monday–Friday, 7 AM–9 AM",
    },
  ];

  const [profile, setProfile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [availability, setAvailability] = useState([]);
  const [saving, setSaving] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skills, setSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedSkillType, setSelectedSkillType] = useState("offer");
  const [availableSkills, setAvailableSkills] = useState([]);
  const [skillCategories, setSkillCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [skillMessage, setSkillMessage] = useState("");
  const [skillDescription, setSkillDescription] = useState("");
  const [skillSaving, setSkillSaving] = useState(false);
  const [skillRemoving, setSkillRemoving] = useState(false);

  const handlePhotoSelect = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setProfilePhoto(file);
  };

  const handleUploadPhoto = async () => {
    if (!profilePhoto) {
      return;
    }
    setPhotoUploading(true);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      setPhotoUploading(false);
      console.error("Session error:", sessionError);
      return;
    }

    if (!sessionData.session) {
      setPhotoUploading(false);
      navigate("/login");
      return;
    }

    const userId = sessionData.session.user.id;
    const oldAvatarUrl = profile?.avatar_url;

    let oldAvatarPath = null;

    if (oldAvatarUrl) {
      const url = new URL(oldAvatarUrl);
      const marker = "/storage/v1/object/public/profile-photos/";

      if (url.pathname.includes(marker)) {
        oldAvatarPath = url.pathname.split(marker)[1];
      }
    }

    const fileExtension = profilePhoto.name.split(".").pop();
    const filePath = `${userId}/avatar-${Date.now()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(filePath, profilePhoto, {
        upsert: false,
      });

    if (uploadError) {
      setPhotoUploading(false);
      console.error("Photo upload error:", uploadError);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(filePath);

    console.log("Profile photo URL:", publicUrlData.publicUrl);

    const { error: avatarUpdateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrlData.publicUrl,
      })
      .eq("id", userId);

    if (avatarUpdateError) {
      setPhotoUploading(false);
      console.error("Avatar URL update error:", avatarUpdateError);
      return;
    }

    if (oldAvatarPath && oldAvatarPath !== filePath) {
      const { error: deleteError } = await supabase.storage
        .from("profile-photos")
        .remove([oldAvatarPath]);

      if (deleteError) {
        console.error("Old profile photo delete error:", deleteError);
      }
    }

    setProfile((prev) => ({
      ...prev,
      avatar_url: publicUrlData.publicUrl,
    }));

    setPhotoUploading(false);

    console.log("Profile photo uploaded successfully");
  };

  const handleAddSkill = async () => {
    setSkillMessage("");
    setSkillSaving(true);

    if (selectedSkills.length === 0) {
      setSkillSaving(false);
      setSkillMessage("Please select at least one skill");
      return;
    }

    const alreadyAddedSkills = selectedSkills.filter((skillId) =>
      skills.some(
        (item) =>
          item.skills.id === skillId && item.skill_type === selectedSkillType,
      ),
    );

    if (alreadyAddedSkills.length > 0) {
      setSkillSaving(false);
      setSkillMessage("Some selected skills are already added");
      return;
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      setSkillSaving(false);
      console.error("Session error:", sessionError);
      return;
    }

    if (!sessionData.session) {
      setSkillSaving(false);
      navigate("/login");
      return;
    }

    const userId = sessionData.session.user.id;

    const skillsToInsert = selectedSkills.map((skillId) => ({
      user_id: userId,
      skill_id: skillId,
      skill_type: selectedSkillType,
      description: skillDescription.trim() || null,
      moderation_status: "pending",
    }));

    const { error } = await supabase.from("user_skills").insert(skillsToInsert);

    if (error) {
      setSkillSaving(false);
      console.error("Add skills error:", error);
      setSkillMessage("Failed to add skills");
      return;
    }

    const addedSkills = selectedSkills
      .map((skillId) => availableSkills.find((skill) => skill.id === skillId))
      .filter(Boolean)
      .map((skill) => ({
        skill_type: selectedSkillType,
        moderation_status: "pending",
        skills: skill,
      }));

    setSkills((prev) => [...prev, ...addedSkills]);

    setSelectedSkills([]);
    setSkillDescription("");
    setSelectedCategory("");
    setSkillSaving(false);
    setSkillMessage("Skills added and sent for approval");
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
        availability: availability,
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
      availability: availability,
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
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId || data.session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return;
      }

      if (!profileData) {
        setProfile(null);
        setSkills([]);
        setSkillsLoading(false);
        return;
      }

      setProfile(profileData);
      if (profileData.avatar_url) {
        setProfilePhoto(profileData.avatar_url);
      }
      setLocation(profileData.location || "");
      setBio(profileData.bio || "");
      setIsPublic(profileData.is_public);
      setAvailability(profileData.availability || []);

      const userSkillsQuery = supabase
        .from("user_skills")
        .select(
          `
    skill_type,
    moderation_status,
    skills (
      id,
      name
    )
  `,
        )
        .eq("user_id", userId || data.session.user.id);

      if (!isOwnProfile) {
        userSkillsQuery.eq("moderation_status", "approved");
      }

      const { data: userSkills, error: skillsError } = await userSkillsQuery;

      if (skillsError) {
        console.error("Skills fetch error:", skillsError);
        setSkillsLoading(false);
        return;
      }

      setSkills(userSkills || []);
      setSkillsLoading(false);

      const { data: availableSkills, error: availableSkillsError } =
        await supabase
          .from("skills")
          .select("id, name, parent_id")
          .not("parent_id", "is", null)
          .order("name");

      if (availableSkillsError) {
        console.error("Available skills fetch error:", availableSkillsError);
        return;
      }

      setAvailableSkills(availableSkills || []);

      const { data: categories, error: categoriesError } = await supabase
        .from("skills")
        .select("id, name")
        .is("parent_id", null)
        .order("name");

      if (categoriesError) {
        console.error("Categories fetch error:", categoriesError);
        return;
      }

      setSkillCategories(categories || []);
      console.log("Current profile:", profile);
    };

    checkSession();
  }, [navigate]);
  return (
    <div>
      {!profile && !isOwnProfile ? (
        <>
          <h1>Profile</h1>
          <p>This profile is private or does not exist.</p>
          <button type="button" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </>
      ) : (
        <>
          <h1>Profile</h1>
          {isOwnProfile && (
            <div>
              <label htmlFor="profilePhoto">Profile Photo</label>

              <input
                id="profilePhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
              />

              <button
                type="button"
                onClick={handleUploadPhoto}
                disabled={photoUploading}
              >
                {photoUploading ? "Uploading..." : "Upload Photo"}
              </button>
            </div>
          )}
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt="Profile"
              width="120"
              height="120"
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          )}
          <p>Welcome, {profile?.full_name}</p>
          <p>Username: {profile?.username}</p>
          <p>Role: {profile?.role}</p>
          <p>Location: {profile?.location || "Not added"}</p>
          <p>Bio: {profile?.bio || "No bio added"}</p>
          <p>Profile visibility: {profile?.is_public ? "Public" : "Private"}</p>
          <p>
            Availability:{" "}
            {profile?.availability?.length > 0
              ? profile.availability
                  .map(
                    (value) =>
                      availabilityOptions.find(
                        (option) => option.value === value,
                      )?.label || value,
                  )
                  .join(", ")
              : "Not provided"}
          </p>
          <h2>My Skills</h2>
          {isOwnProfile && (
            <>
              <button
                type="button"
                onClick={handleAddSkill}
                disabled={skillSaving}
              >
                {skillSaving ? "Adding..." : "Add Skill"}
              </button>

              {skillMessage && <p>{skillMessage}</p>}

              {!selectedCategory ? (
                <div>
                  <p>Select a category</p>

                  {skillCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setSkillMessage("");
                      }}
                    >
                      {category.name} →
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("");
                      setSkillMessage("");
                    }}
                  >
                    ← Back to Categories
                  </button>

                  <p>
                    {
                      skillCategories.find(
                        (category) => category.id === selectedCategory,
                      )?.name
                    }
                  </p>

                  {availableSkills
                    .filter((skill) => skill.parent_id === selectedCategory)
                    .map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => {
                          setSelectedSkills((prev) =>
                            prev.includes(skill.id)
                              ? prev.filter((id) => id !== skill.id)
                              : [...prev, skill.id],
                          );
                          setSkillMessage("");
                        }}
                      >
                        {selectedSkills.includes(skill.id) ? "✓ " : ""}
                        {skill.name}
                      </button>
                    ))}
                </div>
              )}

              <select
                value={selectedSkillType}
                onChange={(e) => setSelectedSkillType(e.target.value)}
              >
                <option value="offer">I can teach</option>
                <option value="want">I want to learn</option>
              </select>

              <textarea
                placeholder="Describe this skill"
                value={skillDescription}
                onChange={(e) => setSkillDescription(e.target.value)}
              />
            </>
          )}
          {skillsLoading ? (
            <p>Loading skills...</p>
          ) : skills.length === 0 ? (
            <p>No skills added yet.</p>
          ) : (
            <div>
              <h3>Skills I Offer</h3>

              {skills.filter((item) => item.skill_type === "offer").length ===
              0 ? (
                <p>No offered skills.</p>
              ) : (
                skills
                  .filter((item) => item.skill_type === "offer")
                  .map((item) => (
                    <div key={`${item.skills.id}-offer`}>
                      <span>{item.skills.name}</span>

                      {item.moderation_status === "pending" && (
                        <small>Pending approval</small>
                      )}
                      {item.moderation_status === "rejected" && (
                        <small>Rejected</small>
                      )}

                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveSkill(item.skills.id, item.skill_type)
                          }
                          disabled={skillRemoving}
                        >
                          {skillRemoving ? "Removing..." : "Remove"}
                        </button>
                      )}
                    </div>
                  ))
              )}

              <h3>Skills I Want</h3>

              {skills.filter((item) => item.skill_type === "want").length ===
              0 ? (
                <p>No wanted skills.</p>
              ) : (
                skills
                  .filter((item) => item.skill_type === "want")
                  .map((item) => (
                    <div key={`${item.skills.id}-want`}>
                      <span>{item.skills.name}</span>

                      {item.moderation_status === "pending" && (
                        <small>Pending approval</small>
                      )}
                      {item.moderation_status === "rejected" && (
                        <small>Rejected</small>
                      )}

                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveSkill(item.skills.id, item.skill_type)
                          }
                          disabled={skillRemoving}
                        >
                          {skillRemoving ? "Removing..." : "Remove"}
                        </button>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}
          {isOwnProfile && (
            <>
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
                <h3>Availability</h3>

                {availabilityOptions.map((option) => (
                  <label key={option.value}>
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={availability.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAvailability((prev) => [...prev, option.value]);
                        } else {
                          setAvailability((prev) =>
                            prev.filter((item) => item !== option.value),
                          );
                        }
                      }}
                    />
                    {option.label}
                  </label>
                ))}
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

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </>
          )}{" "}
        </>
      )}
    </div>
  );
}

export default Profile;
