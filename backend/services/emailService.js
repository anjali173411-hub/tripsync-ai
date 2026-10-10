
// Sends emails from the app (used for trip invitations).
//
// It uses a Gmail account. The address and its "app password" are secrets,
// so they live in backend/.env:
//   EMAIL_USER=yourname@gmail.com
//   EMAIL_PASS=your 16-letter app password
//
// If they are not set, emails are simply skipped: the invitation is still
// saved and the person sees it on their dashboard when they log in.

import nodemailer from "nodemailer";

// Makes text safe to put inside HTML, e.g. "<b>" becomes "&lt;b&gt;"
function escapeHtml(text) {
  return String(text)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split("\"").join("&quot;");
}

// Returns true if the email settings are in .env
export function isEmailSetUp() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

// Sends the "you are invited" email.
// Returns true if the email was sent, false if it could not be sent.
export async function sendInvitationEmail(toEmail, organiserName, trip) {
  if (!isEmailSetUp()) {
    console.warn("Email not sent: EMAIL_USER / EMAIL_PASS are not set in .env");
    return false;
  }

  const mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const signUpLink = process.env.CLIENT_URL + "/register";
  const logInLink = process.env.CLIENT_URL + "/login";

  const subject = organiserName + " invited you to plan \"" + trip.title + "\" on TripSync AI";

  const text =
    "Hi!\n\n" +
    organiserName + " has invited you to join their trip \"" + trip.title + "\" to " + trip.destination + ".\n\n" +
    "To accept the invitation:\n" +
    "- New to TripSync AI? Sign up with this email address: " + signUpLink + "\n" +
    "- Already have an account? Log in: " + logInLink + "\n\n" +
    "The invitation will be waiting on your dashboard.\n\n" +
    "- TripSync AI";

  const html =
    "<p>Hi!</p>" +
    "<p><strong>" + escapeHtml(organiserName) + "</strong> has invited you to join their trip " +
    "<strong>" + escapeHtml(trip.title) + "</strong> to " + escapeHtml(trip.destination) + ".</p>" +
    "<p>To accept the invitation:</p>" +
    "<ul>" +
    "<li>New to TripSync AI? <a href=\"" + signUpLink + "\">Sign up</a> with this email address.</li>" +
    "<li>Already have an account? <a href=\"" + logInLink + "\">Log in</a>.</li>" +
    "</ul>" +
    "<p>The invitation will be waiting on your dashboard.</p>" +
    "<p>- TripSync AI</p>";

  try {
    await mailer.sendMail({
      from: "TripSync AI <" + process.env.EMAIL_USER + ">",
      to: toEmail,
      subject: subject,
      text: text,
      html: html
    });
    return true;
  } catch (error) {
    console.error("Could not send invitation email:", error.message);
    return false;
  }
}
