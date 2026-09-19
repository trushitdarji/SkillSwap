import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./SwapRequests.css";

function SwapRequests() {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ratingRequest, setRatingRequest] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratedRequests, setRatedRequests] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileNames, setProfileNames] = useState({});
  const [skillNames, setSkillNames] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [feedback, setFeedback] = useState("");
  const allRequests = [...incomingRequests, ...outgoingRequests];

  const requestCounts = {
    all: allRequests.length,
    pending: allRequests.filter((request) => request.status === "pending")
      .length,
    accepted: allRequests.filter((request) => request.status === "accepted")
      .length,
    completed: allRequests.filter((request) => request.status === "completed")
      .length,
  };

  const getProfileName = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error);
      return "Unknown User";
    }

    return data?.full_name || data?.username || "Unknown User";
  };

  const getSkillName = async (skillId) => {
    const { data, error } = await supabase
      .from("skills")
      .select("name")
      .eq("id", skillId)
      .maybeSingle();

    if (error) {
      console.error("Skill fetch error:", error);
      return "Unknown Skill";
    }

    return data?.name || "Unknown Skill";
  };

  const handleAccept = async (requestId) => {
    const { error } = await supabase
      .from("swap_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) {
      setError(error.message);
      return;
    }

    setIncomingRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.id === requestId ? { ...request, status: "accepted" } : request,
      ),
    );
  };

  const handleReject = async (requestId) => {
    const { error } = await supabase
      .from("swap_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      setError(error.message);
      return;
    }

    setIncomingRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.id === requestId ? { ...request, status: "rejected" } : request,
      ),
    );
  };

  const handleCancel = async (requestId) => {
    const { error } = await supabase
      .from("swap_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId);

    if (error) {
      setError(error.message);
      return;
    }

    setOutgoingRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.id === requestId
          ? { ...request, status: "cancelled" }
          : request,
      ),
    );
  };

  const handleComplete = async (requestId) => {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user?.id) {
      setError("User session not found.");
      return;
    }

    const currentUserId = sessionData.session.user.id;

    const request = [...incomingRequests, ...outgoingRequests].find(
      (item) => item.id === requestId,
    );

    if (!request) {
      setError("Swap request not found.");
      return;
    }

    const updateData =
      request.sender_id === currentUserId
        ? { sender_completed_at: new Date().toISOString() }
        : { receiver_completed_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from("swap_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setIncomingRequests((prevRequests) =>
      prevRequests.map((item) => (item.id === requestId ? data : item)),
    );

    setOutgoingRequests((prevRequests) =>
      prevRequests.map((item) => (item.id === requestId ? data : item)),
    );
  };

  const handleSubmitRating = async (rating, feedback) => {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user?.id) {
      setError("User session not found.");
      return;
    }

    const currentUserId = sessionData.session.user.id;
    const request = ratingRequest;

    if (!request) {
      setError("Rating request not found.");
      return;
    }

    const revieweeId =
      request.sender_id === currentUserId
        ? request.receiver_id
        : request.sender_id;

    const { error } = await supabase.from("ratings").insert({
      swap_request_id: request.id,
      reviewer_id: currentUserId,
      reviewee_id: revieweeId,
      rating: Number(rating),
      feedback: feedback.trim() || null,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setRatedRequests((prev) => [...prev, request.id]);
    setRatingRequest(null);
    setSelectedRating(0);
    setFeedback("");
  };

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError("");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.user?.id) {
        setError("User session not found.");
        setLoading(false);
        return;
      }

      const currentUserId = sessionData.session.user.id;
      setCurrentUserId(currentUserId);

      const { data: existingRatings, error: ratingsError } = await supabase
        .from("ratings")
        .select("swap_request_id")
        .eq("reviewer_id", currentUserId);

      if (ratingsError) {
        setError(ratingsError.message);
        setLoading(false);
        return;
      }

      setRatedRequests(
        (existingRatings || []).map((rating) => rating.swap_request_id),
      );

      const { data: incoming, error: incomingError } = await supabase
        .from("swap_requests")
        .select("*")
        .eq("receiver_id", currentUserId);

      if (incomingError) {
        setError(incomingError.message);
        setLoading(false);
        return;
      }

      setIncomingRequests(incoming || []);
      const names = {};

      for (const request of incoming || []) {
        names[request.sender_id] = await getProfileName(request.sender_id);
      }

      setProfileNames(names);

      const skills = {};

      for (const request of incoming || []) {
        skills[request.offered_skill_id] = await getSkillName(
          request.offered_skill_id,
        );

        skills[request.requested_skill_id] = await getSkillName(
          request.requested_skill_id,
        );
      }

      const { data: outgoing, error: outgoingError } = await supabase
        .from("swap_requests")
        .select("*")
        .eq("sender_id", currentUserId);

      if (outgoingError) {
        setError(outgoingError.message);
        setLoading(false);
        return;
      }

      for (const request of outgoing || []) {
        names[request.receiver_id] = await getProfileName(request.receiver_id);
      }

      setProfileNames(names);

      for (const request of outgoing || []) {
        skills[request.offered_skill_id] = await getSkillName(
          request.offered_skill_id,
        );

        skills[request.requested_skill_id] = await getSkillName(
          request.requested_skill_id,
        );
      }

      setSkillNames(skills);

      setOutgoingRequests(outgoing || []);

      setLoading(false);
    };

    fetchRequests();
  }, []);

  if (loading) {
    return <p>Loading requests...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  const revieweeId = ratingRequest
    ? ratingRequest.sender_id === currentUserId
      ? ratingRequest.receiver_id
      : ratingRequest.sender_id
    : null;

  const filteredIncomingRequests =
    activeFilter === "all"
      ? incomingRequests
      : incomingRequests.filter((request) => request.status === activeFilter);

  const filteredOutgoingRequests =
    activeFilter === "all"
      ? outgoingRequests
      : outgoingRequests.filter((request) => request.status === activeFilter);

  return (
    <div className="swap-page">
      {/* Page Header */}
      <section className="swap-page-header">
        <div>
          <span className="swap-eyebrow">PEER EXCHANGE</span>

          <h1>Swap Requests</h1>

          <p>
            Coordinate, accept, and rate your collaborative 1-on-1 knowledge
            trades with fellow campus creators.
          </p>
        </div>

        <div className="swap-status-tabs">
          <button
            className={activeFilter === "all" ? "active" : ""}
            onClick={() => setActiveFilter("all")}
          >
            All <span>{requestCounts.all}</span>
          </button>

          <button
            className={activeFilter === "pending" ? "active" : ""}
            onClick={() => setActiveFilter("pending")}
          >
            Pending <span>{requestCounts.pending}</span>
          </button>

          <button
            className={activeFilter === "accepted" ? "active" : ""}
            onClick={() => setActiveFilter("accepted")}
          >
            Accepted <span>{requestCounts.accepted}</span>
          </button>

          <button
            className={activeFilter === "completed" ? "active" : ""}
            onClick={() => setActiveFilter("completed")}
          >
            Completed <span>{requestCounts.completed}</span>
          </button>
        </div>
      </section>

      {/* Request Type Tabs */}
      <div className="swap-request-tabs">
        <div className="swap-request-tab active">
          <span className="swap-tab-icon">↙</span>
          <div>
            <small>QUEUE</small>
            <strong>Incoming Requests</strong>
          </div>
          <span className="swap-tab-count">{incomingRequests.length}</span>
        </div>

        <div className="swap-request-tab">
          <span className="swap-tab-icon">↗</span>
          <div>
            <small>SENT</small>
            <strong>Outgoing Requests</strong>
          </div>
          <span className="swap-tab-count">{outgoingRequests.length}</span>
        </div>
      </div>

      {/* Incoming Requests */}
      <section className="swap-section">
        <div className="swap-section-header">
          <h2>
            Incoming Requests
            <span>
              {filteredIncomingRequests.length}{" "}
              {activeFilter === "all" ? "Active" : activeFilter}
            </span>
          </h2>

          <p>Peers asking to learn your skills</p>
        </div>

        {filteredIncomingRequests.length === 0 ? (
          <div className="swap-empty-state">
            <div className="swap-empty-icon">↙</div>
            <h3>No incoming requests yet</h3>
            <p>New skill swap requests will appear here.</p>
          </div>
        ) : (
          <div className="swap-request-list">
            {filteredIncomingRequests.map((request) => (
              <article
                className={`swap-request-card ${
                  request.status === "rejected" ? "is-rejected" : ""
                }`}
                key={request.id}
              >
                {/* Card Top */}
                <div className="swap-card-top">
                  <div className="swap-user-info">
                    <div className="swap-avatar">
                      {(profileNames[request.sender_id] || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <div className="swap-name-row">
                        <strong>
                          {profileNames[request.sender_id] || "Unknown User"}
                        </strong>

                        <span className="swap-request-id">
                          #REQ-{request.id.slice(0, 8)}
                        </span>
                      </div>

                      <p>wants to swap skills with you</p>
                    </div>
                  </div>

                  <span
                    className={`swap-status-badge status-${request.status}`}
                  >
                    {request.status === "pending" && "● Pending Response"}

                    {request.status === "accepted" && "● Accepted & Active"}

                    {request.status === "rejected" && "⊘ Declined"}

                    {request.status === "cancelled" && "⊘ Cancelled"}

                    {request.status === "completed" && "✓ Completed"}
                  </span>
                </div>

                {/* Skill Exchange */}
                <div className="swap-skills-box">
                  <div className="swap-skill-column">
                    <span>
                      {(
                        profileNames[request.sender_id] || "USER"
                      ).toUpperCase()}{" "}
                      TEACHES YOU
                    </span>

                    <div className="swap-skill">
                      <span>✎</span>
                      {skillNames[request.offered_skill_id] || "Unknown Skill"}
                    </div>
                  </div>

                  <div className="swap-exchange-icon">⇄</div>

                  <div className="swap-skill-column">
                    <span>YOU TEACH</span>

                    <div className="swap-skill">
                      <span>⌘</span>
                      {skillNames[request.requested_skill_id] ||
                        "Unknown Skill"}
                    </div>
                  </div>
                </div>

                {/* Message */}
                {request.message && (
                  <div className="swap-message">“{request.message}”</div>
                )}

                {/* Card Bottom */}
                <div className="swap-card-bottom">
                  <span className="swap-request-meta">
                    ◷ Request #{request.id.slice(0, 8)}
                  </span>

                  <div className="swap-actions">
                    {request.status === "pending" && (
                      <>
                        <button
                          className="swap-btn swap-btn-secondary"
                          onClick={() => handleReject(request.id)}
                        >
                          × Reject
                        </button>

                        <button
                          className="swap-btn swap-btn-primary"
                          onClick={() => handleAccept(request.id)}
                        >
                          ✓ Accept Swap
                        </button>
                      </>
                    )}

                    {request.status === "accepted" &&
                      !request.receiver_completed_at && (
                        <button
                          className="swap-btn swap-btn-primary"
                          onClick={() => handleComplete(request.id)}
                        >
                          ✓ Mark as Completed
                        </button>
                      )}

                    {request.status === "completed" &&
                      !ratedRequests.includes(request.id) && (
                        <button
                          className="swap-btn swap-btn-primary"
                          onClick={() => {
                            setRatingRequest(request);
                            setSelectedRating(0);
                          }}
                        >
                          ☆ Rate User
                        </button>
                      )}

                    {request.status === "completed" &&
                      ratedRequests.includes(request.id) && (
                        <span className="swap-rated">☆ Rated</span>
                      )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Outgoing Requests */}
      <section className="swap-section">
        <div className="swap-section-header">
          <h2>
            Outgoing Requests
            <span>
              {filteredOutgoingRequests.length}{" "}
              {activeFilter === "all" ? "Active" : activeFilter}
            </span>
          </h2>

          <p>Requests you proposed to peers</p>
        </div>

        {filteredOutgoingRequests.length === 0 ? (
          <div className="swap-empty-state">
            <div className="swap-empty-icon">↗</div>
            <h3>No outgoing requests yet</h3>
            <p>Requests you send will appear here.</p>
          </div>
        ) : (
          <div className="swap-request-list">
            {filteredOutgoingRequests.map((request) => (
              <article
                className={`swap-request-card ${
                  request.status === "rejected" ? "is-rejected" : ""
                }`}
                key={request.id}
              >
                {/* Card Top */}
                <div className="swap-card-top">
                  <div className="swap-user-info">
                    <div className="swap-avatar">
                      {(profileNames[request.receiver_id] || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <div className="swap-name-row">
                        <strong>
                          {profileNames[request.receiver_id] || "Unknown User"}
                        </strong>

                        <span className="swap-request-id">
                          #REQ-{request.id.slice(0, 8)}
                        </span>
                      </div>

                      <p>Request sent by you</p>
                    </div>
                  </div>

                  <span
                    className={`swap-status-badge status-${request.status}`}
                  >
                    {request.status === "pending" &&
                      "● Awaiting Partner Response"}

                    {request.status === "accepted" && "● Request Accepted"}

                    {request.status === "rejected" && "⊘ Declined"}

                    {request.status === "cancelled" && "⊘ Cancelled"}

                    {request.status === "completed" && "✓ Completed"}
                  </span>
                </div>

                {/* Skill Exchange */}
                <div className="swap-skills-box">
                  <div className="swap-skill-column">
                    <span>YOU OFFER</span>

                    <div className="swap-skill">
                      <span>▣</span>
                      {skillNames[request.offered_skill_id] || "Unknown Skill"}
                    </div>
                  </div>

                  <div className="swap-exchange-icon">→</div>

                  <div className="swap-skill-column">
                    <span>
                      YOU REQUEST FROM{" "}
                      {(
                        profileNames[request.receiver_id] || "USER"
                      ).toUpperCase()}
                    </span>

                    <div className="swap-skill">
                      <span>◉</span>
                      {skillNames[request.requested_skill_id] ||
                        "Unknown Skill"}
                    </div>
                  </div>
                </div>

                {/* Message */}
                {request.message && (
                  <div className="swap-message">“{request.message}”</div>
                )}

                {/* Card Bottom */}
                <div className="swap-card-bottom">
                  <span className="swap-request-meta">
                    ◷ Request #{request.id.slice(0, 8)}
                  </span>

                  <div className="swap-actions">
                    {request.status === "pending" && (
                      <button
                        className="swap-btn swap-btn-secondary"
                        onClick={() => handleCancel(request.id)}
                      >
                        ⊗ Cancel Request
                      </button>
                    )}

                    {request.status === "accepted" &&
                      !request.sender_completed_at && (
                        <button
                          className="swap-btn swap-btn-primary"
                          onClick={() => handleComplete(request.id)}
                        >
                          ✓ Mark as Completed
                        </button>
                      )}

                    {request.status === "completed" &&
                      !ratedRequests.includes(request.id) && (
                        <button
                          className="swap-btn swap-btn-primary"
                          onClick={() => {
                            setRatingRequest(request);
                            setSelectedRating(0);
                          }}
                        >
                          ☆ Rate User
                        </button>
                      )}

                    {request.status === "completed" &&
                      ratedRequests.includes(request.id) && (
                        <span className="swap-rated">☆ Rated</span>
                      )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Rating Modal */}
      {ratingRequest && (
        <div className="swap-modal-overlay">
          <div className="swap-rating-modal">
            <button
              className="swap-modal-close"
              onClick={() => {
                setRatingRequest(null);
                setSelectedRating(0);
              }}
            >
              ×
            </button>

            <h2>Rate User</h2>

            <p>
              How was your skill swap experience with{" "}
              <strong>
                {ratingRequest.sender_id === currentUserId
                  ? profileNames[ratingRequest.receiver_id]
                  : profileNames[ratingRequest.sender_id]}
              </strong>
            </p>

            <div className="swap-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={star <= selectedRating ? "selected" : ""}
                  onClick={() => setSelectedRating(star)}
                >
                  ★
                </button>
              ))}
            </div>

            <label htmlFor="feedback">Feedback</label>

            <textarea
              id="feedback"
              placeholder="Share your experience..."
              rows="4"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
            />

            <div className="swap-modal-actions">
              <button
                className="swap-btn swap-btn-secondary"
                onClick={() => {
                  setRatingRequest(null);
                  setSelectedRating(0);
                }}
              >
                Cancel
              </button>

              <button
                className="swap-btn swap-btn-primary"
                onClick={() => {
                  if (!selectedRating) {
                    setError("Please select a rating.");
                    return;
                  }

                  handleSubmitRating(selectedRating, feedback);
                }}
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SwapRequests;
