const axios = require('axios')

/**
 * Heuristic Big-O Analyzer for code snippets (Offline / Resilient fallback)
 */
function heuristicComplexityAnalysis(code = "", language = "", problemContext = {}) {
  const clean = code.toLowerCase()

  let timeComplexity = "O(n)"
  let timeExplanation = "Linear single-pass traversal over the input elements."
  let spaceComplexity = "O(1)"
  let spaceExplanation = "Constant auxiliary space with a few local pointer variables."
  const bottlenecks = []
  const optimizations = []
  let isOptimal = true

  // Check for nested loops: e.g. for ... for or while ... for
  const forMatches = (code.match(/\bfor\b|\bwhile\b/g) || []).length
  const hasNestedLoops = /(for|while)[\s\S]{1,120}(for|while)/.test(code)

  // Check for sorting
  const hasSorting = /\.sort|\bsort\(|\bsorted\(|arrays\.sort|collections\.sort/.test(clean)

  // Check for binary search
  const hasBinarySearch = /(low|left)\s*<=\s*(high|right)|mid\s*=|binary_?search|bisect/.test(clean)

  // Check for branching recursion (e.g. fibonacci, backtracking)
  const hasBranchingRecursion = /return\s+\w+\([^)]+\)\s*\+\s*\w+\([^)]+\)/.test(clean)

  // Space heuristics
  const usesMapOrSet = /new\s+map|new\s+set|\bdict\(\)|\bset\(\)|unordered_map|unordered_set|hashmap|hashset|\{\}/.test(clean)
  const usesMatrix = /new\s+array\([^)]*\)\.fill|vector\s*<\s*vector|\[\[0\]\s*\*/.test(clean)
  const usesRecursion = /def\s+(\w+)\b[\s\S]*?\1\(|function\s+(\w+)\b[\s\S]*?\2\(|(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\3\(/.test(clean)

  if (hasBranchingRecursion) {
    timeComplexity = "O(2^n)"
    timeExplanation = "Exponential time complexity due to overlapping recursive subproblems without memoization."
    bottlenecks.push("Unmemoized recursive branching evaluates identical states repeatedly.")
    optimizations.push("Apply memoization (Top-Down Dynamic Programming) or Bottom-Up Tabulation to reduce time to O(n).")
    isOptimal = false
  } else if (hasNestedLoops && forMatches >= 2) {
    timeComplexity = "O(n²)"
    timeExplanation = "Quadratic time complexity resulting from nested iteration over the input sequence."
    bottlenecks.push("Outer and inner loops result in n * (n - 1) / 2 comparisons.")
    optimizations.push("Consider using a Hash Map or Two Pointers technique to achieve an O(n) or O(n log n) solution.")
    isOptimal = false
  } else if (hasSorting) {
    timeComplexity = "O(n log n)"
    timeExplanation = "Dominated by the comparison-based sort operation, which runs in O(n log n) average and worst-case time."
    if (problemContext?.topic && problemContext.topic.toLowerCase().includes('hash')) {
      optimizations.push("If order does not strictly need to be maintained, a hash map lookup could reduce runtime to O(n).")
      isOptimal = false
    } else {
      isOptimal = true
    }
  } else if (hasBinarySearch) {
    timeComplexity = "O(log n)"
    timeExplanation = "Logarithmic time complexity achieved by halving the search space in each iteration."
    isOptimal = true
  }

  // Space analysis
  if (usesMatrix) {
    spaceComplexity = "O(m * n)"
    spaceExplanation = "2D matrix or DP table allocation proportional to m * n elements."
  } else if (usesMapOrSet) {
    spaceComplexity = "O(n)"
    spaceExplanation = "Auxiliary memory allocated for hash table storing up to n unique keys/elements."
  } else if (usesRecursion) {
    spaceComplexity = "O(n)"
    spaceExplanation = "Call stack memory consumption proportional to the maximum recursion depth."
  }

  return {
    timeComplexity,
    timeExplanation,
    spaceComplexity,
    spaceExplanation,
    bottlenecks: bottlenecks.length > 0 ? bottlenecks : ["No severe computational bottlenecks detected."],
    optimizations: optimizations.length > 0 ? optimizations : ["Current implementation is well-optimized for the chosen algorithmic pattern."],
    isOptimal
  }
}

/**
 * Heuristic Tiered Socratic Hint Generator (Offline / Resilient fallback)
 */
function heuristicSocraticHints(title = "Problem", topic = "General", difficulty = "Medium", notes = "") {
  const t = topic.toLowerCase()
  const p = title.toLowerCase()

  let hint1 = "Carefully identify the core invariant: What relationship between the inputs remains true at each step?"
  let hint2 = "Examine if sorting the input or using an auxiliary data structure (Hash Map, Deque, or Frequency Array) simplifies your state transitions."
  let hint3 = "Watch for edge cases: empty input, single element array, all duplicates, negative numbers, or values exceeding standard integer limits (overflow)."
  let hint4 = "1. Validate edge cases. 2. Initialize pointers or state tracking variables. 3. Iterate while maintaining the invariant. 4. Return the aggregated result."
  let coachTip = "Great engineers don't jump straight into coding. Sketch out 2 small test cases on paper first!"

  if (t.includes("two pointer") || p.includes("two sum") || p.includes("palindrome") || p.includes("water")) {
    hint1 = "💡 Intuition: Could two pointers moving in opposite directions (or one fast, one slow) eliminate the need for nested comparisons?"
    hint2 = "⚙️ Invariant: If the array is sorted, comparing elements at left and right indices tells you definitively which direction to move next."
    hint3 = "⚠️ Edge Cases: Beware of duplicate values if unique pairs are required, and odd vs even length inputs."
    hint4 = "Pseudocode:\nleft = 0, right = n - 1\nwhile left < right:\n  if condition_met(left, right): return result\n  else if too_small: left++\n  else: right--"
    coachTip = "Two pointers is the quintessential technique to reduce O(n²) nested loop searches into a single O(n) sweep."
  } else if (t.includes("sliding window") || p.includes("substring") || p.includes("subarray")) {
    hint1 = "💡 Intuition: Instead of recomputing results for overlapping subarrays, can you maintain a 'window' that expands to include new elements and contracts when invalid?"
    hint2 = "⚙️ Invariant: Expand the right boundary to find a valid window; then shrink the left boundary while maintaining validity to optimize your target metric."
    hint3 = "⚠️ Edge Cases: Window of size 0 or 1, string with all identical characters, or string with all distinct characters."
    hint4 = "Pseudocode:\nwindow_start = 0\nfor window_end in range(n):\n  add nums[window_end] to state\n  while state is invalid:\n    remove nums[window_start] from state\n    window_start++\n  update_best_answer()"
    coachTip = "Always ask yourself: 'What is the exact condition that makes this current window invalid?'"
  } else if (t.includes("dynamic programming") || t.includes("dp") || p.includes("climb") || p.includes("coin") || p.includes("robber")) {
    hint1 = "💡 Intuition: Break the problem into overlapping subproblems. Does the optimal answer for size N depend directly on optimal answers for size N-1 or N-2?"
    hint2 = "⚙️ Recurrence: Define dp[i] clearly in plain words (e.g. 'maximum profit achievable using elements up to index i'). What is the transition relation?"
    hint3 = "⚠️ Edge Cases: Base cases i = 0 and i = 1, unreachable states (initialize with infinity), and 0 amount/target."
    hint4 = "Pseudocode:\n// 1. Base cases\ndp[0] = base_val\n// 2. Tabulation loop\nfor i from 1 to n:\n  dp[i] = min/max/sum(dp[i - step] + cost)\nreturn dp[n]"
    coachTip = "If your DP state transition only looks back 1 or 2 steps, you can optimize Space Complexity from O(n) to O(1) using two variables!"
  } else if (t.includes("tree") || t.includes("binary") || p.includes("tree") || p.includes("depth")) {
    hint1 = "💡 Intuition: Trees are inherently recursive. If you knew the answer for the left subtree and right subtree, how would you combine them for the root?"
    hint2 = "⚙️ Invariant: A Depth-First Search (DFS) processes paths down to leaves, whereas Breadth-First Search (BFS) explores level by level using a FIFO Queue."
    hint3 = "⚠️ Edge Cases: Null root node, skewed tree (resembling a linked list, stack overflow risk), and single node."
    hint4 = "Pseudocode:\ndef dfs(node):\n  if not node: return base_case\n  left_res = dfs(node.left)\n  right_res = dfs(node.right)\n  return combine(left_res, right_res, node.val)"
    coachTip = "Think about whether you need information flowing from leaves UP to root (post-order) or root DOWN to leaves (pre-order)."
  } else if (t.includes("graph") || p.includes("island") || p.includes("course") || p.includes("cycle")) {
    hint1 = "💡 Intuition: Represent the problem as vertices and directed/undirected edges. Do you need to detect cycles, find shortest paths, or count components?"
    hint2 = "⚙️ Invariant: Always maintain a `visited` set or in-place mark to prevent infinite loops when traversing cyclic graphs."
    hint3 = "⚠️ Edge Cases: Disconnected components (loop over all vertices to trigger search), self-loops, and empty graph."
    hint4 = "Pseudocode:\nvisited = set()\nfor node in all_nodes:\n  if node not in visited:\n    bfs_or_dfs(node, visited)"
    coachTip = "For shortest path in an unweighted graph, BFS is guaranteed to find it first. For weighted graphs, reach for Dijkstra."
  }

  return {
    hint1,
    hint2,
    hint3,
    hint4,
    coachTip
  }
}

/**
 * Call Gemini 2.5 Flash API with Fallback Protection
 */
async function callGemini(promptText) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      },
      { timeout: 12000 }
    )

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (rawText) {
      return JSON.parse(rawText)
    }
  } catch (err) {
    console.warn("Gemini API call failed or timed out, falling back to heuristics:", err.message)
  }
  return null
}

/**
 * Public Service Methods
 */
async function analyzeComplexity({ code, language = "", problemContext = {} }) {
  if (process.env.GEMINI_API_KEY) {
    const prompt = `You are a senior algorithmic complexity analyzer for competitive programming.
Analyze the following code snippet and return ONLY a valid JSON object matching this schema:
{
  "timeComplexity": "e.g. O(n log n)",
  "timeExplanation": "Clear concise explanation of loops, recursions, and dominant operations",
  "spaceComplexity": "e.g. O(n)",
  "spaceExplanation": "Explanation of auxiliary allocations, stack memory, and variables",
  "bottlenecks": ["List of performance bottlenecks or potential issues"],
  "optimizations": ["List of optimization tips or theoretical lower bounds"],
  "isOptimal": boolean
}

Code:
\`\`\`${language}
${code}
\`\`\`
Problem Context: ${JSON.stringify(problemContext)}`

    const geminiResult = await callGemini(prompt)
    if (geminiResult && geminiResult.timeComplexity) {
      return geminiResult
    }
  }

  // Fallback heuristic analysis
  return heuristicComplexityAnalysis(code, language, problemContext)
}

async function generateSocraticHints({ title, topic, difficulty, notes, userQuery }) {
  if (process.env.GEMINI_API_KEY) {
    const prompt = `You are a world-class Socratic DSA Coach. Do NOT give away full solution code immediately.
Instead, provide tiered, layered hints that guide the student to think through the solution themselves.
Problem: "${title}"
Topic: "${topic}"
Difficulty: "${difficulty}"
Student Notes/Thoughts: "${notes || 'None'}"
Specific Question: "${userQuery || 'None'}"

Return ONLY a valid JSON object matching this schema:
{
  "hint1": "Level 1 - Core Intuition & Pattern: Which algorithmic pattern/data structure to consider and why (no code)",
  "hint2": "Level 2 - Invariant & Step: The mathematical invariant or state transition rule",
  "hint3": "Level 3 - Traps & Edge Cases: Sneaky test cases to guard against (overflow, duplicates, empty bounds)",
  "hint4": "Level 4 - Structural Pseudocode: Skeleton logic outline guiding the implementation",
  "coachTip": "Encouraging pedagogical advice or mental model reminder"
}`

    const geminiResult = await callGemini(prompt)
    if (geminiResult && geminiResult.hint1) {
      return geminiResult
    }
  }

  // Fallback heuristic hints
  return heuristicSocraticHints(title, topic, difficulty, notes)
}

module.exports = {
  analyzeComplexity,
  generateSocraticHints,
  heuristicComplexityAnalysis,
  heuristicSocraticHints
}
