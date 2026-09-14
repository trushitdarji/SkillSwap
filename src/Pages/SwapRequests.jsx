import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function SwapRequests() {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileNames, setProfileNames] = useState({});
  const [skillNames, setSkillNames] = useState({});

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

  return (
    <div>
      <h1>Swap Requests</h1>
      <h2>Incoming Requests</h2>

      {incomingRequests.length === 0 ? (
        <p>No incoming requests.</p>
      ) : (
        incomingRequests.map((request) => (
          <div key={request.id}>
            <p>From: {profileNames[request.sender_id] || "Loading..."}</p>
            <p>
              You offer: {skillNames[request.offered_skill_id] || "Loading..."}
            </p>

            <p>
              You want: {skillNames[request.requested_skill_id] || "Loading..."}
            </p>
            <p>Request ID: {request.id}</p>
            <p>Status: {request.status}</p>
            {request.status === "pending" && (
              <button type="button" onClick={() => handleAccept(request.id)}>
                Accept
              </button>
            )}
            {request.status === "pending" && (
              <button type="button" onClick={() => handleReject(request.id)}>
                Reject
              </button>
            )}

            {request.status === "accepted" &&
              !request.receiver_completed_at && (
                <button
                  type="button"
                  onClick={() => handleComplete(request.id)}
                >
                  Mark as Completed
                </button>
              )}

            {request.message && <p>Message: {request.message}</p>}
          </div>
        ))
      )}
      <h2>Outgoing Requests</h2>

      {outgoingRequests.length === 0 ? (
        <p>No outgoing requests.</p>
      ) : (
        outgoingRequests.map((request) => (
          <div key={request.id}>
            <p>To: {profileNames[request.receiver_id] || "Loading..."}</p>
            <p>
              You offer: {skillNames[request.offered_skill_id] || "Loading..."}
            </p>

            <p>
              You want: {skillNames[request.requested_skill_id] || "Loading..."}
            </p>
            <p>Request ID: {request.id}</p>
            <p>Status: {request.status}</p>
            {request.status === "pending" && (
              <button type="button" onClick={() => handleCancel(request.id)}>
                Cancel
              </button>
            )}

            {request.status === "accepted" && !request.sender_completed_at && (
              <button type="button" onClick={() => handleComplete(request.id)}>
                Mark as Completed
              </button>
            )}

            {request.message && <p>Message: {request.message}</p>}
          </div>
        ))
      )}
    </div>
  );
}

export default SwapRequests;
