import LLM "mo:llm";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Error "mo:base/Error";
import Int "mo:base/Int";

actor class Designer() = this {

  // Only user/system messages for LLM chat context
  stable var conversationHistory : [LLM.ChatMessage] = [];

  // Optional: full chat history (including assistant)
  stable var fullChatHistory : [FullChatMessage] = [];

  // Track all roles for your app logic
  type FullChatMessage = {
    role : { #system_; #user; #assistant };
    content : Text;
  };

  let designerPrompt : Text = "You are a professional graphic designer with 20 years of experience. 
    You specialize in creating:
    - Wedding invitations and cards
    - Business cards and stationery
    - Birthday and celebration cards
    - Funeral programs and memorial templates
    - Posters and promotional materials

    Always provide:
    1. Detailed design descriptions
    2. Color scheme recommendations
    3. Typography suggestions
    4. Layout guidelines
    5. Optional file format recommendations";

  public shared func professionalDesignerChat(
    userInput : Text,
    attachments : [Blob]
  ) : async Text {

    try {
      // Add reference to uploaded files
      let processedInput = if (attachments.size() > 0) {
        let attachmentInfo = "\n[User attached " # Int.toText(attachments.size()) #
          " file(s) containing design references]";
        userInput # attachmentInfo
      } else {
        userInput
      };

      // System and user message
      let systemMessage : LLM.ChatMessage = {
        role = #system_;
        content = designerPrompt;
      };

      let userMessage : LLM.ChatMessage = {
        role = #user;
        content = processedInput;
      };

      // Update chat context
      conversationHistory := Array.append(conversationHistory, [userMessage]);

      // Build chat input (system + previous history)
      let messages = Array.append([systemMessage], conversationHistory);

      let response = await LLM.chat(#Llama3_1_8B, messages);

      // Optional: track all messages (incl. assistant)
      fullChatHistory := Array.append(
        fullChatHistory,
        [
          { role = #user; content = processedInput },
          { role = #assistant; content = response }
        ]
      );

      // Return only the assistant reply
      response

    } catch (e) {
      Debug.print("LLM Error: " # Error.message(e));
      "⚠️ Design service is currently unavailable. Please try again later. Technical details: " # Error.message(e);
    };
  };

  // Reset both histories
  public shared func resetConversation() : async () {
    conversationHistory := [];
    fullChatHistory := [];
  };

  public query func version() : async Text {
    "1.1.1";
  };

  // Optional: expose full conversation history
  public query func getFullChatHistory() : async [FullChatMessage] {
    fullChatHistory
  };
};
