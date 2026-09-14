import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

function Browse() {
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");
  const [swapUser, setSwapUser] = useState(null);
  const [selectedOfferedSkill, setSelectedOfferedSkill] = useState("");
  const [selectedRequestedSkill, setSelectedRequestedSkill] = useState("");
  const [swapMessage, setSwapMessage] = useState("");
  const [myOfferedSkills, setMyOfferedSkills] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchBrowseData = async () => {
      setRecommendationLoading(true);
      setRecommendationError("");

      const { data: skillsData, error: skillsError } = await supabase
        .from("skills")
        .select("id, name")
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
        .select("id, full_name, username, location, availability")
        .in("id", recommendedUserIds);

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

  const handleSendSwapRequest = async () => {
    console.log("Send Swap Request clicked");

    if (!swapUser || !selectedOfferedSkill || !selectedRequestedSkill) {
      console.log("Swap request validation failed");
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
      return;
    }

    console.log("Swap request created:", data);
  };

  return (
    <div>
      <h1>Browse Skills</h1>
      <p>Find people to swap skills with.</p>

      <div>
        <input
          type="text"
          placeholder="Search by skill..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
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

        <button
          type="button"
          onClick={async () => {
            setSearchLoading(true);

            const { data: sessionData } = await supabase.auth.getSession();

            const currentUserId = sessionData.session?.user?.id;

            const selectedSkillName = availableSkills.find(
              (skill) => skill.id === selectedSkill,
            )?.name;

            const skillName = selectedSkillName || searchTerm.trim();

            if (!skillName) {
              setSearchLoading(false);
              setSubmittedSearch("");
              setSearchResults([]);
              return;
            }

            setSubmittedSearch(skillName);

            const { data, error } = await supabase
              .from("user_skills")
              .select("user_id, skill_id, skill_type")
              .eq("skill_type", "offer");

            if (error) {
              console.error("User search error:", error);
              setSearchLoading(false);
              return;
            }

            const enrichedResults = (data || [])
              .filter((result) => result.user_id !== currentUserId)
              .map((result) => ({
                ...result,
                skills:
                  availableSkills.find(
                    (skill) => skill.id === result.skill_id,
                  ) || null,
              }))
              .filter((result) =>
                result.skills?.name
                  ?.toLowerCase()
                  .includes(skillName.toLowerCase()),
              );

            setSearchResults(enrichedResults);
            setSearchLoading(false);
          }}
        >
          Search
        </button>

        {submittedSearch && <p>Searching for: {submittedSearch}</p>}

        <div>
          <h2>Recommended Users</h2>

          {recommendationLoading ? (
            <p>Loading recommendations...</p>
          ) : recommendationError ? (
            <p>{recommendationError}</p>
          ) : recommendedUsers.length === 0 ? (
            <p>No recommendations available.</p>
          ) : (
            <div>
              {recommendedUsers.map((user) => (
                <div key={user.user_id}>
                  <h3>
                    {user.profile?.full_name ||
                      user.profile?.username ||
                      "Unknown User"}
                  </h3>

                  <p>Username: @{user.profile?.username || "N/A"}</p>

                  <p>Location: {user.profile?.location || "Not provided"}</p>

                  <p>
                    Availability:{" "}
                    {user.profile?.availability?.length > 0
                      ? user.profile.availability
                          .map((value) => {
                            const labels = {
                              weekends: "Weekends",
                              weekday_nights: "Monday–Saturday, 8 PM–10 PM",
                              evenings: "Monday–Friday, 6 PM–8 PM",
                              weekday_mornings: "Monday–Friday, 7 AM–9 AM",
                            };

                            return labels[value] || value;
                          })
                          .join(", ")
                      : "Not provided"}
                  </p>

                  <p>
                    Offers:{" "}
                    {user.offers.length > 0
                      ? user.offers.join(", ")
                      : "No skills listed"}
                  </p>

                  <p>
                    Wants:{" "}
                    {user.wants.length > 0
                      ? user.wants.join(", ")
                      : "No skills listed"}
                  </p>

                  <p>Match Score: {user.matchScore}</p>
                  <button onClick={() => navigate(`/profile/${user.user_id}`)}>
                    View Profile
                  </button>
                  <button
                    type="button"
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
              ))}
              {swapUser && (
                <div>
                  <h2>Request Swap</h2>

                  <h3>
                    Requesting swap with:{" "}
                    {swapUser.profile?.full_name ||
                      swapUser.profile?.username ||
                      "Unknown User"}
                  </h3>

                  <div>
                    <label>Skill I will offer</label>

                    <select
                      value={selectedOfferedSkill}
                      onChange={(e) => setSelectedOfferedSkill(e.target.value)}
                    >
                      <option value="">Select a skill</option>

                      {myOfferedSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Skill I want to learn</label>

                    <select
                      value={selectedRequestedSkill}
                      onChange={(e) =>
                        setSelectedRequestedSkill(e.target.value)
                      }
                    >
                      <option value="">Select a skill</option>

                      {swapUser.wantSkillIds.map((skillId, index) => (
                        <option key={skillId} value={skillId}>
                          {swapUser.wants[index]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Message</label>

                    <textarea
                      placeholder="Write a message..."
                      value={swapMessage}
                      onChange={(e) => setSwapMessage(e.target.value)}
                    />
                  </div>

                  <button type="button" onClick={handleSendSwapRequest}>
                    Send Swap Request
                  </button>

                  <button type="button" onClick={() => setSwapUser(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {searchLoading ? (
          <p>Searching...</p>
        ) : submittedSearch && searchResults.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div>
            {searchResults.map((result) => (
              <div key={`${result.user_id}-${result.skills?.id || "unknown"}`}>
                <h3>User ID: {result.user_id}</h3>
                <p>Offers: {result.skills?.name || "Unknown skill"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Browse;
