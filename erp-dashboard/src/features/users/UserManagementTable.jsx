import React from "react";
import {
  AlertTriangle,
  Briefcase,
  Clock3,
  Eye,
  Lock,
  Pencil,
  Shield,
  Trash2,
  UnlockKeyhole,
  UserCheck,
  Users,
} from "lucide-react";
import { ROLES } from "../../app/constants.js";

const roleStyles = {
  [ROLES.ADMIN]: {
    label: "ADMIN",
    icon: Shield,
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  [ROLES.HR]: {
    label: "HR",
    icon: UserCheck,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [ROLES.USER]: {
    label: "USER",
    icon: Briefcase,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const presenceStyles = {
  "active-now": { className: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  "active-recently": { className: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  online: { className: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  typing: { className: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  away: { className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  offline: { className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

function getAccountLockState(user) {
  const lockUntil = user?.lockUntil ? new Date(user.lockUntil) : null;
  const isLocked = Boolean(
    (user?.isLocked || user?.accountLocked) &&
    lockUntil &&
    lockUntil.getTime() > Date.now()
  );

  return {
    attempts: user?.loginAttempts ?? user?.failedLoginAttempts ?? 0,
    isLocked,
    lockUntil,
  };
}

function formatRemainingLockTime(lockUntil) {
  if (!lockUntil) return "-";
  const remainingMs = lockUntil.getTime() - Date.now();
  if (remainingMs <= 0) return "Auto unlock pending";

  const minutes = Math.ceil(remainingMs / 60000);
  return minutes <= 1 ? "Less than 1m left" : `${minutes}m left`;
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name[0] || "?").toUpperCase();
}

function Badge({ children, className = "", title = "" }) {
  return (
    <span
      title={title}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold leading-none whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

function RoleBadge({ role }) {
  const style = roleStyles[role] || {
    label: role || "USER",
    icon: Users,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const Icon = style.icon;

  return (
    <Badge className={style.className}>
      <Icon className="h-3.5 w-3.5" />
      {style.label}
    </Badge>
  );
}

function PresenceBadge({ presence }) {
  const style = presenceStyles[presence.status] || presenceStyles.offline;

  return (
    <Badge className={style.className} title={presence.exactTooltip}>
      <span className={`h-2 w-2 rounded-full ${style.dot}${presence.dotPulse ? " animate-pulse" : ""}`} />
      {presence.label || "Offline"}
    </Badge>
  );
}

function LockBadge({ lockState }) {
  return lockState.isLocked ? (
    <Badge className="bg-red-50 text-red-700 border-red-200">
      <Lock className="h-3.5 w-3.5" />
      Locked
    </Badge>
  ) : (
    <Badge className="bg-blue-50 text-blue-700 border-blue-200">
      <UserCheck className="h-3.5 w-3.5" />
      Active
    </Badge>
  );
}

function CountdownBadge({ lockState }) {
  if (!lockState.isLocked) {
    return <span className="text-sm font-medium text-slate-400">-</span>;
  }

  return (
    <Badge className="bg-orange-50 text-orange-700 border-orange-200">
      <Clock3 className="h-3.5 w-3.5" />
      {formatRemainingLockTime(lockState.lockUntil)}
    </Badge>
  );
}

function UserIdentity({ user }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-sm">
        {getInitials(user.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950">{user.name}</p>
        <p className="mt-0.5 truncate text-sm text-slate-600">{user.email}</p>
        <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-wide text-slate-400">
          ID {String(user._id || "").slice(0, 8)}
        </p>
      </div>
    </div>
  );
}

function ActionButton({ title, onClick, disabled = false, children, className = "" }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function UserActions({
  user,
  canEdit,
  canDelete,
  canUnlock,
  unlocking,
  onView,
  onEdit,
  onUnlock,
  onDelete,
}) {
  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      <ActionButton
        title="View"
        onClick={() => onView(user)}
        className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
      >
        <Eye className="h-4 w-4" />
        <span className="hidden xl:inline">View</span>
      </ActionButton>

      {canEdit && (
        <ActionButton
          title="Edit"
          onClick={() => onEdit(user)}
          className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        >
          <Pencil className="h-4 w-4" />
          <span className="hidden xl:inline">Edit</span>
        </ActionButton>
      )}

      {canUnlock && (
        <ActionButton
          title="Unlock"
          onClick={() => onUnlock(user)}
          disabled={unlocking}
          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        >
          <UnlockKeyhole className="h-4 w-4" />
          <span className="hidden xl:inline">{unlocking ? "..." : "Unlock"}</span>
        </ActionButton>
      )}

      {canDelete && (
        <ActionButton
          title="Delete"
          onClick={() => onDelete(user)}
          className="border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </ActionButton>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="animate-pulse border-b border-slate-100">
          <td className="px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-3.5 w-36 rounded bg-slate-200" />
                <div className="h-3 w-48 rounded bg-slate-100" />
              </div>
            </div>
          </td>
          <td className="px-5 py-5"><div className="h-7 w-20 rounded-full bg-slate-100" /></td>
          <td className="px-5 py-5"><div className="h-7 w-24 rounded-full bg-slate-100" /></td>
          <td className="px-5 py-5"><div className="h-7 w-20 rounded-full bg-slate-100" /></td>
          <td className="px-5 py-5"><div className="mx-auto h-4 w-8 rounded bg-slate-100" /></td>
          <td className="px-5 py-5"><div className="mx-auto h-7 w-24 rounded-full bg-slate-100" /></td>
          <td className="sticky right-0 bg-white px-6 py-5">
            <div className="ml-auto h-9 w-32 rounded-lg bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
        <Users className="h-6 w-6" />
      </div>
      <h4 className="mt-4 text-base font-bold text-slate-950">No users found</h4>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        Try adjusting the search, role, or presence filters to find the staff member you are looking for.
      </p>
    </div>
  );
}

function MobileUserCard({
  user,
  presence,
  lockState,
  canEdit,
  canDelete,
  canUnlock,
  unlocking,
  onView,
  onEdit,
  onUnlock,
  onDelete,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <UserIdentity user={user} />
      <div className="mt-4 flex flex-wrap gap-2">
        <RoleBadge role={user.role} />
        <PresenceBadge presence={presence} />
        <LockBadge lockState={lockState} />
        <CountdownBadge lockState={lockState} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attempts</p>
          <p className="mt-1 font-bold text-slate-900">{lockState.attempts}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account</p>
          <p className={lockState.isLocked ? "mt-1 font-bold text-red-700" : "mt-1 font-bold text-blue-700"}>
            {lockState.isLocked ? "Locked" : "Active"}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <UserActions
          user={user}
          canEdit={canEdit}
          canDelete={canDelete}
          canUnlock={canUnlock}
          unlocking={unlocking}
          onView={onView}
          onEdit={onEdit}
          onUnlock={onUnlock}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

export default function UserManagementTable({
  users = [],
  loading = false,
  currentUser,
  unlockingUserId = "",
  getProfilePresence,
  onView,
  onEdit,
  onUnlock,
  onDelete,
}) {
  const getPermissions = (user, lockState) => {
    const canEdit =
      currentUser?.role === ROLES.ADMIN ||
      (currentUser?.role === ROLES.HR && user.role === ROLES.USER);
    const canDelete =
      (currentUser?.role === ROLES.HR && user.role === ROLES.USER) ||
      (currentUser?.role === ROLES.ADMIN && user.role !== ROLES.ADMIN);
    const canUnlock =
      lockState.isLocked &&
      (currentUser?.role === ROLES.ADMIN ||
        (currentUser?.role === ROLES.HR && user.role === ROLES.USER));

    return { canEdit, canDelete, canUnlock };
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950">Staff Members</h3>
          <p className="mt-1 text-sm text-slate-500">{users.length} users match the current filters</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
          Actions stay pinned while scrolling
        </div>
      </div>

      <div className="md:hidden">
        <div className="space-y-3 p-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-32 rounded bg-slate-200" />
                    <div className="h-3 w-44 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="mt-4 h-9 rounded-lg bg-slate-100" />
              </div>
            ))
          ) : users.length === 0 ? (
            <EmptyState />
          ) : (
            users.map((user) => {
              const presence = getProfilePresence(user._id);
              const lockState = getAccountLockState(user);
              const permissions = getPermissions(user, lockState);

              return (
                <MobileUserCard
                  key={user._id}
                  user={user}
                  presence={presence}
                  lockState={lockState}
                  unlocking={unlockingUserId === user._id}
                  {...permissions}
                  onView={onView}
                  onEdit={onEdit}
                  onUnlock={onUnlock}
                  onDelete={onDelete}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="hidden md:block">
        {users.length === 0 && !loading ? (
          <div className="p-6">
            <EmptyState />
          </div>
        ) : (
          <div className="overflow-x-auto px-4 pb-4 pt-3">
            <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  {["User", "Role", "Status", "Lock", "Attempts", "Remaining"].map((header) => (
                    <th
                      key={header}
                      className="border-y border-slate-200 bg-slate-50 px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 first:rounded-l-xl first:border-l"
                    >
                      {header}
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 rounded-r-xl border-y border-r border-slate-200 bg-slate-50 px-6 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 shadow-[-10px_0_16px_-16px_rgba(15,23,42,0.5)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <LoadingSkeleton />
                ) : (
                  users.map((user, index) => {
                    const presence = getProfilePresence(user._id);
                    const lockState = getAccountLockState(user);
                    const permissions = getPermissions(user, lockState);
                    const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/70";

                    return (
                      <tr
                        key={user._id}
                        className={`group border-b border-slate-100 transition-colors hover:bg-blue-50/50 ${rowBg}`}
                      >
                        <td className="min-w-[320px] border-b border-slate-100 px-6 py-5">
                          <UserIdentity user={user} />
                        </td>
                        <td className="border-b border-slate-100 px-5 py-5">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="border-b border-slate-100 px-5 py-5">
                          <PresenceBadge presence={presence} />
                        </td>
                        <td className="border-b border-slate-100 px-5 py-5">
                          <LockBadge lockState={lockState} />
                        </td>
                        <td className="border-b border-slate-100 px-5 py-5 text-center">
                          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-100 px-2 text-sm font-bold text-slate-800">
                            {lockState.attempts}
                          </span>
                        </td>
                        <td className="min-w-[160px] border-b border-slate-100 px-5 py-5">
                          <CountdownBadge lockState={lockState} />
                        </td>
                        <td className={`sticky right-0 z-10 min-w-[184px] border-b border-slate-100 px-6 py-5 shadow-[-10px_0_16px_-16px_rgba(15,23,42,0.55)] transition-colors group-hover:bg-blue-50 ${rowBg}`}>
                          <UserActions
                            user={user}
                            unlocking={unlockingUserId === user._id}
                            {...permissions}
                            onView={onView}
                            onEdit={onEdit}
                            onUnlock={onUnlock}
                            onDelete={onDelete}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
