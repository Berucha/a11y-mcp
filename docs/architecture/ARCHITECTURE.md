# Architecture Diagram - GitHub Accessibility Reviewer MCP

## System Architecture Overview

```mermaid
graph TB
    subgraph "GitHub Repository"
        PR[Pull Request Event]
        Files[Changed Files]
    end
    
    subgraph "GitHub Actions Workflow"
        Trigger[Workflow Trigger]
        Checkout[Checkout Code]
        Setup[Setup Node.js]
        Install[Install Dependencies]
    end
    
    subgraph "MCP Server Layer"
        MCPServer[MCP Server<br/>src/mcp-server.js]
        Router[Request Router]
        
        subgraph "Analysis Engine"
            FastPath[Fast Path<br/>Regex Checks]
            ASTPath[AST Path<br/>Babel/PostCSS]
            Hybrid[Hybrid Decision<br/>Engine]
        end
        
        subgraph "Rule Engine"
            WCAGEngine[WCAG 2.2<br/>Rule Engine]
            LDSValidator[LDS Component<br/>Validator]
            ConfigMgr[Configuration<br/>Manager]
        end
        
        subgraph "Parsers"
            RegexParser[Regex Parser<br/>Pattern Matching]
            JSXParser[JSX/TSX Parser<br/>Babel AST]
            CSSParser[CSS Parser<br/>PostCSS]
        end
    end
    
    subgraph "External Services"
        LDSStorybook[LDS Storybook API]
        GitHubAPI[GitHub API]
    end
    
    subgraph "Output Layer"
        Results[Analysis Results]
        PRComment[PR Comment]
        CheckRun[GitHub Check Run]
        Artifacts[Artifacts]
    end
    
    PR --> Trigger
    Trigger --> Checkout
    Checkout --> Setup
    Setup --> Install
    Install --> MCPServer
    
    MCPServer --> Router
    Router --> Hybrid
    Hybrid -->|Simple Cases| FastPath
    Hybrid -->|Complex Cases| ASTPath
    
    FastPath --> RegexParser
    ASTPath --> JSXParser
    ASTPath --> CSSParser
    
    RegexParser --> WCAGEngine
    JSXParser --> WCAGEngine
    CSSParser --> WCAGEngine
    
    WCAGEngine --> LDSValidator
    LDSValidator --> LDSStorybook
    WCAGEngine --> ConfigMgr
    
    WCAGEngine --> Results
    Results --> PRComment
    Results --> CheckRun
    Results --> Artifacts
    
    PRComment --> GitHubAPI
    CheckRun --> GitHubAPI
```

## Component Architecture

```mermaid
graph LR
    subgraph "Core Components"
        A[MCP Server<br/>mcp-server.js]
        B[Hybrid Analyzer<br/>hybrid-analyzer.js]
        C[Regex Analyzer<br/>regex-analyzer.js]
    end
    
    subgraph "Fast Path"
        D[Regex Patterns]
        E[Pattern Matching]
    end
    
    subgraph "AST Path"
        F[Babel Parser<br/>JSX/TSX]
        G[PostCSS Parser<br/>CSS/SCSS]
        H[AST Traversal]
    end
    
    subgraph "Integration"
        I[MCP Client<br/>mcp-client.js]
        J[GitHub Actions<br/>analyze-pr-mcp.js]
        K[CLI Tool<br/>cli-scanner.js]
    end
    
    A --> B
    B -->|Fast| C
    B -->|Complex| F
    C --> D
    C --> E
    F --> G
    F --> H
    A --> I
    I --> J
    A --> K
```

## Data Flow

```mermaid
sequenceDiagram
    participant PR as Pull Request
    participant GA as GitHub Actions
    participant Analyzer as analyze-pr-mcp.js
    participant Client as mcp-client.js
    participant MCP as MCP Server<br/>mcp-server.js
    participant Hybrid as Hybrid Analyzer<br/>hybrid-analyzer.js
    participant Fast as Fast Path<br/>regex-analyzer.js
    participant AST as AST Path<br/>Babel/PostCSS
    participant Rules as WCAG Rules<br/>Embedded in Analyzers
    participant GitHub as GitHub API
    
    PR->>GA: PR Event Triggered
    GA->>GA: Checkout & Setup
    GA->>Analyzer: Run analyze-pr-mcp.js
    Analyzer->>GitHub: Fetch PR Files
    GitHub-->>Analyzer: File Contents
    Analyzer->>Client: checkAccessibilityBatch()
    Client->>MCP: JSON-RPC Request (stdio)
    MCP->>Hybrid: Route File Analysis
    Hybrid->>Hybrid: Determine Path
    
    alt Simple Violations
        Hybrid->>Fast: Pattern Matching
        Fast->>Rules: Regex Results
    else Complex Cases
        Hybrid->>AST: Parse with Babel/PostCSS
        AST->>Rules: AST Results
    end
    
    Rules->>Rules: Apply WCAG 2.2 Rules
    Rules->>MCP: Return Violations
    MCP->>Client: JSON-RPC Response
    Client-->>Analyzer: Parsed Results
    Analyzer->>GitHub: Post PR Comment
    Analyzer->>GitHub: Create Check Run
    GitHub->>PR: Display Results
```

## Hybrid Decision Logic

```mermaid
flowchart TD
    Start[File to Analyze] --> CheckType{File Type?}
    
    CheckType -->|JSX/TSX| CheckComplexity{Complex Code?}
    CheckType -->|CSS/SCSS| CheckComplexity
    CheckType -->|HTML| FastPath[Use Fast Path]
    
    CheckComplexity -->|Has ARIA| ASTPath[Use AST Path]
    CheckComplexity -->|Has useState/useEffect| ASTPath
    CheckComplexity -->|Has CSS-in-JS| ASTPath
    CheckComplexity -->|Has Dynamic Content| ASTPath
    CheckComplexity -->|Simple Patterns| FastPath
    
    FastPath --> RegexChecks[Regex Pattern Checks]
    ASTPath --> ParseAST[Parse with Babel/PostCSS]
    
    ParseAST --> ASTChecks[AST-based Checks]
    
    RegexChecks --> MergeResults[Merge Results]
    ASTChecks --> MergeResults
    
    MergeResults --> Return[Return Violations]
```

## Technology Stack

```mermaid
graph TB
    subgraph "Runtime"
        Node[Node.js 18+]
        ESModules[ES Modules]
    end
    
    subgraph "Protocol"
        MCP[MCP Protocol<br/>JSON-RPC 2.0]
        Stdio[Stdio Transport]
    end
    
    subgraph "Parsing"
        Regex[Regex Patterns<br/>Fast Checks]
        Babel[Babel Parser<br/>JSX/TSX]
        PostCSS[PostCSS<br/>CSS/SCSS]
    end
    
    subgraph "Analysis"
        WCAG[WCAG 2.2 Rules]
        LDS[LDS Validation]
        Config[Config System]
    end
    
    subgraph "Integration"
        GitHub[GitHub Actions<br/>analyze-pr-mcp.js]
        CLI[CLI Tool<br/>cli-scanner.js]
        MCPClient[MCP Client<br/>mcp-client.js]
        API[GitHub API]
    end
    
    Node --> ESModules
    ESModules --> MCP
    MCP --> Stdio
    Stdio --> Babel
    Stdio --> PostCSS
    Stdio --> Regex
    Babel --> WCAG
    PostCSS --> WCAG
    Regex --> WCAG
    WCAG --> LDS
    WCAG --> Config
    LDS --> GitHub
    Config --> GitHub
    GitHub --> API
    GitHub --> CLI
```

## File Structure

```
a11y-mcp/
├── src/
│   ├── core/
│   │   ├── hybrid-analyzer.js  # Hybrid decision engine (fast regex + AST)
│   │   └── regex-analyzer.js   # Fast regex-based analyzer
│   └── mcp-server.js           # MCP server implementation (JSON-RPC)
├── scripts/
│   ├── analyze-pr-mcp.js       # GitHub Actions PR analyzer
│   ├── mcp-client.js           # MCP client for JSON-RPC communication
│   ├── color-contrast.js       # Color contrast calculator
│   ├── scan-parallel.js        # Parallel file scanning
│   ├── setup-integration.js    # Easy integration setup script
│   └── test-mcp-integration.js # MCP integration tests
├── cli-scanner.js              # Standalone CLI tool
├── run.sh                      # Batch file scanner script
├── github-actions/
│   └── accessibility-review.yml # GitHub Actions workflow
├── examples/                   # Test files with violations
├── tests/
│   └── accessibility-checks.test.js # Test suite
└── docs/
    └── architecture/
        └── ARCHITECTURE.md     # This file
```

## Performance Characteristics

| Component | Speed | Accuracy | Use Case |
|-----------|-------|----------|----------|
| **Fast Path (Regex)** | ⚡⚡⚡⚡⚡ | ⚡⚡⚡ | Simple violations, large files |
| **AST Path** | ⚡⚡ | ⚡⚡⚡⚡⚡ | Complex violations, dynamic code |
| **Hybrid** | ⚡⚡⚡⚡ | ⚡⚡⚡⚡⚡ | Production (best of both) |

## Integration Points

1. **GitHub Actions**: Automated PR checks via `analyze-pr-mcp.js`
2. **MCP Protocol**: Standardized tool interface (JSON-RPC via stdio)
3. **CLI Tool**: Local development via `cli-scanner.js`
4. **MCP Client**: `mcp-client.js` for programmatic access
5. **GitHub API**: PR comments and check runs via `@octokit/rest`

**Planned Integrations:**
- **LDS Storybook**: Component validation (Phase 2)
- **Configuration**: Per-repo customization (Phase 3)

---

**Version**: 2.0.0 (Production Ready)
**Last Updated**: Current session
