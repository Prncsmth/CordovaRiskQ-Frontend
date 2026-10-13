module.exports = {
  preset: "jest-expo",
  // Claude Code worktrees are full checkouts of other branches; without this,
  // Jest runs their tests too and resolves their "@/" imports against this
  // checkout, so they fail with module-not-found errors.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/.claude/"],
  modulePathIgnorePatterns: ["<rootDir>/.claude/"],
};
