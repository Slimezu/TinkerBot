import logging
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.agents import AgentSession, Agent
from livekit.plugins import google

load_dotenv()
logger = logging.getLogger("tinkerbot")

class TinkerbotAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="You are Tinkerbot, a friendly, concise, and helpful AI assistant built for the live launch. Keep your answers conversational and punchy."
        )

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Initialize Gemini as the real-time audio brain
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash", 
            voice="Puck",
            temperature=0.7,
        )
    )

    await session.start(
        room=ctx.room,
        agent=TinkerbotAssistant(),
    )

    await session.generate_reply(
        instructions="Greet the user warmly as Tinkerbot and ask how you can help them with the launch today YOU ARE MADE BY RIDITH SHETTY AND DANIYAL."
    )

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="tinkerbot-agent",
        )
    )
