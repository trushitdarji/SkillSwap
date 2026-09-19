import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import "./Profile.css";
import "./Browse.css";

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
  const [swapUser, setSwapUser] = useState(null);
  const [selectedOfferedSkill, setSelectedOfferedSkill] = useState("");
  const [selectedRequestedSkill, setSelectedRequestedSkill] = useState("");
  const [swapMessage, setSwapMessage] = useState("");
  const [myOfferedSkills, setMyOfferedSkills] = useState([]);

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

  const handleSendSwapRequest = async () => {
    if (!swapUser || !selectedOfferedSkill || !selectedRequestedSkill) {
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user?.id;

    if (!currentUserId) {
      navigate("/login");
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
      return;
    }

    console.log("Swap request created:", data);

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
    }

    alert("Swap request sent successfully!");

    setSwapUser(null);
    setSelectedOfferedSkill("");
    setSelectedRequestedSkill("");
    setSwapMessage("");
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

      const { data: currentUserOfferedSkills, error: currentUserSkillsError } =
        await supabase
          .from("user_skills")
          .select(
            `
      skill_id,
      skill_type,
      skills (
        id,
        name
      )
    `,
          )
          .eq("user_id", data.session.user.id)
          .eq("skill_type", "offer");

      if (currentUserSkillsError) {
        console.error(
          "Current user offered skills fetch error:",
          currentUserSkillsError,
        );
      } else {
        const offeredSkills = (currentUserOfferedSkills || []).map((item) => ({
          id: item.skills.id,
          name: item.skills.name,
        }));

        setMyOfferedSkills(offeredSkills);
      }

      setSkillCategories(categories || []);
      console.log("Current profile:", profile);
    };

    checkSession();
  }, [navigate, userId, isOwnProfile]);
  return (
    <div className="profile-page">
      <nav className="profile-navbar">
        <a href="/" className="profile-navbar-logo">
          <span className="profile-navbar-logo-icon">S</span>
          <span>SkillSwap</span>
        </a>

        <div className="profile-navbar-links">
          <a href="/">Home</a>
          <a href="/browse" className="active">
            Browse
          </a>
          <a href="/swap-requests">Swap Requests</a>
          <a href="/dashboard">Dashboard</a>
        </div>

        <div className="profile-navbar-user">
          <span>
            <strong>
              {profile?.full_name || profile?.username || "SkillSwap User"}
            </strong>

            <small>View Profile</small>
          </span>

          <span className="profile-navbar-avatar">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "Profile"}
              />
            ) : (
              (profile?.full_name || profile?.username || "U")
                .charAt(0)
                .toUpperCase()
            )}
          </span>
        </div>
      </nav>

      <main className="profile-content">
        <div className="profile-back-row">
          <button type="button" onClick={() => navigate("/browse")}>
            ← Back to Browse Skills
          </button>
        </div>

        <section className="profile-header-card">
          <div className="profile-header-main">
            <div className="profile-main-avatar">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Profile"}
                />
              ) : (
                (profile?.full_name || profile?.username || "U")
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            <div className="profile-header-info">
              <div className="profile-name-row">
                <h1>
                  {profile?.full_name || profile?.username || "SkillSwap User"}
                </h1>

                <span className="profile-badge">✓ Verified Creator</span>

                {profile?.is_public && (
                  <span className="profile-badge profile-badge-light">
                    ◉ Public Profile
                  </span>
                )}
              </div>

              <p className="profile-username">
                @{profile?.username || "username"}
              </p>

              <div className="profile-meta">
                <span>📍 {profile?.location || "Location not provided"}</span>

                {profile?.availability?.length > 0 && (
                  <span>
                    ◷{" "}
                    {profile.availability
                      .map((value) => {
                        const labels = {
                          weekends: "Weekends",
                          weekday_nights: "Mon–Sat evenings",
                          evenings: "Weekday evenings",
                          weekday_mornings: "Weekday mornings",
                        };

                        return labels[value] || value;
                      })
                      .join(", ")}
                  </span>
                )}
              </div>

              <p className="profile-bio">
                {profile?.bio || "This user has not added a bio yet."}
              </p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">
              <strong>
                {skills.filter((item) => item.skill_type === "offer").length}
              </strong>
              <span>Skills Offered</span>
            </div>

            <div className="profile-stat">
              <strong>
                {skills.filter((item) => item.skill_type === "want").length}
              </strong>
              <span>Skills Wanted</span>
            </div>

            <div className="profile-stat">
              <strong>—</strong>
              <span>Completed Swaps</span>
            </div>

            <div className="profile-stat">
              <strong>—</strong>
              <span>Response Time</span>
            </div>
          </div>
        </section>

        {/* Existing profile content stays below for now */}
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
            <div className="profile-body-grid">
              <div className="profile-main-column">
                <section className="profile-section-card">
                  <div className="profile-section-title">
                    <div>
                      <span className="profile-section-icon">✦</span>
                      <h2>Skills I Can Teach</h2>
                    </div>

                    <span className="profile-section-count">
                      {
                        skills.filter((item) => item.skill_type === "offer")
                          .length
                      }{" "}
                      Available
                    </span>
                  </div>

                  {skills.filter((item) => item.skill_type === "offer")
                    .length === 0 ? (
                    <div className="profile-empty-skills">
                      No offered skills yet.
                    </div>
                  ) : (
                    <div className="profile-skill-grid">
                      {skills
                        .filter((item) => item.skill_type === "offer")
                        .map((item) => (
                          <article
                            className="profile-skill-card"
                            key={`${item.skills.id}-offer`}
                          >
                            <div className="profile-skill-card-top">
                              <h3>{item.skills.name}</h3>

                              <span className="profile-skill-level">
                                {item.moderation_status === "approved"
                                  ? "Available"
                                  : item.moderation_status}
                              </span>
                            </div>

                            <p>
                              {item.description ||
                                "Skill description not added yet."}
                            </p>

                            {isOwnProfile && (
                              <button
                                type="button"
                                className="profile-remove-skill"
                                onClick={() =>
                                  handleRemoveSkill(
                                    item.skills.id,
                                    item.skill_type,
                                  )
                                }
                                disabled={skillRemoving}
                              >
                                {skillRemoving ? "Removing..." : "Remove"}
                              </button>
                            )}
                          </article>
                        ))}
                    </div>
                  )}
                </section>

                <section className="profile-section-card">
                  <div className="profile-section-title">
                    <div>
                      <span className="profile-section-icon">◉</span>
                      <h2>Skills I Want to Learn</h2>
                    </div>

                    <span className="profile-section-count profile-count-light">
                      {
                        skills.filter((item) => item.skill_type === "want")
                          .length
                      }{" "}
                      Priority Goals
                    </span>
                  </div>

                  {skills.filter((item) => item.skill_type === "want")
                    .length === 0 ? (
                    <div className="profile-empty-skills">
                      No wanted skills yet.
                    </div>
                  ) : (
                    <div className="profile-wanted-list">
                      {skills
                        .filter((item) => item.skill_type === "want")
                        .map((item) => (
                          <article
                            className="profile-wanted-card"
                            key={`${item.skills.id}-want`}
                          >
                            <div>
                              <div className="profile-wanted-title">
                                <h3>{item.skills.name}</h3>

                                <span>High Match</span>
                              </div>

                              <p>
                                {item.description ||
                                  "Skill description not added yet."}
                              </p>
                            </div>

                            {isOwnProfile && (
                              <button
                                type="button"
                                className="profile-remove-skill"
                                onClick={() =>
                                  handleRemoveSkill(
                                    item.skills.id,
                                    item.skill_type,
                                  )
                                }
                                disabled={skillRemoving}
                              >
                                {skillRemoving ? "Removing..." : "Remove"}
                              </button>
                            )}
                          </article>
                        ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="profile-side-column">
                <section className="profile-action-card">
                  <span className="profile-side-eyebrow">
                    ◈ Direct Peer Exchange
                  </span>

                  {!isOwnProfile && (
                    <button
                      type="button"
                      className="profile-request-button"
                      onClick={() => {
                        setSwapUser({
                          user_id: profile.id,
                          profile: profile,
                          offers: skills
                            .filter((item) => item.skill_type === "offer")
                            .map((item) => item.skills.name),
                          offerSkillIds: skills
                            .filter((item) => item.skill_type === "offer")
                            .map((item) => item.skills.id),
                        });

                        setSelectedOfferedSkill("");
                        setSelectedRequestedSkill("");
                        setSwapMessage("");
                      }}
                    >
                      ⇄ Request Swap
                    </button>
                  )}

                  <p>
                    Exchange skills directly with each other — 100% free peer
                    trade.
                  </p>

                  <div className="profile-side-actions">
                    <button type="button">♡ Bookmark</button>
                    <button type="button">↗ Share</button>
                  </div>
                </section>

                <section className="profile-preferences-card">
                  <h2>Exchange Preferences</h2>

                  <div className="profile-preference">
                    <span>⌖</span>
                    <div>
                      <strong>Location</strong>
                      <p>{profile?.location || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="profile-preference">
                    <span>◷</span>
                    <div>
                      <strong>General Availability</strong>
                      <p>
                        {profile?.availability?.length > 0
                          ? profile.availability
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
                          : "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="profile-preference">
                    <span>▣</span>
                    <div>
                      <strong>Profile Visibility</strong>
                      <p>{profile?.is_public ? "Public" : "Private"}</p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
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
                    Send a request to exchange skills and learn from each other.
                  </p>
                </div>

                <button
                  type="button"
                  className="browse-modal-close"
                  onClick={() => setSwapUser(null)}
                >
                  ×
                </button>
              </div>

              <div className="browse-swap-user">
                <div className="browse-swap-user-avatar">
                  {(profile?.full_name || profile?.username || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="browse-swap-user-info">
                  <strong>
                    {profile?.full_name ||
                      profile?.username ||
                      "SkillSwap User"}
                  </strong>

                  <span>
                    @{profile?.username || "N/A"}
                    {profile?.location ? ` • ${profile.location}` : ""}
                  </span>
                </div>

                <span className="browse-swap-availability">
                  {profile?.availability?.length > 0
                    ? profile.availability
                        .map((value) => {
                          const labels = {
                            weekends: "Weekends",
                            weekday_nights: "Mon–Sat evenings",
                            evenings: "Evenings",
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
                    onChange={(e) => setSelectedRequestedSkill(e.target.value)}
                  >
                    <option value="">Select a skill</option>

                    {swapUser.offerSkillIds?.map((skillId, index) => (
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
                    {swapUser.offers?.[
                      swapUser.offerSkillIds?.indexOf(selectedRequestedSkill)
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
                  disabled={!selectedOfferedSkill || !selectedRequestedSkill}
                >
                  Send Swap Request
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Profile;
