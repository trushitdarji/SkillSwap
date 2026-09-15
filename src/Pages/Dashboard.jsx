import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Dashboard() {
  const [currentUserId, setCurrentUserId] = useState(null);

  const navigate = useNavigate();

  const [pendingRequests, setPendingRequests] = useState([]);
  const [currentSwaps, setCurrentSwaps] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [completingSwapId, setCompletingSwapId] = useState(null);
  const [ratingSwap, setRatingSwap] = useState(null);
  const [ratingValue, setRatingValue] = useState("");
  const [feedback, setFeedback] = useState("");

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

    setCurrentSwaps((currentSwaps) =>
      currentSwaps.map((currentSwap) =>
        currentSwap.id === swap.id ? data : currentSwap,
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

      setCurrentUserId(data.session.user.id);

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
        .eq("receiver_id", currentUserId)
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
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .in("status", ["accepted", "completed"]);

      if (swapsError) {
        console.error("Current swaps error:", swapsError);
        return;
      }

      setCurrentSwaps(acceptedSwaps);

      console.log("Current User ID:", currentUserId);
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
        .eq("sender_id", currentUserId)
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
    };

    checkSession();
  }, []);

  return (
    <div>
      <h1>SkillSwap Dashboard</h1>
      <p>Welcome to SkillSwap</p>
      <h2>Pending Swap Requests</h2>

      {pendingRequests?.length === 0 ? (
        <p>No pending swap requests.</p>
      ) : (
        pendingRequests?.map((request) => (
          <div key={request.id}>
            <p>From: {request.sender?.full_name}</p>
            <p>Username: @{request.sender?.username}</p>
            <p>Offering: {request.offered_skill?.name}</p>
            <p>Wants to learn: {request.requested_skill?.name}</p>
            <p>Message: {request.message || "No message"}</p>
            <button type="button" onClick={() => handleAcceptSwap(request.id)}>
              Accept
            </button>
            <button type="button" onClick={() => handleRejectSwap(request.id)}>
              Reject
            </button>
            <hr />
          </div>
        ))
      )}

      <h2>Sent Swap Requests</h2>

      {sentRequests.length === 0 ? (
        <p>No sent swap requests.</p>
      ) : (
        sentRequests.map((request) => (
          <div key={request.id}>
            <p>To: {request.receiver?.full_name}</p>
            <p>Username: @{request.receiver?.username}</p>
            <p>Offering: {request.offered_skill?.name}</p>
            <p>Wants to learn: {request.requested_skill?.name}</p>
            <p>Message: {request.message || "No message"}</p>
            <p>Status: {request.status}</p>

            <button type="button" onClick={() => handleCancelSwap(request.id)}>
              Cancel Request
            </button>
            <hr />
          </div>
        ))
      )}

      <h2>Current Swaps</h2>

      {currentSwaps.length === 0 ? (
        <p>No current swaps.</p>
      ) : (
        currentSwaps.map((swap) => (
          <div key={swap.id}>
            <p>
              With:{" "}
              {swap.sender_id === currentUserId
                ? swap.receiver?.full_name
                : swap.sender?.full_name}
            </p>

            <p>
              Username: @
              {swap.sender_id === currentUserId
                ? swap.receiver?.username
                : swap.sender?.username}
            </p>

            <p>Offering: {swap.offered_skill?.name}</p>
            <p>Wants to learn: {swap.requested_skill?.name}</p>
            <p>Status: {swap.status}</p>

            {swap.status === "completed" && (
              <button type="button" onClick={() => setRatingSwap(swap)}>
                Rate User
              </button>
            )}

            {ratingSwap?.id === swap.id && (
              <div>
                <h3>Rate User</h3>

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

                <button type="button" onClick={handleSubmitRating}>
                  Submit Rating
                </button>
              </div>
            )}

            {swap.status === "accepted" && (
              <button
                type="button"
                onClick={() => handleCompleteSwap(swap)}
                disabled={completingSwapId === swap.id}
              >
                {completingSwapId === swap.id
                  ? "Completing..."
                  : "Complete Swap"}
              </button>
            )}

            {swap.status === "completed" && <p>Completed ✓</p>}

            <hr />
          </div>
        ))
      )}

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;
