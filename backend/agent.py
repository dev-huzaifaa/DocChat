import os
import re
import json
import asyncio
from openai import OpenAI
from ddgs import DDGS
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

MODEL = "llama-3.1-8b-instant"

SYSTEM_PROMPT = (
    "Answer using the document context below. Cite sources like [Source 1]. "
    "If the context does not clearly and fully answer the question, "
    "you MUST call the web_search tool before responding — do not say "
    "'I do not know' without first attempting a web search. Never make things up. "
    "Respond with the final answer only — do not narrate your reasoning, do not "
    "describe what you are about to do, and do not include any <think> tags."
)

WEB_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the web for current information not found in the provided documents.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "the search query"}
            },
            "required": ["query"],
        },
    },
}

# ever reaches the user, whether it arrives in one chunk or split across chunks.
THINK_TAG_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)

def strip_reasoning(text: str) -> str:
    if not text:
        return text
    return THINK_TAG_RE.sub("", text).strip()
# llama-3.1-8b-instant frequently refuses instead of calling the web_search
# tool, even when the system prompt explicitly instructs it to search first.
# Small models are unreliable at spontaneous tool-calling, so instead of
# trusting the model's judgment, we detect a refusal after the fact and
# force a web search ourselves.
REFUSAL_RE = re.compile(
    r"(i\s*(can'?t|cannot|am unable to)\s*(answer|find|determine)|"
    r"(context|document)s?\s*(does not|doesn'?t|do not|don'?t)\s*(contain|provide|include)|"
    r"not\s*(mentioned|found|available)\s*in\s*the\s*(context|document))",
    re.IGNORECASE,
)

def looks_like_refusal(text: str) -> bool:
    return bool(text) and bool(REFUSAL_RE.search(text))

def do_web_search(query):
    results = DDGS().text(query, max_results=4)
    if not results:
        return "No results found."
    return "\n\n".join(f"{r['title']}: {r['body']}" for r in results)

def build_context(chunks):
    if not chunks:
        return "No relevant document content found."
    return "\n\n---\n\n".join(
        f"[Source {i + 1}: {c['source']}, page {c['page']}]\n{c['text']}"
        for i, c in enumerate(chunks)
    )

def _assistant_tool_call_message(msg):
    """Convert an SDK message object with tool_calls into a plain dict the
    API can accept back on the next turn. Passing the raw pydantic object
    back in `messages` is invalid and is what causes the model to get
    confused and start narrating its reasoning instead of answering."""
    return {
        "role": "assistant",
        "content": msg.content or "",
        "tool_calls": [
            {
                "id": call.id,
                "type": "function",
                "function": {
                    "name": call.function.name,
                    "arguments": call.function.arguments,
                },
            }
            for call in msg.tool_calls
        ],
    }

def _run_tool_calls(messages, msg):
    """Appends the assistant tool-call message + tool results to `messages`."""
    messages.append(_assistant_tool_call_message(msg))
    for call in msg.tool_calls:
        args = json.loads(call.function.arguments)
        result = do_web_search(args["query"])
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,
            "content": result,
        })

def _force_web_search(messages, question):
    """Runs a web search directly (no tool-call round trip needed) and
    appends the results as a system note, for use when the model refused
    to answer instead of calling the tool itself."""
    result = do_web_search(question)
    messages.append({
        "role": "system",
        "content": (
            "The document context did not answer the question, so a web "
            f"search was run automatically. Web search results:\n\n{result}\n\n"
            "Answer the original question using these results."
        ),
    })

def answer_question(question, vectorstore, top_k=4):
    retrieved = vectorstore.query(question, top_k=top_k)
    context = build_context(retrieved)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
    ]

    used_web_search = False

    try:
        response = client.chat.completions.create(
            model=MODEL, messages=messages, tools=[WEB_SEARCH_TOOL],
        )
        msg = response.choices[0].message
    except Exception as e:
        print("TOOL CALL FAILED, falling back to plain answer:", e)
        response = client.chat.completions.create(model=MODEL, messages=messages)
        msg = response.choices[0].message
        return {
            "answer": strip_reasoning(msg.content),
            "sources": retrieved,
            "used_web_search": False,
        }

    if msg.tool_calls:
        used_web_search = True
        _run_tool_calls(messages, msg)
        response = client.chat.completions.create(model=MODEL, messages=messages)
        msg = response.choices[0].message
    elif looks_like_refusal(msg.content):
        # Model refused instead of calling the tool — force a search and retry.
        used_web_search = True
        _force_web_search(messages, question)
        response = client.chat.completions.create(model=MODEL, messages=messages)
        msg = response.choices[0].message

    return {
        "answer": strip_reasoning(msg.content),
        "sources": retrieved,
        "used_web_search": used_web_search,
    }

async def stream_answer(question, vectorstore, top_k=4):
    """
    Yields NDJSON lines:
      {"type": "meta", ...}   -> sent once, up front
      {"type": "token", "text": "..."} -> sent per chunk, as they arrive
      {"type": "error", "text": "..."} -> only on failure
      {"type": "done"} -> sent once at the very end
    """
    retrieved = vectorstore.query(question, top_k=top_k)
    context = build_context(retrieved)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
    ]
    used_web_search = False

    # Step 1: one non-streaming call, purely to detect whether a tool call
    # is needed. This is unavoidable — you can't know if the model wants to
    # call a tool until you get its (non-streamed) decision back.
    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=MODEL,
            messages=messages,
            tools=[WEB_SEARCH_TOOL],
        )
        msg = response.choices[0].message
    except Exception as exc:
        yield json.dumps({"type": "error", "text": f"Stream setup failed: {exc}"}) + "\n"
        return

    if msg.tool_calls:
        used_web_search = True
        _run_tool_calls(messages, msg)
    elif looks_like_refusal(msg.content):
        # Model refused instead of calling the tool — force a search and retry.
        used_web_search = True
        _force_web_search(messages, question)

    # Let the frontend render sources / web-search badge immediately,
    # before any answer tokens arrive.
    yield json.dumps({
        "type": "meta",
        "sources": retrieved,
        "used_web_search": used_web_search,
    }) + "\n"
    # Step 2: the actual streamed answer.
    stream = await asyncio.to_thread(
        client.chat.completions.create,
        model=MODEL,
        messages=messages,
        stream=True,
    )
    buffer = ""
    in_think_block = False

    for chunk in stream:
        delta = getattr(getattr(chunk, "choices", [None])[0], "delta", None)
        content = getattr(delta, "content", None)
        if not content:
            continue
        buffer += content
        while True:
            if not in_think_block:
                start = buffer.find("<think>")
                if start == -1:
                    if buffer:
                        yield json.dumps({"type": "token", "text": buffer}) + "\n"
                    buffer = ""
                    break
                else:
                    if start > 0:
                        yield json.dumps({"type": "token", "text": buffer[:start]}) + "\n"
                    buffer = buffer[start + len("<think>"):]
                    in_think_block = True
            else:
                end = buffer.find("</think>")
                if end == -1:
                    buffer = ""  # discard partial thinking content
                    break
                else:
                    buffer = buffer[end + len("</think>"):]
                    in_think_block = False

    yield json.dumps({"type": "done"}) + "\n"

if __name__ == "__main__":
    from vectorstore import VectorStore
    store = VectorStore()
    result = answer_question("what is this document about", store)
    print("ANSWER:", result["answer"])
    print("USED WEB SEARCH:", result["used_web_search"])