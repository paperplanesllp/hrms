const USER_STATUS = {
  AVAILABLE: "available",
  RINGING: "ringing",
  IN_CALL: "in_call",
  OFFLINE: "offline",
};

const CALL_STATUS = {
  INITIATING: "initiating",
  RINGING: "ringing",
  IN_CALL: "in_call",
  REJECTED: "rejected",
  ENDED: "ended",
  TIMEOUT: "timeout",
  FAILED: "failed",
};

const userStates = new Map(); // Map<userId, state>
const activeCalls = new Map(); // Map<callId, call>
const userSocketIds = new Map(); // Map<userId, Set<socketId>>

const toKey = (value) => String(value || "").trim();

const ensureUserState = (userId) => {
  const key = toKey(userId);
  if (!key) return null;

  if (!userStates.has(key)) {
    userStates.set(key, {
      userId: key,
      status: USER_STATUS.OFFLINE,
      currentCallId: null,
      callerId: null,
      receiverId: null,
      startedAt: null,
      updatedAt: new Date(),
    });
  }

  return userStates.get(key);
};

const getSocketCount = (userId) => {
  const key = toKey(userId);
  return userSocketIds.get(key)?.size || 0;
};

const isOnlineBySockets = (userId) => getSocketCount(userId) > 0;

const setAvailableOrOffline = (userId) => {
  const state = ensureUserState(userId);
  if (!state) return;

  state.status = isOnlineBySockets(userId) ? USER_STATUS.AVAILABLE : USER_STATUS.OFFLINE;
  state.currentCallId = null;
  state.callerId = null;
  state.receiverId = null;
  state.startedAt = null;
  state.updatedAt = new Date();
};

const setRinging = (userId, payload) => {
  const state = ensureUserState(userId);
  if (!state) return;

  state.status = USER_STATUS.RINGING;
  state.currentCallId = payload.callId;
  state.callerId = payload.callerId;
  state.receiverId = payload.receiverId;
  state.startedAt = payload.startedAt;
  state.updatedAt = new Date();
};

const setInCall = (userId, payload) => {
  const state = ensureUserState(userId);
  if (!state) return;

  state.status = USER_STATUS.IN_CALL;
  state.currentCallId = payload.callId;
  state.callerId = payload.callerId;
  state.receiverId = payload.receiverId;
  state.startedAt = payload.startedAt;
  state.updatedAt = new Date();
};

const isBusyStatus = (status) => status === USER_STATUS.RINGING || status === USER_STATUS.IN_CALL;

export const registerUserSocket = (userId, socketId) => {
  const userKey = toKey(userId);
  const socketKey = toKey(socketId);
  if (!userKey || !socketKey) return;

  if (!userSocketIds.has(userKey)) {
    userSocketIds.set(userKey, new Set());
  }

  userSocketIds.get(userKey).add(socketKey);

  console.log("[CallManager] registerUserSocket", {
    userId: userKey,
    socketId: socketKey,
    socketCount: userSocketIds.get(userKey).size,
  });

  const state = ensureUserState(userKey);
  if (!isBusyStatus(state.status)) {
    state.status = USER_STATUS.AVAILABLE;
    state.updatedAt = new Date();
  }
};

export const unregisterUserSocket = (userId, socketId) => {
  const userKey = toKey(userId);
  const socketKey = toKey(socketId);
  if (!userKey || !socketKey) return;

  const sockets = userSocketIds.get(userKey);
  if (!sockets) return;

  sockets.delete(socketKey);
  console.log("[CallManager] unregisterUserSocket", {
    userId: userKey,
    socketId: socketKey,
    remainingSocketCount: sockets.size,
  });

  if (sockets.size === 0) {
    userSocketIds.delete(userKey);
    const state = ensureUserState(userKey);
    if (state && !isBusyStatus(state.status)) {
      state.status = USER_STATUS.OFFLINE;
      state.updatedAt = new Date();
    }
  }
};

export const isUserOnline = (userId) => isOnlineBySockets(userId);

export const hasUserSocket = (userId) => isOnlineBySockets(userId);

export const getUserSocketSnapshot = (userId) => {
  const key = toKey(userId);
  const sockets = Array.from(userSocketIds.get(key) || []);
  return {
    userId: key,
    socketCount: sockets.length,
    socketIds: sockets,
    hasSocket: sockets.length > 0,
  };
};

export const isUserBusy = (userId) => {
  const state = ensureUserState(userId);
  return state ? isBusyStatus(state.status) : false;
};

export const getUserState = (userId) => {
  const state = ensureUserState(userId);
  if (!state) return null;
  return { ...state };
};

export const getCallState = (callId) => {
  const call = activeCalls.get(toKey(callId));
  return call ? { ...call } : null;
};

export const startRinging = ({ callId, callerId, receiverId, callType, conversationId }) => {
  const normalizedCallId = toKey(callId);
  const normalizedCallerId = toKey(callerId);
  const normalizedReceiverId = toKey(receiverId);

  if (!normalizedCallId || !normalizedCallerId || !normalizedReceiverId) {
    return { ok: false, code: "INVALID_CALL_PAYLOAD" };
  }

  if (normalizedCallerId === normalizedReceiverId) {
    return { ok: false, code: "INVALID_CALL_TARGET" };
  }

  if (isUserBusy(normalizedCallerId)) {
    return { ok: false, code: "SELF_BUSY" };
  }

  if (isUserBusy(normalizedReceiverId)) {
    return { ok: false, code: "USER_BUSY" };
  }

  const startedAt = new Date();
  const call = {
    callId: normalizedCallId,
    callerId: normalizedCallerId,
    receiverId: normalizedReceiverId,
    callType,
    conversationId: conversationId || null,
    startedAt,
    status: CALL_STATUS.INITIATING,
    delivery: {
      mode: "pending",
      attemptedAt: new Date(),
      deliveredAt: null,
      pushSentAt: null,
      failureReason: null,
    },
    expiresAt: null,
    acceptedAt: null,
  };

  activeCalls.set(normalizedCallId, call);
  setRinging(normalizedCallerId, call);

  if (isOnlineBySockets(normalizedReceiverId)) {
    setRinging(normalizedReceiverId, call);
  } else {
    setAvailableOrOffline(normalizedReceiverId);
  }

  return { ok: true, call: { ...call } };
};

export const setCallExpiresAt = (callId, expiresAt) => {
  const normalizedCallId = toKey(callId);
  const call = activeCalls.get(normalizedCallId);
  if (!call) return { ok: false, code: "CALL_NOT_FOUND" };

  call.expiresAt = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return { ok: true, call: { ...call } };
};

export const markCallDelivery = ({ callId, mode, failureReason = null }) => {
  const normalizedCallId = toKey(callId);
  const call = activeCalls.get(normalizedCallId);
  if (!call) return { ok: false, code: "CALL_NOT_FOUND" };

  call.delivery = {
    ...(call.delivery || {}),
    mode,
    attemptedAt: call.delivery?.attemptedAt || new Date(),
    deliveredAt: mode === "realtime-delivered" ? new Date() : call.delivery?.deliveredAt || null,
    pushSentAt: mode === "push-sent" ? new Date() : call.delivery?.pushSentAt || null,
    failureReason,
  };

  if (mode === "realtime-delivered") {
    call.status = CALL_STATUS.RINGING;
    setRinging(call.receiverId, call);
    setRinging(call.callerId, call);
  }

  return { ok: true, call: { ...call } };
};

export const acceptCall = (callId, userId) => {
  const normalizedCallId = toKey(callId);
  const normalizedUserId = toKey(userId);
  const call = activeCalls.get(normalizedCallId);
  if (!call) return { ok: false, code: "CALL_NOT_FOUND" };

  if (call.status !== CALL_STATUS.RINGING && call.status !== CALL_STATUS.INITIATING) {
    return { ok: false, code: "CALL_NOT_AVAILABLE" };
  }

  if (![call.callerId, call.receiverId].includes(normalizedUserId)) {
    return { ok: false, code: "CALL_PARTICIPANT_MISMATCH" };
  }

  call.status = CALL_STATUS.IN_CALL;
  call.acceptedAt = new Date();

  setInCall(call.callerId, call);
  setInCall(call.receiverId, call);

  return { ok: true, call: { ...call } };
};

export const rejectCall = (callId) => {
  const normalizedCallId = toKey(callId);
  const call = activeCalls.get(normalizedCallId);
  if (!call) return { ok: false, code: "CALL_NOT_FOUND" };

  call.status = CALL_STATUS.REJECTED;
  activeCalls.delete(normalizedCallId);
  setAvailableOrOffline(call.callerId);
  setAvailableOrOffline(call.receiverId);
  return { ok: true, call: { ...call } };
};

export const missCall = (callId) => {
  const normalizedCallId = toKey(callId);
  const call = activeCalls.get(normalizedCallId);
  if (!call) return { ok: false, code: "CALL_NOT_FOUND" };

  call.status = CALL_STATUS.TIMEOUT;
  activeCalls.delete(normalizedCallId);
  setAvailableOrOffline(call.callerId);
  setAvailableOrOffline(call.receiverId);
  return { ok: true, call: { ...call } };
};

export const endCall = (callId) => {
  const normalizedCallId = toKey(callId);
  const call = activeCalls.get(normalizedCallId);
  if (!call) return { ok: false, code: "CALL_NOT_FOUND" };

  call.status = CALL_STATUS.ENDED;
  activeCalls.delete(normalizedCallId);
  setAvailableOrOffline(call.callerId);
  setAvailableOrOffline(call.receiverId);
  return { ok: true, call: { ...call } };
};

export const failCall = (callId, reason = "UNKNOWN") => {
  const normalizedCallId = toKey(callId);
  const call = activeCalls.get(normalizedCallId);
  if (!call) return { ok: false, code: "CALL_NOT_FOUND" };

  call.status = CALL_STATUS.FAILED;
  call.delivery = {
    ...(call.delivery || {}),
    mode: "failed",
    failureReason: reason,
  };

  activeCalls.delete(normalizedCallId);
  setAvailableOrOffline(call.callerId);
  setAvailableOrOffline(call.receiverId);
  return { ok: true, call: { ...call } };
};

export const cleanupUserCallState = (userId) => {
  const state = ensureUserState(userId);
  if (!state?.currentCallId) {
    return { ok: true, call: null, peerUserId: null };
  }

  const active = activeCalls.get(state.currentCallId);
  if (!active) {
    setAvailableOrOffline(userId);
    return { ok: true, call: null, peerUserId: null };
  }

  const peerUserId = active.callerId === toKey(userId) ? active.receiverId : active.callerId;
  activeCalls.delete(active.callId);
  setAvailableOrOffline(active.callerId);
  setAvailableOrOffline(active.receiverId);
  return { ok: true, call: { ...active }, peerUserId };
};

export const getCallManagerSnapshot = () => ({
  users: Array.from(userStates.values()).map((state) => ({ ...state })),
  activeCalls: Array.from(activeCalls.values()).map((call) => ({ ...call })),
});

export const CALL_USER_STATUS = USER_STATUS;
export const CALL_SESSION_STATUS = CALL_STATUS;