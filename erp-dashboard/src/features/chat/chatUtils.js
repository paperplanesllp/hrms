/**
 * Utility helpers for the chat module
 */

import {
  formatISTDateLabel,
  formatISTChatTimestamp,
  formatISTTime,
} from "../../lib/istDateTime.js";

/**
 * Format a date into Today / Yesterday / DayName / DD MMM YYYY
 */
export function formatDateLabel(date) {
  return formatISTDateLabel(date);
}

/**
 * Format a time as "10:45 am"
 */
export function formatTime(date) {
  return formatISTTime(date);
}

/**
 * Format last seen: "today at 10:45 am", "yesterday at 5:00 pm", etc.
 */
export function formatLastSeen(date) {
  if (!date) return "";
  const d = new Date(date);
  const label = formatDateLabel(d).toLowerCase();
  const time = formatTime(d);
  return `${label} at ${time}`;
}

/**
 * Format chat list timestamp (compact)
 */
export function formatChatTime(date) {
  return formatISTChatTimestamp(date);
}

/**
 * Group messages by date bucket (returns array of { label, messages })
 */
export function groupMessagesByDate(messages) {
  const groups = [];
  let currentLabel = null;

  (messages || []).forEach((msg) => {
    if (!msg || !msg.createdAt) return;
    const label = formatDateLabel(msg.createdAt);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  });

  return groups;
}

/** Check if two messages are in the same "group" (same sender, <2 min apart) */
export function isSameGroup(prev, curr) {
  if (!prev || !curr) return false;
  if (prev.sender?._id !== curr.sender?._id) return false;
  if (!prev.createdAt || !curr.createdAt) return false;
  const diff = new Date(curr.createdAt) - new Date(prev.createdAt);
  if (Number.isNaN(diff)) return false;
  return diff < 120_000; // 2 minutes
}

/** Get initials from a name */
export function getInitials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

/** Decrypt content if needed */
export function safeDecrypt(content, chatId, decryptFn, isEncryptedFn) {
  if (!content) return "";
  try {
    return isEncryptedFn(content) ? decryptFn(content, chatId) : content;
  } catch {
    return content;
  }
}
