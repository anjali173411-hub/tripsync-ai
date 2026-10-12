import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in first"
    });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }

  try {
    const user = await User.findById(decoded.id).select("role isActive tokenVersion");

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "Your account is not active"
      });
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        message: "You have been logged out. Please log in again"
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role
    };
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Could not check your login"
    });
  }
}

export function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required"
    });
  }

  next();
}
