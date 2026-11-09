export const ROLE_LABEL = {
  ADMIN: "Admin",
  FACULTY: "Faculty",
  STUDENT: "Student",
};

export const STATUS_LABEL = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  INACTIVE: "Deactivated",
};

export const fullName = (u) =>
  `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.username;
