// The "Next step" bar at the top of every trip page.
// It shows how far the trip is (Invite -> Preferences -> Plan -> Decide -> Finalise -> Enjoy)
// and ONE button for the next thing the logged-in person should do.
//
// Usage: <NextStep tripId={tripId} refreshKey={anything} />
// When refreshKey changes (e.g. after saving), the bar loads again.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import api from "../api/axios.js";

// Works out which step the trip is on, and what this person should do next.
// Returns { step, text, buttonText, link } (buttonText is "" when there is nothing to click)
function getNextStep(progress, tripLink) {
  // Finished trips
  if (progress.status === "completed") {
    return { step: "Enjoy", text: "Trip completed. How was it?", buttonText: "Write a review", link: "/reviews" };
  }
  if (progress.itineraryFinalised) {
    return { step: "Enjoy", text: "Your plan is final. Have a great trip!", buttonText: "Track spending", link: tripLink + "/budget" };
  }

  // Everyone must have their own preferences first (also people who joined late)
  if (!progress.iHaveSavedPreferences) {
    return {
      step: "Preferences",
      text: "Tell the AI what you'd like from this trip.",
      buttonText: "Fill in your preferences",
      link: tripLink + "/preferences"
    };
  }

  // A plan exists: decide, then finalise
  if (progress.hasItinerary) {
    if (progress.decisionsWaitingForMyVote > 0) {
      return {
        step: "Decide",
        text: "The group needs your vote on " + progress.decisionsWaitingForMyVote + " decision(s).",
        buttonText: "Vote now",
        link: tripLink + "/consensus"
      };
    }
    if (progress.openDecisions > 0) {
      if (progress.isOrganiser) {
        return {
          step: "Decide",
          text: "Waiting for others to vote on " + progress.openDecisions + " decision(s). You can also decide yourself.",
          buttonText: "See decisions",
          link: tripLink + "/consensus"
        };
      }
      return { step: "Decide", text: "Waiting for the others to vote.", buttonText: "See decisions", link: tripLink + "/consensus" };
    }
    if (progress.isOrganiser) {
      return { step: "Finalise", text: "Everything is decided. Check the plan and finalise it.", buttonText: "Review and finalise", link: tripLink + "/itinerary" };
    }
    return { step: "Finalise", text: "Waiting for the organiser to finalise the plan.", buttonText: "See the plan", link: tripLink + "/itinerary" };
  }

  // No plan yet
  if (progress.tripType === "group" && progress.isOrganiser && progress.memberCount === 1 && progress.invitedCount === 0) {
    return { step: "Invite", text: "Invite the people coming with you.", buttonText: "Invite people", link: tripLink + "/members" };
  }
  if (progress.invitedCount > 0) {
    if (progress.isOrganiser) {
      return {
        step: "Invite",
        text: "Waiting for " + progress.invitedCount + " invited person(s) to accept.",
        buttonText: "See members",
        link: tripLink + "/members"
      };
    }
    return { step: "Invite", text: "Waiting for everyone invited to join.", buttonText: "", link: "" };
  }
  if (progress.membersMissingPreferences > 0) {
    return {
      step: "Preferences",
      text: "Waiting for " + progress.membersMissingPreferences + " member(s) to fill in their preferences.",
      buttonText: progress.isOrganiser ? "See who" : "",
      link: tripLink + "/members"
    };
  }
  if (progress.isOrganiser) {
    return { step: "Plan", text: "Everyone is ready. Let the AI plan the trip!", buttonText: "Generate the plan", link: tripLink + "/itinerary" };
  }
  return { step: "Plan", text: "Everyone is ready. Waiting for the organiser to generate the plan.", buttonText: "", link: "" };
}

function NextStep(props) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    loadProgress();
  }, [props.tripId, props.refreshKey]);

  async function loadProgress() {
    try {
      const response = await api.get("/trips/" + props.tripId + "/progress");
      setProgress(response.data);
    } catch (err) {
      setProgress(null); // the bar is extra help; if it fails, just don't show it
    }
  }

  if (!progress) {
    return null;
  }

  // Solo trips have no inviting or voting
  let steps = ["Invite", "Preferences", "Plan", "Decide", "Finalise", "Enjoy"];
  if (progress.tripType === "solo") {
    steps = ["Preferences", "Plan", "Finalise", "Enjoy"];
  }

  const next = getNextStep(progress, "/trips/" + props.tripId);
  const currentIndex = steps.indexOf(next.step);

  return (
    <div className="next-step">
      {/* The progress line */}
      <div className="steps-line">
        {steps.map((step, index) => {
          let className = "step";
          if (index < currentIndex) {
            className = "step done";
          } else if (index === currentIndex) {
            className = "step current";
          }

          return (
            <div key={step} className={className}>
              <span className="step-dot">{index < currentIndex ? <Check size={12} /> : index + 1}</span>
              <span className="step-name">{step}</span>
            </div>
          );
        })}
      </div>

      {/* What to do now */}
      <div className="next-action">
        <div>
          <span className="next-label">Next step</span>
          <p>{next.text}</p>
        </div>
        {next.buttonText && (
          <Link to={next.link} className="button">
            {next.buttonText} <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </div>
  );
}

export default NextStep;
