const express = require("express");
const { INSTITUTES, BRANCHES, EXAM_TYPES, SEMESTERS } = require("../utils/catalog");

const router = express.Router();

// GET /api/catalog - everything the frontend needs to build its filter dropdowns
router.get("/", (req, res) => {
  res.json({ institutes: INSTITUTES, branches: BRANCHES, examTypes: EXAM_TYPES, semesters: SEMESTERS });
});

module.exports = router;
