import express from "express";
import Trip from "../models/Trip.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import Preference from "../models/Preference.js";
import Itinerary from "../models/Itinerary.js";
import ConflictVote from "../models/ConflictVote.js";
import { sendInvitationEmail } from "../services/emailService.js";

const router = express.Router();

function looksLikeEmail(text) {
  const atPosition = text.indexOf("@");
  const lastDot = text.lastIndexOf(".");
  return atPosition > 0 && lastDot > atPosition + 1 && lastDot < text.length - 1 && !text.includes(" ");
}

function listHasId(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].toString() === id.toString()) {
      return true;
    }
  }
  return false;
}

function removeEmailFromList(list, email) {
  const newList = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i] !== email) {
      newList.push(list[i]);
    }
  }
  return newList;
}

router.post("/:tripId/members", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the organiser can invite members"
      });
    }

    if (trip.type !== "group") {
      return res.status(400).json({
        message: "Members can only be invited to group trips"
      });
    }

    let email = "";
    if (req.body.email) {
      email = String(req.body.email).toLowerCase().trim();
    }

    if (!looksLikeEmail(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address"
      });
    }

    const existingUser = await User.findOne({ email: email });

    if (existingUser && listHasId(trip.members, existingUser._id)) {
      return res.status(409).json({
        message: "This person is already a trip member"
      });
    }

    // Add the email in one step that only succeeds if it is not already there,
    // so two quick clicks cannot both send an invitation.
    const added = await Trip.updateOne(
      { _id: trip._id, invitedEmails: { $ne: email } },
      { $push: { invitedEmails: email } }
    );

    if (added.modifiedCount === 0) {
      return res.status(409).json({
        message: "This email has already been invited"
      });
    }

    const organiser = await User.findById(req.user.id);
    const emailSent = await sendInvitationEmail(email, organiser.name, trip);

    let message = "Invitation saved for " + email + ".";
    if (emailSent) {
      message = "Invitation email sent to " + email + ".";
    }
    message += " They will see it on their dashboard after they sign up or log in with this email.";

    res.status(200).json({
      message: message,
      emailSent: emailSent
    });
  } catch (error) {
    console.error("Invite error:", error);
    res.status(400).json({
      message: "Could not send invitation"
    });
  }
});

router.delete("/:tripId/invitations", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the organiser can cancel invitations"
      });
    }

    let email = "";
    if (req.body && req.body.email) {
      email = String(req.body.email).toLowerCase().trim();
    }

    if (!trip.invitedEmails.includes(email)) {
      return res.status(404).json({
        message: "No invitation for this email"
      });
    }

    trip.invitedEmails = removeEmailFromList(trip.invitedEmails, email);
    await trip.save();

    res.json({
      message: "Invitation to " + email + " cancelled"
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not cancel the invitation"
    });
  }
});

router.get("/invitations/mine", verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);

    const trips = await Trip.find({
      invitedEmails: me.email
    }).populate("organiser", "name email");

    res.json({ invitations: trips });
  } catch (error) {
    res.status(500).json({
      message: "Could not load invitations"
    });
  }
});

router.post("/:tripId/invitation/accept", verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const trip = await Trip.findById(req.params.tripId);

    if (!trip || !trip.invitedEmails.includes(me.email)) {
      return res.status(404).json({
        message: "Invitation not found"
      });
    }

    trip.invitedEmails = removeEmailFromList(trip.invitedEmails, me.email);

    if (!listHasId(trip.members, me._id)) {
      trip.members.push(me._id);
    }

    await trip.save();

    res.json({
      message: "You joined " + trip.title + "!"
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not accept invitation"
    });
  }
});

router.post("/:tripId/invitation/decline", verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const trip = await Trip.findById(req.params.tripId);

    if (!trip || !trip.invitedEmails.includes(me.email)) {
      return res.status(404).json({
        message: "Invitation not found"
      });
    }

    trip.invitedEmails = removeEmailFromList(trip.invitedEmails, me.email);
    await trip.save();

    res.json({
      message: "Invitation declined"
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not decline invitation"
    });
  }
});

router.delete("/:tripId/members/:userId", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    if (trip.organiser.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the organiser can remove members"
      });
    }

    if (req.params.userId === req.user.id) {
      return res.status(400).json({
        message: "The organiser cannot be removed from the trip"
      });
    }

    const itinerary = await Itinerary.findOne({ trip: trip._id });

    if (trip.status !== "planning" || (itinerary && itinerary.status === "finalised")) {
      return res.status(400).json({
        message: "Members can only be removed before the itinerary is finalised"
      });
    }

    if (!listHasId(trip.members, req.params.userId)) {
      return res.status(404).json({
        message: "This person is not a member of the trip"
      });
    }

    const newMembers = [];
    for (let i = 0; i < trip.members.length; i++) {
      if (trip.members[i].toString() !== req.params.userId) {
        newMembers.push(trip.members[i]);
      }
    }
    trip.members = newMembers;
    await trip.save();

    await Preference.deleteMany({ trip: trip._id, user: req.params.userId });
    const conflicts = await ConflictVote.find({ trip: trip._id });
    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];

      const keptVotes = [];
      for (let j = 0; j < conflict.votes.length; j++) {
        if (conflict.votes[j].user.toString() !== req.params.userId) {
          keptVotes.push(conflict.votes[j]);
        }
      }
      conflict.votes = keptVotes;
      conflict.recountVotes();
      await conflict.save();
    }

    res.json({
      message: "Member removed"
    });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(400).json({
      message: "Could not remove member"
    });
  }
});

router.get("/:tripId/members", verifyToken, async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.tripId,
      members: req.user.id
    }).populate("members", "name email");

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found or access denied"
      });
    }

    res.json({
      members: trip.members,
      invitedEmails: trip.invitedEmails
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not load members"
    });
  }
});

export default router;
