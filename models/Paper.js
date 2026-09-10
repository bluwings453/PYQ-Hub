const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema(
  {
    instituteCode: { type: String, required: true, index: true },
    instituteName: { type: String, required: true },
    branch: { type: String, required: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 8, index: true },
    examType: { type: String, required: true, enum: ["Mid Semester", "End Semester"] },
    subjectName: { type: String, required: true, trim: true },
    subjectCode: { type: String, trim: true },
    year: { type: Number, required: true },

    fileName: { type: String, required: true },
    filePath: { type: String, required: true }, // relative path under /uploads
    fileSize: { type: Number },

    uploaderName: { type: String, trim: true },
    uploaderContact: { type: String, trim: true },
    note: { type: String, trim: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    upvotes: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Speeds up the common browse query: approved papers for one institute/branch/semester
paperSchema.index({ instituteCode: 1, branch: 1, semester: 1, status: 1 });

module.exports = mongoose.model("Paper", paperSchema);
