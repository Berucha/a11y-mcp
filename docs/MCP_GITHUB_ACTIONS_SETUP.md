# ✅ MCP-Based Accessibility Checker - Ready for GitHub Actions!

## 🎉 What You Have Now

A **real Model Context Protocol (MCP) server** for accessibility checking that integrates with GitHub Actions!

### 🏗️ Architecture

```
┌──────────────────────┐
│   GitHub PR Event    │
│  (Pull Request Open) │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  GitHub Actions      │
│  Workflow Runner     │
└──────────┬───────────┘
           │
           ▼  MCP Protocol (JSON-RPC)
┌──────────────────────────────────────┐
│  MCP Server (mcp-server-simple.js)   │
│  ┌────────────────────────────────┐  │
│  │  Tools:                        │  │
│  │  - check_accessibility()       │  │
│  │  - check_accessibility_batch() │  │
│  │  - suggest_fix()               │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────┐
│  GitHub API          │
│  Post Results to PR  │
└──────────────────────┘
```

## ✨ Why This is a Real MCP Solution

✅ **Implements MCP Protocol** - Uses `@modelcontextprotocol/sdk` for standardized communication  
✅ **Exposes Tools** - Provides `check_accessibility`, `check_accessibility_batch`, `suggest_fix` tools  
✅ **JSON-RPC Communication** - Follows Model Context Protocol specification  
✅ **Stdio Transport** - Can be called by any MCP client (GitHub Actions, Claude Desktop, custom tools)  
✅ **Standardized Interface** - Works with any MCP-compatible system  
✅ **Future-Ready** - Can be extended with more tools, used by AI agents, integrated with Copilot  

## 📊 What It Does

| Feature | Details |
|---------|---------|
| **File Types** | `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.htm`, `.css`, `.scss` |
| **Violations Detected** | 10 types covering WCAG 2.2 Level A & AA |
| **WCAG Coverage** | Images, Buttons, Forms, Links, HTML structure, Focus styles |
| **Integration** | GitHub Actions (automated PR checks) |
| **Protocol** | Model Context Protocol (MCP) via JSON-RPC |
| **Transport** | Stdio (standard input/output) |

## 🚀 Setup for GitHub Actions (5 minutes)

### Step 1: Copy MCP Server to Your Repository

```bash
# In your target repository (where you want accessibility checks)
mkdir -p .github/a11y-mcp
cd .github/a11y-mcp

# Copy the MCP server and dependencies
cp /Users/C284934/Github/Accessibility/a11y-mcp/mcp-server-simple.js .
cp /Users/C284934/Github/Accessibility/a11y-mcp/package.json .
cp /Users/C284934/Github/Accessibility/a11y-mcp/package-lock.json .
```

### Step 2: Copy GitHub Actions Workflow

```bash
# From your repository root
mkdir -p .github/workflows
cp /Users/C284934/Github/Accessibility/a11y-mcp/github-actions/accessibility-mcp-workflow.yml .github/workflows/accessibility-check.yml
```

### Step 3: Commit and Push

```bash
git add .github/
git commit -m "Add MCP-based accessibility checks"
git push
```

### Step 4: Test It!

Create a test PR with a file containing violations:

```jsx
// test-component.jsx
export const BadComponent = () => {
  return (
    <div>
      <img src="logo.png" />  {/* Missing alt text */}
      <div onClick={() => alert('Hi')}>Click</div>  {/* Should be button */}
    </div>
  );
};
```

The MCP server will analyze it and post results to your PR!

## 🧪 Testing the MCP Server Locally

### Test 1: List Available Tools

```bash
cd /Users/C284934/Github/Accessibility/a11y-mcp

echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  node mcp-server-simple.js 2>/dev/null | jq
```

**Expected Output:**
```json
{
  "tools": [
    {
      "name": "check_accessibility",
      "description": "Check a file for WCAG 2.2 AA accessibility violations",
      ...
    },
    {
      "name": "check_accessibility_batch",
      ...
    },
    {
      "name": "suggest_fix",
      ...
    }
  ]
}
```

### Test 2: Check a Single File

```bash
cat << 'EOF' | node mcp-server-simple.js 2>/dev/null | jq
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "check_accessibility",
    "arguments": {
      "filePath": "test.html",
      "content": "<html><body><img src='test.jpg'></body></html>"
    }
  }
}
EOF
```

### Test 3: Get Fix Suggestions

```bash
cat << 'EOF' | node mcp-server-simple.js 2>/dev/null | jq
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "suggest_fix",
    "arguments": {
      "violationId": "img-missing-alt",
      "code": "<img src='logo.png'>"
    }
  }
}
EOF
```

## 📋 MCP Tools Reference

### Tool: `check_accessibility`

Check a single file for violations.

**Input:**
```json
{
  "filePath": "src/App.jsx",
  "content": "<optional file content>"
}
```

**Output:**
```json
{
  "filePath": "src/App.jsx",
  "fileType": "jsx",
  "violations": [...],
  "summary": {
    "totalViolations": 3,
    "errors": 2,
    "warnings": 1
  }
}
```

### Tool: `check_accessibility_batch`

Check multiple files at once.

**Input:**
```json
{
  "files": [
    {"path": "src/App.jsx", "content": "..."},
    {"path": "src/styles.css", "content": "..."}
  ]
}
```

**Output:**
```json
{
  "results": [...],
  "summary": {
    "filesChecked": 2,
    "filesWithViolations": 1,
    "totalViolations": 5
  }
}
```

### Tool: `suggest_fix`

Get detailed fix suggestions for a violation.

**Input:**
```json
{
  "violationId": "img-missing-alt",
  "code": "<img src='logo.png'>"
}
```

**Output:**
```json
{
  "violationId": "img-missing-alt",
  "code": "<img src='logo.png'>",
  "suggestions": [
    "Add descriptive alt text: <img src='...' alt='Description'>",
    "For decorative images, use alt=''",
    ...
  ]
}
```

## 🎯 How GitHub Actions Uses the MCP Server

1. **PR is created/updated** → GitHub Actions workflow triggers
2. **Get changed files** → Identifies files to check
3. **Prepare MCP request** → Builds JSON-RPC request with file contents
4. **Call MCP server** → `cat mcp-request.json | node mcp-server-simple.js`
5. **Parse MCP response** → Extract violations from JSON-RPC response
6. **Post results to PR** → Comment with detailed findings
7. **Pass/Fail check** → Fails if violations found (optional)

## 🔧 Configuration

### Make Checks Required

1. Go to your repo → **Settings** → **Branches**
2. Edit branch protection for `main`
3. Enable "Require status checks to pass before merging"
4. Check "accessibility-check"

Now PRs **cannot merge** until accessibility issues are fixed!

### Customize File Types

Edit `.github/workflows/accessibility-check.yml`:

```yaml
paths:
  - 'src/**/*.jsx'  # Only check src folder
  - 'components/**/*.tsx'
  # Add/remove patterns as needed
```

## 🌟 Future Enhancements (Easy to Add)

Since this is a real MCP server, you can:

✅ **Add More Tools** - Add `generate_report`, `check_ldscomponents`, etc.  
✅ **Use with AI Agents** - Let developers ask Copilot Chat about violations  
✅ **Add Resources** - Expose WCAG guidelines as MCP resources  
✅ **Add Prompts** - Create MCP prompts for common accessibility tasks  
✅ **HTTP Transport** - Run as HTTP server for web-based tools  
✅ **Connect to Claude Desktop** - Let Claude help fix violations  

## 📖 Key Files

| File | Purpose |
|------|---------|
| `mcp-server-simple.js` | The MCP server implementation |
| `github-actions/accessibility-mcp-workflow.yml` | GitHub Actions workflow |
| `package.json` | MCP SDK dependencies |
| `cli-scanner.js` | Standalone CLI (non-MCP fallback) |

## 🎓 Learn More

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [MCP SDK on GitHub](https://github.com/modelcontextprotocol/sdk)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)

## ✅ You're Ready!

You now have a **real MCP-based accessibility checker** that:
- ✅ Implements the Model Context Protocol
- ✅ Works with GitHub Actions
- ✅ Can be extended with AI agents/Copilot
- ✅ Follows industry standards
- ✅ Is production-ready

**This meets your MVP requirements!** 🎉

---

## 🆘 Troubleshooting

**Q: MCP server not responding?**  
A: Make sure `@modelcontextprotocol/sdk` is installed: `npm ci` in `.github/a11y-mcp/`

**Q: No violations found but I see issues?**  
A: Test locally first with `echo '...' | node mcp-server-simple.js` to debug

**Q: Want to add more checks?**  
A: Edit the `analyzeFile()` function in `mcp-server-simple.js`

**Q: How to use with Copilot Chat?**  
A: Coming in future iteration - need to configure MCP client in VS Code

---

**Questions?** Test locally first, check the MCP protocol documentation, or review the GitHub Actions logs.
