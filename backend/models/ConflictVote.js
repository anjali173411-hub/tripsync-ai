
import mongoose from "mongoose";

// One document = one conflict the AI found in a group trip (SRS 6.5).
// It holds the compromise options, every member's vote, and the result.
const conflictVoteSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true
    },
    // What the clash is, e.g. "Asha wants parasailing, Ravi wants no water sports"
    conflictDescription: {
      type: String,
      required: true
    },
    // Why the AI flagged it
    reasoning: {
      type: String,
      default: ""
    },
    // Names of the members involved
    affectedMembers: {
      type: [String],
      default: []
    },
    // The compromise options the group votes on
    options: [
      {
        description: {
          type: String,
          required: true
        },
        extraCost: {
          type: Number,
          default: 0
        },
        voteCount: {
          type: Number,
          default: 0
        }
      }
    ],
    // One entry per member who voted
    votes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        optionIndex: {
          type: Number,
          required: true
        }
      }
    ],
    resolved: {
      type: Boolean,
      default: false
    },
    // Which option was chosen (null until resolved)
    chosenOption: {
      type: Number,
      default: null
    }
  },
  { timestamps: true }
);

// Counts the votes again and stores the number on each option
conflictVoteSchema.methods.recountVotes = function () {
  for (let i = 0; i < this.options.length; i++) {
    let count = 0;
    for (let j = 0; j < this.votes.length; j++) {
      if (this.votes[j].optionIndex === i) {
        count = count + 1;
      }
    }
    this.options[i].voteCount = count;
  }
};

const ConflictVote = mongoose.model("ConflictVote", conflictVoteSchema);

export default ConflictVote;
