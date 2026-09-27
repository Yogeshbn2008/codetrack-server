const express = require('express')
const router = express.Router()
const aiService = require('../services/aiService')

// @route   POST /api/ai/analyze-complexity
// @desc    Analyze time & space Big-O complexity with bottlenecks and optimization hints
router.post('/analyze-complexity', async (req, res) => {
  try {
    const { code, language, problemContext } = req.body

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ message: "Code snippet is required for complexity analysis" })
    }

    const result = await aiService.analyzeComplexity({
      code: code.trim(),
      language: language || "",
      problemContext: problemContext || {}
    })

    res.json(result)
  } catch (err) {
    console.error("AI complexity error:", err)
    res.status(500).json({ message: "Failed to analyze code complexity. Please try again." })
  }
})

// @route   POST /api/ai/socratic-hint
// @desc    Generate tiered progressive Socratic hints for a problem
router.post('/socratic-hint', async (req, res) => {
  try {
    const { title, topic, difficulty, notes, userQuery } = req.body

    const result = await aiService.generateSocraticHints({
      title: title || "Algorithm Problem",
      topic: topic || "Algorithms",
      difficulty: difficulty || "Medium",
      notes: notes || "",
      userQuery: userQuery || ""
    })

    res.json(result)
  } catch (err) {
    console.error("AI Socratic hint error:", err)
    res.status(500).json({ message: "Failed to generate hints. Please try again." })
  }
})

module.exports = router
