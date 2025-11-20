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
            JSXParser[JSX/TSX Parser<br/>Babel AST]
            CSSParser[CSS Parser<br/>PostCSS]
            RegexParser[Regex Parser<br/>Pattern Matching]
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
        A[Accessibility Scanner]
        B[Hybrid Analyzer]
        C[Rule Engine]
        D[Parser Factory]
    end
    
    subgraph "Fast Path"
        E[Regex Analyzer]
        F[Pattern Matcher]
    end
    
    subgraph "AST Path"
        G[Babel Parser]
        H[PostCSS Parser]
        I[AST Traverser]
    end
    
    subgraph "Integration"
        J[MCP Server]
        K[GitHub Actions]
        L[CLI Tool]
    end
    
    A --> B
    B -->|Fast| E
    B -->|Complex| G
    E --> F
    G --> H
    G --> I
    B --> C
    C --> D
    A --> J
    A --> K
    A --> L
```

## Data Flow

```mermaid
sequenceDiagram
    participant PR as Pull Request
    participant GA as GitHub Actions
    participant Analyzer as analyze-pr-mcp.js
    participant Client as mcp-client.js
    participant MCP as MCP Server
    participant Hybrid as Hybrid Analyzer
    participant Fast as Fast Path
    participant AST as AST Path
    participant Rules as Rule Engine
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
    
    Rules->>Rules: Apply WCAG Rules
    Rules->>Rules: Validate LDS Components
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
        Babel[Babel Parser<br/>JSX/TSX]
        PostCSS[PostCSS<br/>CSS/SCSS]
        Regex[Regex Patterns<br/>Fast Checks]
    end
    
    subgraph "Analysis"
        WCAG[WCAG 2.2 Rules]
        LDS[LDS Validation]
        Config[Config System]
    end
    
    subgraph "Integration"
        GitHub[GitHub Actions]
        CLI[CLI Tool]
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
│   │   ├── scanner.ts          # Main scanner orchestrator
│   │   ├── hybrid-analyzer.ts  # Hybrid decision engine
│   │   └── rule-engine.ts      # WCAG rule engine
│   ├── parsers/
│   │   ├── fast-parser.ts      # Regex-based fast parser
│   │   ├── ast-parser.ts       # AST-based parser
│   │   ├── javascript.ts        # Babel JSX/TSX parser
│   │   └── css.ts              # PostCSS parser
│   ├── rules/
│   │   ├── wcag-rules.ts       # WCAG 2.2 rules
│   │   ├── lds-rules.ts        # LDS component rules
│   │   └── custom-rules.ts      # Custom rule definitions
│   ├── integration/
│   │   ├── mcp-server.ts       # MCP server implementation
│   │   ├── github-actions.ts   # GitHub Actions integration
│   │   └── cli.ts              # CLI interface
│   └── utils/
│       ├── color-contrast.ts   # Color contrast calculator
│       └── config.ts           # Configuration management
├── scripts/
│   ├── setup.js                # Easy integration script
│   └── analyze-pr.js           # PR analysis script
├── .github/
│   └── workflows/
│       └── accessibility-review.yml
└── docs/
    └── ARCHITECTURE.md         # This file
```

## Performance Characteristics

| Component | Speed | Accuracy | Use Case |
|-----------|-------|----------|----------|
| **Fast Path (Regex)** | ⚡⚡⚡⚡⚡ | ⚡⚡⚡ | Simple violations, large files |
| **AST Path** | ⚡⚡ | ⚡⚡⚡⚡⚡ | Complex violations, dynamic code |
| **Hybrid** | ⚡⚡⚡⚡ | ⚡⚡⚡⚡⚡ | Production (best of both) |

## Integration Points

1. **GitHub Actions**: Automated PR checks
2. **MCP Protocol**: Standardized tool interface
3. **CLI Tool**: Local development
4. **LDS Storybook**: Component validation
5. **Configuration**: Per-repo customization

---

**Version**: 2.0.0 (Production Ready)
**Last Updated**: Current session
