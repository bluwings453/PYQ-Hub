const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Paper = require("../models/Paper");
const { INSTITUTES } = require("../utils/catalog");

const router = express.Router();

// ---- File upload setup ----
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${safe}${path.extname(file.originalname)}`);
  },
});

function fileFilter(req, file, cb) {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are accepted"), false);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per paper
});

// GET /api/papers - browse approved papers with optional filters
router.get("/", async (req, res) => {
  try {
    const { institute, branch, semester, examType, year, q } = req.query;

    const filter = { status: "approved" };
    if (institute) filter.instituteCode = institute;
    if (branch) filter.branch = branch;
    if (semester) filter.semester = Number(semester);
    if (examType) filter.examType = examType;
    if (year) filter.year = Number(year);
    if (q) filter.subjectName = { $regex: q, $options: "i" };

    const papers = await Paper.find(filter).sort({ year: -1, createdAt: -1 }).limit(200);
    res.json(papers);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch papers" });
  }
});

// GET /api/papers/subjects - distinct subject list for a given institute/branch/semester,
// used to narrow the search box as the person picks filters
router.get("/subjects", async (req, res) => {
  try {
    const { institute, branch, semester } = req.query;
    const filter = { status: "approved" };
    if (institute) filter.instituteCode = institute;
    if (branch) filter.branch = branch;
    if (semester) filter.semester = Number(semester);

    const subjects = await Paper.distinct("subjectName", filter);
    res.json(subjects.sort());
  } catch (err) {
    res.status(500).json({ error: "Could not fetch subjects" });
  }
});

// POST /api/papers - contribute a new paper (goes in as "pending" for moderation)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { instituteCode, branch, semester, examType, subjectName, subjectCode, year, uploaderName, uploaderContact, note } = req.body;

    if (!req.file) return res.status(400).json({ error: "A PDF file is required" });

    const institute = INSTITUTES.find((i) => i.code === instituteCode);
    if (!institute) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Unknown institute" });
    }
    if (!branch || !semester || !examType || !subjectName || !year) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Missing required fields" });
    }

    const paper = await Paper.create({
      instituteCode: institute.code,
      instituteName: institute.name,
      branch,
      semester: Number(semester),
      examType,
      subjectName,
      subjectCode,
      year: Number(year),
      fileName: req.file.originalname,
      filePath: req.file.filename,
      fileSize: req.file.size,
      uploaderName,
      uploaderContact,
      note,
      status: "pending",
    });

    res.status(201).json({ message: "Thanks - your paper is in the review queue.", id: paper._id });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /api/papers/:id/download - stream the PDF and count the download
router.get("/:id/download", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper || paper.status !== "approved") {
      return res.status(404).json({ error: "Paper not found" });
    }
    const filePath = path.join(uploadDir, paper.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File missing on server" });

    paper.downloadCount += 1;
    await paper.save();

    res.download(filePath, `${paper.instituteCode}_${paper.subjectName}_${paper.examType}_${paper.year}.pdf`);
  } catch (err) {
    res.status(500).json({ error: "Download failed" });
  }
});

// PATCH /api/papers/:id/upvote - lightweight community quality signal, no auth required
router.patch("/:id/upvote", async (req, res) => {
  try {
    const paper = await Paper.findByIdAndUpdate(req.params.id, { $inc: { upvotes: 1 } }, { new: true });
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    res.json({ upvotes: paper.upvotes });
  } catch (err) {
    res.status(500).json({ error: "Could not register upvote" });
  }
});

module.exports = router;
