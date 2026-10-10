
// Sends emails from the app (used for trip invitations).
//
// There are two ways to send, chosen by what is in backend/.env (or Render's settings):
//
//   1. Brevo email service (used online on Render)
//      Render's free plan blocks normal email sending (SMTP), so online we send
//      through Brevo's web API instead, which works like visiting a website.
//        BREVO_API_KEY=your Brevo API key
//        EMAIL_USER=the email address you confirmed as a sender in Brevo
//
//   2. Gmail (used on your own computer)
//        EMAIL_USER=yourname@gmail.com
//        EMAIL_PASS=your 16-letter Gmail app password
//
// If neither is set up, or sending fails, the invitation is still saved and
// the person sees it on their dashboard when they sign up or log in.

import nodemailer from "nodemailer";

// Give up on sending an email after 10 seconds, so the page never hangs
const EMAIL_TIMEOUT_MS = 10000;

// Makes text safe to put inside HTML, e.g. "<b>" becomes "&lt;b&gt;"
function escapeHtml(text) {
  return String(text)
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split("\"").join("&quot;");
}

// Returns true if at least one way of sending email is set up
export function isEmailSetUp() {
  const brevoReady = Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_USER);
  const gmailReady = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  return brevoReady || gmailReady;
}

// Sends one email through Brevo's web API. Returns true if it worked.
async function sendWithBrevo(toEmail, subject, text, html) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      sender: { name: "TripSync AI", email: process.env.EMAIL_USER },
      to: [{ email: toEmail }],
      subject: subject,
      textContent: text,
      htmlContent: html
    }),
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS)
  });

  if (!response.ok) {
    const problem = await response.text();
    console.error("Brevo could not send the email (" + response.status + "):", problem);
    return false;
  }

  return true;
}

// Sends one email through Gmail. Returns true if it worked.
async function sendWithGmail(toEmail, subject, text, html) {
  const mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Stop waiting if Gmail can't be reached (some hosts block it)
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS
  });

  await mailer.sendMail({
    from: "TripSync AI <" + process.env.EMAIL_USER + ">",
    to: toEmail,
    subject: subject,
    text: text,
    html: html
  });

  return true;
}

// Sends the "you are invited" email.
// Returns true if the email was sent, false if it could not be sent.
export async function sendInvitationEmail(toEmail, organiserName, trip) {
  if (!isEmailSetUp()) {
    console.warn("Email not sent: no email settings found");
    return false;
  }

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
    // Online (Brevo key set): use Brevo. On your computer: use Gmail.
    if (process.env.BREVO_API_KEY) {
      return await sendWithBrevo(toEmail, subject, text, html);
    }
    return await sendWithGmail(toEmail, subject, text, html);
  } catch (error) {
    console.error("Could not send invitation email:", error.message);
    return false;
  }
}
