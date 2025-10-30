# Agent Roles & Capabilities

Quick reference guide for all available specialized agents.

## 🏗️ System Architect

**Agent Type:** `system-architect`

**Primary Focus:** High-level technical design and architecture

**Use When:**
- Designing new system architectures
- Making architectural decisions
- Evaluating design patterns and trade-offs
- Planning for scalability and performance
- Creating system-wide technical designs
- Documenting architectural decisions

**Capabilities:**
- Microservices architecture design
- System component design
- Technology stack evaluation
- Scalability planning
- Performance architecture
- Integration pattern design
- Architectural documentation

**Outputs:**
- Architecture diagrams
- Technical decision records
- Scalability plans
- Design pattern recommendations
- System integration guides

**Documentation:** `.agent/agents/system-architect/`

---

## 🔍 Research Analyst

**Agent Type:** `research-analyst`

**Primary Focus:** Deep investigation and contextual understanding

**Use When:**
- Understanding existing codebase before changes
- Investigating dependencies and patterns
- Mapping system relationships
- Documenting technical debt
- Analyzing integration points
- Researching best practices

**Capabilities:**
- Codebase exploration and analysis
- Dependency mapping
- Pattern identification
- Technical debt assessment
- Multi-source information synthesis
- Context gathering
- Impact analysis

**Outputs:**
- Research reports in `.agent/tasks/research/`
- Codebase analysis documents
- Dependency maps
- Technical debt assessments
- Integration point documentation

**Documentation:** `.agent/agents/research-analyst/`

---

## 💻 Implementation Coder

**Agent Type:** `implementation-coder`

**Primary Focus:** Production-quality code implementation

**Use When:**
- Implementing features from specifications
- Refactoring existing code
- Adding error handling and validation
- Optimizing performance
- Designing APIs
- Writing clean, maintainable code

**Capabilities:**
- Production code implementation
- Code refactoring
- API design and development
- Error handling implementation
- Performance optimization
- Best practices application
- Clean code principles

**Outputs:**
- Production-ready code
- Refactored implementations
- API implementations
- Unit tests
- Implementation documentation

**Documentation:** `.agent/agents/implementation-coder/`

---

## 🎯 Code Quality Analyzer

**Agent Type:** `code-quality-analyzer`

**Primary Focus:** Comprehensive code quality assurance

**Use When:**
- After completing feature implementation
- Before creating pull requests
- Reviewing refactored code
- Assessing technical debt
- Analyzing code complexity
- **PROACTIVELY after any coding task**

**Capabilities:**
- Code smell detection
- Complexity analysis
- Best practice validation
- Security review
- Performance analysis
- Refactoring suggestions
- Technical debt identification

**Outputs:**
- Code quality reports
- Refactoring recommendations
- Complexity metrics
- Security findings
- Performance improvement suggestions

**Documentation:** `.agent/agents/code-quality-analyzer/`

---

## 🔧 Backend API Developer

**Agent Type:** `backend-api-dev`

**Primary Focus:** Backend and database development

**Use When:**
- Creating REST or GraphQL endpoints
- Implementing authentication/authorization
- Designing database schemas
- Building CRUD operations
- Adding API middleware
- Working with Supabase PostgreSQL

**Capabilities:**
- REST/GraphQL endpoint creation
- Authentication systems (JWT, OAuth, etc.)
- Database schema design
- Supabase integration
- CRUD operations
- API validation and middleware
- Database query optimization

**Outputs:**
- API endpoints
- Database schemas and migrations
- Authentication implementations
- CRUD services
- API documentation

**Documentation:** `.agent/agents/backend-api-dev/`

---

## 🔀 PR Manager

**Agent Type:** `pr-manager`

**Primary Focus:** Pull request lifecycle management

**Use When:**
- Creating GitHub pull requests
- Orchestrating code reviews
- Managing merge workflows
- Running automated tests
- Coordinating multi-agent reviews
- Handling complex PR lifecycles

**Capabilities:**
- PR creation and management
- Multi-agent review coordination
- Test automation orchestration
- Merge conflict resolution
- Review swarm coordination
- CI/CD integration

**Outputs:**
- GitHub pull requests
- Review coordination plans
- Test results
- Merge reports

**Documentation:** `.agent/agents/pr-manager/`

---

## Agent Selection Guide

### By Task Type

**Architecture & Planning:**
→ System Architect

**Research & Analysis:**
→ Research Analyst

**Code Implementation:**
→ Implementation Coder (general)
→ Backend API Developer (API/database specific)

**Quality Assurance:**
→ Code Quality Analyzer

**Deployment:**
→ PR Manager

### By Project Phase

**1. Discovery Phase**
- Research Analyst (understand existing code)
- System Architect (plan architecture)

**2. Development Phase**
- Implementation Coder (general features)
- Backend API Developer (API/database)

**3. Review Phase**
- Code Quality Analyzer (always!)

**4. Integration Phase**
- PR Manager (create and manage PRs)

### Parallel vs Sequential

**Can Run in Parallel:**
- Research Analyst + System Architect (independent research and design)
- Implementation Coder + Backend API Developer (if independent features)
- Multiple Implementation tasks (if no dependencies)

**Must Run Sequentially:**
- Research → Design → Implementation
- Implementation → Quality Analysis
- Quality Analysis → PR Creation

---

## Common Patterns

### Pattern 1: New Feature
```
1. Research Analyst - Understand existing code
2. System Architect - Design integration
3. Implementation Coder - Build feature
4. Code Quality Analyzer - Review
5. PR Manager - Create PR
```

### Pattern 2: API Development
```
1. Research Analyst - Analyze requirements
2. Backend API Developer - Build endpoints
3. Code Quality Analyzer - Review
4. PR Manager - Create PR
```

### Pattern 3: Refactoring
```
1. Research Analyst - Identify patterns
2. Code Quality Analyzer - Assess current state
3. Implementation Coder - Refactor
4. Code Quality Analyzer - Verify improvements
5. PR Manager - Create PR
```

### Pattern 4: Architecture Change
```
1. System Architect - Design new architecture
2. Research Analyst - Analyze impact
3. Multiple agents in parallel - Implement components
4. Code Quality Analyzer - Review all changes
5. PR Manager - Coordinate PRs
```
