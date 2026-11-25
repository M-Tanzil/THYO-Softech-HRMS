import {
  loginSchema,
  refreshTokenSchema,
} from "./auth.validator.js";

import {
  loginUser,
  refreshAccessToken,
  logoutUser,
} from "./auth.service.js";

const handleError = (res, error) => {
  if (error.message === "Invalid email or password") {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }

  if (
    error.message === "User account is inactive" ||
    error.message === "Invalid or expired refresh token"
  ) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Authentication error:", error.message);

  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again.",
  });
};

export const login = async (req, res) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten(),
    });
  }

  try {
    const result = await loginUser(validation.data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const refresh = async (req, res) => {
  const validation = refreshTokenSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten(),
    });
  }

  try {
    const result = await refreshAccessToken(
      validation.data.refreshToken
    );

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const logout = async (req, res) => {
  const validation = refreshTokenSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.flatten(),
    });
  }

  try {
    const result = await logoutUser(
      validation.data.refreshToken
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
