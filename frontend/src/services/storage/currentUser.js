
import { getAccessToken } from "./authStorage";

export function getCurrentUser() {
  try {
    const token = getAccessToken();

    if (!token) return {};

    const encodedPayload = token.split(".")[1];

    if (!encodedPayload) return {};

    const base64 = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const paddedBase64 = base64.padEnd(
      Math.ceil(base64.length / 4) * 4,
      "="
    );

    const user = JSON.parse(atob(paddedBase64));

    const roles = Array.isArray(user.roles)
      ? user.roles
          .map((role) =>
            typeof role === "string" ? role : role?.name
          )
          .filter(Boolean)
      : [];

    const firstName = user.firstName || user.first_name || "";
    const lastName = user.lastName || user.last_name || "";

    const name =
      user.name ||
      user.fullName ||
      user.full_name ||
      user.employeeName ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      user.username ||
      "";

    return {
      name,
      email: user.email || "",
      role: roles
        .map((role) =>
          role
            .replace(/_/g, " ")
            .replace(/-/g, " ")
        )
        .join(", ") || user.role?.name || user.role || "",
    };
  } catch (error) {
    console.error("Unable to read current user:", error);
    return {};
  }
}
