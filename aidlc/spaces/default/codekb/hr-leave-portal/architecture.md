# Architecture

## Architecture Analysis

### System Overview
Serverless AWS system defined with Python CDK. A FastAPI app on Lambda behind API Gateway serves employee CRUD, and a Strands-based agent runs on Bedrock AgentCore Runtime. Both share one DynamoDB table and one Cognito user pool.

### Architectural Style
Serverless, two entry points over a shared data store (evidence: backend_stack.py, agent_runtime_stack.py).

### Component Relationships
```mermaid
flowchart LR
  User[Browser / future React UI] -->|Cognito token| APIGW[API Gateway HrApi]
  User -->|Cognito JWT| ACR[AgentCore Runtime hrAgent]
  APIGW --> Lambda[Lambda FastAPI + Mangum]
  Lambda --> DDB[(DynamoDB HrTable)]
  ACR --> Agent[Strands agent container]
  Agent --> DDB
  Agent --> Bedrock[Bedrock models]
  Agent --> SNS[SNS HR email topic]
  Agent --> Mem[AgentCore Memory optional]
  Cognito[Cognito User Pool] -.authorizes.-> APIGW
  Cognito -.authorizes.-> ACR
```
Text fallback: the user calls API Gateway (Cognito authorizer) which invokes the Lambda, and calls AgentCore Runtime (Cognito JWT) which runs the agent; both read and write DynamoDB; the agent also uses Bedrock, SNS and optional memory.

### Data Flow
- REST: request -> API Gateway -> Cognito authorizer -> Lambda -> DynamoDB.
- Agent: prompt -> AgentCore -> agent loop -> tools -> DynamoDB/SNS/Bedrock -> streamed text back.

### Key Design Decisions
- Single-table DynamoDB: employees `PK=USER, SK=<employeeId>`; leave `PK=<employeeId>, SK=<startDate>`; GSI1 `USER_BY_DATE` by start date.
- Build artifacts (Lambda layer ARN, agent image URI) pass through SSM parameters, resolved at synth.
- One Cognito pool and client authorize both API Gateway and AgentCore.

### Improvement Opportunities
- Add the missing leave controller; align employee item shape (GSI keys) between REST and agent.
- Restrict CORS, pin account/region, stop hard-coding the SNS ARN.

## Interaction Diagrams

### List employees via REST
```mermaid
sequenceDiagram
  participant U as Browser
  participant G as API Gateway
  participant C as Cognito authorizer
  participant L as Lambda FastAPI
  participant D as DynamoDB
  U->>G: GET /employees (Authorization token)
  G->>C: validate token
  C-->>G: ok
  G->>L: proxy event
  L->>D: query PK=USER
  D-->>L: items
  L-->>U: 200 {employees: [...]}
```
Text fallback: the browser sends a token; the authorizer validates it; Lambda queries PK=USER and returns `{employees: [...]}`.

### Chat with hrAgent
```mermaid
sequenceDiagram
  participant U as Browser
  participant R as AgentCore Runtime
  participant A as Strands agent
  participant T as Tools
  U->>R: invoke {prompt, actorId} + Bearer JWT + session id
  R->>A: entrypoint(payload, context)
  A->>T: tool calls (DynamoDB / SNS / Bedrock)
  T-->>A: results
  A-->>R: streamed text chunks
  R-->>U: streamed response
```
Text fallback: the browser invokes the runtime with a prompt; the agent calls tools and streams text chunks back.
