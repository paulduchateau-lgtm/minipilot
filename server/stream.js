// ── SSE Streaming for AI responses ───────────────────────────────────────────
// Streams AI tokens to the client via Server-Sent Events.
// The client receives incremental text + a final JSON payload.

/**
 * Stream an Anthropic Claude response via SSE.
 *
 * @param {object} anthropic - Anthropic SDK client
 * @param {object} res - Express response object
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} options - { maxTokens, model }
 * @returns {Promise<string>} The full response text
 */
export async function streamAnthropicSSE(anthropic, res, systemPrompt, userPrompt, { maxTokens = 4096, model = "claude-sonnet-4-20250514" } = {}) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let fullText = "";

  try {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt || undefined,
      messages: [{ role: "user", content: userPrompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.text) {
        fullText += event.delta.text;
        res.write(`data: ${JSON.stringify({ type: "token", text: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done", text: fullText })}\n\n`);
    res.end();
    return fullText;

  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    res.end();
    throw err;
  }
}

/**
 * Stream a Mistral response via SSE.
 *
 * @param {object} mistralClient - Mistral SDK client
 * @param {object} res - Express response object
 * @param {Array} messages - [{role, content}]
 * @param {object} options - { maxTokens, model }
 * @returns {Promise<string>}
 */
export async function streamMistralSSE(mistralClient, res, messages, { maxTokens = 4096, model = "mistral-large-latest" } = {}) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let fullText = "";

  try {
    const stream = await mistralClient.chat.stream({
      model,
      messages,
      maxTokens,
    });

    for await (const chunk of stream) {
      const delta = chunk.data?.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        res.write(`data: ${JSON.stringify({ type: "token", text: delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done", text: fullText })}\n\n`);
    res.end();
    return fullText;

  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    res.end();
    throw err;
  }
}
