
import mongoose from "mongoose";

const conflictVoteSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true
    },
    
    conflictDescription: {
      type: String,
      required: true
    },
    
    reasoning: {
      type: String,
      default: ""
    },
    
    affectedMembers: {
      type: [String],
      default: []
    },
    
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
    
    chosenOption: {
      type: Number,
      default: null
    }
  },
  { timestamps: true }
);

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
