
// Protects against NoSQL injection (SRS 5.2).
//
// MongoDB treats keys that start with "$" (like {"$gt": ""}) as commands.
// Someone could send {"email": {"$gt": ""}} to trick a database search.
// This middleware removes any such keys from the request body before
// the routes see it.

function cleanObject(value) {
  // Lists: clean every item
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = cleanObject(value[i]);
    }
    return value;
  }

  // Objects: drop dangerous keys, clean the rest
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (key.startsWith("$") || key.includes(".")) {
        delete value[key];
      } else {
        value[key] = cleanObject(value[key]);
      }
    }
  }

  return value;
}

export function sanitizeInput(req, res, next) {
  if (req.body) {
    req.body = cleanObject(req.body);
  }
  next();
}
