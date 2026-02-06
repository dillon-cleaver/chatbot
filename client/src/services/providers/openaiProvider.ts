import type { Message } from "../../types";
import type { LLMProvider, FileAttachment } from "../llmService";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(
    messages: Message[],
    systemPrompt: string,
    fileAttachments?: FileAttachment[],
  ): Promise<string> {
    try {
      // Convert messages to OpenAI format
      // GPT-5 models use "developer" role instead of "system"
      const isGpt5 = this.model.startsWith("gpt-5");
      const openAIMessages: Array<{
        role: "system" | "developer" | "user" | "assistant";
        content:
          | string
          | Array<{ type: string; text?: string; image_url?: { url: string } }>;
      }> = [{ role: isGpt5 ? "developer" : "system", content: systemPrompt }];

      // Process user messages
      for (const msg of messages) {
        if (msg.role === "user") {
          const content: Array<{
            type: string;
            text?: string;
            image_url?: { url: string };
          }> = [{ type: "text", text: msg.content }];

          // Add file attachments if present
          if (fileAttachments && fileAttachments.length > 0) {
            for (const file of fileAttachments) {
              if (file.type === "image" && file.mimeType) {
                content.push({
                  type: "image_url",
                  image_url: {
                    url: `data:${file.mimeType};base64,${file.data}`,
                  },
                });
              } else if (file.type === "text") {
                content[0].text = `${content[0].text}\n\n${file.data}`;
              }
            }
          }

          openAIMessages.push({
            role: "user",
            content:
              content.length === 1 && content[0].type === "text"
                ? content[0].text!
                : content,
          });
        } else {
          openAIMessages.push({
            role: "assistant",
            content: msg.content,
          });
        }
      }

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: openAIMessages,
            max_completion_tokens: 2048,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `OpenAI API error: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as OpenAIResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error("No response from OpenAI");
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error("Unknown error calling OpenAI API");
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: "user", content: "test" }],
            max_completion_tokens: 10,
          }),
        },
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}
