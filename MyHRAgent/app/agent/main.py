from functools import lru_cache
from strands import Agent
from strands.agent.conversation_manager.null_conversation_manager import NullConversationManager
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from model.load import load_model
from parse import parse_payload
from memory.session import get_memory_session_manager
from tools import email_tools, employee_tools, leave_tools

DEFAULT_SYSTEM_PROMPT = """
You are an HR assistant for the company's leave-management system. You help HR
staff look up employees, manage employee records, and track leave requests.

You have tools to:
- Create, look up, update, list, and delete employees.
- List employees hired within a date range.
- Record and list leave requests for an employee, optionally filtered by month.

Guidelines:
- Always use a tool to read or change data. Never guess or make up employee
  details, ids, dates, or leave records.
- Employee ids are short (8-character) strings. If you don't have an id, list
  employees first and match on name rather than assuming one.
- Dates are formatted YYYY-MM-DD. Month filters are formatted YYYY-MM. If a user
  gives a date in another format, convert it before calling a tool.
- Before deleting an employee or overwriting an existing record, confirm with
  the user, since these actions replace or remove data.
- When a lookup returns nothing, say so plainly instead of inventing a result.
- Keep replies short and factual. Summarize what a tool returned rather than
  dumping raw fields, but keep every value accurate.
- Only help with HR tasks this system supports. Decline unrelated requests.
"""

# Define a collection of tools used by the model
tools = [
    # Employee tools
    employee_tools.create_employee,
    employee_tools.save_employee,
    employee_tools.get_employee,
    employee_tools.list_employees,
    employee_tools.list_employees_by_hire_date,
    employee_tools.delete_employee,
    # Leave tools
    leave_tools.save_leave,
    leave_tools.list_leave,
    # Email tools
    email_tools.generate_leave_email,
    email_tools.send_email_to_hr,
]


app = BedrockAgentCoreApp()


@app.entrypoint
async def invoke(payload, context):
    session_id = getattr(context, "session_id", None) or "default-session"
    user_input, actor_id = parse_payload(payload)

    # parse_payload returns either a plain prompt or a full message history.
    history = []
    if isinstance(user_input, list):
        history, last = user_input[:-1], user_input[-1]
        prompt = "".join(b.get("text", "") for b in last.get("content", []))
    else:
        prompt = user_input

    session_manager = get_memory_session_manager(session_id, actor_id)
    agent = Agent(
        model=load_model(),
        system_prompt=DEFAULT_SYSTEM_PROMPT,
        tools=tools,
        messages=history or None,
        session_manager=session_manager,
        conversation_manager=NullConversationManager() if session_manager else None,
    )

    async for event in agent.stream_async(prompt):
        if "data" in event:
            yield event["data"]


if __name__ == "__main__":
    app.run()
