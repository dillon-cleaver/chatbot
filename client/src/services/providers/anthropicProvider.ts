import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "../../types";
import type { LLMProvider, FileAttachment } from "../llmService";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    this.model = model;
  }

  async sendMessage(
    messages: Message[],
    systemPrompt: string,
    fileAttachments?: FileAttachment[],
  ): Promise<string> {
    try {
      // Convert messages to Anthropic format
      const anthropicMessages: Anthropic.MessageParam[] = messages.map(
        (msg) => {
          if (msg.role === "user") {
            const content: Array<
              | Anthropic.TextBlockParam
              | Anthropic.ImageBlockParam
              | Anthropic.DocumentBlockParam
            > = [{ type: "text", text: msg.content }];

            // Add file attachments if present
            if (fileAttachments && fileAttachments.length > 0) {
              for (const file of fileAttachments) {
                if (file.type === "image" && file.mimeType) {
                  content.push({
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: file.mimeType,
                      data: file.data,
                    },
                  } as Anthropic.ImageBlockParam);
                } else if (file.type === "document" && file.mimeType) {
                  content.push({
                    type: "document",
                    source: {
                      type: "base64",
                      media_type: file.mimeType,
                      data: file.data,
                    },
                  } as Anthropic.DocumentBlockParam);
                } else if (file.type === "text") {
                  content.push({ type: "text", text: file.data });
                }
              }
            }

            return {
              role: "user",
              content: content as Anthropic.MessageParam["content"],
            };
          } else {
            return {
              role: "assistant",
              content: msg.content,
            };
          }
        },
      );

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      // Extract text content from response
      const textContent = response.content.find(
        (block: Anthropic.ContentBlock) => block.type === "text",
      ) as Anthropic.TextBlock | undefined;

      if (!textContent) {
        throw new Error("No text content in response");
      }

      return textContent.text;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw new Error("Unknown error calling Anthropic API");
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: "user", content: "test" }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
