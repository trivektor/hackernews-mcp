import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "hackernews",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "summarize_hn_latest_stories",
  "Summarize latest N stories on Hacker News",
  {
    parameters: {
      n: {
        type: "number",
        description: "Number of stories to summarize",
        minimum: 1,
        maximum: 100
      }
    }
  },
  async (args, extra) => {
    const n = args.n as number;

    const topStoriesResponse = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    const topStories = await topStoriesResponse.json();
    const topStoriesIds = topStories.slice(0, n);
    
    const stories = await Promise.all(
      topStoriesIds.map((id: number) => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`))
    );
    
    const storiesData = await Promise.all(stories.map((story) => story.json()));

    return {
      content: [
        {
          type: "text",
          text: `Here are the latest ${n} stories from Hacker News and their URLs:`
        },
        ...storiesData.map((story: any) => ({
          type: "resource",
          resource: {
            type: "url",
            uri: story.url || "",
            text: story.title || ""
          }
        }))
      ]
    } as {
      content: Array<{
        type: "text";
        text: string;
      } | {
        type: "resource";
        resource: {
          type: "url";
          uri: string;
          text: string;
        };
      }>
    };
  }
);

async function main() {
  let transport: StdioServerTransport | null = null;
  
  // Set up graceful shutdown
  process.on('SIGTERM', async () => {
    console.error('MCP Server received SIGTERM, shutting down...');
    if (transport) {
      await transport.close();
    }
    process.exit(0);
  });

  try {
    transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("MCP Server running on stdio");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
